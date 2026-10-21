import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'data.setVariable',
  category: 'data',
  label: 'Set Variable',
  description: 'Assigns a value (literal or {{template}}) to a named workflow variable.',
  icon: 'variable',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'name', label: 'Variable name', type: 'string', required: true },
  { key: 'value', label: 'Value', type: 'string', help: 'Literal, or a {{variable}} reference.' },
];

export const io: PulseIO = {
  inputs: [{ key: 'value', label: 'Value to assign' }],
  outputs: [{ key: '{name}', label: 'The named variable', description: 'Written under the configured name.' }],
};
