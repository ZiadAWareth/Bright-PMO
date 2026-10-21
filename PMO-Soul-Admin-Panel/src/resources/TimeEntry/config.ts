import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface TimeEntry {
  id: number;
  userId: number;
  projectId: number;
  workItemId: number;
  timesheetId?: number;
  date: string;
  startTime?: string;
  endTime?: string;
  hours: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const timeentryHooks = makeResourceHooks<TimeEntry & { id: number }>('timeentry', 'Time Entry');

const schema = z.object({
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    hours: z.string().min(1, 'Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    description: z.string().optional(),
    status: z.enum(['draft', 'submitted', 'approved', 'rejected'] as [string, ...string[]], { required_error: 'Status is required' }),
    userId: z.string().optional().or(z.literal('')),
    projectId: z.string().optional().or(z.literal('')),
    workItemId: z.string().optional().or(z.literal('')),
    timesheetId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'timeentry',
  routeBase: '/timeentry',
  label: 'Time Entry',
  labelPlural: 'Time Entries',
  organizationOwned: true,
  hooks: timeentryHooks,
  fields: [
  { name: 'date', label: 'Date', kind: 'datetime', optional: false },
  { name: 'startTime', label: 'Start Time', kind: 'datetime', optional: true },
  { name: 'endTime', label: 'End Time', kind: 'datetime', optional: true },
  { name: 'hours', label: 'Hours', kind: 'decimal', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['draft', 'submitted', 'approved', 'rejected'] },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'timesheetId', label: 'Timesheet', kind: 'relation', optional: true, relation: { resource: 'timesheet', displayField: 'comments', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'date', label: 'Date', kind: 'datetime' },
  { name: 'startTime', label: 'Start Time', kind: 'datetime' },
  { name: 'endTime', label: 'End Time', kind: 'datetime' },
  { name: 'hours', label: 'Hours', kind: 'decimal' },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'timesheetId', label: 'Timesheet', kind: 'relation', relation: { resource: 'timesheet', displayField: 'comments', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    date: '',
    startTime: '',
    endTime: '',
    hours: '',
    description: '',
    status: '',
    userId: '',
    projectId: '',
    workItemId: '',
    timesheetId: '',
    organizationId: '',
  },
};
