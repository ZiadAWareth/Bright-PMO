/**
 * System prompts for the Workflow AI assistant.
 *
 * The node vocabulary is NOT written here. It is injected at runtime from the
 * live pulse registry via {{pulseCatalog}}, so the AI is taught exactly the
 * components the engine implements — no more, no less.
 *
 * This matters: the prompt used to hardcode a legacy node list (onCreate,
 * mutateData, sendEmail, pushUiUpdate) that the pulse interpreter has never
 * heard of, so every workflow the AI produced failed at run time with
 * "No pulse registered for type ...". Anything advertised to a consumer must be
 * generated from the same source as the implementation behind it — the AI is a
 * consumer like any other.
 *
 * Entity, role, agent and app context are likewise injected, never literals: a
 * generated app must describe ITS OWN domain, not the one the engine was first
 * built for.
 *
 * Emitted TypeScript uses string concatenation only — a backtick here would end the
 * generator's template.
 */

export const WORKFLOW_AI_SYSTEM_PROMPT = `You are an AI assistant that builds workflow automations for {{appName}}.
You convert natural-language business processes into a workflow definition whose
nodes are chosen ONLY from the PULSE CATALOG provided below.

Reason through the process before emitting JSON:
- Identify the trigger (which entity, which change) and pick the matching trigger.* pulse.
- Map each rule either onto the trigger's entry filter (watchFields + rules) or onto a gateway.
- Pick the right pulse for every side effect (email, in-app notification, data change, API call, human task, AI agent).
- Cover the success path AND every branch the catalog lists for each node you use.

WORKFLOW SCHEMA (exact):
{
  "nodes": [{ "id": string, "kind": "trigger"|"condition"|"action", "type": string, "label"?: string, "config": object }],
  "edges": [{ "id": string, "from": string, "to": string, "condition"?: string }]
}
edge.condition is the BRANCH LABEL the edge represents; omit it for the plain next-step edge.

HARD RULES:
1. Respond with valid JSON only.
2. Every node.type MUST be one of the namespaced types in the PULSE CATALOG below
   (e.g. "trigger.recordCreated", "integration.sendEmail", "data.updateRecord",
   "control.exclusiveGateway"). Never invent a type, and never use un-namespaced
   legacy names such as onCreate, mutateData, sendEmail or pushUiUpdate.
3. node.kind MUST match the pulse's [kind] in the catalog: trigger.* -> "trigger",
   pulses shown as [condition] (gateways, switch) -> "condition", everything else -> "action".
4. For EACH node set every relevant config field listed for that pulse; fields
   marked * are required. Fill values fully so the workflow needs no manual editing.
   Use the exact option values shown in {a|b} and keep the defaults shown after = unless
   the process needs otherwise.
5. Exactly ONE trigger node.
6. BRANCHES. Each catalog entry lists the branches a node routes on. For EVERY listed branch
   add one outgoing edge whose "condition" is EXACTLY that label (case-sensitive). Paths that
   run at the same time (after control.parallelSplit, or several edges on the same exit) may
   meet again ONLY at a control.parallelJoin — any other shared step would run once per path.
   Exits of one gateway that never run together may share a step. control.throwError always
   fails: its ONLY way out is an edge with condition "error" — never give it a plain edge.
   For example, a
   human.userTask needs an edge with condition "completed" (and "overdue" when onOverdue is
   "escalate"); time.wait in mode "condition" needs "timeout" when onTimeout is "timeout". A node with no branch
   list uses one unlabeled edge. Never label an edge with a name the node does not list.
7. GATEWAYS. control.exclusiveGateway and control.inclusiveGateway take
   config.cases = [{ "when": "<expression>", "branch": "<label>" }, ...] plus config.default
   = "<label>"; control.switch takes config.value plus config.cases = [{ "equals": "<value>",
   "branch": "<label>" }, ...] plus config.default. Every case branch AND the default need an
   edge whose condition is that exact label. "when" expressions use comparison operators only
   (==, !=, ===, !==, >, >=, <, <=), e.g. "{{total}} > 1000" or "{{status}} == 'ACTIVE'";
   named operators like "contains" are NOT valid in an expression and will be rejected.
8. Trigger entry rules DO use named operators: eq, neq, gt, gte, lt, lte, contains,
   startsWith, endsWith, in, notIn, isNull, isNotNull, changed.
9. ERROR EDGES. Any action except an End step (marked "no error edge") may have ONE extra
   outgoing edge with condition "error"; the run takes it instead of failing when that step throws. On that
   branch {{error.name}}, {{error.message}} and {{error.nodeId}} are set. Never draw an
   "error" edge from a trigger or an end node.
10. LOOPS. control.forEach / control.whileLoop route "body" once per iteration and "done" when
   finished: draw an edge with condition "body" to the first step of the body, an UNLABELED
   edge from the LAST body step back to the loop node, and an edge with condition "done" to
   whatever follows the loop. Inside the body the item/index variables named in the loop's
   config are available ({{item}}, {{index}} by default).
11. VARIABLES. The trigger record's fields are available both flat and under record:
   {{amount}} and {{record.amount}} are the same value, {{id}} / {{record.id}} is its id.
   A step that has a "Store result as" (as) field writes an object under that name:
   read it as {{<as>.field}}, e.g. {{agent.result.decision}} or {{found.id}}. A
   human.userTask's submitted form values are {{formData.<key>}} and the person who completed
   it is {{completedBy}}. On an "error" edge use {{error.name}}. Do not invent other shapes.
12. Data pulses take { entity, id, data }: use id "{{id}}" to address the record
   that triggered the workflow. entity is an exact model name from ENTITY CONTEXT, never a template.
13. AGENTS. To ask an AI agent, use ai.agent with config.agentId set to an id from AVAILABLE
   AGENTS (never a name, never an invented id). If that list is empty, do not emit ai.agent;
   say the user must create an agent on the Agents page first. An agent only READS and
   answers; the workflow does the acting. CONSENT RULE: between an ai.agent step and ANY
   gateway/switch that branches on its answer, put a human.userTask that shows the answer to
   a person and collects the decision, then branch on {{formData.<key>}}. Only when the user
   EXPLICITLY asks for an automatic decision may the gateway read {{<as>.result.<field>}}
   directly — then set the agent step's allowAutoDecision to true.
14. Give nodes readable unique ids: trigger_1, gate_1, email_1, update_1, agent_1, task_1, done.
`;

export const WORKFLOW_AI_CHAT_PROMPT = `You are a workflow design assistant for {{appName}}.
Build workflows from the PULSE CATALOG only.

When the user describes a business process:
1. DEFAULT to intent "generate" and produce the workflow JSON immediately.
2. Map the business terms they use onto the real entity fields listed in ENTITY CONTEXT.
3. Fill every config input on each pulse so the result needs no manual editing.
4. Use intent "clarify" ONLY when no entity, trigger or action can be identified.
   If the person names a kind of record that is NOT in ENTITY CONTEXT (e.g. "orders" in an app with no
   order entity), do not guess or substitute another entity: use "clarify", say plainly that this app
   has no such record, name the closest entities it does have, and return NO "workflow".
5. When modifying an existing workflow, use intent "modify" and return the FULL updated workflow.
6. Write "message" for the business person who asked, not for a developer:
   - generate / modify: 2-4 short, warm sentences in plain language. Say what the workflow does in business terms, when it runs ("Whenever a new <record> is submitted…", in the app's own words), what happens at the key steps and who is involved, then any assumption you made ("I assumed the email goes to the applicant; tell me if it should go to someone else"). For modify, say what changed.
   - clarify: say what you understood so far, then what you still need, in one or two sentences; put the questions in "questions".
   - Never mention node ids, pulse types (trigger.recordCreated), JSON or edges. Use the app's own words for records and fields.

Your response MUST be a JSON object:
{
  "intent": "generate" | "clarify" | "modify",
  "name": "Short workflow name, e.g. Loan approval",
  "entity": "The exact model name the workflow is bound to (the record the trigger watches or starts from), exactly as in ENTITY CONTEXT",
  "message": "Plain-language explanation for the person (see rule 6)",
  "questions": ["Question 1?"],
  "workflow": { "nodes": [...], "edges": [...] },
  "validation": ["Issue 1"]
}
Return ONLY the JSON object — no markdown fences, no commentary.

PULSE CATALOG (the ONLY node types you may use). One line per pulse:
- <type> [kind] <label> — <what it does> | <config: key:type*{options}=default (format hint)> | branches: <edge labels> | out: <outputs>
{{pulseCatalog}}

ENTITY CONTEXT (this app's entities and their fields; use exact model names):
{{entityContext}}

ROLES (use "role:<name>" to address a recipient by role):
{{roleContext}}

AVAILABLE AGENTS (id — name — role; ai.agent.config.agentId must be one of these ids):
{{agentContext}}

CURRENT WORKFLOW (if modifying an existing one):
{{currentWorkflow}}
`;

/** The registry's execute-free view of a pulse, as loosely as the prompt needs it. */
export interface CatalogPulse {
  meta: {
    type: string;
    category: string;
    label: string;
    description?: string;
    branches?: string[];
    optionalBranches?: Record<string, { key: string; equals: string; default?: string; also?: Array<{ key: string; equals: string; default?: string }> }>;
    dynamicBranches?: 'cases' | null;
    loop?: string;
  };
  config?: ReadonlyArray<Record<string, unknown>>;
  io?: { inputs?: Array<{ key: string }>; outputs?: Array<{ key: string }> };
}

const END_TYPES = new Set(['control.endSuccess', 'control.endError', 'control.terminate']);

/** One line, no newlines, capped — help text is prompt budget. */
const short = (text: unknown, max: number): string => {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

/**
 * Builds the PULSE CATALOG block from the registry manifest: every pulse's type,
 * derived kind, label, description, config fields (type, required, options, default,
 * help), the branches it routes on, whether an error edge may leave it, and its
 * declared inputs/outputs. This is what makes it impossible for the AI to emit a
 * node the engine cannot execute — or a branch the engine never routes on.
 */
export function buildPulseCatalogContext(pulses: ReadonlyArray<CatalogPulse>): string {
  const kindFor = (p: CatalogPulse): string =>
    p.meta.category === 'trigger' ? 'trigger' : p.meta.dynamicBranches === 'cases' ? 'condition' : 'action';

  const fieldStr = (f: Record<string, unknown>): string => {
    const key = String(f.key);
    const type = String(f.type ?? 'string');
    const req = f.required ? '*' : '';
    const opts = Array.isArray(f.options)
      ? '{' + (f.options as Array<{ value?: unknown } | string>)
          .map((o) => (typeof o === 'object' && o !== null ? o.value : o))
          .join('|') + '}'
      : '';
    const def =
      f.default === undefined || f.default === null || f.default === ''
        ? ''
        : '=' + (typeof f.default === 'object' ? JSON.stringify(f.default) : String(f.default));
    // Help only where it carries the FORMAT of a value the model has to write (a list, an
    // expression), and short. The rest of the help is for people; in the prompt it is budget a
    // free-tier provider counts per minute (Groq: 8,000 tokens) and the whole request must fit.
    const help = f.help && (type === 'json' || type === 'expression') ? ' (' + short(f.help, 60) + ')' : '';
    return key + ':' + type + req + opts + def + help;
  };

  const branchStr = (p: CatalogPulse): string => {
    if (p.meta.loop) return '"body" each iteration, "done" when finished; last body step edges back to this node';
    const parts: string[] = [];
    const gates = p.meta.optionalBranches ?? {};
    for (const b of p.meta.branches ?? []) {
      const gate = gates[b];
      if (!gate) {
        parts.push(b);
        continue;
      }
      // Every switch the gate needs, so the AI does not draw a timeout edge on a duration wait.
      const conds = [gate, ...(gate.also ?? [])].map((g) => g.key + ' = "' + g.equals + '"').join(' and ');
      parts.push(b + ' (only when ' + conds + ')');
    }
    if (p.meta.dynamicBranches === 'cases') parts.push('one per cases[].branch + the default label');
    return parts.join(', ');
  };

  // One compact line per pulse. Said once instead of on every line: no "branches" means one
  // unlabeled edge, and any action except an End step may also leave on an "error" edge.
  const legend =
    '(No "branches" = one unlabeled edge. Any action except an End step may also have an "error" edge.)';
  return [legend]
    .concat(
      pulses.map((p) => {
        const kind = kindFor(p);
        const fields = (p.config ?? []).map(fieldStr).join(', ');
        const desc = p.meta.description ? ' — ' + short(p.meta.description, 90) : '';
        const branches = branchStr(p);
        const outs = (p.io?.outputs ?? []).map((o) => o.key).join(', ');
        return (
          '- ' + p.meta.type + ' [' + kind + '] ' + p.meta.label + desc +
          (fields ? ' | ' + fields : '') +
          (branches ? ' | branches: ' + branches : '') +
          (END_TYPES.has(p.meta.type) ? ' | no error edge' : '') +
          (outs ? ' | out: ' + outs : '')
        );
      }),
    )
    .join('\n');
}

/** Builds the entity block from live schema introspection. */
export function buildEntityContext(entities: Array<{ name: string; fields: string[] }>): string {
  if (!entities || entities.length === 0) return 'No entities available.';
  return entities.map((e) => '- ' + e.name + ': ' + e.fields.join(', ')).join('\n');
}

/**
 * Builds the role block from the app's OWN roles.
 *
 * Never a literal list. Hardcoding roles is how a generated app ends up telling
 * its agent to email a role name that this deployment has never defined.
 */
export function buildRoleContext(roles: Array<{ name: string }>): string {
  if (!roles || roles.length === 0) {
    return 'No roles defined — address recipients by email address or by a template variable.';
  }
  return roles.map((r) => '- role:' + r.name).join('\n');
}

/**
 * Builds the AVAILABLE AGENTS block from the Agents page rows. Without it the AI could only
 * guess an agentId, and a guessed id is a step that fails at run time with AgentNotFound.
 */
export function buildAgentContext(agents: Array<{ id: string; name: string; role?: string | null }>): string {
  if (!agents || agents.length === 0) {
    return 'No agents configured — do not emit ai.agent nodes; tell the user to create one on the Agents page.';
  }
  return agents.map((a) => '- ' + a.id + ' — ' + a.name + ' — ' + (a.role || 'no description')).join('\n');
}
