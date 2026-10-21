import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ProjectLifecycleStep {
  id: number;
  projectId: number;
  key: string;
  title: string;
  sortOrder: number;
  gating: string;
  isRequired: boolean;
  status: string;
  completedAt?: string;
  completedById?: number;
  organizationId?: number;
}

export const projectlifecyclestepHooks = makeResourceHooks<ProjectLifecycleStep & { id: number }>('projectlifecyclestep', 'Project Lifecycle Step');

const schema = z.object({
    key: z.string().min(1, 'Key is required'),
    title: z.string().min(1, 'Title is required'),
    sortOrder: z.coerce.number({ invalid_type_error: 'Sort Order is required' }),
    gating: z.enum(['sequential', 'free'] as [string, ...string[]], { required_error: 'Gating is required' }),
    isRequired: z.boolean().default(false),
    status: z.enum(['locked', 'available', 'in_progress', 'completed', 'skipped'] as [string, ...string[]], { required_error: 'Status is required' }),
    completedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    completedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'projectlifecyclestep',
  routeBase: '/projectlifecyclestep',
  label: 'Project Lifecycle Step',
  labelPlural: 'Project Lifecycle Steps',
  organizationOwned: true,
  hooks: projectlifecyclestepHooks,
  fields: [
  { name: 'key', label: 'Key', kind: 'text', optional: false },
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number', optional: false },
  { name: 'gating', label: 'Gating', kind: 'enum', optional: false, options: ['sequential', 'free'] },
  { name: 'isRequired', label: 'Is Required', kind: 'boolean', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['locked', 'available', 'in_progress', 'completed', 'skipped'] },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'completedById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'key', label: 'Key', kind: 'text' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number' },
  { name: 'gating', label: 'Gating', kind: 'enum' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'completedById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    key: '',
    title: '',
    sortOrder: undefined,
    gating: '',
    isRequired: false,
    status: '',
    completedAt: '',
    projectId: '',
    completedById: '',
    organizationId: '',
  },
};
