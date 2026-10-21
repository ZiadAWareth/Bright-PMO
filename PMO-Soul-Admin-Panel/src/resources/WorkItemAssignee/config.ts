import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface WorkItemAssignee {
  id: number;
  workItemId: number;
  userId: number;
  assignedAt: string;
  organizationId?: number;
}

export const workitemassigneeHooks = makeResourceHooks<WorkItemAssignee & { id: number }>('workitemassignee', 'Work Item Assignee');

const schema = z.object({
    assignedAt: z.string().min(1, 'Assigned At is required'),
    workItemId: z.string().optional().or(z.literal('')),
    userId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'workitemassignee',
  routeBase: '/workitemassignee',
  label: 'Work Item Assignee',
  labelPlural: 'Work Item Assignees',
  organizationOwned: true,
  hooks: workitemassigneeHooks,
  fields: [
  { name: 'assignedAt', label: 'Assigned At', kind: 'datetime', optional: false },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'assignedAt', label: 'Assigned At', kind: 'datetime' },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    assignedAt: '',
    workItemId: '',
    userId: '',
    organizationId: '',
  },
};
