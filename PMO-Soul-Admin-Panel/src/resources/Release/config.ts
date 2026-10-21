import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Release {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  status: string;
  targetDate?: string;
  releasedAt?: string;
  milestoneWorkItemId?: number;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const releaseHooks = makeResourceHooks<Release & { id: number }>('release', 'Release');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    status: z.enum(['planned', 'in_progress', 'released', 'cancelled'] as [string, ...string[]], { required_error: 'Status is required' }),
    targetDate: z.string().optional(),
    releasedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    milestoneWorkItemId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'release',
  routeBase: '/release',
  label: 'Release',
  labelPlural: 'Releases',
  organizationOwned: true,
  hooks: releaseHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['planned', 'in_progress', 'released', 'cancelled'] },
  { name: 'targetDate', label: 'Target Date', kind: 'datetime', optional: true },
  { name: 'releasedAt', label: 'Released At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'milestoneWorkItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'targetDate', label: 'Target Date', kind: 'datetime' },
  { name: 'releasedAt', label: 'Released At', kind: 'datetime' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'milestoneWorkItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    description: '',
    status: '',
    targetDate: '',
    releasedAt: '',
    projectId: '',
    milestoneWorkItemId: '',
    organizationId: '',
  },
};
