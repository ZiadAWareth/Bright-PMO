import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'data.updateRecord',
  category: 'data',
  label: 'Update Record',
  description: 'Updates a record; optionally enforces an expected version (optimistic lock).',
  icon: 'edit',
  async: 'never',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'entity', label: 'Entity', type: 'entity', required: true },
  { key: 'id', label: 'Record id', type: 'string', required: true },
  { key: 'data', label: 'Data', type: 'json', default: {} },
  { key: 'expectedVersion', label: 'Expected version', type: 'number', help: 'When set, the update fails with a conflict if the record moved on.' },
];

export const io: PulseIO = {
  inputs: [{ key: 'data', label: 'Fields to update' }],
  outputs: [{ key: 'record', label: 'The updated record' }],
};
