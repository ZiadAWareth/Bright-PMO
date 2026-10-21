import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ProjectClosure {
  id: number;
  projectId: number;
  status: string;
  startedAt: string;
  approvedAt?: string;
  finalNotes?: string;
  organizationId?: number;
}

export const projectclosureHooks = makeResourceHooks<ProjectClosure & { id: number }>('projectclosure', 'Project Closure');

const schema = z.object({
    status: z.enum(['in_progress', 'pending_approval', 'approved'] as [string, ...string[]], { required_error: 'Status is required' }),
    startedAt: z.string().min(1, 'Started At is required'),
    approvedAt: z.string().optional(),
    finalNotes: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'projectclosure',
  routeBase: '/projectclosure',
  label: 'Project Closure',
  labelPlural: 'Project Closures',
  organizationOwned: true,
  hooks: projectclosureHooks,
  fields: [
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['in_progress', 'pending_approval', 'approved'] },
  { name: 'startedAt', label: 'Started At', kind: 'datetime', optional: false },
  { name: 'approvedAt', label: 'Approved At', kind: 'datetime', optional: true },
  { name: 'finalNotes', label: 'Final Notes', kind: 'textarea', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'startedAt', label: 'Started At', kind: 'datetime' },
  { name: 'approvedAt', label: 'Approved At', kind: 'datetime' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    status: '',
    startedAt: '',
    approvedAt: '',
    finalNotes: '',
    projectId: '',
    organizationId: '',
  },
};
