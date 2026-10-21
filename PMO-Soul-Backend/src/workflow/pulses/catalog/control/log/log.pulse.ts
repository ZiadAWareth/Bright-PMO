import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.log',
  category: 'control',
  label: 'Log / Audit Entry',
  description: 'Writes a message to the workflow audit/log sink — the primary debugging tool for a flow.',
  icon: 'file-text',
  async: 'never',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'level',
    label: 'Level',
    type: 'select',
    default: 'info',
    options: [
      { value: 'debug', label: 'Debug' },
      { value: 'info', label: 'Info' },
      { value: 'warn', label: 'Warn' },
      { value: 'error', label: 'Error' },
    ],
  },
  { key: 'message', label: 'Message', type: 'string', required: true, help: 'Supports {{variables}}.' },
];

export const io: PulseIO = {
  inputs: [{ key: 'message', label: 'Message to log' }],
  outputs: [],
};
