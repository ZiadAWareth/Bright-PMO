import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.exclusiveGateway',
  category: 'control',
  label: 'Exclusive Gateway (XOR)',
  description: 'Evaluates ordered branch conditions and activates the first true branch; falls through to a mandatory default.',
  icon: 'git-branch',
  async: 'never',
  hasSideEffects: false,
  dynamicBranches: 'cases',
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'cases',
    label: 'Branches',
    type: 'json',
    help: 'Ordered list of { "when": "<expression>", "branch": "<edge label>" }.',
    default: [],
    rawTemplates: true,
  },
  { key: 'default', label: 'Default branch', type: 'string', required: true, default: 'default' },
];

export const io: PulseIO = {
  inputs: [{ key: 'cases', label: 'Ordered branch conditions' }],
  outputs: [],
};
