import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.forEach',
  category: 'control',
  label: 'For Each (sequential)',
  description: 'Iterates a collection, running the body once per item (item + index exposed); collects each pass into a results array.',
  icon: 'repeat',
  async: 'never',
  hasSideEffects: false,
  loop: 'forEach',
  branches: ['body', 'done'],
};

export const config: PulseFieldDescriptor[] = [
  { key: 'collection', label: 'Collection', type: 'expression', required: true, help: 'e.g. {{records}}' },
  { key: 'item', label: 'Item variable', type: 'string', default: 'item' },
  { key: 'index', label: 'Index variable', type: 'string', default: 'index' },
  { key: 'as', label: 'Results variable', type: 'string', default: 'results', help: 'Array of { index, item, output | error } per iteration, set when the loop finishes' },
  {
    key: 'onItemError',
    label: 'When an item fails',
    type: 'select',
    default: 'fail',
    options: [
      { value: 'fail', label: 'Fail the run' },
      { value: 'skip', label: 'Record the error and continue with the next item' },
      { value: 'stop', label: 'Record the error and end the loop' },
    ],
  },
];

export const io: PulseIO = {
  inputs: [{ key: 'collection', label: 'Collection to iterate' }],
  outputs: [
    { key: 'item', label: 'Current item (per iteration)' },
    { key: 'index', label: 'Current index (per iteration)' },
    { key: 'results', label: 'Per-iteration results (after done)' },
  ],
};
