import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface StatusTransition {
  id: number;
  workItemId: number;
  fromStatusId?: number;
  toStatusId: number;
  changedById: number;
  changedAt: string;
  organizationId?: number;
}

export const statustransitionHooks = makeResourceHooks<StatusTransition & { id: number }>('statustransition', 'Status Transition');

const schema = z.object({
    changedAt: z.string().min(1, 'Changed At is required'),
    workItemId: z.string().optional().or(z.literal('')),
    fromStatusId: z.string().optional().or(z.literal('')),
    toStatusId: z.string().optional().or(z.literal('')),
    changedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'statustransition',
  routeBase: '/statustransition',
  label: 'Status Transition',
  labelPlural: 'Status Transitions',
  organizationOwned: true,
  hooks: statustransitionHooks,
  fields: [
  { name: 'changedAt', label: 'Changed At', kind: 'datetime', optional: false },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'fromStatusId', label: 'Workitemstatus', kind: 'relation', optional: true, relation: { resource: 'workitemstatus', displayField: 'name', refField: 'id' } },
  { name: 'toStatusId', label: 'Workitemstatus To Status', kind: 'relation', optional: true, relation: { resource: 'workitemstatus', displayField: 'name', refField: 'id' } },
  { name: 'changedById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'changedAt', label: 'Changed At', kind: 'datetime' },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'fromStatusId', label: 'Workitemstatus', kind: 'relation', relation: { resource: 'workitemstatus', displayField: 'name', refField: 'id' } },
  { name: 'toStatusId', label: 'Workitemstatus To Status', kind: 'relation', relation: { resource: 'workitemstatus', displayField: 'name', refField: 'id' } },
  { name: 'changedById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    changedAt: '',
    workItemId: '',
    fromStatusId: '',
    toStatusId: '',
    changedById: '',
    organizationId: '',
  },
};
