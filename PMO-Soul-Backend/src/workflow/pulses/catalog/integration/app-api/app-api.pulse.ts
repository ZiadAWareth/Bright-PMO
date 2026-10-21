import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'integration.appApi',
  category: 'integration',
  label: 'Call App API',
  description: "Calls one of this app's own APIs — pick the endpoint, map the body.",
  icon: 'server',
  async: 'always',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'endpoint', label: 'Endpoint', type: 'string', required: true, widget: 'apiEndpoint', help: 'Pick an app API to call.' },
  { key: 'body', label: 'Body', type: 'json', help: 'Request body — map fields from previous steps.' },
  { key: 'query', label: 'Query params', type: 'json' },
  { key: 'as', label: 'Store response as', type: 'string', default: 'response' },
];

export const io: PulseIO = {
  inputs: [{ key: 'body', label: 'Request body' }],
  outputs: [
    { key: 'status', label: 'HTTP status code' },
    { key: 'response', label: 'Response body' },
  ],
};
