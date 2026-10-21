import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.endSuccess',
  category: 'control',
  label: 'End (Success)',
  description: 'Terminates the workflow instance successfully.',
  icon: 'check-circle',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [];

export const io: PulseIO = { inputs: [], outputs: [] };
