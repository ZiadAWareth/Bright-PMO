import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.switch',
  category: 'control',
  label: 'Switch / Router',
  description: 'Routes to the branch whose case matches a value; falls through to a default.',
  icon: 'route',
  async: 'never',
  hasSideEffects: false,
  dynamicBranches: 'cases',
};

export const config: PulseFieldDescriptor[] = [
  { key: 'value', label: 'Value', type: 'expression', required: true, help: 'e.g. {{stage}}' },
  { key: 'cases', label: 'Cases', type: 'json', default: [], help: 'Array of { "equals": "...", "branch": "..." }.' },
  { key: 'default', label: 'Default branch', type: 'string', required: true, default: 'default' },
];

export const io: PulseIO = {
  inputs: [{ key: 'value', label: 'Value to match' }],
  outputs: [],
};
