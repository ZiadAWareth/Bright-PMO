import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'trigger.recordUpdated',
  category: 'trigger',
  label: 'On Record Updated',
  description: 'Starts when a record is updated — optionally only when specific fields change and a condition holds.',
  icon: 'refresh-cw',
  async: 'never',
  hasSideEffects: false,
  // The row, plus the row as it was and the names of the fields that changed.
  triggerInput: { source: 'record', event: 'onUpdate' },
};

export const config: PulseFieldDescriptor[] = [
  // No `entity` field — the workflow's target entity (modeler header) is the single
  // authoritative binding the engine routes on; see On Record Created.
  { key: 'watchFields', label: 'Watch fields', type: 'string', help: 'Comma-separated fields — fire only when one of these changes. Blank = any change.' },
  { key: 'logic', label: 'Match', type: 'select', default: 'AND', options: [{ value: 'AND', label: 'All conditions' }, { value: 'OR', label: 'Any condition' }] },
  { key: 'rules', label: 'Only when', type: 'json', widget: 'conditions', default: [], help: 'Optional value filter — each row is field · operator · value.' },
];

export const io: PulseIO = {
  inputs: [],
  outputs: [
    { key: 'record', label: 'The updated record' },
    { key: 'previous', label: 'The record as it was before this update' },
    { key: 'changedFields', label: 'Names of the fields that changed' },
  ],
};
