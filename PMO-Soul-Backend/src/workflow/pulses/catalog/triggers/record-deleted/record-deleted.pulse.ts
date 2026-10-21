import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'trigger.recordDeleted',
  category: 'trigger',
  label: 'On Record Deleted',
  description: 'Starts the workflow when a record of the chosen entity is deleted.',
  icon: 'trash-2',
  async: 'never',
  hasSideEffects: false,
  triggerInput: { source: 'record', event: 'onDelete' },
};

export const config: PulseFieldDescriptor[] = [
  // No `entity` field — the workflow's target entity (modeler header) is the single
  // authoritative binding the engine routes on; see On Record Created.
  { key: 'logic', label: 'Match', type: 'select', default: 'AND', options: [{ value: 'AND', label: 'All conditions' }, { value: 'OR', label: 'Any condition' }] },
  { key: 'rules', label: 'Only when', type: 'json', widget: 'conditions', default: [], help: 'Optional value filter — each row is field · operator · value.' },
];

export const io: PulseIO = {
  inputs: [],
  outputs: [{ key: 'record', label: 'The deleted record' }],
};
