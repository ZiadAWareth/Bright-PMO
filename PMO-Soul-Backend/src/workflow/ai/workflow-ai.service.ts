import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigurableLLMProvider, ChatMessage } from './llm-provider';
import { AiNotConfiguredError } from '../../agent/ai-config';
import { LlmRequestError } from '../../agent/llm.client';

/**
 * A failed model call, as the person in the panel should hear it. These used to escape as plain
 * errors, which Nest turns into a bare "Internal server error": no key yet, a rejected key and a
 * provider's rate limit all looked the same, and none said what to do.
 */
function aiCallError(err: unknown): Error {
  if (err instanceof AiNotConfiguredError) {
    return new ServiceUnavailableException({ error: 'AiNotConfigured', message: err.message });
  }
  if (err instanceof LlmRequestError) {
    return new BadGatewayException({ error: 'AiProviderError', message: err.message });
  }
  // Anything else on the way to the model is still a reason the person can read, never a bare
  // "Internal server error" — the message that hid this failure from everyone who saw it.
  return new BadGatewayException({
    error: 'AiAssistantFailed',
    message: 'The workflow assistant could not get an answer: ' + ((err as Error)?.message || String(err)),
  });
}
import {
  WORKFLOW_AI_SYSTEM_PROMPT,
  WORKFLOW_AI_CHAT_PROMPT,
  buildAgentContext,
  buildEntityContext,
  buildPulseCatalogContext,
  buildRoleContext,
} from './workflow-ai.prompts';
import { validateAiWorkflow, normalizeAiWorkflow } from './workflow-ai.rules';
import { buildPulseRegistry } from '../pulses/catalog';
import { publicAgentSummary } from '../../agent/named-agent.rules';
import type { PublicAgent } from '../../agent/named-agent.rules';

export interface AIResponse {
  intent: 'generate' | 'clarify' | 'modify';
  /** The assistant's name for the workflow; the modeler fills the header with it. */
  name?: string;
  /** The model the workflow is bound to (Target entity) — an update/create/delete trigger has no
   *  entity of its own, so without this the header stayed blank after Apply. */
  entity?: string;
  message: string;
  questions?: string[];
  workflow?: { nodes: any[]; edges: any[] };
  validation?: string[];
}

interface ChatRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentWorkflow?: { nodes: any[]; edges: any[] } | null;
}

/**
 * Pull the JSON object out of a reply that may not be only JSON.
 *
 * `responseFormat: 'json'` is a hint the OpenAI wire format honours and Anthropic does not, and
 * the AI Provider page lets an administrator choose either. Before that page fed this assistant it
 * was hardwired to Groq, so a bare JSON.parse was safe; it is not any more. Without this, choosing
 * Anthropic produced an assistant that answered every message with a wall of raw JSON and never
 * offered "Apply to canvas" — technically not a crash, which is what would have made it hard to
 * report.
 *
 * Exported for the generator's tests, which is also why it takes no dependencies.
 */
export function extractJsonObject(raw: string): unknown | null {
  const text = (raw || '').trim();
  if (!text) return null;

  // Cheap path: it really is just JSON.
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }

  // A fenced block, with or without a language tag.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* fall through */
    }
  }

  // Prose either side of a bare object. Braces are counted rather than regex-matched so that a
  // nested workflow definition is not truncated at its first inner closing brace. Braces inside
  // strings are skipped, or a node label containing "}" would end the object early.
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Internal tables the assistant must not treat as business entities — the designer's list. */
const INTERNAL_MODELS = new Set([
  'Workflow', 'WorkflowVersion', 'WorkflowRun', 'WorkflowRunStep',
  'Notification', 'NotificationDelivery', 'Organization', 'BusinessUnit',
  // Encrypted connection values; a Connector step names a connection by id instead.
  'ConnectorConnection',
  // Dynamic Dashboards plumbing (encrypted engine key, embed tokens), not business entities.
  'DashboardEngineConnection', 'DashboardEngineOrg', 'EmbeddedDashboard',
]);

@Injectable()
export class WorkflowAIService {
  private readonly logger = new Logger(WorkflowAIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: ConfigurableLLMProvider,
  ) {}

  async chat(request: ChatRequest): Promise<AIResponse> {
    const entities = this.listEntities();
    const agents = await this.listAgents();
    const entityContext = buildEntityContext(entities);
    const roleNames = await this.listRoleNames();
    const roleContext = buildRoleContext((roleNames ?? []).map((name) => ({ name })));
    const agentContext = buildAgentContext(agents);
    // Straight from the live registry: the AI can only ever be taught the pulses
    // this app actually has, and a newly added pulse teaches itself.
    const registry = buildPulseRegistry().all();
    const pulseCatalog = buildPulseCatalogContext(registry as any);
    const appName = process.env.APP_NAME || 'this application';
    const currentWorkflowStr = request.currentWorkflow
      ? JSON.stringify(request.currentWorkflow, null, 2)
      : 'None (creating new workflow)';

    const systemPrompt = WORKFLOW_AI_CHAT_PROMPT
      .replace('{{appName}}', appName)
      .replace('{{pulseCatalog}}', pulseCatalog)
      .replace('{{entityContext}}', entityContext)
      .replace('{{roleContext}}', roleContext)
      .replace('{{agentContext}}', agentContext)
      .replace('{{currentWorkflow}}', currentWorkflowStr);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: WORKFLOW_AI_SYSTEM_PROMPT.replace('{{appName}}', appName) + '\n\n' + systemPrompt,
      },
    ];

    if (request.history) {
      for (const msg of request.history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: request.message });

    let response: string;
    try {
      response = await this.llm.chat(messages, {
        temperature: 0.3,
        // Room for the workflow JSON — and for a reasoning model's thinking before it (gpt-oss,
        // gpt-5). A provider that counts this against a per-minute limit and finds the request too
        // large says so with its numbers, and the client shrinks it to fit (llm.client).
        maxTokens: 4096,
        responseFormat: 'json',
      });
    } catch (err) {
      this.logger.warn('Workflow assistant call failed: ' + (err as Error)?.message);
      throw aiCallError(err);
    }

    const parsed = extractJsonObject(response) as AIResponse | null;
    if (!parsed || typeof parsed !== 'object') {
      this.logger.warn('Could not find a JSON object in the model reply; showing it as prose');
      return { intent: 'clarify', message: response, questions: [] };
    }
    // An empty plan is not a plan. A "clarify" answer never carries one, and a generate/modify
    // that came back with no steps becomes a plain "I couldn't build this", instead of a card
    // offering to apply nothing.
    const stepCount = Array.isArray((parsed.workflow as any)?.nodes) ? (parsed.workflow as any).nodes.length : 0;
    if (parsed.intent === 'clarify' || stepCount === 0) {
      if (parsed.intent !== 'clarify') {
        parsed.intent = 'clarify';
        parsed.message =
          (parsed.message ? parsed.message + '\n\n' : '') +
          "I couldn't build a workflow from this. Tell me which record it should start from and what should happen.";
      }
      delete (parsed as any).workflow;
      delete (parsed as any).validation;
      return parsed;
    }
    if (parsed.workflow) {
      parsed.workflow = normalizeAiWorkflow(parsed.workflow, registry as any) as any;
      // The same rules Save applies (graph-rules.ts), so the panel never calls clean what the
      // designer will refuse — plus the agent check only the assistant can get wrong.
      parsed.validation = validateAiWorkflow(parsed.workflow, {
        pulses: registry as any,
        entities: entities.map((e) => e.name),
        agentIds: agents.map((a) => a.id),
        roles: roleNames ?? undefined,
      });
    }
    return parsed;
  }

  /**
   * Entity names + fields from the running Prisma client — the same source and the same
   * exclusions as the designer's catalog, so the two lists agree. The previous information_schema scan
   * returned table names (which differ from model names under @@map) and internal tables, and
   * the validator then matched entities by substring.
   */
  private listEntities(): Array<{ name: string; fields: string[] }> {
    try {
      const dmmf: any = (this.prisma as any)._runtimeDataModel?.models ?? {};
      return Object.keys(dmmf)
        .filter((name) => !INTERNAL_MODELS.has(name))
        .map((name) => ({
          name,
          fields: (dmmf[name].fields ?? [])
            .filter((f: any) => f.kind === 'scalar' || f.kind === 'enum')
            .map((f: any) => f.name),
        }));
    } catch (err) {
      this.logger.warn('Failed to read the schema: ' + (err as Error).message);
      return [];
    }
  }

  /** The Agents page rows, as much of them as a consumer may see (id, name, role). */
  private async listAgents(): Promise<PublicAgent[]> {
    try {
      const rows = await (this.prisma as any).agent.findMany({
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      });
      return (rows ?? []).map((r: any) => publicAgentSummary(r));
    } catch (err) {
      this.logger.warn('Failed to read agents: ' + (err as Error).message);
      return [];
    }
  }

  /**
   * The app's OWN roles. Hardcoding a role list is how a generated app ends up
   * telling its agent to email a role name this deployment never defined.
   */
  /** The app's OWN role names; null when they cannot be read, so the role check is skipped, not failed. */
  private async listRoleNames(): Promise<string[] | null> {
    try {
      const rows = await (this.prisma as any).rolesAndPermissions.findMany({
        select: { role: true },
      });
      return (rows ?? []).map((r: any) => String(r.role ?? '').trim()).filter((n: string) => n);
    } catch (err) {
      this.logger.warn('Failed to read roles: ' + (err as Error).message);
      return null;
    }
  }
}
