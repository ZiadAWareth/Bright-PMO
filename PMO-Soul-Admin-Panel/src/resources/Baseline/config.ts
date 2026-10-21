import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Baseline {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  type: string;
  isActive: boolean;
  capturedAt: string;
  totalBudget: string;
  plannedEnd?: string;
  createdById: number;
  organizationId?: number;
}

export const baselineHooks = makeResourceHooks<Baseline & { id: number }>('baseline', 'Baseline');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    type: z.enum(['initial', 'revised', 're_baseline'] as [string, ...string[]], { required_error: 'Type is required' }),
    isActive: z.boolean().default(false),
    capturedAt: z.string().min(1, 'Captured At is required'),
    totalBudget: z.string().min(1, 'Total Budget is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    plannedEnd: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    createdById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'baseline',
  routeBase: '/baseline',
  label: 'Baseline',
  labelPlural: 'Baselines',
  organizationOwned: true,
  hooks: baselineHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['initial', 'revised', 're_baseline'] },
  { name: 'isActive', label: 'Is Active', kind: 'boolean', optional: false },
  { name: 'capturedAt', label: 'Captured At', kind: 'datetime', optional: false },
  { name: 'totalBudget', label: 'Total Budget', kind: 'decimal', optional: false },
  { name: 'plannedEnd', label: 'Planned End', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'createdById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'isActive', label: 'Is Active', kind: 'boolean' },
  { name: 'capturedAt', label: 'Captured At', kind: 'datetime' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'createdById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    description: '',
    type: '',
    isActive: false,
    capturedAt: '',
    totalBudget: '',
    plannedEnd: '',
    projectId: '',
    createdById: '',
    organizationId: '',
  },
};
