import { assertPublicUrl } from '../workflow/pulses/core/url-guard';

export type AiProvider = 'groq' | 'openai' | 'anthropic' | 'xai' | 'openrouter' | 'azure' | 'custom';

/** Anthropic's Messages API is not OpenAI-shaped — different auth header, body and tool schema. */
export type WireFormat = 'openai' | 'anthropic';

export type AiRuntime = 'server' | 'browser';

/** Thrown only when something actually tries to CALL the model with no key. Resolving a
 *  config without a key is a valid, silent, dormant state — see `configured`. */
export class AiNotConfiguredError extends Error {
  readonly code = 'AiNotConfigured';
  constructor(message = 'No AI provider key is configured for this app.') {
    super(message);
    this.name = 'AiNotConfiguredError';
  }
}

export interface AiConfigInput {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  /** Defaults to 'server'. The browser path changes which headers are sent. */
  runtime?: AiRuntime;
}

interface ProviderPreset {
  /** How the provider is named in the UI. The id stays the stored value. */
  label: string;
  wireFormat: WireFormat;
  baseUrl?: string;
  defaultModel: string;
  /** azure/custom have no sensible default host; the user must supply one. */
  requiresBaseUrl?: boolean;
  /** Extra headers required only when calling directly from a browser. */
  browserHeaders?: Record<string, string>;
}

/**
 * Browser-callability was measured by CORS preflight, not assumed (plan §7 item 0.0):
 * groq / openrouter return `allow-origin: *`, openai reflects the caller's origin, and
 * anthropic sends NO `allow-origin` until the request opts in via the header below.
 */
export const PROVIDER_PRESETS: Record<AiProvider, ProviderPreset> = {
  groq: {
    label: 'Groq',
    wireFormat: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-120b',
  },
  openai: {
    label: 'OpenAI',
    wireFormat: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    wireFormat: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-6',
    browserHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' },
  },
  // xAI (Grok) speaks the OpenAI wire format, tools included.
  xai: {
    label: 'xAI (Grok)',
    wireFormat: 'openai',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-4',
  },
  openrouter: {
    label: 'OpenRouter',
    wireFormat: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
  },
  azure: { label: 'Azure OpenAI', wireFormat: 'openai', defaultModel: 'gpt-4o-mini', requiresBaseUrl: true },
  custom: { label: 'Custom (OpenAI-compatible)', wireFormat: 'openai', defaultModel: '', requiresBaseUrl: true },
};

export interface ResolvedAiConfig {
  provider: AiProvider;
  wireFormat: WireFormat;
  baseUrl: string;
  model: string;
  runtime: AiRuntime;
  /** False = dormant. Callers MUST NOT make any outbound request. */
  configured: boolean;
  /** Why it is not usable, for the health endpoint. Never contains the key. */
  reason?: string;
  apiKey: string;
  authHeaders(): Record<string, string>;
}

function normaliseProvider(value: string | undefined): AiProvider {
  const p = (value || '').trim().toLowerCase();
  return (p in PROVIDER_PRESETS ? p : 'groq') as AiProvider;
}

export function resolveAiConfig(input: AiConfigInput = {}): ResolvedAiConfig {
  const provider = normaliseProvider(input.provider);
  const preset = PROVIDER_PRESETS[provider];
  const runtime: AiRuntime = input.runtime === 'browser' ? 'browser' : 'server';

  const apiKey = (input.apiKey || '').trim();
  const model = (input.model || '').trim() || preset.defaultModel;
  const rawBaseUrl = (input.baseUrl || '').trim() || preset.baseUrl || '';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  let reason: string | undefined;
  if (!baseUrl) {
    reason = `Provider "${provider}" requires an explicit base URL.`;
  } else {
    // SSRF guard on a user-supplied host. Runs even while dormant so a bad URL is reported
    // at config time rather than on the first real request.
    try {
      assertPublicUrl(baseUrl);
    } catch (err) {
      reason = (err as Error).message;
    }
  }
  if (!reason && !model) reason = `Provider "${provider}" requires an explicit model.`;
  if (!reason && !apiKey) reason = 'No API key configured.';

  return {
    provider,
    wireFormat: preset.wireFormat,
    baseUrl,
    model,
    runtime,
    configured: !reason,
    reason,
    apiKey,
    authHeaders() {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (preset.wireFormat === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers.Authorization = `Bearer ${apiKey}`;
      }
      if (runtime === 'browser' && preset.browserHeaders) {
        Object.assign(headers, preset.browserHeaders);
      }
      return headers;
    },
  };
}

/** Use at the top of any code path about to actually reach the network. */
export function requireAiConfig(cfg: ResolvedAiConfig): ResolvedAiConfig {
  if (!cfg.configured) throw new AiNotConfiguredError(cfg.reason);
  return cfg;
}

/** Server-side convenience. The browser path builds its input from saved user settings. */
export function aiConfigFromEnv(env: Record<string, string | undefined>): ResolvedAiConfig {
  return resolveAiConfig({
    provider: env.WORKFLOW_AI_PROVIDER,
    apiKey: env.WORKFLOW_AI_API_KEY,
    model: env.WORKFLOW_AI_MODEL,
    baseUrl: env.WORKFLOW_AI_BASE_URL,
    runtime: 'server',
  });
}

/** Safe to return over HTTP — deliberately omits `apiKey`. */
export function describeAiConfig(cfg: ResolvedAiConfig) {
  return {
    provider: cfg.provider,
    providerLabel: PROVIDER_PRESETS[cfg.provider]?.label ?? cfg.provider,
    wireFormat: cfg.wireFormat,
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    configured: cfg.configured,
    reason: cfg.reason,
    hasKey: cfg.apiKey.length > 0,
  };
}
