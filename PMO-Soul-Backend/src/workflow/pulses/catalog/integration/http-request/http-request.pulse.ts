import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'integration.httpRequest',
  category: 'integration',
  label: 'HTTP Request',
  description: 'Calls an external HTTP endpoint with templated headers and body, and captures the response.',
  icon: 'globe',
  async: 'always',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'method',
    label: 'Method',
    type: 'select',
    default: 'GET',
    options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m })),
  },
  { key: 'url', label: 'URL', type: 'string', required: true, help: 'Supports {{variables}}.' },
  { key: 'headers', label: 'Headers', type: 'json', default: {}, help: 'Object of header name → value.' },
  { key: 'body', label: 'Body', type: 'json', help: 'Request body (for POST/PUT/PATCH).' },
  { key: 'as', label: 'Store response as', type: 'string', default: 'response' },
];

export const io: PulseIO = {
  inputs: [{ key: 'url', label: 'Target URL' }],
  outputs: [
    { key: 'status', label: 'HTTP status code' },
    { key: 'response', label: 'Response body' },
  ],
};
