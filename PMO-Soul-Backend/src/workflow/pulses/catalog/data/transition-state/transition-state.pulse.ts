import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'data.transitionState',
  category: 'data',
  label: 'Transition State',
  description: 'Moves a record to a new state, enforcing the allowed transitions.',
  icon: 'shuffle',
  async: 'never',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'entity', label: 'Entity', type: 'entity', required: true },
  { key: 'id', label: 'Record id', type: 'string', required: true },
  // Picked from the chosen table's fields (widget), so a mistyped name is caught while designing.
  { key: 'stateField', label: 'State field', type: 'string', widget: 'entityField', default: 'status', help: 'The field that holds the state, on the table above.' },
  { key: 'to', label: 'Target state', type: 'string', required: true },
  { key: 'transitions', label: 'Allowed transitions', type: 'json', default: [], help: 'Array of { "from": "...", "to": "..." }.' },
];

export const io: PulseIO = {
  inputs: [],
  outputs: [{ key: 'record', label: 'The transitioned record' }],
};
