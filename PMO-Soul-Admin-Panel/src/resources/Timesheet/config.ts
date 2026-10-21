import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Timesheet {
  id: number;
  userId: number;
  projectId: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalHours: string;
  comments?: string;
  submittedAt?: string;
  approvedById?: number;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const timesheetHooks = makeResourceHooks<Timesheet & { id: number }>('timesheet', 'Timesheet');

const schema = z.object({
    periodStart: z.string().min(1, 'Period Start is required'),
    periodEnd: z.string().min(1, 'Period End is required'),
    status: z.enum(['draft', 'submitted', 'approved', 'rejected'] as [string, ...string[]], { required_error: 'Status is required' }),
    totalHours: z.string().min(1, 'Total Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    comments: z.string().optional(),
    submittedAt: z.string().optional(),
    decidedAt: z.string().optional(),
    userId: z.string().optional().or(z.literal('')),
    projectId: z.string().optional().or(z.literal('')),
    approvedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'timesheet',
  routeBase: '/timesheet',
  label: 'Timesheet',
  labelPlural: 'Timesheets',
  organizationOwned: true,
  hooks: timesheetHooks,
  fields: [
  { name: 'periodStart', label: 'Period Start', kind: 'datetime', optional: false },
  { name: 'periodEnd', label: 'Period End', kind: 'datetime', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['draft', 'submitted', 'approved', 'rejected'] },
  { name: 'totalHours', label: 'Total Hours', kind: 'decimal', optional: false },
  { name: 'comments', label: 'Comments', kind: 'textarea', optional: true },
  { name: 'submittedAt', label: 'Submitted At', kind: 'datetime', optional: true },
  { name: 'decidedAt', label: 'Decided At', kind: 'datetime', optional: true },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'approvedById', label: 'User Approved By', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'periodStart', label: 'Period Start', kind: 'datetime' },
  { name: 'periodEnd', label: 'Period End', kind: 'datetime' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'totalHours', label: 'Total Hours', kind: 'decimal' },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'approvedById', label: 'User Approved By', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    periodStart: '',
    periodEnd: '',
    status: '',
    totalHours: '',
    comments: '',
    submittedAt: '',
    decidedAt: '',
    userId: '',
    projectId: '',
    approvedById: '',
    organizationId: '',
  },
};
