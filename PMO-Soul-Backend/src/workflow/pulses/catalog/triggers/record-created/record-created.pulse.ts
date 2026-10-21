import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'trigger.recordCreated',
  category: 'trigger',
  label: 'On Record Created',
  description: 'Starts the workflow when a record of the chosen entity is created.',
  icon: 'plus-circle',
  async: 'never',
  hasSideEffects: false,
  triggerInput: { source: 'record', event: 'onCreate' },
};

export const config: PulseFieldDescriptor[] = [
  // No `entity` field here: the workflow's target entity (set once in the modeler
  // header) is the authoritative binding the engine routes on. This trigger simply
  // means "a record of THAT entity was created" — asking for the entity again would
  // be a second, silently-ignored source of truth.
  { key: 'logic', label: 'Match', type: 'select', default: 'AND', options: [{ value: 'AND', label: 'All conditions' }, { value: 'OR', label: 'Any condition' }] },
  { key: 'rules', label: 'Only when', type: 'json', widget: 'conditions', default: [], help: 'Optional value filter — each row is field · operator · value.' },
];

export const io: PulseIO = {
  inputs: [],
  outputs: [{ key: 'record', label: 'The created record' }],
};
