import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.endError',
  category: 'control',
  label: 'End (Error)',
  description: 'Terminates the workflow instance with a named error that propagates to the caller.',
  icon: 'x-circle',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'errorName', label: 'Error name', type: 'string', required: true, default: 'Error' },
  { key: 'message', label: 'Message', type: 'string' },
];

export const io: PulseIO = { inputs: [], outputs: [] };
