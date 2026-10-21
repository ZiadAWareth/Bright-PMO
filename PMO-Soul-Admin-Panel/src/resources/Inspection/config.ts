import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Inspection {
  id: number;
  projectId: number;
  kind: string;
  scheduledAt: string;
  inspectorId?: number;
  status: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const inspectionHooks = makeResourceHooks<Inspection & { id: number }>('inspection', 'Inspection');

const schema = z.object({
    kind: z.string().min(1, 'Kind is required'),
    scheduledAt: z.string().min(1, 'Scheduled At is required'),
    status: z.enum(['scheduled', 'in_progress', 'passed', 'failed'] as [string, ...string[]], { required_error: 'Status is required' }),
    notes: z.string().optional(),
    completedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    inspectorId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'inspection',
  routeBase: '/inspection',
  label: 'Inspection',
  labelPlural: 'Inspections',
  organizationOwned: true,
  hooks: inspectionHooks,
  fields: [
  { name: 'kind', label: 'Kind', kind: 'text', optional: false },
  { name: 'scheduledAt', label: 'Scheduled At', kind: 'datetime', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['scheduled', 'in_progress', 'passed', 'failed'] },
  { name: 'notes', label: 'Notes', kind: 'textarea', optional: true },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'inspectorId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'kind', label: 'Kind', kind: 'text' },
  { name: 'scheduledAt', label: 'Scheduled At', kind: 'datetime' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'inspectorId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    kind: '',
    scheduledAt: '',
    status: '',
    notes: '',
    completedAt: '',
    projectId: '',
    inspectorId: '',
    organizationId: '',
  },
};
