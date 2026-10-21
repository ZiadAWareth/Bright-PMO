import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from '../agent/settings-crypto';
import {
  type Actor,
  type Decision,
  type OrgPolicy,
  type OrgStatus,
  canManageEntry,
  canRequestOrg,
  canSetOrg,
  isPolicy,
  orgEnabled,
  targetOrgForNewEntry,
  visibleEntries,
} from './access';
import { EmbedCodeError, type EmbedOptions, embedAddress, parseEmbedCode, sameOrigin } from './embed-code';
import { generateAppKeyPair, newState, pkcePair, publicJwkOf } from './engine-keys';
import { EngineCallError, disconnect, exchangeCode, fetchStatus } from './engine-client';

/** How long the owner has to approve in the engine before the request is abandoned. */
const PENDING_LIFETIME_MS = 15 * 60 * 1000;
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 500;

type ConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'revoked';

/** The only messages a person ever sees for an engine failure. */
function engineMessage(err: EngineCallError): string {
  switch (err.code) {
    case 'unreachable':
      return 'The Dashboard Engine could not be reached. Check its API address and that it is running, then try again.';
    case 'disabled':
      return 'This Dashboard Engine does not accept app connections yet. Ask whoever runs it to set CONNECTED_APPS_ENABLED=true.';
    case 'invalid_grant':
      return 'The approval expired or was already used. Click Connect again.';
    case 'app_revoked':
      return 'The Dashboard Engine disconnected this app. Connect again to restore dashboards.';
    case 'unauthorized':
      return 'The Dashboard Engine no longer accepts this app\'s key. Disconnect and connect again.';
    default:
      return err.message || 'The Dashboard Engine refused the request.';
  }
}

function deny(decision: Decision): never {
  throw new ForbiddenException(decision.reason || 'Not allowed.');
}

function equalSecret(a: string, b: string): boolean {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * An engine address as typed by an administrator: http(s), no credentials, no path beyond "/".
 * Plain http is accepted only for this machine (localhost) unless DASHBOARD_ENGINE_ALLOW_HTTP=true.
 */
function cleanAddress(value: unknown, label: string): string {
  const text = String(value ?? '').trim();
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new BadRequestException(`${label} must be a full address, like https://dashboards.example.com.`);
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const httpAllowed = local || process.env.DASHBOARD_ENGINE_ALLOW_HTTP === 'true';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && httpAllowed)) {
    throw new BadRequestException(`${label} must start with https://.`);
  }
  if (url.username || url.password) throw new BadRequestException(`${label} must not contain a user name or password.`);
  return url.origin + url.pathname.replace(/\/+$/, '');
}

function clip(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

@Injectable()
export class DashboardEngineService {
  constructor(private readonly prisma: PrismaService) {}

  private get connections(): any {
    return (this.prisma as any).dashboardEngineConnection;
  }
  private get orgRows(): any {
    return (this.prisma as any).dashboardEngineOrg;
  }
  private get entries(): any {
    return (this.prisma as any).embeddedDashboard;
  }
  private get organizations(): any {
    return (this.prisma as any).organization;
  }
  private secret(): string {
    return process.env.JWT_SECRET || '';
  }

  private async row(): Promise<any | null> {
    return this.connections.findUnique({ where: { scope: 'default' } });
  }

  private policyOf(row: any | null): OrgPolicy {
    return isPolicy(row?.orgPolicy) ? row.orgPolicy : 'self_service';
  }

  private async orgStatus(orgId: number | null): Promise<OrgStatus | null> {
    if (orgId === null) return null;
    const r = await this.orgRows.findUnique({ where: { orgId } });
    return (r?.status as OrgStatus) ?? null;
  }

  private credentials(row: any) {
    const privateKeyPem = decryptSecret(row?.privateKeyCipher, this.secret());
    if (!row?.clientId || !row?.engineApiUrl || !row?.keyId || !privateKeyPem) return null;
    return { engineApiUrl: row.engineApiUrl as string, clientId: row.clientId as string, privateKeyPem, kid: row.keyId as string };
  }

  // ── Connection (the app owner) ─────────────────────────────────────────────

  /** What the settings page shows. Org administrators get their own organization only. */
  async overview(actor: Actor) {
    if (!actor.isOwner && !actor.canManage) {
      throw new ForbiddenException('Your role cannot change dashboard settings.');
    }
    const row = await this.row();
    const policy = this.policyOf(row);
    const status: ConnectionStatus = (row?.status as ConnectionStatus) || 'disconnected';
    return {
      isOwner: actor.isOwner,
      connection: {
        status,
        engineUrl: row?.engineUrl || null,
        engineApiUrl: actor.isOwner ? row?.engineApiUrl || null : null,
        workspaceName: row?.workspaceName || null,
        workspaceCreated: Boolean(row?.workspaceCreated),
        sharedProjectName: row?.sharedProjectName || null,
        connectedAt: row?.connectedAt || null,
        connectedByEmail: actor.isOwner ? row?.connectedByEmail || null : null,
        lastError: actor.isOwner ? row?.lastError || null : null,
      },
      policy,
      lockOptOut: Boolean(row?.lockOrgOptOut),
      defaults: actor.isOwner
        ? {
            engineUrl: process.env.DASHBOARD_ENGINE_URL || '',
            engineApiUrl: process.env.DASHBOARD_ENGINE_API_URL || '',
          }
        : null,
      organizations: await this.organizationsFor(actor, policy),
    };
  }

  private async organizationsFor(actor: Actor, policy: OrgPolicy) {
    // The tenant middleware already limits an organization's administrator to their own row.
    const orgs: { id: number; name: string }[] = await this.organizations.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const mine = actor.isOwner ? orgs : orgs.filter((o) => o.id === actor.organizationId);
    const statuses: any[] = await this.orgRows.findMany({ where: { orgId: { in: mine.map((o) => o.id) } } });
    const byOrg = new Map(statuses.map((s) => [s.orgId, s]));
    return mine.map((o) => {
      const s = byOrg.get(o.id);
      return {
        id: o.id,
        name: o.name,
        status: (s?.status as OrgStatus) || null,
        enabled: orgEnabled(policy, s?.status),
        changedByEmail: s?.changedByEmail || null,
        changedAt: s?.changedAt || null,
        requestedByEmail: s?.requestedByEmail || null,
      };
    });
  }

  /**
   * Step 1 of connecting: make this app's key pair and PKCE pair, remember them (encrypted), and
   * return the engine's approval address for the owner's browser.
   */
  async start(actor: Actor, body: any, email: string, requestOrigin: string | undefined) {
    if (!actor.isOwner) throw new ForbiddenException('Only the app owner can connect the Dashboard Engine.');
    const existing = await this.row();
    if (existing?.status === 'connected') {
      throw new ConflictException('This app is already connected. Disconnect it first to connect to a different engine or workspace.');
    }
    if (!this.secret()) throw new ServiceUnavailableException('This app has no JWT_SECRET, so it cannot store its Dashboard Engine key safely.');

    const engineUrl = cleanAddress(body?.engineUrl || process.env.DASHBOARD_ENGINE_URL, 'The Dashboard Engine address');
    const engineApiUrl = cleanAddress(body?.engineApiUrl || process.env.DASHBOARD_ENGINE_API_URL, 'The Dashboard Engine API address');

    // Where the engine sends the owner back. The admin panel's configured address wins; the
    // browser's own origin is only a fallback for an app whose APP_ADMIN_URL is not set.
    const adminOrigin = cleanAddress(process.env.APP_ADMIN_URL || requestOrigin, 'This admin panel\'s address');
    const redirectUri = new URL('/settings/dashboard-engine/callback', adminOrigin).toString();

    const keys = generateAppKeyPair();
    const pkce = pkcePair();
    const state = newState();
    const data = {
      status: 'pending',
      engineUrl,
      engineApiUrl,
      clientId: null,
      keyId: keys.kid,
      privateKeyCipher: encryptSecret(keys.privateKeyPem, this.secret()),
      pendingState: state,
      pendingVerifierCipher: encryptSecret(pkce.verifier, this.secret()),
      pendingRedirectUri: redirectUri,
      pendingStartedAt: new Date(),
      lastError: null,
      updatedByEmail: email || null,
    };
    await this.connections.upsert({ where: { scope: 'default' }, create: { scope: 'default', ...data }, update: data });

    const appName = clip(process.env.APP_NAME || 'This app', 120);
    const authorize = new URL('/connect/authorize', engineUrl);
    authorize.searchParams.set('client_name', appName);
    authorize.searchParams.set('redirect_uri', redirectUri);
    authorize.searchParams.set('state', state);
    authorize.searchParams.set('code_challenge', pkce.challenge);
    authorize.searchParams.set('code_challenge_method', 'S256');
    authorize.searchParams.set('workspace_name', clip(body?.workspaceName || appName, 120));
    return { authorizeUrl: authorize.toString() };
  }

  /** Step 3: the engine sent the owner back with a one-time code; trade it for this app's ID. */
  async complete(actor: Actor, body: any, email: string) {
    if (!actor.isOwner) throw new ForbiddenException('Only the app owner can connect the Dashboard Engine.');
    const row = await this.row();
    const state = String(body?.state || '');
    if (!row || row.status !== 'pending' || !row.pendingState || !equalSecret(state, row.pendingState)) {
      throw new BadRequestException('This connection attempt is not the one this app started. Click Connect again.');
    }
    const clearPending = { pendingState: null, pendingVerifierCipher: null, pendingRedirectUri: null, pendingStartedAt: null };

    if (body?.error) {
      await this.connections.update({
        where: { scope: 'default' },
        data: { ...clearPending, status: 'disconnected', privateKeyCipher: null, keyId: null, lastError: null },
      });
      return { status: 'cancelled' as const };
    }
    if (!row.pendingStartedAt || Date.now() - new Date(row.pendingStartedAt).getTime() > PENDING_LIFETIME_MS) {
      await this.connections.update({ where: { scope: 'default' }, data: { ...clearPending, status: 'disconnected' } });
      throw new BadRequestException('The approval took too long. Click Connect again.');
    }

    const verifier = decryptSecret(row.pendingVerifierCipher, this.secret());
    const privateKeyPem = decryptSecret(row.privateKeyCipher, this.secret());
    if (!verifier || !privateKeyPem) {
      await this.connections.update({ where: { scope: 'default' }, data: { ...clearPending, status: 'disconnected' } });
      throw new BadRequestException('This app could not read its connection request. Click Connect again.');
    }

    try {
      const result = await exchangeCode(row.engineApiUrl, {
        code: String(body?.code || ''),
        codeVerifier: verifier,
        redirectUri: row.pendingRedirectUri,
        publicJwk: publicJwkOf(privateKeyPem),
      });
      await this.connections.update({
        where: { scope: 'default' },
        data: {
          ...clearPending,
          status: 'connected',
          clientId: result.clientId,
          keyId: result.kid || row.keyId,
          workspaceName: result.workspace?.name || null,
          workspaceCreated: Boolean(result.workspaceCreated),
          sharedProjectName: result.sharedProject?.name || null,
          connectedAt: new Date(),
          connectedByEmail: email || null,
          lastError: null,
          updatedByEmail: email || null,
        },
      });
      return { status: 'connected' as const, workspaceName: result.workspace?.name || null };
    } catch (err) {
      if (err instanceof EngineCallError) {
        await this.connections.update({
          where: { scope: 'default' },
          data: { ...clearPending, status: 'disconnected', lastError: engineMessage(err) },
        });
        throw new BadRequestException(engineMessage(err));
      }
      throw err;
    }
  }

  /** Ask the engine whether this app is still connected, and refresh what it is connected to. */
  async check(actor: Actor) {
    if (!actor.isOwner && !actor.canManage) throw new ForbiddenException('Your role cannot check the Dashboard Engine connection.');
    const row = await this.row();
    const creds = row?.status === 'connected' ? this.credentials(row) : null;
    if (!creds) return this.overview(actor);
    try {
      const s = await fetchStatus(creds);
      await this.connections.update({
        where: { scope: 'default' },
        data: { workspaceName: s.workspace?.name || row.workspaceName, sharedProjectName: s.sharedProject?.name || row.sharedProjectName, lastError: null },
      });
    } catch (err) {
      if (!(err instanceof EngineCallError)) throw err;
      const revoked = err.code === 'app_revoked';
      await this.connections.update({
        where: { scope: 'default' },
        data: { lastError: engineMessage(err), ...(revoked ? { status: 'revoked' } : {}) },
      });
    }
    return this.overview(actor);
  }

  /** Disconnect: tell the engine (best effort), then forget the key. The dashboard list is kept. */
  async disconnectApp(actor: Actor, email: string) {
    if (!actor.isOwner) throw new ForbiddenException('Only the app owner can disconnect the Dashboard Engine.');
    const row = await this.row();
    if (!row) return this.overview(actor);
    const creds = this.credentials(row);
    if (creds && row.status === 'connected') {
      try {
        await disconnect(creds);
      } catch {
        // The engine being down must not trap the app in a connection it wants out of.
      }
    }
    await this.connections.update({
      where: { scope: 'default' },
      data: {
        status: 'disconnected',
        clientId: null,
        keyId: null,
        privateKeyCipher: null,
        pendingState: null,
        pendingVerifierCipher: null,
        pendingRedirectUri: null,
        pendingStartedAt: null,
        lastError: null,
        updatedByEmail: email || null,
      },
    });
    return this.overview(actor);
  }

  async setPolicy(actor: Actor, body: any, email: string) {
    if (!actor.isOwner) throw new ForbiddenException('Only the app owner decides how organizations get dashboards.');
    if (!isPolicy(body?.policy)) throw new BadRequestException('Choose how organizations get dashboards.');
    const data = { orgPolicy: body.policy, lockOrgOptOut: body.policy === 'automatic' && Boolean(body.lockOptOut), updatedByEmail: email || null };
    await this.connections.upsert({ where: { scope: 'default' }, create: { scope: 'default', status: 'disconnected', ...data }, update: data });
    return this.overview(actor);
  }

  // ── Organizations ──────────────────────────────────────────────────────────

  async setOrganization(actor: Actor, orgId: number, enable: boolean, email: string) {
    const row = await this.row();
    const decision = canSetOrg(actor, orgId, enable, this.policyOf(row), Boolean(row?.lockOrgOptOut));
    if (!decision.ok) deny(decision);
    const org = await this.organizations.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!org) throw new NotFoundException('That organization does not exist.');
    const data = { status: enable ? 'active' : 'inactive', changedByEmail: email || null, changedAt: new Date(), requestedByEmail: null };
    await this.orgRows.upsert({ where: { orgId }, create: { orgId, ...data }, update: data });
    return this.overview(actor);
  }

  async requestOrganization(actor: Actor, orgId: number, email: string) {
    const row = await this.row();
    const decision = canRequestOrg(actor, orgId, this.policyOf(row));
    if (!decision.ok) deny(decision);
    const current = await this.orgStatus(orgId);
    if (current !== 'active') {
      const data = { status: 'requested', requestedByEmail: email || null, changedAt: new Date() };
      await this.orgRows.upsert({ where: { orgId }, create: { orgId, ...data }, update: data });
    }
    return this.overview(actor);
  }

  // ── The dashboard list ─────────────────────────────────────────────────────

  private present(e: any, actor: Actor, orgNames?: Map<number, string>) {
    const orgId: number | null = e.orgId ?? null;
    return {
      id: e.id,
      title: e.title,
      description: e.description || null,
      kind: e.kind,
      engineId: e.engineId,
      organizationId: orgId,
      organizationName: orgId === null ? null : orgNames?.get(orgId) ?? null,
      options: (e.options as EmbedOptions) || {},
      hasAccessToken: Boolean(e.tokenCipher),
      canManage: canManageEntry(actor, e.orgId ?? null).ok,
      sortOrder: e.sortOrder,
      updatedAt: e.updatedAt,
    };
  }

  /** The Dynamic Dashboards area for this person: whether it is usable, and what is in it. */
  async listForViewer(actor: Actor) {
    if (!actor.isOwner && !actor.canView && !actor.canManage) {
      throw new ForbiddenException('Your role does not include Dynamic Dashboards.');
    }
    const row = await this.row();
    const connected = row?.status === 'connected';
    const policy = this.policyOf(row);
    const enabled = actor.isOwner || orgEnabled(policy, await this.orgStatus(actor.organizationId));
    const state = !connected ? (row?.status === 'revoked' ? 'revoked' : 'not_connected') : enabled ? 'ready' : 'org_disabled';
    const rows: any[] = state === 'ready' || actor.isOwner || actor.canManage
      ? await this.entries.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
      : [];
    const mine = visibleEntries(actor, rows.map((r) => ({ ...r, organizationId: r.orgId ?? null })));
    // Names of the organizations the entries belong to (the tenant middleware limits an
    // organization's administrator to their own organization's name).
    const orgIds = [...new Set(mine.map((e) => e.organizationId).filter((v): v is number => v !== null))];
    const orgNames = new Map<number, string>(
      orgIds.length
        ? (await this.organizations.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } })).map(
            (o: { id: number; name: string }) => [o.id, o.name] as [number, string],
          )
        : [],
    );
    return {
      state,
      policy,
      isOwner: actor.isOwner,
      canManage: actor.isOwner || actor.canManage,
      engineUrl: connected ? row.engineUrl : null,
      dashboards: state === 'ready' || actor.isOwner || actor.canManage ? mine.map((e) => this.present(e, actor, orgNames)) : [],
    };
  }

  private async requireConnected() {
    const row = await this.row();
    if (row?.status !== 'connected' || !row.engineUrl) {
      throw new BadRequestException('Connect this app to the Dashboard Engine first (Settings → Dashboard Engine).');
    }
    return row;
  }

  private parse(code: unknown, engineUrl: string) {
    let parsed;
    try {
      parsed = parseEmbedCode(code);
    } catch (err) {
      if (err instanceof EmbedCodeError) throw new BadRequestException(err.message);
      throw err;
    }
    if (!sameOrigin(parsed.origin, engineUrl)) {
      throw new BadRequestException(
        `That code is from ${parsed.origin}, but this app is connected to ${new URL(engineUrl).origin}. Copy the code from the connected Dashboard Engine.`,
      );
    }
    return parsed;
  }

  async create(actor: Actor, body: any, email: string) {
    const row = await this.requireConnected();
    const target = targetOrgForNewEntry(actor, body?.organizationId);
    if ('ok' in target) deny(target);
    const orgId = (target as { orgId: number | null }).orgId;
    if (orgId !== null) {
      const org = await this.organizations.findUnique({ where: { id: orgId }, select: { id: true } });
      if (!org) throw new NotFoundException('That organization does not exist.');
    }
    const parsed = this.parse(body?.code, row.engineUrl);
    const duplicate = await this.entries.findFirst({ where: { kind: parsed.kind, engineId: parsed.engineId, orgId } });
    if (duplicate) throw new ConflictException(`This dashboard is already in the list as "${duplicate.title}".`);

    const title = clip(body?.title, MAX_TITLE) || `Dashboard ${parsed.engineId.slice(0, 8)}`;
    const created = await this.entries.create({
      data: {
        kind: parsed.kind,
        engineId: parsed.engineId,
        engineOrigin: parsed.origin,
        orgId,
        title,
        description: clip(body?.description, MAX_DESCRIPTION) || null,
        options: parsed.options as any,
        tokenCipher: parsed.token ? encryptSecret(parsed.token, this.secret()) : null,
        sortOrder: Number.isInteger(body?.sortOrder) ? body.sortOrder : 0,
        addedByEmail: email || null,
      },
    });
    return this.present(created, actor);
  }

  private async entryFor(actor: Actor, id: number) {
    const entry = Number.isInteger(id) ? await this.entries.findUnique({ where: { id } }) : null;
    if (!entry) throw new NotFoundException('That dashboard is not in the list.');
    return entry;
  }

  async update(actor: Actor, id: number, body: any) {
    const entry = await this.entryFor(actor, id);
    const decision = canManageEntry(actor, entry.orgId ?? null);
    if (!decision.ok) deny(decision);
    const data: Record<string, any> = {};
    if (body?.title !== undefined) {
      const title = clip(body.title, MAX_TITLE);
      if (!title) throw new BadRequestException('Give the dashboard a name.');
      data.title = title;
    }
    if (body?.description !== undefined) data.description = clip(body.description, MAX_DESCRIPTION) || null;
    if (Number.isInteger(body?.sortOrder)) data.sortOrder = body.sortOrder;
    if (body?.code !== undefined && String(body.code).trim()) {
      const row = await this.requireConnected();
      const parsed = this.parse(body.code, row.engineUrl);
      Object.assign(data, {
        kind: parsed.kind,
        engineId: parsed.engineId,
        engineOrigin: parsed.origin,
        options: parsed.options as any,
        tokenCipher: parsed.token ? encryptSecret(parsed.token, this.secret()) : null,
      });
    }
    const updated = await this.entries.update({ where: { id }, data });
    return this.present(updated, actor);
  }

  async remove(actor: Actor, id: number) {
    const entry = await this.entryFor(actor, id);
    const decision = canManageEntry(actor, entry.orgId ?? null);
    if (!decision.ok) deny(decision);
    await this.entries.delete({ where: { id } });
    return { removed: true };
  }

  /**
   * What the dashboard page puts in its iframe.
   *
   * INTERIM: until the engine's per-viewer embed (plan Phase 3) is available, the iframe uses the
   * engine embed token pasted with the code, decrypted here for viewers this app allows. Every
   * viewer then sees what that token allows, exactly as with a pasted iframe today. The token is
   * never returned by any list or settings call.
   */
  async embedFor(actor: Actor, id: number) {
    const view = await this.listForViewer(actor);
    if (view.state !== 'ready') return { state: view.state };
    const entry = view.dashboards.find((d) => d.id === id);
    if (!entry) throw new NotFoundException('That dashboard is not available to you.');
    const row = await this.entries.findUnique({ where: { id } });
    const token = row?.tokenCipher ? decryptSecret(row.tokenCipher, this.secret()) : null;
    if (!token) return { state: 'needs_token' as const, title: entry.title };
    const src = embedAddress(row.engineOrigin, row.kind, row.engineId, (row.options as EmbedOptions) || {});
    src.searchParams.set('token', token);
    return { state: 'ready' as const, title: entry.title, src: src.toString(), height: entry.options?.height || null };
  }
}
