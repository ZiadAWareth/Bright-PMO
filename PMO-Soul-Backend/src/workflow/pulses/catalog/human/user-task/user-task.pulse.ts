import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'human.userTask',
  category: 'human',
  label: 'User Task',
  description: 'Assigns work to a person and waits until they complete it.',
  icon: 'user-check',
  async: 'always',
  hasSideEffects: true,
  branches: ['completed', 'overdue'],
  optionalBranches: { overdue: { key: 'onOverdue', equals: 'escalate', default: 'continue' } },
};

export const config: PulseFieldDescriptor[] = [
  { key: 'title', label: 'Task title', type: 'string', required: true, help: 'Supports {{variables}}.' },
  { key: 'instructions', label: 'Instructions', type: 'string', help: 'What the assignee needs to do.' },
  { key: 'assignee', label: 'Assign to', type: 'recipient', required: true, help: 'A role ("role:Dispatcher"), a user, or a template such as {{ownerId}}.' },
  { key: 'dueInHours', label: 'Due in (hours)', type: 'number', help: 'Leave empty for no deadline.' },
  {
    key: 'onOverdue',
    label: 'If overdue',
    type: 'select',
    default: 'continue',
    options: [
      { value: 'continue', label: 'Keep waiting' },
      { value: 'escalate', label: 'Take the "overdue" branch' },
    ],
  },
  { key: 'form', label: 'Fields to collect', type: 'json', help: 'Optional field list; the completed values become this step\'s output.' },
];

export const io: PulseIO = {
  inputs: [{ key: 'assignee', label: 'Who the task goes to' }],
  outputs: [
    { key: 'completedBy', label: 'Who completed it' },
    { key: 'formData', label: 'Values they submitted' },
  ],
};
