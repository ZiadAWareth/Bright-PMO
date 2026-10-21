import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'trigger.webhook',
  category: 'trigger',
  label: 'On Webhook',
  description: 'Starts the workflow from an inbound HTTP call to a unique webhook URL.',
  icon: 'webhook',
  async: 'never',
  hasSideEffects: false,
  // The CALL (webhook.controller): method, headers, query and body. Never a table row: a test
  // uses the last real call, or the example body the designer typed.
  triggerInput: { source: 'call', event: 'webhook' },
};

export const config: PulseFieldDescriptor[] = [
  { key: 'path', label: 'Path', type: 'string', required: true, widget: 'webhookPath', help: 'e.g. new-order' },
  {
    key: 'method',
    label: 'Method',
    type: 'select',
    default: 'POST',
    options: ['POST', 'GET', 'PUT'].map((m) => ({ value: m, label: m })),
  },
  { key: 'secret', label: 'Secret', type: 'string', widget: 'webhookSecret', help: 'Optional. Callers send it in the X-Webhook-Secret header.' },
  // What callers send is not a setting: it is the trigger's INPUT, shown in the step's Input pane
  // (the last real call, or an example body typed there, kept as config._sample.payload).
];

export const io: PulseIO = {
  inputs: [],
  outputs: [
    { key: 'payload', label: 'Request body' },
    { key: 'headers', label: 'Request headers' },
    { key: 'query', label: 'Query string (without ?secret=)' },
    { key: 'method', label: 'HTTP method (POST, GET or PUT)' },
  ],
};
