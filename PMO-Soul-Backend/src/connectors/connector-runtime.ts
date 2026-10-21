import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as net from 'node:net';
import { promises as dns } from 'node:dns';
import { encryptSecret, decryptSecret } from '../agent/settings-crypto';
import { ENABLED_CONNECTORS } from './enabled';
import type { EnabledConnector } from './enabled';

/** A refusal with a name a person (and a workflow's error edge) can act on. */
export class ConnectorError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = code;
  }
}

export interface ConnectorProp {
  key: string;
  type: string;
  required: boolean;
  label: string;
  description?: string;
  options?: Array<{ label: string; value: unknown }>;
  secret?: boolean;
}
export interface ConnectorAuthOption { kind: string; label: string; description?: string; props: ConnectorProp[] }
export interface ConnectorActionInfo { name: string; label: string; description?: string; props: ConnectorProp[] }
export interface ConnectorInfo {
  id: string;
  label: string;
  available: boolean;
  problem?: string;
  auth: ConnectorAuthOption[];
  actions: ConnectorActionInfo[];
}

/**
 * The connection kinds this app can hold WITHOUT a sign-in flow. Every enabled piece offers one
 * (a service account, a token, host + user + password). OAuth2 waits for the sign-in flow.
 */
export const SUPPORTED_AUTH = new Set(['CUSTOM_AUTH']);
const SECRET_TYPES = new Set(['SECRET_TEXT']);
/** How long one action may run, and the most it may hand back to the workflow. */
export const ACTION_TIMEOUT_MS = 60000;
export const MAX_OUTPUT_CHARS = 256 * 1024;

// The packages live in the app's (shared) node_modules. Swappable so a test can hand in a stand-in.
let loadPackage: (name: string) => any = (name) => createRequire(path.join(process.cwd(), 'package.json'))(name);
const pieces = new Map<string, any>();
export function setPackageLoader(fn: (name: string) => any): void {
  loadPackage = fn;
  pieces.clear();
}

function enabledById(id: string): EnabledConnector {
  const enabled = ENABLED_CONNECTORS.find((c) => c.id === id);
  if (!enabled) {
    throw new ConnectorError('NotEnabled', 'The connector "' + id + '" is not enabled for this app. Tick it in Soul '
      + '(Generation → Connectors) and redeploy.');
  }
  return enabled;
}

function pieceOf(id: string): any {
  const enabled = enabledById(id);
  if (!pieces.has(id)) {
    let mod: any;
    try {
      mod = loadPackage(enabled.package);
    } catch {
      throw new ConnectorError('NotInstalled', enabled.label + ' is enabled but not installed on this server (' + enabled.package + ').');
    }
    const piece = Object.values(mod || {}).find((v: any) => v && typeof v === 'object' && v._actions);
    if (!piece) throw new ConnectorError('NotInstalled', enabled.package + ' is not a connector package.');
    pieces.set(id, piece);
  }
  return pieces.get(id);
}

const plain = (html: unknown) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function describeProps(props: Record<string, any> | undefined): ConnectorProp[] {
  return Object.entries(props || {}).map(([key, p]) => {
    const options = Array.isArray(p?.options?.options)
      ? p.options.options.map((o: any) => ({ label: String(o?.label ?? o?.value), value: o?.value }))
      : undefined;
    return {
      key,
      type: String(p?.type ?? 'SHORT_TEXT'),
      required: Boolean(p?.required),
      label: String(p?.displayName || key),
      ...(p?.description ? { description: plain(p.description).slice(0, 400) } : {}),
      ...(options ? { options } : {}),
      ...(SECRET_TYPES.has(String(p?.type)) ? { secret: true } : {}),
    };
  });
}

function authOptions(piece: any): any[] {
  return ([] as any[]).concat(piece?.auth || []).filter(Boolean);
}

/** What each enabled connector can do and what a connection to it needs — from the package itself. */
export function connectorCatalog(): ConnectorInfo[] {
  return ENABLED_CONNECTORS.map((c) => {
    try {
      const piece = pieceOf(c.id);
      return {
        id: c.id,
        label: c.label,
        available: true,
        auth: authOptions(piece).filter((a) => SUPPORTED_AUTH.has(String(a.type))).map((a) => ({
          kind: String(a.type),
          label: String(a.displayName || a.type),
          ...(a.description ? { description: plain(a.description).slice(0, 600) } : {}),
          props: describeProps(a.props),
        })),
        actions: Object.values(piece._actions || {}).map((a: any) => ({
          name: String(a.name),
          label: String(a.displayName || a.name),
          ...(a.description ? { description: plain(a.description).slice(0, 300) } : {}),
          props: describeProps(a.props),
        })),
      };
    } catch (err: any) {
      return { id: c.id, label: c.label, available: false, problem: String(err?.message ?? err), auth: [], actions: [] };
    }
  });
}

// ── Connections ──────────────────────────────────────────────────────────────────────────────

/** Ranges nothing legitimate is deployed on; private / on-prem addresses ARE allowed (that is the point). */
function blockedAddress(ip: string): boolean {
  const v = ip.toLowerCase();
  if (net.isIPv4(v)) {
    const [a, b] = v.split('.').map(Number);
    return (a === 169 && b === 254) || a === 0 || a >= 224;
  }
  if (net.isIPv6(v)) return v === '::' || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') || v.startsWith('ff');
  return false;
}

/** The hosts a connection's values point at: URLs, bare hosts, and the common connection-string forms. */
export function hostsIn(values: Record<string, unknown>): string[] {
  const out = new Set<string>();
  for (const [key, raw] of Object.entries(values || {})) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const v = raw.trim();
    if (/url$/i.test(key) || /^https?:\/\//i.test(v)) {
      try { out.add(new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v).hostname); } catch { /* not a URL */ }
    } else if (/^(host|server|hostname)$/i.test(key)) {
      out.add(v.replace(/^\[|\]$/g, '').split(/[:,;\/]/)[0]);
    } else if (/connection/i.test(key)) {
      const m = v.match(/(?:\/\/|@|server\s*=\s*|data source\s*=\s*|host\s*=\s*)\s*(?:tcp:)?([^:;,\/\s)]+)/i);
      if (m) out.add(m[1]);
    }
  }
  return [...out].filter(Boolean);
}

/** Refuses a connection that points at the cloud metadata service or a range nothing is deployed on. */
export async function checkConnectionHosts(values: Record<string, unknown>): Promise<void> {
  for (const host of hostsIn(values)) {
    const name = host.toLowerCase();
    if (name === 'metadata.google.internal' || name === 'metadata') {
      throw new ConnectorError('HostNotAllowed', host + ' is a cloud metadata address and cannot be connected to.');
    }
    const ips = net.isIP(name) ? [name] : await dns.lookup(name, { all: true }).then((r) => r.map((x) => x.address), () => []);
    const bad = ips.find(blockedAddress);
    if (bad) throw new ConnectorError('HostNotAllowed', host + ' resolves to ' + bad + ', which cannot be connected to.');
  }
}

/** A short, safe description of a connection: who / where, never a secret. */
function hintOf(option: ConnectorAuthOption, values: Record<string, unknown>): string {
  const show = option.props.filter((p) => !p.secret && /host|server|url|user|email|account|database|service|tenant|client_id|clientid/i.test(p.key));
  return show.map((p) => String(values[p.key] ?? '')).filter(Boolean).map((s) => s.slice(0, 60)).join(' · ').slice(0, 200);
}

function connectionRepo(prisma: any) {
  const repo = prisma?.connectorConnection;
  if (!repo) throw new ConnectorError('NotEnabled', 'This app has no connectors enabled.');
  return repo;
}

/** A connection as anyone outside this module sees it: never the secret, never the cipher. */
export function publicConnection(row: any) {
  return {
    id: row.id, connectorId: row.connectorId, name: row.name, authKind: row.authKind, hint: row.hint ?? '',
    updatedAt: row.updatedAt, updatedByEmail: row.updatedByEmail ?? null,
  };
}

export async function listConnections(prisma: any) {
  const rows = await connectionRepo(prisma).findMany({ orderBy: [{ connectorId: 'asc' }, { name: 'asc' }] });
  return rows.map(publicConnection);
}

/**
 * Create, or update by id. A value left EMPTY on update keeps what was saved — so the page never has
 * to be handed a secret back to edit a connection's other fields.
 */
export async function saveConnection(
  prisma: any,
  input: { id?: number; connectorId: string; name: string; authKind?: string; values: Record<string, unknown> },
  appSecret: string,
  who?: string,
) {
  const repo = connectionRepo(prisma);
  const info = connectorCatalog().find((c) => c.id === input?.connectorId);
  if (!info) enabledById(String(input?.connectorId));
  if (!info?.available) throw new ConnectorError('NotInstalled', info?.problem || 'This connector is not installed.');
  const option = info.auth.find((a) => a.kind === (input.authKind || info.auth[0]?.kind));
  if (!option) throw new ConnectorError('UnsupportedAuth', info.label + ' cannot be connected without a sign-in flow yet.');
  const name = String(input.name ?? '').trim();
  if (!name || name.length > 80) throw new ConnectorError('InvalidName', 'Give the connection a name (up to 80 characters).');

  let values: Record<string, unknown> = {};
  const previous = input.id ? await repo.findUnique({ where: { id: Number(input.id) } }) : null;
  if (input.id && !previous) throw new ConnectorError('NotFound', 'That connection no longer exists.');
  if (previous) values = JSON.parse(decryptSecret(previous.valueCipher, appSecret) || '{}');
  for (const p of option.props) {
    const v = (input.values || {})[p.key];
    if (v !== undefined && v !== null && v !== '') values[p.key] = v;
  }
  const missing = option.props.filter((p) => p.required && (values[p.key] === undefined || values[p.key] === '')).map((p) => p.label);
  if (missing.length) throw new ConnectorError('MissingValue', 'Fill in: ' + missing.join(', ') + '.');
  for (const key of Object.keys(values)) if (!option.props.some((p) => p.key === key)) delete values[key];
  await checkConnectionHosts(values);

  const data = {
    connectorId: info.id, name, authKind: option.kind, valueCipher: encryptSecret(JSON.stringify(values), appSecret),
    hint: hintOf(option, values), updatedByEmail: who ?? null,
  };
  const row = previous ? await repo.update({ where: { id: previous.id }, data }) : await repo.create({ data });
  return publicConnection(row);
}

export async function deleteConnection(prisma: any, id: number) {
  await connectionRepo(prisma).delete({ where: { id: Number(id) } });
  return { deleted: true };
}

async function authFor(prisma: any, id: number, appSecret: string, connectorId?: string) {
  const row = await connectionRepo(prisma).findUnique({ where: { id: Number(id) } });
  if (!row) throw new ConnectorError('NotFound', 'Connection ' + id + ' does not exist.');
  if (connectorId && row.connectorId !== connectorId) {
    throw new ConnectorError('WrongConnection', 'Connection "' + row.name + '" is for ' + row.connectorId + ', not ' + connectorId + '.');
  }
  const props = JSON.parse(decryptSecret(row.valueCipher, appSecret) || '{}');
  return { row, auth: { type: row.authKind, props } };
}

/** The piece's own credential check, when it has one. */
export async function testConnection(prisma: any, id: number, appSecret: string) {
  const { row, auth } = await authFor(prisma, id, appSecret);
  const option = authOptions(pieceOf(row.connectorId)).find((a) => String(a.type) === row.authKind);
  if (typeof option?.validate !== 'function') {
    return { valid: null, message: 'This connector has no built-in test — run a workflow step to try the connection.' };
  }
  try {
    // validate() takes the BARE values, unlike run() which takes { type, props } — checked against the real
    // Oracle and SAP Ariba pieces (2026-10-01): wrapped, Ariba answered valid without calling anything.
    const verdict: any = await withTimeout(Promise.resolve(option.validate({ auth: auth.props, server: unsupported('server') })), ACTION_TIMEOUT_MS);
    return verdict?.valid ? { valid: true } : { valid: false, message: String(verdict?.error ?? 'The connection was refused.') };
  } catch (err: any) {
    return { valid: false, message: String(err?.message ?? err) };
  }
}

// ── Running an action ────────────────────────────────────────────────────────────────────────

/** A context member this app does not provide: any use says so, instead of quietly doing nothing. */
function unsupported(what: string): any {
  return new Proxy({}, {
    get(_t, key) {
      if (key === 'then' || typeof key === 'symbol') return undefined;
      throw new ConnectorError('NotSupported', 'This action needs "' + what + '.' + String(key) + '", which Soul does not provide yet.');
    },
  });
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new ConnectorError('Timeout', 'The connector did not answer within ' + Math.round(ms / 1000) + ' s.')), ms);
    work.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/** Run one action of one enabled connector, with one of the app's connections. */
export async function runConnectorAction(
  prisma: any,
  appSecret: string,
  req: { connector: string; action: string; connection: number | string; props?: Record<string, unknown>; runId?: string },
): Promise<unknown> {
  const piece = pieceOf(String(req.connector));
  const action = piece._actions?.[String(req.action)];
  if (!action) {
    const names = Object.keys(piece._actions || {});
    throw new ConnectorError('UnknownAction', '"' + req.action + '" is not an action of ' + req.connector + '. Some it has: '
      + names.slice(0, 12).join(', ') + (names.length > 12 ? '…' : '') + '.');
  }
  const props = { ...(req.props || {}) };
  const missing = describeProps(action.props).filter((p) => p.required && (props[p.key] === undefined || props[p.key] === '')).map((p) => p.label);
  if (missing.length) throw new ConnectorError('MissingValue', 'The step needs: ' + missing.join(', ') + '.');
  const { auth } = await authFor(prisma, Number(req.connection), appSecret, String(req.connector));
  const context = {
    auth,
    propsValue: props,
    store: unsupported('store'),
    files: unsupported('files'),
    server: unsupported('server'),
    connections: unsupported('connections'),
    flows: unsupported('flows'),
    project: { id: 'soul-app' },
    run: { id: String(req.runId ?? '') },
    executionType: 'BEGIN',
    tags: { add: async () => undefined },
  };
  const output = await withTimeout(Promise.resolve().then(() => action.run(context)), ACTION_TIMEOUT_MS);
  const text = JSON.stringify(output === undefined ? null : output);
  if (text.length > MAX_OUTPUT_CHARS) {
    throw new ConnectorError('OutputTooLarge', 'The connector returned more than ' + Math.round(MAX_OUTPUT_CHARS / 1024) + ' KB; narrow the request.');
  }
  return JSON.parse(text);
}
