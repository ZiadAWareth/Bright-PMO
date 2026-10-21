import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.validate',
  category: 'control',
  label: 'Validate',
  description: 'Asserts a condition and raises a named, catchable business error when it fails.',
  icon: 'shield-check',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'condition',
    label: 'Condition',
    type: 'expression',
    required: true,
    help: 'Passes when true, else raises the error. A bare {{field}} checks it is present; add an operator to compare, e.g. {{amount}} > 0.',
  },
  { key: 'errorName', label: 'Error name', type: 'string', default: 'ValidationFailed' },
  { key: 'message', label: 'Message', type: 'string', help: 'Shown when the assertion fails.' },
];

export const io: PulseIO = {
  inputs: [{ key: 'condition', label: 'Assertion' }],
  outputs: [],
};
