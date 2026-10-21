import type { ResolvedAiConfig } from './ai-config';
import { requireAiConfig } from './ai-config';
import type { WebSource } from './web-search.rules';
import { webSearchSupport, webSourcesFromAnthropic, webSourcesFromOpenAi, webSourcesFromOpenAiResponses } from './web-search.rules';

/**
 * A tool as the MODEL sees it. Note this is not the same thing as an `AgentTool` — the model
 * only ever needs the name, the prose and the argument schema. Everything else about a tool
 * (who may run it, whether it writes) is the runtime's business and is deliberately not sent.
 */
export interface LlmToolDefinition {
  name: string;
  description: string;
  /** JSON Schema object. Both wire formats accept the same dialect here. */
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  /** Provider-assigned id. Tool results must quote it back or the model loses the thread. */
  id: string;
  name: string;
  args: Record<string, unknown>;
  /**
   * Set when the model produced arguments that are not valid JSON. The call is still returned
   * rather than dropped: the right response is to hand the model back an error naming its own
   * bad argument, which it can usually fix on the next turn. Dropping it silently produces a
   * conversation where the model waits forever for a result that never comes.
   */
  parseError?: string;
}

export type LlmMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; content: string };

export interface LlmReply {
  content: string;
  toolCalls: LlmToolCall[];
  /** 'tool_calls' when the model wants tools run, 'stop' when it has answered. */
  finishReason: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  /** Web pages the provider's own search read for this reply. Empty unless search was on. */
  webSources?: WebSource[];
  /** Search was asked for but the model refused the search tool, so this reply was made without
   *  it (the provider's reason). The question is still answered — see callLlm. */
  webSearchSkipped?: string;
}

export interface LlmRequest {
  messages: LlmMessage[];
  tools?: LlmToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /**
   * A HINT, not a guarantee, and callers must treat it as one. OpenAI-shaped providers honour it
   * with `response_format`; Anthropic has no equivalent and will happily wrap the object in prose
   * or a code fence. Any caller that parses the reply as JSON has to tolerate that anyway, so this
   * exists to improve the odds, not to remove the need.
   */
  responseFormat?: 'json' | 'text';
  /** Offer the provider's native web search. Refused (thrown) on a provider without one. */
  webSearch?: boolean;
  /** Internal: do not retry without search when the model refuses it (the save-time check). */
  noSearchFallback?: boolean;
  /** Internal: how many times this call already waited out the provider's rate limit. */
  rateLimitRetries?: number;
  /** Internal: settings this model refused, learnt from its 400 and left out on the retry. */
  compat?: LlmCompat;
  /** Internal: the answer room was already cut to fit the provider's per-minute limit. */
  shrunkToFit?: boolean;
  /** Internal: asked again with low reasoning effort after the model thought its budget away. */
  reasoningRetry?: boolean;
}

/**
 * The smaller answer room that makes a request fit, from a "request too large" refusal that states
 * its numbers (Groq: "Limit 8000, Requested 9500"). Null when it does not say, or when what would
 * be left for the answer is too little to be useful.
 */
export function maxTokensToFit(text: string, maxTokens: number): number | null {
  const m = /limit\s+(\d+),\s*requested\s+(\d+)/i.exec(String(text || ''));
  if (!m) return null;
  const over = Number(m[2]) - Number(m[1]);
  if (!(over > 0)) return null;
  const next = maxTokens - over - 200;
  return next >= 800 ? next : null;
}

/**
 * What a model would not take. OpenAI's newer models (the gpt-5 family, the o-series reasoning
 * models) refuse `max_tokens` (they want `max_completion_tokens`) and any temperature but the
 * default, and some models refuse `response_format`. Rather than keep a list of model names that
 * goes stale, the client listens to the refusal and sends the request again without the setting.
 */
export interface LlmCompat {
  completionTokens?: boolean;
  noTemperature?: boolean;
  noResponseFormat?: boolean;
  /** Send reasoning_effort "low" (a reasoning model that spent its whole budget thinking). */
  lowReasoning?: boolean;
  /** This model refused reasoning_effort: never send it again. */
  noReasoningEffort?: boolean;
}

/** The adjustment a 400 asks for, or null when it is not one of these refusals (or already made). */
export function compatFor(text: string, current: LlmCompat = {}): LlmCompat | null {
  const t = String(text || '').toLowerCase();
  const refused = /unsupported|not supported|does not support|only the default|is not allowed/.test(t);
  if (!current.completionTokens && t.includes('max_tokens') && t.includes('max_completion_tokens')) {
    return { ...current, completionTokens: true };
  }
  if (!current.noTemperature && t.includes('temperature') && refused) return { ...current, noTemperature: true };
  if (!current.noResponseFormat && (t.includes('response_format') || t.includes('json_object')) && refused) {
    return { ...current, noResponseFormat: true };
  }
  if (current.lowReasoning && !current.noReasoningEffort && t.includes('reasoning_effort')) {
    return { ...current, lowReasoning: false, noReasoningEffort: true };
  }
  return null;
}

/** Carries the provider's own words, truncated. Never carries the key — see `authHeaders`. */
export class LlmRequestError extends Error {
  readonly code = 'LlmRequestFailed';
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'LlmRequestError';
  }
}

// ---------------------------------------------------------------------------
// OpenAI wire format (groq, openai, openrouter, azure, most "custom" hosts)
// ---------------------------------------------------------------------------

function toOpenAiMessages(messages: LlmMessage[]): unknown[] {
  return messages.map((message) => {
    if (message.role === 'tool') {
      return { role: 'tool', tool_call_id: message.toolCallId, content: message.content };
    }
    if (message.role === 'assistant' && message.toolCalls?.length) {
      return {
        role: 'assistant',
        // Some providers reject a null content alongside tool_calls, others reject an empty
        // string. An empty string is accepted by every provider measured, so use that.
        content: message.content || '',
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.args) },
        })),
      };
    }
    return { role: message.role, content: message.content };
  });
}

function fromOpenAi(payload: any): LlmReply {
  const choice = payload?.choices?.[0] ?? {};
  const message = choice.message ?? {};
  const toolCalls: LlmToolCall[] = (message.tool_calls ?? []).map((call: any) => {
    const raw = call?.function?.arguments;
    return parseToolArgs(call?.id ?? '', call?.function?.name ?? '', raw);
  });
  return {
    content: typeof message.content === 'string' ? message.content : '',
    toolCalls,
    finishReason: choice.finish_reason ?? (toolCalls.length ? 'tool_calls' : 'stop'),
    usage: {
      inputTokens: payload?.usage?.prompt_tokens,
      outputTokens: payload?.usage?.completion_tokens,
    },
    webSources: webSourcesFromOpenAi(message),
  };
}

// ---------------------------------------------------------------------------
// OpenAI Responses API — used ONLY for openai + web search
// ---------------------------------------------------------------------------

/**
 * Why a second OpenAI shape: Chat Completions accepts `web_search_options` only on the
 * `*-search-preview` models, and those refuse function tools — which the assistant always
 * sends. Any ordinary model (gpt-4o-mini, Loan-desk 2026-09-23) answers 400. The Responses API
 * runs web search and function tools together on the same models, so search goes through it.
 * Everything else keeps Chat Completions untouched.
 */
function toOpenAiResponsesInput(messages: LlmMessage[]): { instructions?: string; input: unknown[] } {
  const instructions = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const input: unknown[] = [];
  for (const message of messages) {
    if (message.role === 'system') continue;
    if (message.role === 'tool') {
      input.push({ type: 'function_call_output', call_id: message.toolCallId, output: message.content });
      continue;
    }
    if (message.role === 'assistant' && message.toolCalls?.length) {
      if (message.content) input.push({ role: 'assistant', content: message.content });
      for (const call of message.toolCalls) {
        input.push({ type: 'function_call', call_id: call.id, name: call.name, arguments: JSON.stringify(call.args) });
      }
      continue;
    }
    input.push({ role: message.role, content: message.content });
  }
  return { instructions: instructions || undefined, input };
}

function fromOpenAiResponses(payload: any): LlmReply {
  const items: any[] = Array.isArray(payload?.output) ? payload.output : [];
  const toolCalls: LlmToolCall[] = items
    .filter((item) => item?.type === 'function_call')
    .map((item) => parseToolArgs(item.call_id ?? '', item.name ?? '', item.arguments));
  const content = items
    .filter((item) => item?.type === 'message')
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((part: any) => part?.type === 'output_text')
    .map((part: any) => part.text ?? '')
    .join('');
  return {
    content,
    toolCalls,
    finishReason: toolCalls.length ? 'tool_calls' : 'stop',
    usage: {
      inputTokens: payload?.usage?.input_tokens,
      outputTokens: payload?.usage?.output_tokens,
    },
    webSources: webSourcesFromOpenAiResponses(items),
  };
}

// ---------------------------------------------------------------------------
// Anthropic wire format
// ---------------------------------------------------------------------------

/**
 * Anthropic differs in three ways that matter here: the system prompt is a top-level field
 * rather than a message, assistant tool calls are content BLOCKS rather than a sibling array,
 * and tool results come back as a `user` message rather than a `tool` role.
 *
 * Consecutive tool results are merged into one user message because the API requires strict
 * user/assistant alternation — two user messages in a row is a 400.
 */
function toAnthropicMessages(messages: LlmMessage[]): { system?: string; messages: unknown[] } {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');

  const out: any[] = [];
  for (const message of messages) {
    if (message.role === 'system') continue;

    if (message.role === 'tool') {
      const block = {
        type: 'tool_result',
        tool_use_id: message.toolCallId,
        content: message.content,
      };
      const last = out[out.length - 1];
      if (last?.role === 'user' && Array.isArray(last.content)) last.content.push(block);
      else out.push({ role: 'user', content: [block] });
      continue;
    }

    if (message.role === 'assistant' && message.toolCalls?.length) {
      const blocks: any[] = [];
      if (message.content) blocks.push({ type: 'text', text: message.content });
      for (const call of message.toolCalls) {
        blocks.push({ type: 'tool_use', id: call.id, name: call.name, input: call.args });
      }
      out.push({ role: 'assistant', content: blocks });
      continue;
    }

    out.push({ role: message.role, content: message.content });
  }

  return { system: system || undefined, messages: out };
}

function fromAnthropic(payload: any): LlmReply {
  const blocks: any[] = Array.isArray(payload?.content) ? payload.content : [];
  const text = blocks
    .filter((b) => b?.type === 'text')
    .map((b) => b.text ?? '')
    .join('');
  const toolCalls: LlmToolCall[] = blocks
    .filter((b) => b?.type === 'tool_use')
    // Anthropic returns arguments already parsed, so there is nothing to fail on here.
    .map((b) => ({ id: b.id ?? '', name: b.name ?? '', args: (b.input ?? {}) as Record<string, unknown> }));

  return {
    content: text,
    toolCalls,
    finishReason: payload?.stop_reason === 'tool_use' ? 'tool_calls' : payload?.stop_reason ?? 'stop',
    usage: {
      inputTokens: payload?.usage?.input_tokens,
      outputTokens: payload?.usage?.output_tokens,
    },
    webSources: webSourcesFromAnthropic(blocks),
  };
}

// ---------------------------------------------------------------------------

function parseToolArgs(id: string, name: string, raw: unknown): LlmToolCall {
  if (raw == null || raw === '') return { id, name, args: {} };
  if (typeof raw === 'object') return { id, name, args: raw as Record<string, unknown> };
  try {
    const parsed = JSON.parse(String(raw));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { id, name, args: parsed as Record<string, unknown> };
    }
    return { id, name, args: {}, parseError: 'Arguments must be a JSON object.' };
  } catch {
    return { id, name, args: {}, parseError: 'Arguments were not valid JSON.' };
  }
}

/**
 * One request to the configured model.
 *
 * Throws rather than returning a result object — unlike `probeAiConfig`, whose whole job is to
 * report a bad configuration. By the time we are here the config has already been probed, so a
 * failure is a genuine fault and the caller should not have to remember to check a flag.
 */
export async function callLlm(cfg: ResolvedAiConfig, request: LlmRequest): Promise<LlmReply> {
  requireAiConfig(cfg);

  const anthropic = cfg.wireFormat === 'anthropic';
  const timeoutMs = request.timeoutMs ?? 60000;
  // Checked again here, not only where the agent is prepared: this client is callable on its own.
  const search = request.webSearch ? webSearchSupport(cfg) : null;
  if (request.webSearch && !search) {
    throw new LlmRequestError(`Provider "${cfg.provider}" has no native web search.`);
  }
  const responses = search === 'openai';
  const url = anthropic
    ? `${cfg.baseUrl}/messages`
    : responses
      ? `${cfg.baseUrl}/responses`
      : `${cfg.baseUrl}/chat/completions`;

  let body: Record<string, unknown>;
  if (responses) {
    const { instructions, input } = toOpenAiResponsesInput(request.messages);
    body = {
      model: cfg.model,
      max_output_tokens: request.maxTokens ?? 4096,
      input,
      ...(instructions ? { instructions } : {}),
      ...(request.temperature != null && !request.compat?.noTemperature ? { temperature: request.temperature } : {}),
      ...(request.responseFormat === 'json' && !request.tools?.length
        ? { text: { format: { type: 'json_object' } } }
        : {}),
      tools: [
        ...(request.tools ?? []).map((tool) => ({
          type: 'function',
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          strict: false,
        })),
        // OpenAI runs this tool itself, server-side; the reply carries the pages read.
        { type: 'web_search_preview' },
      ],
      tool_choice: 'auto',
    };
  } else if (anthropic) {
    const { system, messages } = toAnthropicMessages(request.messages);
    body = {
      model: cfg.model,
      // Anthropic requires max_tokens; the OpenAI format does not, but sending it keeps a
      // runaway model from spending the customer's key on one reply.
      max_tokens: request.maxTokens ?? 4096,
      messages,
      ...(system ? { system } : {}),
      ...(request.temperature != null ? { temperature: request.temperature } : {}),
      ...(request.tools?.length || search === 'anthropic'
        ? {
            tools: [
              ...(request.tools ?? []).map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.parameters,
              })),
              // Anthropic runs this tool itself, server-side; the reply carries the pages read.
              ...(search === 'anthropic' ? [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }] : []),
            ],
          }
        : {}),
    };
  } else {
    const compat = request.compat ?? {};
    body = {
      model: cfg.model,
      ...(compat.completionTokens
        ? { max_completion_tokens: request.maxTokens ?? 4096 }
        : { max_tokens: request.maxTokens ?? 4096 }),
      messages: toOpenAiMessages(request.messages),
      ...(request.temperature != null && !compat.noTemperature ? { temperature: request.temperature } : {}),
      ...(compat.lowReasoning && !compat.noReasoningEffort ? { reasoning_effort: 'low' } : {}),
      // Not sent alongside tools: several providers reject the combination, and a model that is
      // choosing a tool is not producing the caller's JSON object on that turn anyway.
      ...(request.responseFormat === 'json' && !request.tools?.length && !compat.noResponseFormat
        ? { response_format: { type: 'json_object' } }
        : {}),
      ...(request.tools?.length
        ? {
            tools: request.tools.map((tool) => ({ type: 'function', function: tool })),
            tool_choice: 'auto',
          }
        : {}),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  request.signal?.addEventListener('abort', onAbort);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: cfg.authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = (err as Error)?.name === 'AbortError';
    throw new LlmRequestError(
      aborted
        ? `The model did not respond within ${timeoutMs}ms.`
        : (err as Error)?.message || 'The request to the model provider failed.',
    );
  } finally {
    clearTimeout(timer);
    request.signal?.removeEventListener('abort', onAbort);
  }

  if (!response.ok) {
    // Truncated: provider errors can echo the whole request back, and this string ends up in
    // logs and in the UI.
    const text = (await response.text().catch(() => '')).slice(0, 600);
    // The provider's own sentence, when the body has one (OpenAI and Anthropic both wrap it as
    // error.message). Without it a 400 says nothing about which argument was refused.
    const detail = providerErrorMessage(text);
    // A model that does not take the search tool (OpenAI's nano models, older Claude) refuses the
    // WHOLE request — even "hi", which never needed search. Answer anyway, without search, and say so.
    if (search && !request.noSearchFallback && isSearchToolRefusal(response.status, text)) {
      const reply = await callLlm(cfg, { ...request, webSearch: false });
      return { ...reply, webSearchSkipped: detail || 'This model does not support web search.' };
    }
    // A setting this model does not take (max_tokens, temperature, response_format): leave it out
    // and send again. One setting per retry, each at most once, so this cannot loop.
    if (response.status === 400 && !anthropic) {
      const next = compatFor(text, request.compat);
      if (next) return callLlm(cfg, { ...request, compat: next });
    }
    // 413 — one request bigger than the plan allows in a minute (Groq's free tier refuses any
    // single request over its 8,000 tokens-per-minute limit). Waiting cannot help; say what can.
    if (response.status === 413 || /request too large/i.test(text)) {
      // The overflow is usually the answer room we reserved, which the provider counts too: shrink
      // it by exactly the overflow and ask once more, rather than failing a request that can fit.
      const fit = request.shrunkToFit ? null : maxTokensToFit(text, request.maxTokens ?? 4096);
      if (fit) return callLlm(cfg, { ...request, maxTokens: fit, shrunkToFit: true });
      throw new LlmRequestError(
        'This request is larger than your AI provider plan allows in one minute. ' +
          'Use a model or plan with a higher tokens-per-minute limit (Provider & Key).' +
          (detail ? ' (' + detail + ')' : ''),
        413,
        text,
      );
    }
    // 429 — a per-minute limit (Groq's free tier: 8,000 tokens a minute). An agent's calls come in a
    // burst, and every call re-sends the conversation so far, so a few quick calls pass the limit
    // although none is large. The provider says how long to wait: wait that long and try again, a
    // few times, instead of failing a run that would succeed a moment later.
    if (response.status === 429) {
      const attempt = request.rateLimitRetries ?? 0;
      const waitMs = rateLimitWaitMs(response.headers.get('retry-after'), text);
      if (waitMs !== null && waitMs <= RATE_LIMIT_MAX_WAIT_MS && attempt < RATE_LIMIT_RETRIES && !request.signal?.aborted) {
        await waitFor(waitMs + 250, request.signal);
        if (!request.signal?.aborted) return callLlm(cfg, { ...request, rateLimitRetries: attempt + 1 });
      }
      throw new LlmRequestError(
        'The AI provider rate limit was reached: too many tokens in one minute for your plan with it. ' +
          'Try again in a minute, give this agent fewer model calls, or raise the limit with the provider.' +
          (detail ? ' (' + detail + ')' : ''),
        429,
        text,
      );
    }
    const message =
      response.status === 401 || response.status === 403
        ? 'The API key was rejected by the provider.'
        : `The model provider returned ${response.status}${detail ? ': ' + detail : '.'}`;
    throw new LlmRequestError(message, response.status, text);
  }

  const payload = await response.json().catch(() => null);
  if (!payload) throw new LlmRequestError('The model provider returned a malformed response.');

  const reply = anthropic ? fromAnthropic(payload) : responses ? fromOpenAiResponses(payload) : fromOpenAi(payload);

  // A REASONING model (gpt-oss, gpt-5, the o-series) spends part of max_tokens thinking before it
  // writes. When the thinking takes all of it, the reply stops at "length" with no answer at all.
  // Ask once more with low reasoning effort, which leaves the budget for the answer; if that still
  // writes nothing, say so instead of returning an empty answer for the caller to trip on.
  if (!reply.content.trim() && !reply.toolCalls.length && reply.finishReason === 'length') {
    if (!anthropic && !responses && !request.reasoningRetry) {
      return callLlm(cfg, {
        ...request,
        reasoningRetry: true,
        maxTokens: Math.max(request.maxTokens ?? 4096, 4096),
        compat: { ...(request.compat ?? {}), lowReasoning: true },
      });
    }
    throw new LlmRequestError(
      'The model used its whole answer budget on reasoning and wrote no answer. ' +
        'Try again, or choose a model that answers directly (for example llama-3.3-70b-versatile on Groq, or gpt-4.1-mini on OpenAI) in AI → Provider & Key.',
    );
  }
  return reply;
}

/** How many times one call waits out a rate limit, and the longest single wait it will make. */
export const RATE_LIMIT_RETRIES = 3;
export const RATE_LIMIT_MAX_WAIT_MS = 20_000;

/**
 * How long the provider asks us to wait after a 429: the Retry-After header (seconds or a date), else
 * the "try again in 630ms" / "7.2s" / "1m2.5s" sentence Groq and OpenAI put in the message. Null when
 * it does not say — then we do not guess.
 */
export function rateLimitWaitMs(retryAfter: string | null | undefined, text: string, now: number = Date.now()): number | null {
  const header = String(retryAfter ?? '').trim();
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds * 1000));
    const at = Date.parse(header);
    if (Number.isFinite(at)) return Math.max(0, at - now);
  }
  const said = /try again in\s+([\d.hms]+)/i.exec(text || '');
  if (!said) return null;
  let ms = 0;
  let found = false;
  for (const part of said[1].matchAll(/([\d.]+)(ms|h|m|s)/g)) {
    const n = Number(part[1]);
    if (!Number.isFinite(n)) continue;
    found = true;
    ms += part[2] === 'ms' ? n : part[2] === 's' ? n * 1000 : part[2] === 'm' ? n * 60_000 : n * 3_600_000;
  }
  return found ? Math.round(ms) : null;
}

function waitFor(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/** The provider refused the search tool itself (HTTP 400 naming it), not the question. */
function isSearchToolRefusal(status: number | undefined, text: string): boolean {
  return status === 400 && /web_search|web search/i.test(text || '');
}

/**
 * Asked when web search is switched on (saving the AI provider): does THIS model take the search
 * tool? Null when it does — or when the check fails for another reason (a bad key, a timeout), which
 * is Test connection's to report, not a reason to refuse the save. One tiny request.
 */
export async function webSearchRefusal(cfg: ResolvedAiConfig): Promise<string | null> {
  try {
    await callLlm(cfg, {
      messages: [{ role: 'user', content: 'Reply with the word OK.' }],
      maxTokens: 16,
      timeoutMs: 20000,
      webSearch: true,
      noSearchFallback: true,
    });
    return null;
  } catch (err) {
    if (err instanceof LlmRequestError && isSearchToolRefusal(err.status, err.body || err.message)) {
      return (
        'Web search is not available on ' + cfg.model + ' (' + (providerErrorMessage(err.body || '') || err.message) + '). ' +
        'Turn web search off, or choose a model that supports it.'
      );
    }
    return null;
  }
}

function providerErrorMessage(text: string): string | null {
  try {
    const parsed = JSON.parse(text);
    const message = parsed?.error?.message;
    return typeof message === 'string' && message.trim() ? message.trim().slice(0, 300) : null;
  } catch {
    return null;
  }
}
