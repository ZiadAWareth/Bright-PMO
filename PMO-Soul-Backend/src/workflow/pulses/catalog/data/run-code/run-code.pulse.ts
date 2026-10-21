import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'data.runCode',
  category: 'data',
  // JavaScript only (a Node vm sandbox), so the name says so; the canvas and palette show the JS logo.
  label: 'Run JavaScript',
  description: 'Runs a short JavaScript function over the run\'s data and adds what it returns as variables.',
  icon: 'javascript',
  async: 'never',
  // It cannot reach the network, files or the database — only the variables it is given.
  hasSideEffects: false,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'code',
    label: 'Code',
    type: 'code',
    required: true,
    // The executor runs it; filling {{templates}} first would rewrite the program.
    rawTemplates: true,
    // What a new step opens with (n8n-style): the contract, in the code itself.
    default: [
      '// `vars` holds the data from the steps before this one,',
      '// e.g. vars.record (the record the run is about). Type `vars.` for the list.',
      '// console.log(...) shows in the Output pane when you Test step.',
      '',
      '// Return an object: each key becomes a variable the next steps can use.',
      'return {',
      '  // total: vars.record.amount * 1.1,',
      '};',
    ].join('\n'),
    // The FIRST 90 characters are what the Workflow AI sees (buildPulseCatalogContext), so the
    // contract leads; the example follows for people.
    help: 'Body of function(vars): return { key: value }; keys become variables. Sync, no await. '
      + 'e.g. return { total: vars.amount * 1.1 }; It has no require, network or files, and stops after 1 s.',
  },
];

export const io: PulseIO = {
  inputs: [{ key: 'code', label: 'Function body' }],
  outputs: [{ key: '{returned keys}', label: 'Each key the code returns', description: 'Written as workflow variables.' }],
};
