import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.terminate',
  category: 'control',
  label: 'Terminate All',
  description: 'Ends the entire workflow instance immediately, stopping every active branch.',
  icon: 'octagon',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'status',
    label: 'End as',
    type: 'select',
    default: 'success',
    options: [
      { value: 'success', label: 'Success' },
      { value: 'error', label: 'Error' },
    ],
  },
  { key: 'errorName', label: 'Error name', type: 'string', help: 'Used when ending as Error.' },
];

export const io: PulseIO = { inputs: [], outputs: [] };
