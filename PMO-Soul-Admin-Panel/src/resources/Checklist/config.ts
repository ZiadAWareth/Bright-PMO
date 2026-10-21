import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Checklist {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  category: string;
  status: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const checklistHooks = makeResourceHooks<Checklist & { id: number }>('checklist', 'Checklist');

const schema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    category: z.enum(['document_verification', 'financial_closure', 'stakeholder_signoff', 'resource_release', 'lessons_learned', 'final_report', 'contract_closure', 'custom'] as [string, ...string[]], { required_error: 'Category is required' }),
    status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'needs_revision'] as [string, ...string[]], { required_error: 'Status is required' }),
    completedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'checklist',
  routeBase: '/checklist',
  label: 'Checklist',
  labelPlural: 'Checklists',
  organizationOwned: true,
  hooks: checklistHooks,
  fields: [
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'category', label: 'Category', kind: 'enum', optional: false, options: ['document_verification', 'financial_closure', 'stakeholder_signoff', 'resource_release', 'lessons_learned', 'final_report', 'contract_closure', 'custom'] },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['draft', 'submitted', 'approved', 'rejected', 'needs_revision'] },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'category', label: 'Category', kind: 'enum' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    title: '',
    description: '',
    category: '',
    status: '',
    completedAt: '',
    projectId: '',
    organizationId: '',
  },
};
