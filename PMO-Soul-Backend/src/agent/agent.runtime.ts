import { ResolvedAiConfig } from './ai-config';
import { callLlm, LlmMessage, LlmReply, LlmToolCall } from './llm.client';
import { WebSource, WEB_SEARCH_RULES, appendWebSources, dedupeSources } from './web-search.rules';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolSource,
  toLlmToolDefinition,
} from './tool.contract';

/**
 * Hard ceiling on model round-trips.
 *
 * Eight is not arbitrary: a well-grounded question costs two or three (describe, query, answer),
 * so eight leaves room for a couple of self-corrections and still stops a loop long before it
 * becomes expensive. The cap exists because a model that misreads a tool error WILL retry the
 * same call forever, and the customer pays per attempt.
 */
const MAX_ITERATIONS = 8;

/**
 * What the loop is doing right now, for a surface that wants to show progress.
 *
 * Only the two things a caller cannot work out for itself mid-run. The answer is NOT an event:
 * the caller already receives it as the return value, and having two sources for one fact is
 * how they end up disagreeing.
 *
 * A `{ type: 'token' }` member can be added here later without changing any existing consumer,
 * which is the reason this is a discriminated union rather than a pair of callbacks.
 */
export type AgentProgress =
  | { type: 'thinking'; iteration: number }
  | { type: 'tool'; invocation: AgentToolInvocation };

export interface AgentRunOptions {
  question: string;
  /** Prior turns, oldest first. Omit for a fresh conversation. */
  history?: LlmMessage[];
  /** Appended after the built-in instructions — used by a surface to say what it is for. */
  systemPrompt?: string;
  tools: AgentTool[];
  context: AgentToolContext;
  maxIterations?: number;
  signal?: AbortSignal;
  /** Called as the run progresses. Optional, and a throwing listener cannot fail the run. */
  onProgress?: (event: AgentProgress) => void;
  /** Offer the provider's own web search. Set from the agent's row; never on by default. */
  webSearch?: boolean;
}

export interface AgentToolInvocation {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  /** The one-line summary when the tool gave one, otherwise the error. */
  summary?: string;
  /** What records the tool read, when it read any. Carried through untouched so the Sources
   *  line under an answer traces back to a tool's own report, not to anything the model said. */
  sources?: AgentToolSource[];
  durationMs: number;
}

export interface AgentRunResult {
  answer: string;
  /** Every tool call made, in order. This is the audit trail and the debugging surface: when an
   *  answer is wrong, the question is always which tools ran and what they returned. */
  invocations: AgentToolInvocation[];
  iterations: number;
  /** True when the cap was hit before the model produced an answer. */
  stoppedEarly: boolean;
  usage: { inputTokens: number; outputTokens: number };
  messages: LlmMessage[];
  /** Web pages read during the run, already listed under the answer. Empty without search. */
  webSources: WebSource[];
}

/**
 * The instructions the model gets before anything else.
 *
 * Short on purpose. Long system prompts full of rules are how you get a model that recites
 * policy instead of answering; the app-specific knowledge belongs in the tools, where it is
 * accurate and cheap, not restated here where it goes stale.
 */
function baseSystemPrompt(appName: string, extra?: string, webSearch?: boolean, tables?: string[]): string {
  const lines = [
    `You are the built-in assistant for ${appName}. You help the person using this app understand and act on its data.`,
    // A model has no clock. Left unsaid, "the last 7 days" is computed from its training cutoff,
    // which silently widens the window to include everything and returns a confidently wrong
    // total — the failure looks like a data problem, not a missing-context one.
    `Today's date is ${new Date().toISOString().slice(0, 10)} (UTC). Use it for every relative date such as "today", "this week" or "the last 30 days"; never assume the current date from memory.`,
    'You do not know this app from memory. Use describe_app to learn its entities and fields, and query_data to read real records. Never invent an entity, a field or a number.',
    // The exact names, always: without them a model guesses ("Role" for RolesAndPermissions) and a
    // read fails. Only what this agent and this person may read (the grounding pack is filtered),
    // and capped, so a large app's list stays a line, not a page.
    ...(tables && tables.length
      ? [
          'The tables you can read, by their exact names: ' +
            tables.slice(0, 60).join(', ') +
            (tables.length > 60 ? ' (and ' + (tables.length - 60) + ' more — use describe_app)' : '') +
            '. Use these names exactly; describe_app gives their fields.',
        ]
      : []),
    'You can only see what this user is allowed to see. If something is missing, say so rather than guessing at what it might contain.',
    // The gate failure that mattered most (2.12, 2026-09-14). Asked about "refunds" in an app with
    // no refund concept, the model tried status REFUNDED, was correctly rejected, read the enum —
    // and then counted CLOSED tickets instead, reporting "0 refunds processed". A confident number
    // about data that does not exist, carrying a Sources line that made it look grounded. Left to
    // itself a model treats the schema as a thesaurus, because answering always scores better than
    // declining. This says plainly that declining IS the answer.
    'If this app does not hold the thing you were asked about, say so and stop. Do not answer with the nearest thing that does exist: in an app with no refunds, a question about refunds is answered by saying there are none recorded — never by counting something else and calling it refunds.',
    // Same sitting: "how many urgent tickets are unresolved" was read as status OPEN only, silently
    // dropping the IN_PROGRESS ones, and answered 1 instead of 3. The reading was defensible; the
    // silence was not. An answer whose interpretation is hidden cannot be checked by the reader.
    'When a word in the question could mean more than one thing here — "open" might be a status, or simply anything not closed — pick the most likely reading and say which one you used, so the number can be checked.',
    // Observed failure, and an expensive one: asked to count one person's tickets, the model
    // looked the person up and — in the SAME turn — issued two counts filtered by the literal
    // string "REPLACE_WITH_USER_ID". Calls made together cannot see each other's results, so
    // both were guaranteed to fail and both were paid for.
    'You may make several tool calls at once, but only when none of them needs a result from another. If one call depends on a value another call will return, wait for that result before making it. Never put a placeholder where a real value belongs.',
    'When a field is reported as withheld, do not speculate about its value.',
    'Answer in plain language. Show the numbers you actually retrieved, and say when a list has been truncated.',
  ];
  if (webSearch) lines.push(...WEB_SEARCH_RULES);
  if (extra) lines.push(extra);
  return lines.join('\n');
}

/** The conversation with every tool call and tool result written out as ordinary text. */
function asPlainTranscript(messages: LlmMessage[]): LlmMessage[] {
  const out: LlmMessage[] = [];
  for (const m of messages) {
    if (m.role === 'tool') {
      out.push({ role: 'user', content: 'Result of ' + m.name + ': ' + m.content });
    } else if (m.role === 'assistant' && m.toolCalls?.length) {
      const asked = m.toolCalls.map((c) => c.name + ' ' + JSON.stringify(c.args ?? {})).join('; ');
      out.push({ role: 'assistant', content: (m.content ? m.content + '\n' : '') + 'I looked up: ' + asked });
    } else {
      out.push(m);
    }
  }
  return out;
}

/** Tool results go back as JSON: it survives nesting, and the model reads it reliably. */
function encodeResult(result: AgentToolResult): string {
  if (result.ok) {
    return JSON.stringify({ ok: true, summary: result.summary, data: result.data });
  }
  return JSON.stringify({ ok: false, error: result.error });
}

export async function runAgent(
  cfg: ResolvedAiConfig,
  options: AgentRunOptions,
): Promise<AgentRunResult> {
  const limit = Math.max(1, options.maxIterations ?? MAX_ITERATIONS);
  const byName = new Map(options.tools.map((tool) => [tool.name, tool]));
  const definitions = options.tools.map(toLlmToolDefinition);

  const messages: LlmMessage[] = [
    {
      role: 'system',
      content: baseSystemPrompt(
        options.context.grounding.appName,
        options.systemPrompt,
        options.webSearch,
        (options.context.grounding.schema?.entities ?? []).map((e) => e.name),
      ),
    },
    ...(options.history ?? []),
    { role: 'user', content: options.question },
  ];

  const invocations: AgentToolInvocation[] = [];
  const usage = { inputTokens: 0, outputTokens: 0 };
  let iterations = 0;
  let answer = '';
  let webSources: WebSource[] = [];

  // Progress is a courtesy to the UI, never a reason to lose an answer the customer paid for.
  // A listener that throws — a closed HTTP connection is the obvious way — is ignored.
  const report = (event: AgentProgress) => {
    try {
      options.onProgress?.(event);
    } catch {
      /* ignore */
    }
  };

  while (iterations < limit) {
    iterations += 1;
    report({ type: 'thinking', iteration: iterations });

    const reply: LlmReply = await callLlm(cfg, {
      messages,
      tools: definitions,
      signal: options.signal,
      webSearch: options.webSearch,
    });
    usage.inputTokens += reply.usage?.inputTokens ?? 0;
    usage.outputTokens += reply.usage?.outputTokens ?? 0;
    webSources = dedupeSources([...webSources, ...(reply.webSources ?? [])]);

    if (!reply.toolCalls.length) {
      answer = appendWebSources(reply.content, webSources);
      messages.push({ role: 'assistant', content: answer });
      return { answer, invocations, iterations, stoppedEarly: false, usage, messages, webSources };
    }

    // The assistant turn must be recorded BEFORE the results, and must include the tool calls:
    // both wire formats reject a tool result that does not follow the call it answers.
    messages.push({ role: 'assistant', content: reply.content, toolCalls: reply.toolCalls });

    for (const call of reply.toolCalls) {
      const result = await runOne(call, byName, options.context);
      invocations.push(result.invocation);
      report({ type: 'tool', invocation: result.invocation });
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        name: call.name,
        content: result.encoded,
      });
    }
  }

  // Out of iterations with tools still pending. Rather than return nothing, ask once more with
  // no tools offered: the model has everything it gathered and is forced to summarise it, which
  // is almost always a more useful answer than "I gave up".
  report({ type: 'thinking', iteration: iterations + 1 });
  const final = await callLlm(cfg, {
    // As plain text: offered no tools but shown a tool-call exchange, some models (Groq's gpt-oss)
    // carry on calling tools, and the provider refuses the request ("Tool choice is none, but model
    // called a tool"). With the lookups written out as text there is nothing to continue.
    messages: [
      ...asPlainTranscript(messages),
      {
        role: 'user',
        content: 'Stop using tools and answer now with what you have. Say plainly if it is incomplete.',
      },
    ],
    signal: options.signal,
    webSearch: options.webSearch,
  });
  webSources = dedupeSources([...webSources, ...(final.webSources ?? [])]);
  answer = appendWebSources(final.content, webSources);
  usage.inputTokens += final.usage?.inputTokens ?? 0;
  usage.outputTokens += final.usage?.outputTokens ?? 0;
  messages.push({ role: 'assistant', content: answer });

  return { answer, invocations, iterations, stoppedEarly: true, usage, messages, webSources };
}

async function runOne(
  call: LlmToolCall,
  byName: Map<string, AgentTool>,
  ctx: AgentToolContext,
): Promise<{ invocation: AgentToolInvocation; encoded: string }> {
  const startedAt = Date.now();

  const finish = (result: AgentToolResult): { invocation: AgentToolInvocation; encoded: string } => ({
    invocation: {
      name: call.name,
      args: call.args,
      ok: result.ok,
      summary: result.ok ? result.summary : result.error,
      // Only a successful call has sources. A failed one read nothing, and letting a failure
      // contribute to the Sources line would credit the answer with data it never saw.
      sources: result.ok ? result.sources : undefined,
      durationMs: Date.now() - startedAt,
    },
    encoded: encodeResult(result),
  });

  if (call.parseError) {
    return finish({ ok: false, error: `${call.parseError} Send the arguments again as a JSON object.` });
  }

  const tool = byName.get(call.name);
  if (!tool) {
    return finish({
      ok: false,
      error: `There is no tool called "${call.name}". Available: ${[...byName.keys()].join(', ')}.`,
    });
  }

  // Only read tools run here. A 'confirm' tool needs a human to approve THIS call with THESE
  // arguments, and there is nobody to ask inside the loop — the surface that started the run has
  // to handle it. Refusing is the safe default; silently running it is not.
  if (tool.trust !== 'read') {
    return finish({
      ok: false,
      error: `"${tool.name}" changes data and needs approval, which is not available in this context.`,
    });
  }

  try {
    return finish(await tool.execute(call.args, ctx));
  } catch (err) {
    // A thrown tool is a bug, not a bad question — but ending the whole run over it would lose
    // the work already done, so it comes back as a failed result the model can route around.
    return finish({ ok: false, error: `"${tool.name}" failed: ${(err as Error).message}` });
  }
}
