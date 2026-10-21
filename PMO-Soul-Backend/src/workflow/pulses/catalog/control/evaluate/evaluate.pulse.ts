import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.evaluate',
  category: 'control',
  label: 'Evaluate Expression',
  description: 'Evaluates a boolean expression against the workflow variables and stores the result.',
  icon: 'function',
  async: 'never',
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'expression', label: 'Expression', type: 'expression', required: true, help: 'e.g. {{amount}} > 1000' },
  { key: 'as', label: 'Store result as', type: 'string', default: 'result' },
];

export const io: PulseIO = {
  inputs: [{ key: 'expression', label: 'Boolean expression' }],
  outputs: [{ key: 'result', label: 'Evaluation result (boolean)' }],
};
