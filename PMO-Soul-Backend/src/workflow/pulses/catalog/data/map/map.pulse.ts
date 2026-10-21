import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'data.map',
  category: 'data',
  label: 'Map Fields',
  description: 'Builds several variables at once from {{templates}}: copy, rename, combine. No code.',
  icon: 'arrow-right-left',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'fields',
    label: 'Fields',
    type: 'json',
    default: {},
    required: true,
    // The first 90 characters are what the Workflow AI sees; the contract leads.
    help: 'target: value rows; values use {{templates}}; each target becomes a variable (or a key of Into). '
      + 'A lone {{record.amount}} keeps its type; text around it makes a string. Arithmetic: use Run JavaScript.',
  },
  {
    key: 'into',
    label: 'Into (optional)',
    type: 'string',
    help: 'Collect the fields into ONE object variable with this name (e.g. payload), ready for a Create Record or HTTP step.',
  },
];

export const io: PulseIO = {
  inputs: [{ key: 'fields', label: 'Target ← value' }],
  outputs: [{ key: '{targets} or {into}', label: 'The mapped values', description: 'One variable per target, or one object under Into.' }],
};
