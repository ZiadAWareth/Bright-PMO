import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'integration.inAppNotification',
  category: 'integration',
  label: 'Send In-App Notification',
  description: "Emits an in-app notification onto the app's notification queue; the app delivers it live over websocket.",
  icon: 'bell',
  async: 'always',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  { key: 'to', label: 'Recipient', type: 'recipient', help: 'User or role to notify (blank = record owner).' },
  { key: 'title', label: 'Title', type: 'string', required: true },
  { key: 'message', label: 'Message', type: 'string', required: true, help: 'Supports {{variables}}.' },
  {
    key: 'level',
    label: 'Level',
    type: 'select',
    default: 'info',
    options: [
      { value: 'info', label: 'Info' },
      { value: 'success', label: 'Success' },
      { value: 'warning', label: 'Warning' },
      { value: 'error', label: 'Error' },
    ],
  },
  { key: 'entity', label: 'Link entity', type: 'entity', help: 'Clicking the notification opens this record. Leave both blank to open the record this workflow is about (not after a delete).' },
  { key: 'entityId', label: 'Link record id', type: 'string', help: 'Which record to open. Blank = the record this workflow is about.' },
];

export const io: PulseIO = {
  inputs: [],
  outputs: [
    { key: 'queued', label: 'Whether the notification was queued' },
    { key: 'recipients', label: 'How many people it was sent to' },
    { key: 'note', label: 'Why nothing was sent, when nobody matched' },
  ],
};
