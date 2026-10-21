import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'data.deleteRecord',
  category: 'data',
  label: 'Delete Record',
  description: 'Deletes a record, or marks it deleted when the entity supports soft deletion.',
  icon: 'trash',
  async: 'never',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'entity', label: 'Entity', type: 'entity', required: true },
  { key: 'id', label: 'Record id', type: 'string', required: true, help: 'Usually {{id}} — the record that triggered the workflow.' },
  {
    key: 'mode',
    label: 'Mode',
    type: 'select',
    default: 'hard',
    options: [
      { value: 'hard', label: 'Delete permanently' },
      { value: 'soft', label: 'Mark as deleted' },
    ],
    help: 'Soft delete sets deletedAt instead of removing the row; the entity must have that field.',
  },
  {
    key: 'missing',
    label: 'If not found',
    type: 'select',
    default: 'error',
    options: [
      { value: 'error', label: 'Fail the step' },
      { value: 'ignore', label: 'Continue' },
    ],
  },
];

export const io: PulseIO = {
  inputs: [{ key: 'id', label: 'Record to delete' }],
  outputs: [{ key: 'deleted', label: 'The deleted record' }],
};
