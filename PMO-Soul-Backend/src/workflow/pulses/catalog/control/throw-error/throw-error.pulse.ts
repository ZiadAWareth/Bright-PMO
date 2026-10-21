import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.throwError',
  category: 'control',
  label: 'Throw Error',
  description: 'Raises a named business error — routable to an error path or caught by a boundary.',
  icon: 'alert-triangle',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'errorName', label: 'Error name', type: 'string', required: true, default: 'BusinessError' },
  { key: 'message', label: 'Message', type: 'string' },
];

export const io: PulseIO = { inputs: [], outputs: [] };
