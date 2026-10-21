import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'trigger.manualStart',
  category: 'trigger',
  label: 'Manual Start',
  description: 'Starts a workflow instance from a selected record or list view.',
  icon: 'play',
  async: 'never',
  hasSideEffects: false,
  // Started on a record someone picked: the run starts with that row.
  triggerInput: { source: 'record', event: 'manualStart' },
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'source',
    label: 'Started from',
    type: 'select',
    default: 'record',
    options: [
      { value: 'record', label: 'A record' },
      { value: 'list', label: 'A list view' },
    ],
  },
  { key: 'entity', label: 'Entity', type: 'entity', help: 'Which model the starter record belongs to.' },
  // "Allowed when": the record must meet these for the Start button to work (a DISBURSED loan cannot
  // be submitted again). Checked by the app on every start (workflow-start.rules startAllowed), so a
  // page, a script or a direct API call are all held to it. Same widget and rules as On Record Updated.
  { key: 'logic', label: 'Match', type: 'select', default: 'AND', options: [{ value: 'AND', label: 'All conditions' }, { value: 'OR', label: 'Any condition' }] },
  { key: 'rules', label: 'Allowed when', type: 'json', widget: 'conditions', default: [], help: 'Optional — the record must meet these to start (e.g. status is not one of DISBURSED, CLOSED). Blank = always.' },
];

export const io: PulseIO = {
  inputs: [],
  outputs: [
    { key: 'record', label: 'Triggering record', description: 'The record the instance was started from.' },
  ],
};
