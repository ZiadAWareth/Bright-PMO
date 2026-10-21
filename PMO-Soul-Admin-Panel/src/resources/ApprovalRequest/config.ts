import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ApprovalRequest {
  id: number;
  type: string;
  status: string;
  projectId: number;
  entityType: string;
  entityId: number;
  payload?: unknown;
  requestedById: number;
  requestedAt: string;
  resolvedAt?: string;
  organizationId?: number;
}

export const approvalrequestHooks = makeResourceHooks<ApprovalRequest & { id: number }>('approvalrequest', 'Approval Request');

const schema = z.object({
    type: z.enum(['project_creation', 'budget_change', 'schedule_change', 'scope_change', 'phase_gate', 'checklist', 'project_closure'] as [string, ...string[]], { required_error: 'Type is required' }),
    status: z.enum(['waiting', 'pending', 'approved', 'rejected', 'revision_requested', 'cancelled'] as [string, ...string[]], { required_error: 'Status is required' }),
    entityType: z.string().min(1, 'Entity Type is required'),
    entityId: z.coerce.number({ invalid_type_error: 'Entity Id is required' }),
    payload: z.string().optional(),
    requestedAt: z.string().min(1, 'Requested At is required'),
    resolvedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    requestedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'approvalrequest',
  routeBase: '/approvalrequest',
  label: 'Approval Request',
  labelPlural: 'Approval Requests',
  organizationOwned: true,
  hooks: approvalrequestHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['project_creation', 'budget_change', 'schedule_change', 'scope_change', 'phase_gate', 'checklist', 'project_closure'] },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['waiting', 'pending', 'approved', 'rejected', 'revision_requested', 'cancelled'] },
  { name: 'entityType', label: 'Entity Type', kind: 'text', optional: false },
  { name: 'entityId', label: 'Entity Id', kind: 'number', optional: false },
  { name: 'payload', label: 'Payload', kind: 'json', optional: true },
  { name: 'requestedAt', label: 'Requested At', kind: 'datetime', optional: false },
  { name: 'resolvedAt', label: 'Resolved At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'requestedById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'entityType', label: 'Entity Type', kind: 'text' },
  { name: 'entityId', label: 'Entity Id', kind: 'number' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'requestedById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    status: '',
    entityType: '',
    entityId: undefined,
    payload: '',
    requestedAt: '',
    resolvedAt: '',
    projectId: '',
    requestedById: '',
    organizationId: '',
  },
};
