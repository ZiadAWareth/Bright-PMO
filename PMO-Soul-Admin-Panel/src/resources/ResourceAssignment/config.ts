import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ResourceAssignment {
  id: number;
  resourceId: number;
  workItemId: number;
  allocationPct: string;
  startDate: string;
  endDate: string;
  plannedHours: string;
  actualHours: string;
  plannedQuantity?: string;
  progressPct: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const resourceassignmentHooks = makeResourceHooks<ResourceAssignment & { id: number }>('resourceassignment', 'Resource Assignment');

const schema = z.object({
    allocationPct: z.string().min(1, 'Allocation Pct is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    startDate: z.string().min(1, 'Start Date is required'),
    endDate: z.string().min(1, 'End Date is required'),
    plannedHours: z.string().min(1, 'Planned Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    actualHours: z.string().min(1, 'Actual Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    plannedQuantity: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    progressPct: z.string().min(1, 'Progress Pct is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    resourceId: z.string().optional().or(z.literal('')),
    workItemId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'resourceassignment',
  routeBase: '/resourceassignment',
  label: 'Resource Assignment',
  labelPlural: 'Resource Assignments',
  organizationOwned: true,
  hooks: resourceassignmentHooks,
  fields: [
  { name: 'allocationPct', label: 'Allocation Pct', kind: 'decimal', optional: false },
  { name: 'startDate', label: 'Start Date', kind: 'datetime', optional: false },
  { name: 'endDate', label: 'End Date', kind: 'datetime', optional: false },
  { name: 'plannedHours', label: 'Planned Hours', kind: 'decimal', optional: false },
  { name: 'actualHours', label: 'Actual Hours', kind: 'decimal', optional: false },
  { name: 'plannedQuantity', label: 'Planned Quantity', kind: 'decimal', optional: true },
  { name: 'progressPct', label: 'Progress Pct', kind: 'decimal', optional: false },
  { name: 'resourceId', label: 'Resource', kind: 'relation', optional: true, relation: { resource: 'resource', displayField: 'name', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'allocationPct', label: 'Allocation Pct', kind: 'decimal' },
  { name: 'startDate', label: 'Start Date', kind: 'datetime' },
  { name: 'endDate', label: 'End Date', kind: 'datetime' },
  { name: 'plannedHours', label: 'Planned Hours', kind: 'decimal' },
  { name: 'resourceId', label: 'Resource', kind: 'relation', relation: { resource: 'resource', displayField: 'name', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    allocationPct: '',
    startDate: '',
    endDate: '',
    plannedHours: '',
    actualHours: '',
    plannedQuantity: '',
    progressPct: '',
    resourceId: '',
    workItemId: '',
    organizationId: '',
  },
};
