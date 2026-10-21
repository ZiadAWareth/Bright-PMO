import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ActivityLog {
  id: number;
  organizationId?: number;
  userId: number;
  action: string;
  entityType: string;
  entityId?: number;
  projectId?: number;
  title: string;
  metadata?: unknown;
  createdAt: string;
}

export const activitylogHooks = makeResourceHooks<ActivityLog & { id: number }>('activitylog', 'Activity Log');

const schema = z.object({
    action: z.string().min(1, 'Action is required'),
    entityType: z.string().min(1, 'Entity Type is required'),
    entityId: z.coerce.number().optional(),
    projectId: z.coerce.number().optional(),
    title: z.string().min(1, 'Title is required'),
    metadata: z.string().optional(),
    userId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'activitylog',
  routeBase: '/activitylog',
  label: 'Activity Log',
  labelPlural: 'Activity Logs',
  organizationOwned: true,
  hooks: activitylogHooks,
  fields: [
  { name: 'action', label: 'Action', kind: 'text', optional: false },
  { name: 'entityType', label: 'Entity Type', kind: 'text', optional: false },
  { name: 'entityId', label: 'Entity Id', kind: 'number', optional: true },
  { name: 'projectId', label: 'Project Id', kind: 'number', optional: true },
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'metadata', label: 'Metadata', kind: 'json', optional: true },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'action', label: 'Action', kind: 'text' },
  { name: 'entityType', label: 'Entity Type', kind: 'text' },
  { name: 'entityId', label: 'Entity Id', kind: 'number' },
  { name: 'projectId', label: 'Project Id', kind: 'number' },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    action: '',
    entityType: '',
    entityId: undefined,
    projectId: undefined,
    title: '',
    metadata: '',
    userId: '',
    organizationId: '',
  },
};
