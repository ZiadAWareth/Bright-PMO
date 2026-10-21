import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  // The id stays `data.generateId` (types are stable identifiers): workflows saved when this step
  // was "Generate ID / Sequence" keep working and now get a random id.
  type: 'data.generateId',
  category: 'data',
  label: 'Generate Random ID',
  description: 'Makes a random unique id — a short code, a UUID, digits or a date-time stamp — with an optional prefix.',
  icon: 'hash',
  async: 'never',
  // Nothing outside the run changes: no table, no counter.
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'format',
    label: 'Kind of id',
    type: 'select',
    default: 'short',
    options: [
      { value: 'short', label: 'Short code — e.g. 7K3QX9MZ' },
      { value: 'uuid', label: 'UUID — e.g. 3f2c8a1e-…' },
      { value: 'number', label: 'Random number — digits only' },
      { value: 'timestamp', label: 'Date-time stamp — e.g. 20261012-153045-K7Q2' },
    ],
  },
  {
    key: 'length',
    label: 'Length',
    type: 'number',
    default: 8,
    help: 'Characters in the random part (4 to 32). Not used for a UUID.',
  },
  { key: 'prefix', label: 'Prefix', type: 'string', help: 'Put in front of the id, e.g. INV- gives INV-7K3QX9MZ. Optional.' },
  { key: 'as', label: 'Store id as', type: 'string', default: 'id', help: 'Later steps read it as {{id}} (or the name you give).' },
];

export const io: PulseIO = {
  inputs: [],
  outputs: [{ key: 'id', label: 'The generated id' }],
};
