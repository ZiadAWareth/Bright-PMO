import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ProgressReport {
  id: number;
  workItemId: number;
  resourceAssignmentId?: number;
  reportedById: number;
  actualProgressPct: string;
  actualHours: string;
  isOnPlan: boolean;
  notes?: string;
  reportedAt: string;
  organizationId?: number;
}

export const progressreportHooks = makeResourceHooks<ProgressReport & { id: number }>('progressreport', 'Progress Report');

const schema = z.object({
    actualProgressPct: z.string().min(1, 'Actual Progress Pct is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    actualHours: z.string().min(1, 'Actual Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    isOnPlan: z.boolean().default(false),
    notes: z.string().optional(),
    reportedAt: z.string().min(1, 'Reported At is required'),
    workItemId: z.string().optional().or(z.literal('')),
    resourceAssignmentId: z.string().optional().or(z.literal('')),
    reportedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'progressreport',
  routeBase: '/progressreport',
  label: 'Progress Report',
  labelPlural: 'Progress Reports',
  organizationOwned: true,
  hooks: progressreportHooks,
  fields: [
  { name: 'actualProgressPct', label: 'Actual Progress Pct', kind: 'decimal', optional: false },
  { name: 'actualHours', label: 'Actual Hours', kind: 'decimal', optional: false },
  { name: 'isOnPlan', label: 'Is On Plan', kind: 'boolean', optional: false },
  { name: 'notes', label: 'Notes', kind: 'textarea', optional: true },
  { name: 'reportedAt', label: 'Reported At', kind: 'datetime', optional: false },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'resourceAssignmentId', label: 'Resourceassignment', kind: 'relation', optional: true, relation: { resource: 'resourceassignment', displayField: 'id', refField: 'id' } },
  { name: 'reportedById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'actualProgressPct', label: 'Actual Progress Pct', kind: 'decimal' },
  { name: 'actualHours', label: 'Actual Hours', kind: 'decimal' },
  { name: 'isOnPlan', label: 'Is On Plan', kind: 'boolean' },
  { name: 'reportedAt', label: 'Reported At', kind: 'datetime' },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'resourceAssignmentId', label: 'Resourceassignment', kind: 'relation', relation: { resource: 'resourceassignment', displayField: 'id', refField: 'id' } },
  { name: 'reportedById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    actualProgressPct: '',
    actualHours: '',
    isOnPlan: false,
    notes: '',
    reportedAt: '',
    workItemId: '',
    resourceAssignmentId: '',
    reportedById: '',
    organizationId: '',
  },
};
