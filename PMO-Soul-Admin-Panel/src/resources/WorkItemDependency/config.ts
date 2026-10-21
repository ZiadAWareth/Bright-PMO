import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface WorkItemDependency {
  id: number;
  predecessorId: number;
  successorId: number;
  type: string;
  lagDays: number;
  createdAt: string;
  organizationId?: number;
}

export const workitemdependencyHooks = makeResourceHooks<WorkItemDependency & { id: number }>('workitemdependency', 'Work Item Dependency');

const schema = z.object({
    type: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'] as [string, ...string[]], { required_error: 'Type is required' }),
    lagDays: z.coerce.number({ invalid_type_error: 'Lag Days is required' }),
    predecessorId: z.string().optional().or(z.literal('')),
    successorId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'workitemdependency',
  routeBase: '/workitemdependency',
  label: 'Work Item Dependency',
  labelPlural: 'Work Item Dependencies',
  organizationOwned: true,
  hooks: workitemdependencyHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'] },
  { name: 'lagDays', label: 'Lag Days', kind: 'number', optional: false },
  { name: 'predecessorId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'successorId', label: 'Workitem Successor', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'lagDays', label: 'Lag Days', kind: 'number' },
  { name: 'createdAt', label: 'Created At', kind: 'datetime' },
  { name: 'predecessorId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'successorId', label: 'Workitem Successor', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    lagDays: undefined,
    predecessorId: '',
    successorId: '',
    organizationId: '',
  },
};
