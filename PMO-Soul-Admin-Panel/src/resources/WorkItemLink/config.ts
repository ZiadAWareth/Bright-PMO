import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface WorkItemLink {
  id: number;
  sourceId: number;
  targetId: number;
  type: string;
  createdAt: string;
  organizationId?: number;
}

export const workitemlinkHooks = makeResourceHooks<WorkItemLink & { id: number }>('workitemlink', 'Work Item Link');

const schema = z.object({
    type: z.enum(['blocks', 'relates_to', 'duplicates'] as [string, ...string[]], { required_error: 'Type is required' }),
    sourceId: z.string().optional().or(z.literal('')),
    targetId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'workitemlink',
  routeBase: '/workitemlink',
  label: 'Work Item Link',
  labelPlural: 'Work Item Links',
  organizationOwned: true,
  hooks: workitemlinkHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['blocks', 'relates_to', 'duplicates'] },
  { name: 'sourceId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'targetId', label: 'Workitem Target', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'createdAt', label: 'Created At', kind: 'datetime' },
  { name: 'sourceId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'targetId', label: 'Workitem Target', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    sourceId: '',
    targetId: '',
    organizationId: '',
  },
};
