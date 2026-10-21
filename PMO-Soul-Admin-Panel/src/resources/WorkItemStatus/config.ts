import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface WorkItemStatus {
  id: number;
  projectId: number;
  name: string;
  category: string;
  sortOrder: number;
  wipLimit?: number;
  isDefault: boolean;
  colorToken?: string;
  archivedAt?: string;
  organizationId?: number;
}

export const workitemstatusHooks = makeResourceHooks<WorkItemStatus & { id: number }>('workitemstatus', 'Work Item Status');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    category: z.enum(['todo', 'in_progress', 'done'] as [string, ...string[]], { required_error: 'Category is required' }),
    sortOrder: z.coerce.number({ invalid_type_error: 'Sort Order is required' }),
    wipLimit: z.coerce.number().optional(),
    isDefault: z.boolean().default(false),
    colorToken: z.string().optional(),
    archivedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'workitemstatus',
  routeBase: '/workitemstatus',
  label: 'Work Item Status',
  labelPlural: 'Work Item Statuses',
  organizationOwned: true,
  hooks: workitemstatusHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'category', label: 'Category', kind: 'enum', optional: false, options: ['todo', 'in_progress', 'done'] },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number', optional: false },
  { name: 'wipLimit', label: 'Wip Limit', kind: 'number', optional: true },
  { name: 'isDefault', label: 'Is Default', kind: 'boolean', optional: false },
  { name: 'colorToken', label: 'Color Token', kind: 'text', optional: true },
  { name: 'archivedAt', label: 'Archived At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'category', label: 'Category', kind: 'enum' },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number' },
  { name: 'wipLimit', label: 'Wip Limit', kind: 'number' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    category: '',
    sortOrder: undefined,
    wipLimit: undefined,
    isDefault: false,
    colorToken: '',
    archivedAt: '',
    projectId: '',
    organizationId: '',
  },
};
