import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface RiskMitigation {
  id: number;
  riskId: number;
  workItemId?: number;
  ownerId: number;
  assigneeId: number;
  description: string;
  actionPlan: string;
  type: string;
  status: string;
  startDate: string;
  dueDate: string;
  progressPct: string;
  completedAt?: string;
  notes?: string;
  lastReminderAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const riskmitigationHooks = makeResourceHooks<RiskMitigation & { id: number }>('riskmitigation', 'Risk Mitigation');

const schema = z.object({
    description: z.string().min(1, 'Description is required'),
    actionPlan: z.string().min(1, 'Action Plan is required'),
    type: z.enum(['avoid', 'transfer', 'mitigate', 'accept', 'contingency'] as [string, ...string[]], { required_error: 'Type is required' }),
    status: z.enum(['planned', 'in_progress', 'completed', 'on_hold', 'cancelled', 'overdue'] as [string, ...string[]], { required_error: 'Status is required' }),
    startDate: z.string().min(1, 'Start Date is required'),
    dueDate: z.string().min(1, 'Due Date is required'),
    progressPct: z.string().min(1, 'Progress Pct is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    completedAt: z.string().optional(),
    notes: z.string().optional(),
    lastReminderAt: z.string().optional(),
    riskId: z.string().optional().or(z.literal('')),
    workItemId: z.string().optional().or(z.literal('')),
    ownerId: z.string().optional().or(z.literal('')),
    assigneeId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'riskmitigation',
  routeBase: '/riskmitigation',
  label: 'Risk Mitigation',
  labelPlural: 'Risk Mitigations',
  organizationOwned: true,
  hooks: riskmitigationHooks,
  fields: [
  { name: 'description', label: 'Description', kind: 'textarea', optional: false },
  { name: 'actionPlan', label: 'Action Plan', kind: 'text', optional: false },
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['avoid', 'transfer', 'mitigate', 'accept', 'contingency'] },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['planned', 'in_progress', 'completed', 'on_hold', 'cancelled', 'overdue'] },
  { name: 'startDate', label: 'Start Date', kind: 'datetime', optional: false },
  { name: 'dueDate', label: 'Due Date', kind: 'datetime', optional: false },
  { name: 'progressPct', label: 'Progress Pct', kind: 'decimal', optional: false },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime', optional: true },
  { name: 'notes', label: 'Notes', kind: 'textarea', optional: true },
  { name: 'lastReminderAt', label: 'Last Reminder At', kind: 'datetime', optional: true },
  { name: 'riskId', label: 'Risk', kind: 'relation', optional: true, relation: { resource: 'risk', displayField: 'name', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'ownerId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'assigneeId', label: 'User Assignee', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'actionPlan', label: 'Action Plan', kind: 'text' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'startDate', label: 'Start Date', kind: 'datetime' },
  { name: 'riskId', label: 'Risk', kind: 'relation', relation: { resource: 'risk', displayField: 'name', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'ownerId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'assigneeId', label: 'User Assignee', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    description: '',
    actionPlan: '',
    type: '',
    status: '',
    startDate: '',
    dueDate: '',
    progressPct: '',
    completedAt: '',
    notes: '',
    lastReminderAt: '',
    riskId: '',
    workItemId: '',
    ownerId: '',
    assigneeId: '',
    organizationId: '',
  },
};
