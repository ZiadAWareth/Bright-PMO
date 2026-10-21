import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.parallelJoin',
  category: 'control',
  label: 'Parallel Join (AND)',
  description: 'Waits for every incoming branch to arrive, then continues once.',
  icon: 'merge',
  async: 'never',
  hasSideEffects: false,
  join: 'and',
};

export const config: PulseFieldDescriptor[] = [];

export const io: PulseIO = { inputs: [], outputs: [] };
