import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'trigger.scheduled',
  category: 'trigger',
  label: 'Scheduled',
  description: 'Starts the workflow on a schedule: every so often, or at set times.',
  icon: 'clock',
  async: 'never',
  hasSideEffects: false,
  // A clock tick (workflow-clock.service): when it fired, by which schedule. Never a table row.
  triggerInput: { source: 'clock', event: 'scheduled' },
};

export const config: PulseFieldDescriptor[] = [
  // Stored as a cron expression (the scheduler reads cron); the designer edits it as "repeat every…"
  // or "at set times…" (the schedule widget), with cron itself as the custom option.
  { key: 'cron', label: 'When it runs', type: 'string', required: true, widget: 'schedule', help: 'Repeat every few minutes, hours or days, or run at set times.' },
  { key: 'timezone', label: 'Time zone', type: 'string', default: 'UTC', widget: 'timezone', help: 'The times above are read in this time zone. Defaults to UTC.' },
];

export const io: PulseIO = {
  inputs: [],
  outputs: [
    { key: 'firedAt', label: 'When the schedule fired (ISO)' },
    { key: 'cron', label: 'The cron expression that fired' },
    { key: 'timezone', label: 'The time zone the schedule is read in' },
  ],
};
