import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ApprovalStep {
  id: number;
  requestId: number;
  stepOrder: number;
  assigneeId?: number;
  approverRoleId?: number;
  status: string;
  decidedById?: number;
  decidedAt?: string;
  comments?: string;
  organizationId?: number;
}

export const approvalstepHooks = makeResourceHooks<ApprovalStep & { id: number }>('approvalstep', 'Approval Step');

const schema = z.object({
    stepOrder: z.coerce.number({ invalid_type_error: 'Step Order is required' }),
    approverRoleId: z.coerce.number().optional(),
    status: z.enum(['waiting', 'pending', 'approved', 'rejected', 'revision_requested', 'cancelled'] as [string, ...string[]], { required_error: 'Status is required' }),
    decidedAt: z.string().optional(),
    comments: z.string().optional(),
    requestId: z.string().optional().or(z.literal('')),
    assigneeId: z.string().optional().or(z.literal('')),
    decidedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'approvalstep',
  routeBase: '/approvalstep',
  label: 'Approval Step',
  labelPlural: 'Approval Steps',
  organizationOwned: true,
  hooks: approvalstepHooks,
  fields: [
  { name: 'stepOrder', label: 'Step Order', kind: 'number', optional: false },
  { name: 'approverRoleId', label: 'Approver Role Id', kind: 'number', optional: true },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['waiting', 'pending', 'approved', 'rejected', 'revision_requested', 'cancelled'] },
  { name: 'decidedAt', label: 'Decided At', kind: 'datetime', optional: true },
  { name: 'comments', label: 'Comments', kind: 'textarea', optional: true },
  { name: 'requestId', label: 'Approvalrequest', kind: 'relation', optional: true, relation: { resource: 'approvalrequest', displayField: 'entityType', refField: 'id' } },
  { name: 'assigneeId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'decidedById', label: 'User Decided By', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'stepOrder', label: 'Step Order', kind: 'number' },
  { name: 'approverRoleId', label: 'Approver Role Id', kind: 'number' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'decidedAt', label: 'Decided At', kind: 'datetime' },
  { name: 'requestId', label: 'Approvalrequest', kind: 'relation', relation: { resource: 'approvalrequest', displayField: 'entityType', refField: 'id' } },
  { name: 'assigneeId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'decidedById', label: 'User Decided By', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    stepOrder: undefined,
    approverRoleId: undefined,
    status: '',
    decidedAt: '',
    comments: '',
    requestId: '',
    assigneeId: '',
    decidedById: '',
    organizationId: '',
  },
};
