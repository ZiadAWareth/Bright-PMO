import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.whileLoop',
  category: 'control',
  label: 'While / Until',
  description: 'Repeats the body while a condition holds, bounded by a mandatory max-iteration guard.',
  icon: 'rotate-cw',
  async: 'never',
  hasSideEffects: false,
  loop: 'while',
  branches: ['body', 'done'],
};

export const config: PulseFieldDescriptor[] = [
  { key: 'condition', label: 'Condition', type: 'expression', required: true, help: 'e.g. {{index}} < 10' },
  { key: 'maxIterations', label: 'Max iterations', type: 'number', required: true, default: 1000 },
  { key: 'index', label: 'Index variable', type: 'string', default: 'index' },
  { key: 'as', label: 'Results variable', type: 'string', default: 'results', help: 'Array of { index, output | error } per pass, set when the loop finishes' },
  {
    key: 'onItemError',
    label: 'When a pass fails',
    type: 'select',
    default: 'fail',
    options: [
      { value: 'fail', label: 'Fail the run' },
      { value: 'skip', label: 'Record the error and continue with the next pass' },
      { value: 'stop', label: 'Record the error and end the loop' },
    ],
  },
];

export const io: PulseIO = {
  inputs: [{ key: 'condition', label: 'Loop condition' }],
  outputs: [
    { key: 'index', label: 'Current iteration (per pass)' },
    { key: 'results', label: 'Per-pass results (after done)' },
  ],
};
