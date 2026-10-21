import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface BaselineItem {
  id: number;
  baselineId: number;
  workItemId: number;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  plannedCost: string;
  plannedHours: string;
  organizationId?: number;
}

export const baselineitemHooks = makeResourceHooks<BaselineItem & { id: number }>('baselineitem', 'Baseline Item');

const schema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    durationDays: z.coerce.number().optional(),
    plannedCost: z.string().min(1, 'Planned Cost is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    plannedHours: z.string().min(1, 'Planned Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    baselineId: z.string().optional().or(z.literal('')),
    workItemId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'baselineitem',
  routeBase: '/baselineitem',
  label: 'Baseline Item',
  labelPlural: 'Baseline Items',
  organizationOwned: true,
  hooks: baselineitemHooks,
  fields: [
  { name: 'startDate', label: 'Start Date', kind: 'datetime', optional: true },
  { name: 'endDate', label: 'End Date', kind: 'datetime', optional: true },
  { name: 'durationDays', label: 'Duration Days', kind: 'number', optional: true },
  { name: 'plannedCost', label: 'Planned Cost', kind: 'decimal', optional: false },
  { name: 'plannedHours', label: 'Planned Hours', kind: 'decimal', optional: false },
  { name: 'baselineId', label: 'Baseline', kind: 'relation', optional: true, relation: { resource: 'baseline', displayField: 'name', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'startDate', label: 'Start Date', kind: 'datetime' },
  { name: 'endDate', label: 'End Date', kind: 'datetime' },
  { name: 'durationDays', label: 'Duration Days', kind: 'number' },
  { name: 'plannedCost', label: 'Planned Cost', kind: 'decimal' },
  { name: 'baselineId', label: 'Baseline', kind: 'relation', relation: { resource: 'baseline', displayField: 'name', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    startDate: '',
    endDate: '',
    durationDays: undefined,
    plannedCost: '',
    plannedHours: '',
    baselineId: '',
    workItemId: '',
    organizationId: '',
  },
};
