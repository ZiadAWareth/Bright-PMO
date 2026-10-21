import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ClosureItem {
  id: number;
  closureId: number;
  type: string;
  title: string;
  documentType?: string;
  isRequired: boolean;
  status: string;
  autoChecked: boolean;
  documentId?: number;
  notes?: string;
  sortOrder: number;
  completedAt?: string;
  completedById?: number;
  organizationId?: number;
}

export const closureitemHooks = makeResourceHooks<ClosureItem & { id: number }>('closureitem', 'Closure Item');

const schema = z.object({
    type: z.enum(['document', 'checklist', 'inspection', 'punch_list', 'handover', 'approval', 'retrospective', 'release_notes', 'custom'] as [string, ...string[]], { required_error: 'Type is required' }),
    title: z.string().min(1, 'Title is required'),
    documentType: z.string().optional(),
    isRequired: z.boolean().default(false),
    status: z.enum(['pending', 'complete', 'waived'] as [string, ...string[]], { required_error: 'Status is required' }),
    autoChecked: z.boolean().default(false),
    notes: z.string().optional(),
    sortOrder: z.coerce.number({ invalid_type_error: 'Sort Order is required' }),
    completedAt: z.string().optional(),
    closureId: z.string().optional().or(z.literal('')),
    documentId: z.string().optional().or(z.literal('')),
    completedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'closureitem',
  routeBase: '/closureitem',
  label: 'Closure Item',
  labelPlural: 'Closure Items',
  organizationOwned: true,
  hooks: closureitemHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['document', 'checklist', 'inspection', 'punch_list', 'handover', 'approval', 'retrospective', 'release_notes', 'custom'] },
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'documentType', label: 'Document Type', kind: 'text', optional: true },
  { name: 'isRequired', label: 'Is Required', kind: 'boolean', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['pending', 'complete', 'waived'] },
  { name: 'autoChecked', label: 'Auto Checked', kind: 'boolean', optional: false },
  { name: 'notes', label: 'Notes', kind: 'textarea', optional: true },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number', optional: false },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime', optional: true },
  { name: 'closureId', label: 'Projectclosure', kind: 'relation', optional: true, relation: { resource: 'projectclosure', displayField: 'finalNotes', refField: 'id' } },
  { name: 'documentId', label: 'Document', kind: 'relation', optional: true, relation: { resource: 'document', displayField: 'name', refField: 'id' } },
  { name: 'completedById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'documentType', label: 'Document Type', kind: 'text' },
  { name: 'isRequired', label: 'Is Required', kind: 'boolean' },
  { name: 'closureId', label: 'Projectclosure', kind: 'relation', relation: { resource: 'projectclosure', displayField: 'finalNotes', refField: 'id' } },
  { name: 'documentId', label: 'Document', kind: 'relation', relation: { resource: 'document', displayField: 'name', refField: 'id' } },
  { name: 'completedById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    title: '',
    documentType: '',
    isRequired: false,
    status: '',
    autoChecked: false,
    notes: '',
    sortOrder: undefined,
    completedAt: '',
    closureId: '',
    documentId: '',
    completedById: '',
    organizationId: '',
  },
};
