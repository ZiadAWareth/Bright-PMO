import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Alert {
  id: number;
  projectId: number;
  type: string;
  severity: string;
  message: string;
  metadata?: unknown;
  escalated: boolean;
  triggeredAt: string;
  resolvedAt?: string;
  organizationId?: number;
}

export const alertHooks = makeResourceHooks<Alert & { id: number }>('alert', 'Alert');

const schema = z.object({
    type: z.enum(['budget_threshold', 'schedule_slip', 'critical_path_change', 'risk_escalation', 'wip_limit_exceeded', 'sprint_at_risk', 'overdue_items'] as [string, ...string[]], { required_error: 'Type is required' }),
    severity: z.enum(['info', 'warning', 'critical'] as [string, ...string[]], { required_error: 'Severity is required' }),
    message: z.string().min(1, 'Message is required'),
    metadata: z.string().optional(),
    escalated: z.boolean().default(false),
    triggeredAt: z.string().min(1, 'Triggered At is required'),
    resolvedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'alert',
  routeBase: '/alert',
  label: 'Alert',
  labelPlural: 'Alerts',
  organizationOwned: true,
  hooks: alertHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['budget_threshold', 'schedule_slip', 'critical_path_change', 'risk_escalation', 'wip_limit_exceeded', 'sprint_at_risk', 'overdue_items'] },
  { name: 'severity', label: 'Severity', kind: 'enum', optional: false, options: ['info', 'warning', 'critical'] },
  { name: 'message', label: 'Message', kind: 'text', optional: false },
  { name: 'metadata', label: 'Metadata', kind: 'json', optional: true },
  { name: 'escalated', label: 'Escalated', kind: 'boolean', optional: false },
  { name: 'triggeredAt', label: 'Triggered At', kind: 'datetime', optional: false },
  { name: 'resolvedAt', label: 'Resolved At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'severity', label: 'Severity', kind: 'enum' },
  { name: 'message', label: 'Message', kind: 'text' },
  { name: 'escalated', label: 'Escalated', kind: 'boolean' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    severity: '',
    message: '',
    metadata: '',
    escalated: false,
    triggeredAt: '',
    resolvedAt: '',
    projectId: '',
    organizationId: '',
  },
};
