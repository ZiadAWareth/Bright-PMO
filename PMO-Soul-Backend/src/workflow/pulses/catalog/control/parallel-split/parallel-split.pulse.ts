import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.parallelSplit',
  category: 'control',
  label: 'Parallel Split (AND)',
  description: 'Activates every outgoing branch at once — the fork half of a fork/join.',
  icon: 'split',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [];

export const io: PulseIO = { inputs: [], outputs: [] };
