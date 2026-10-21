import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.inclusiveGateway',
  category: 'control',
  label: 'Inclusive Gateway (OR)',
  description: 'Activates every branch whose condition is true (zero, one, or many).',
  icon: 'git-fork',
  async: 'never',
  hasSideEffects: false,
  dynamicBranches: 'cases',
};

export const config: PulseFieldDescriptor[] = [
  { key: 'cases', label: 'Branches', type: 'json', default: [], help: 'Array of { "when": "<expression>", "branch": "..." }.', rawTemplates: true },
  { key: 'default', label: 'Default branch', type: 'string', help: 'Taken only when no case matches.' },
];

export const io: PulseIO = {
  inputs: [{ key: 'cases', label: 'Branch conditions' }],
  outputs: [],
};
