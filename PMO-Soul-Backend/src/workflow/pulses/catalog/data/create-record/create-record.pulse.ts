import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'data.createRecord',
  category: 'data',
  label: 'Create Record',
  description: 'Creates a record of the chosen entity from the provided data.',
  icon: 'plus',
  async: 'never',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'entity', label: 'Entity', type: 'entity', required: true },
  { key: 'data', label: 'Data', type: 'json', default: {}, help: 'Field values for the new record (supports {{templates}}).' },
];

export const io: PulseIO = {
  inputs: [{ key: 'data', label: 'Record data' }],
  outputs: [{ key: 'record', label: 'The created record' }],
};
