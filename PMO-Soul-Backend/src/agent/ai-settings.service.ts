import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  aiConfigFromEnv,
  describeAiConfig,
  resolveAiConfig,
  PROVIDER_PRESETS,
  type AiProvider,
  type ResolvedAiConfig,
} from './ai-config';
import { decryptSecret, encryptSecret, last4 } from './settings-crypto';
import { webSearchSupport } from './web-search.rules';
import { webSearchRefusal } from './llm.client';

/** The single row. A constant, not a magic string repeated at every call site. */
const SCOPE = 'default';

/** Where the live configuration came from. Surfaced in the UI so a confused admin
 *  can see that the row they just saved is, or is not, the one being used. */
export type AiConfigSource = 'settings' | 'environment' | 'none';

export interface AgentConfigUpdate {
  provider?: string;
  model?: string;
  baseUrl?: string;
  /** Omitted = keep the stored key. Empty string = delete it. */
  apiKey?: string;
  /** Let the generic assistant use the provider's own web search. */
  assistantWebSearch?: boolean;
}

/**
 * The provider config plus the one app-wide assistant preference stored beside it.
 * Named agents ignore `assistantWebSearch`: their switch is on the Agent row.
 */
export type AssistantAiConfig = ResolvedAiConfig & { assistantWebSearch: boolean };

export interface AgentConfigView {
  provider: string;
  wireFormat: string;
  baseUrl: string;
  model: string;
  configured: boolean;
  reason?: string;
  hasKey: boolean;
  source: AiConfigSource;
  /** Last four characters only, or '' — the key itself never leaves the server. */
  keyHint: string;
  updatedAt: string | null;
  updatedByEmail: string | null;
  /** The saved switch — may be on while the provider cannot honour it. */
  assistantWebSearch: boolean;
  /** Whether the resolved provider has a native web search at all. */
  webSearchSupported: boolean;
  /** Feeds the provider picker, so the frontend does not keep its own copy of this list. */
  providers: Array<{
    id: AiProvider;
    /** Display name for the picker (e.g. "OpenAI"); id is what gets stored. */
    label: string;
    wireFormat: string;
    defaultModel: string;
    defaultBaseUrl: string;
    requiresBaseUrl: boolean;
    /** So the form can grey the search switch for the provider being picked, before saving. */
    webSearch: boolean;
  }>;
}

interface StoredRow {
  provider: string | null;
  modelName: string | null;
  baseUrl: string | null;
  apiKeyCipher: string | null;
  apiKeyLast4: string | null;
  /** Optional: a row from before the column existed reads as undefined, i.e. off. */
  assistantWebSearch?: boolean | null;
  updatedAt: Date | null;
  updatedByEmail: string | null;
}

interface Snapshot {
  config: AssistantAiConfig;
  source: AiConfigSource;
  keyHint: string;
  updatedAt: string | null;
  updatedByEmail: string | null;
}

@Injectable()
export class AiSettingsService {
  private readonly logger = new Logger(AiSettingsService.name);

  /**
   * Cached until something writes through this service. No TTL: a generated app
   * runs one backend process, and that process is the only writer.
   */
  private snapshot: Snapshot | null = null;

  /** Logged once, not per request — a missing table would otherwise flood the log. */
  private warnedAboutTable = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reading `process.env` here, and only here, is intentional. `ai-config.ts` and
   * `settings-crypto.ts` stay free of it so they can be tested and reused; this
   * service is the server-side edge where the environment is legitimately in scope.
   */
  private get appSecret(): string {
    return process.env.JWT_SECRET || '';
  }

  /** The configuration every caller that is about to reach a model should use. */
  async getConfig(): Promise<AssistantAiConfig> {
    return (await this.load()).config;
  }

  /** Safe to return over HTTP. Contains no key. */
  async describe(): Promise<AgentConfigView> {
    const snap = await this.load();
    return {
      ...describeAiConfig(snap.config),
      source: snap.source,
      keyHint: snap.keyHint,
      updatedAt: snap.updatedAt,
      updatedByEmail: snap.updatedByEmail,
      assistantWebSearch: snap.config.assistantWebSearch,
      webSearchSupported: webSearchSupport(snap.config) !== null,
      providers: (Object.keys(PROVIDER_PRESETS) as AiProvider[]).map((id) => ({
        id,
        label: PROVIDER_PRESETS[id].label,
        wireFormat: PROVIDER_PRESETS[id].wireFormat,
        defaultModel: PROVIDER_PRESETS[id].defaultModel,
        defaultBaseUrl: PROVIDER_PRESETS[id].baseUrl || '',
        requiresBaseUrl: Boolean(PROVIDER_PRESETS[id].requiresBaseUrl),
        webSearch: webSearchSupport({ provider: id, wireFormat: PROVIDER_PRESETS[id].wireFormat }) !== null,
      })),
    };
  }

  /**
   * Writes the settings row.
   *
   * Rejects a configuration that is broken for any reason OTHER than a missing
   * key: a bad base URL or an empty model is a mistake worth reporting while the
   * admin is still looking at the form. A missing key is allowed through, so the
   * provider and model can be set up first and the key pasted afterwards.
   */
  async save(update: AgentConfigUpdate, actorEmail?: string): Promise<AgentConfigView> {
    const existing = await this.readRow();

    const provider = (update.provider || existing?.provider || '').trim();
    if (provider && !(provider.toLowerCase() in PROVIDER_PRESETS)) {
      throw new Error(`Unknown provider "${provider}".`);
    }

    // undefined = untouched, '' = cleared, anything else = a new key.
    const rawKey = typeof update.apiKey === 'string' ? update.apiKey.trim() : undefined;
    let cipher = existing?.apiKeyCipher ?? null;
    let hint = existing?.apiKeyLast4 ?? null;
    if (rawKey !== undefined) {
      cipher = rawKey ? encryptSecret(rawKey, this.appSecret) : null;
      hint = rawKey ? last4(rawKey) : null;
    }

    const modelName = (update.model ?? existing?.modelName ?? '').trim() || null;
    const baseUrl = (update.baseUrl ?? existing?.baseUrl ?? '').trim() || null;

    // Validated with a placeholder key rather than the real one, so "no key yet"
    // cannot be the complaint and any remaining objection is genuinely about the
    // provider, model or base URL. Matching on the wording of `reason` would work
    // today and break the first time someone rephrases it.
    const structural = resolveAiConfig({
      provider: provider || undefined,
      apiKey: 'validation-placeholder',
      model: modelName || undefined,
      baseUrl: baseUrl || undefined,
      runtime: 'server',
    });
    if (structural.reason) throw new Error(structural.reason);

    // Web search on: ask the provider now whether THIS model takes the search tool, so a model
    // without it is refused here, in words, instead of breaking every question on the Assistant.
    const nextSearch =
      typeof update.assistantWebSearch === 'boolean' ? update.assistantWebSearch : Boolean(existing?.assistantWebSearch);
    const keyForCheck =
      rawKey !== undefined ? rawKey : existing?.apiKeyCipher ? decryptSecret(existing.apiKeyCipher, this.appSecret) : null;
    if (nextSearch && keyForCheck) {
      const real = resolveAiConfig({
        provider: provider || undefined,
        apiKey: keyForCheck,
        model: modelName || undefined,
        baseUrl: baseUrl || undefined,
        runtime: 'server',
      });
      if (!real.reason && webSearchSupport(real)) {
        const refusal = await webSearchRefusal(real);
        if (refusal) throw new Error(refusal);
      }
    }

    const data = {
      provider: provider || null,
      modelName,
      baseUrl,
      apiKeyCipher: cipher,
      apiKeyLast4: hint,
      // Saved as asked, even on a provider without search: the preference survives a later
      // switch to OpenAI or Anthropic, and the runtime checks support at question time.
      assistantWebSearch:
        typeof update.assistantWebSearch === 'boolean'
          ? update.assistantWebSearch
          : Boolean(existing?.assistantWebSearch),
      updatedByEmail: actorEmail || null,
    };

    await (this.prisma as any).agentSetting.upsert({
      where: { scope: SCOPE },
      create: { scope: SCOPE, ...data },
      update: data,
    });

    this.invalidate();
    return this.describe();
  }

  /** Call after anything that could change the answer. */
  invalidate(): void {
    this.snapshot = null;
  }

  private async load(): Promise<Snapshot> {
    if (this.snapshot) return this.snapshot;

    const row = await this.readRow();
    const storedKey = row ? decryptSecret(row.apiKeyCipher, this.appSecret) : null;

    if (storedKey) {
      this.snapshot = {
        config: {
          ...resolveAiConfig({
            provider: row?.provider || undefined,
            apiKey: storedKey,
            model: row?.modelName || undefined,
            baseUrl: row?.baseUrl || undefined,
            runtime: 'server',
          }),
          assistantWebSearch: Boolean(row?.assistantWebSearch),
        },
        source: 'settings',
        keyHint: row?.apiKeyLast4 || '',
        updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
        updatedByEmail: row?.updatedByEmail ?? null,
      };
      return this.snapshot;
    }

    // A stored row whose key will not decrypt (rotated JWT_SECRET) is reported as
    // such, rather than quietly falling back to an environment key the admin has
    // long forgotten about and cannot see in the UI.
    if (row?.apiKeyCipher) {
      this.logger.warn(
        'Stored provider key could not be decrypted — JWT_SECRET has probably changed. Re-enter the key in Agent settings.',
      );
    }

    const env = aiConfigFromEnv(process.env);
    this.snapshot = {
      // All-or-nothing, like the rest of the fallback: an env-configured app takes its
      // search switch from the environment too, never from a half-usable row.
      config: { ...env, assistantWebSearch: process.env.AGENT_ASSISTANT_WEB_SEARCH === 'true' },
      source: env.apiKey ? 'environment' : 'none',
      keyHint: env.apiKey ? last4(env.apiKey) : '',
      updatedAt: null,
      updatedByEmail: null,
    };
    return this.snapshot;
  }

  /**
   * Returns null when the table is not there.
   *
   * An app generated before this feature existed has no `AgentSetting` table
   * until it is migrated, and the agent has to keep working from the environment
   * in the meantime — the same degrade-don't-crash rule the grounding pack uses
   * for malformed workflows.
   */
  private async readRow(): Promise<StoredRow | null> {
    try {
      return await (this.prisma as any).agentSetting.findUnique({ where: { scope: SCOPE } });
    } catch (err) {
      if (!this.warnedAboutTable) {
        this.warnedAboutTable = true;
        this.logger.warn(
          `AgentSetting is unreadable (${(err as Error).message}). Falling back to environment configuration.`,
        );
      }
      return null;
    }
  }
}
