import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Handover {
  id: number;
  projectId: number;
  scheduledAt: string;
  responsibleId: number;
  recipient?: string;
  receiptDocumentId?: number;
  status: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const handoverHooks = makeResourceHooks<Handover & { id: number }>('handover', 'Handover');

const schema = z.object({
    scheduledAt: z.string().min(1, 'Scheduled At is required'),
    recipient: z.string().optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed'] as [string, ...string[]], { required_error: 'Status is required' }),
    notes: z.string().optional(),
    completedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    responsibleId: z.string().optional().or(z.literal('')),
    receiptDocumentId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'handover',
  routeBase: '/handover',
  label: 'Handover',
  labelPlural: 'Handovers',
  organizationOwned: true,
  hooks: handoverHooks,
  fields: [
  { name: 'scheduledAt', label: 'Scheduled At', kind: 'datetime', optional: false },
  { name: 'recipient', label: 'Recipient', kind: 'text', optional: true },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['scheduled', 'in_progress', 'completed'] },
  { name: 'notes', label: 'Notes', kind: 'textarea', optional: true },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'responsibleId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'receiptDocumentId', label: 'Document', kind: 'relation', optional: true, relation: { resource: 'document', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'scheduledAt', label: 'Scheduled At', kind: 'datetime' },
  { name: 'recipient', label: 'Recipient', kind: 'text' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'responsibleId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'receiptDocumentId', label: 'Document', kind: 'relation', relation: { resource: 'document', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    scheduledAt: '',
    recipient: '',
    status: '',
    notes: '',
    completedAt: '',
    projectId: '',
    responsibleId: '',
    receiptDocumentId: '',
    organizationId: '',
  },
};
