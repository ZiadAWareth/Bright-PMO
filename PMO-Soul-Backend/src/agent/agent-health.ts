import { ResolvedAiConfig } from './ai-config';

export interface AgentHealth {
  /** The provider answered at all — proves the URL and network path work. */
  reachable: boolean;
  /** The key was accepted. */
  authenticated: boolean;
  /** The configured model accepted a tool definition. Null when not probed. */
  supportsTools: boolean | null;
  status?: number;
  error?: string;
}

/** A deliberately trivial tool. We only care whether the API accepts the parameter at all. */
const PROBE_TOOL = {
  name: 'soul_probe',
  description: 'Capability probe. Never called.',
  parameters: { type: 'object', properties: {}, required: [] as string[] },
};

function probeBody(cfg: ResolvedAiConfig): Record<string, unknown> {
  const messages = [{ role: 'user', content: 'hi' }];
  if (cfg.wireFormat === 'anthropic') {
    return {
      model: cfg.model,
      max_tokens: 1,
      messages,
      tools: [
        {
          name: PROBE_TOOL.name,
          description: PROBE_TOOL.description,
          input_schema: PROBE_TOOL.parameters,
        },
      ],
    };
  }
  return {
    model: cfg.model,
    max_tokens: 1,
    messages,
    tools: [{ type: 'function', function: PROBE_TOOL }],
  };
}

function probeUrl(cfg: ResolvedAiConfig): string {
  return cfg.wireFormat === 'anthropic'
    ? `${cfg.baseUrl}/messages`
    : `${cfg.baseUrl}/chat/completions`;
}

/**
 * Makes ONE real outbound request. Never call this on a page load — a BYO key belongs to the
 * customer, and an unauthenticated or automatic probe is a way to drain it. Gated behind an
 * admin permission in the controller.
 *
 * Returns a result rather than throwing: "misconfigured" is information the settings UI needs
 * to display, not an exception.
 */
export async function probeAiConfig(
  cfg: ResolvedAiConfig,
  timeoutMs = 15000,
): Promise<AgentHealth> {
  // Dormant. This is the §0.7 guarantee: no key means zero outbound traffic.
  if (!cfg.configured) {
    return { reachable: false, authenticated: false, supportsTools: null, error: cfg.reason };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(probeUrl(cfg), {
      method: 'POST',
      headers: cfg.authHeaders(),
      body: JSON.stringify(probeBody(cfg)),
      signal: controller.signal,
    });

    // The provider answered, so URL and network are fine regardless of the status.
    if (response.ok) {
      return { reachable: true, authenticated: true, supportsTools: true, status: response.status };
    }

    const text = (await response.text()).slice(0, 400);

    if (response.status === 401 || response.status === 403) {
      return {
        reachable: true,
        authenticated: false,
        supportsTools: null,
        status: response.status,
        error: 'The API key was rejected by the provider.',
      };
    }

    // A 400 mentioning tools is the case worth catching early: the key is fine but the chosen
    // model cannot do tool calling, so every agent run would fail mid-conversation instead.
    if (response.status === 400 && /tool|function/i.test(text)) {
      return {
        reachable: true,
        authenticated: true,
        supportsTools: false,
        status: response.status,
        error: `Model "${cfg.model}" does not support tool calling.`,
      };
    }

    return {
      reachable: true,
      authenticated: true,
      supportsTools: null,
      status: response.status,
      error: text,
    };
  } catch (err) {
    const message = (err as Error)?.name === 'AbortError'
      ? `Provider did not respond within ${timeoutMs}ms.`
      : (err as Error)?.message || 'Request failed.';
    return { reachable: false, authenticated: false, supportsTools: null, error: message };
  } finally {
    clearTimeout(timer);
  }
}
