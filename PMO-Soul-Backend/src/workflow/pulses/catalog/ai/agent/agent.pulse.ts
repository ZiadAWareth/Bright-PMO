import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

/**
 * ONE node type for every agent.
 *
 * An agent is a configuration ROW, not a node type: the admin writes its job description, its
 * model and its limits on the Agents page, then drops this step on the canvas and picks it from
 * a list. A node type per agent would mean a palette that grows with the customer's imagination
 * and a code change for every new agent — which is the exact "no writing code" promise this is
 * here to keep.
 */
export const meta: PulseMeta = {
  type: 'ai.agent',
  category: 'ai',
  label: 'AI Agent',
  description: 'Asks a configured agent a question about this app and returns a typed answer.',
  icon: 'sparkles',
  async: 'always',
  // Read-only in Phase 3 — the agent cannot write, and the workflow does any writing through
  // the create/update/delete steps that already exist. Marked as side-effecting anyway: it
  // spends money and calls an outside service, so a retry is not free and the wrapper must
  // treat it with the same care as a payment.
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'agentId',
    label: 'Agent',
    type: 'string',
    required: true,
    widget: 'agentPicker',
    help: 'Which configured agent to ask. Manage them on the Agents page.',
  },
  {
    key: 'task',
    label: 'Task',
    type: 'string',
    required: true,
    help: 'What to ask the agent. Supports {{variables}}, e.g. "Summarise ticket {{id}}".',
  },
  {
    key: 'runAs',
    label: 'Run as',
    type: 'string',
    // A list of people, not a text box. This one field decides whose permissions the agent works
    // under, and a mistyped id picks a real, different person without any error.
    widget: 'userPicker',
    help:
      'Whose permissions the agent works under. The agent can only ever see LESS than this ' +
      'person can. Leave blank when a person triggers the workflow; REQUIRED for scheduled and ' +
      'webhook workflows, which have no triggering user.',
  },
  {
    key: 'webSearch',
    label: 'Web search',
    type: 'select',
    options: [{ value: 'inherit', label: 'Inherit from the agent' }, { value: 'off', label: 'Off for this step' }],
    default: 'inherit',
    help:
      'Whether this step may use the agent\u2019s web search. "inherit" follows the switch on the ' +
      'Agents page; "off" disables it for this step only. A step can never turn on what the agent ' +
      'is not allowed.',
  },
  {
    key: 'maxIterations',
    label: 'Max model calls',
    type: 'number',
    help: 'Optional cap for this step. Cannot raise the agent\u2019s own limit, only lower it.',
  },
  {
    key: 'allowAutoDecision',
    label: 'Allow automatic decision',
    type: 'boolean',
    default: false,
    help:
      'Off: a gateway may only branch on this agent\u2019s answer after a User Task has shown it to a ' +
      'person (activation is refused otherwise). On: the answer may decide a path by itself. Use ' +
      'sparingly, and only for low-stakes routing.',
  },
  {
    key: 'outputSchema',
    label: 'Answer shape (this step)',
    type: 'json',
    help:
      'Optional JSON schema for this step\u2019s answer. When set it replaces the agent\u2019s own ' +
      'output schema for this call only, so one agent can answer different steps in different ' +
      'shapes. Leave empty to use the schema from the Agents page.',
  },
  {
    key: 'as',
    label: 'Store result as',
    type: 'string',
    default: 'agent',
    help: 'Variable holding { answer, result, toolsUsed }. Branch on {{agent.result.<field>}}.',
  },
];

export const io: PulseIO = {
  inputs: [
    { key: 'agentId', label: 'Agent' },
    { key: 'task', label: 'Task', description: 'The question, with variables resolved.' },
  ],
  outputs: [
    {
      key: 'agent',
      label: 'Agent result',
      description:
        'An object: `answer` (prose), `result` (the typed object, when the agent declares an ' +
        'output schema) and `toolsUsed` (what it actually read). Gateways branch on `result`.',
    },
    { key: 'usage', label: 'Tokens spent', description: 'calls, inputTokens and outputTokens for this call.' },
  ],
};
