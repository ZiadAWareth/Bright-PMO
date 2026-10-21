import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'data.readRecord',
  category: 'data',
  label: 'Read Record',
  description: 'Loads a single record of an entity by id (or a where filter).',
  icon: 'search',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'entity', label: 'Entity', type: 'entity', required: true },
  { key: 'id', label: 'Record id', type: 'string', help: 'The id to load (or use a where filter).' },
  { key: 'where', label: 'Where', type: 'json', help: 'Alternative lookup filter when not using id.' },
  { key: 'as', label: 'Store record as', type: 'string', default: 'record', help: 'Variable name for the loaded record, so later steps read {{name.field}}. Use distinct names when a flow loads more than one record.' },
  { key: 'optional', label: 'Continue if not found', type: 'boolean', default: false, help: 'When on, a missing id or no match yields an empty record instead of failing the flow (e.g. an owner lookup used only to address a notification).' },
];

export const io: PulseIO = {
  inputs: [{ key: 'id', label: 'Record id' }],
  outputs: [{ key: 'record', label: 'The loaded record (also under your "Store record as" name)' }],
};
