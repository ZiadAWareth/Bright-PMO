import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'time.wait',
  category: 'time',
  label: 'Wait / Delay',
  description: 'Pauses the workflow for an amount of time, until a date and time, or until a record meets conditions.',
  icon: 'timer',
  async: 'always',
  hasSideEffects: false,
  branches: ['timeout'],
  // A deadline exists only when waiting on a record: a duration / until wait simply elapses, so its
  // graph must not be made to wire a 'timeout' edge the run could never take. And even then the
  // timeout path is opt-in: by default a wait that gives up stops the run (an incident), so nobody
  // is made to draw a path for "what we waited for never happened" unless they have one.
  optionalBranches: {
    timeout: {
      key: 'onTimeout',
      equals: 'timeout',
      default: 'fail',
      also: [{ key: 'mode', equals: 'condition', default: 'duration' }],
    },
  },
};

const ON_RECORD = { key: 'mode', is: ['condition'] };

export const config: PulseFieldDescriptor[] = [
  {
    key: 'mode',
    label: 'Wait',
    type: 'select',
    default: 'duration',
    options: [
      { value: 'duration', label: 'For an amount of time' },
      { value: 'until', label: 'Until a date and time' },
      { value: 'condition', label: 'Until a record meets conditions' },
    ],
  },

  // ── For an amount of time ──
  { key: 'amount', label: 'Wait for', type: 'number', default: 1, showWhen: { key: 'mode', is: ['duration'] } },
  {
    key: 'unit',
    label: 'Unit',
    type: 'select',
    default: 'minutes',
    showWhen: { key: 'mode', is: ['duration'] },
    options: [
      { value: 'seconds', label: 'Seconds' },
      { value: 'minutes', label: 'Minutes' },
      { value: 'hours', label: 'Hours' },
      { value: 'days', label: 'Days' },
      { value: 'weeks', label: 'Weeks' },
    ],
  },

  // ── Until a date and time ──
  {
    key: 'until',
    label: 'Wait until',
    type: 'string',
    widget: 'dateTime',
    showWhen: { key: 'mode', is: ['until'] },
    help: 'Pick a date and time, or drag in a date from an earlier step (e.g. the record’s due date). A time already past continues at once.',
  },

  // ── Until a record meets conditions ──
  { key: 'entity', label: 'Table', type: 'entity', showWhen: ON_RECORD, help: 'The table of the record to watch.' },
  {
    key: 'recordId',
    label: 'Record',
    type: 'string',
    default: '{{record.id}}',
    showWhen: ON_RECORD,
    help: 'The id of the record to watch — by default the record this workflow started with.',
  },
  {
    key: 'logic',
    label: 'Continue when',
    type: 'select',
    default: 'AND',
    showWhen: ON_RECORD,
    options: [
      { value: 'AND', label: 'All conditions are true' },
      { value: 'OR', label: 'Any condition is true' },
    ],
  },
  {
    key: 'rules',
    label: 'Conditions',
    type: 'json',
    widget: 'conditions',
    default: [],
    showWhen: ON_RECORD,
    help: 'Checked against the record as it is NOW in the database, about every 30 seconds — e.g. status is APPROVED.',
  },
  { key: 'giveUpAfter', label: 'Give up after', type: 'number', default: 1, showWhen: ON_RECORD },
  {
    key: 'giveUpUnit',
    label: 'Unit',
    type: 'select',
    default: 'days',
    showWhen: ON_RECORD,
    options: [
      { value: 'minutes', label: 'Minutes' },
      { value: 'hours', label: 'Hours' },
      { value: 'days', label: 'Days' },
      { value: 'weeks', label: 'Weeks' },
    ],
  },
  {
    key: 'onTimeout',
    label: 'If it gives up',
    type: 'select',
    default: 'fail',
    showWhen: ON_RECORD,
    help: 'Stopping shows the run in Runs & Incidents. Choose a "timeout" path only when something should happen instead (a reminder, an escalation, closing the request).',
    options: [
      { value: 'fail', label: 'Stop the run' },
      { value: 'timeout', label: 'Take a "timeout" path' },
      { value: 'continue', label: 'Carry on as if it were met' },
    ],
  },
  {
    key: 'as',
    label: 'Store the record as',
    type: 'string',
    default: 'watchedRecord',
    showWhen: ON_RECORD,
    help: 'When the conditions are met, later steps read the record as it is then, e.g. {{watchedRecord.status}}.',
  },
];

// Record mode writes the watched record under "Store the record as" (shown with that setting);
// a duration / date wait writes nothing.
export const io: PulseIO = { inputs: [], outputs: [] };
