import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'data.queryRecords',
  category: 'data',
  label: 'Query Records',
  description: 'Returns a filtered, sorted, paginated collection of records.',
  icon: 'list',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'entity', label: 'Entity', type: 'entity', required: true },
  { key: 'where', label: 'Where', type: 'json', default: {} },
  { key: 'orderBy', label: 'Order by', type: 'json', help: 'e.g. { "createdAt": "desc" }' },
  { key: 'page', label: 'Page (0-based)', type: 'number', default: 0 },
  { key: 'pageSize', label: 'Page size', type: 'number', help: '0 = no pagination (all rows). "total" still counts every match, not just this page.' },
];

export const io: PulseIO = {
  inputs: [{ key: 'where', label: 'Filter' }],
  outputs: [
    { key: 'records', label: 'The matched collection' },
    { key: 'total', label: 'Every match, across all pages' },
  ],
};
