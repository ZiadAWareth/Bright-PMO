import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Escalation {
  id: number;
  workItemId: number;
  escalatedTo: string;
  reason: string;
  status: string;
  triggeredAt: string;
  resolvedAt?: string;
  organizationId?: number;
}

export const escalationHooks = makeResourceHooks<Escalation & { id: number }>('escalation', 'Escalation');

const schema = z.object({
    escalatedTo: z.string().min(1, 'Escalated To is required'),
    reason: z.string().min(1, 'Reason is required'),
    status: z.enum(['open', 'acknowledged', 'resolved'] as [string, ...string[]], { required_error: 'Status is required' }),
    triggeredAt: z.string().min(1, 'Triggered At is required'),
    resolvedAt: z.string().optional(),
    workItemId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'escalation',
  routeBase: '/escalation',
  label: 'Escalation',
  labelPlural: 'Escalations',
  organizationOwned: true,
  hooks: escalationHooks,
  fields: [
  { name: 'escalatedTo', label: 'Escalated To', kind: 'text', optional: false },
  { name: 'reason', label: 'Reason', kind: 'text', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['open', 'acknowledged', 'resolved'] },
  { name: 'triggeredAt', label: 'Triggered At', kind: 'datetime', optional: false },
  { name: 'resolvedAt', label: 'Resolved At', kind: 'datetime', optional: true },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'escalatedTo', label: 'Escalated To', kind: 'text' },
  { name: 'reason', label: 'Reason', kind: 'text' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'triggeredAt', label: 'Triggered At', kind: 'datetime' },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    escalatedTo: '',
    reason: '',
    status: '',
    triggeredAt: '',
    resolvedAt: '',
    workItemId: '',
    organizationId: '',
  },
};
