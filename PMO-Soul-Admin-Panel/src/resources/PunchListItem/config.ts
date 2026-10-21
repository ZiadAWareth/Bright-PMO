import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface PunchListItem {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  location?: string;
  status: string;
  assigneeId?: number;
  dueOn?: string;
  resolvedAt?: string;
  createdAt: string;
  organizationId?: number;
}

export const punchlistitemHooks = makeResourceHooks<PunchListItem & { id: number }>('punchlistitem', 'Punch List Item');

const schema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(['open', 'in_progress', 'resolved'] as [string, ...string[]], { required_error: 'Status is required' }),
    dueOn: z.string().optional(),
    resolvedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    assigneeId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'punchlistitem',
  routeBase: '/punchlistitem',
  label: 'Punch List Item',
  labelPlural: 'Punch List Items',
  organizationOwned: true,
  hooks: punchlistitemHooks,
  fields: [
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'location', label: 'Location', kind: 'text', optional: true },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['open', 'in_progress', 'resolved'] },
  { name: 'dueOn', label: 'Due On', kind: 'datetime', optional: true },
  { name: 'resolvedAt', label: 'Resolved At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'assigneeId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'location', label: 'Location', kind: 'text' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'dueOn', label: 'Due On', kind: 'datetime' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'assigneeId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    title: '',
    description: '',
    location: '',
    status: '',
    dueOn: '',
    resolvedAt: '',
    projectId: '',
    assigneeId: '',
    organizationId: '',
  },
};
