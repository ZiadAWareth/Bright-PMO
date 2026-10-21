import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ClosureTemplateItem {
  id: number;
  templateId: number;
  type: string;
  title: string;
  documentType?: string;
  isRequired: boolean;
  sortOrder: number;
  organizationId?: number;
}

export const closuretemplateitemHooks = makeResourceHooks<ClosureTemplateItem & { id: number }>('closuretemplateitem', 'Closure Template Item');

const schema = z.object({
    type: z.enum(['document', 'checklist', 'inspection', 'punch_list', 'handover', 'approval', 'retrospective', 'release_notes', 'custom'] as [string, ...string[]], { required_error: 'Type is required' }),
    title: z.string().min(1, 'Title is required'),
    documentType: z.string().optional(),
    isRequired: z.boolean().default(false),
    sortOrder: z.coerce.number({ invalid_type_error: 'Sort Order is required' }),
    templateId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'closuretemplateitem',
  routeBase: '/closuretemplateitem',
  label: 'Closure Template Item',
  labelPlural: 'Closure Template Items',
  organizationOwned: true,
  hooks: closuretemplateitemHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['document', 'checklist', 'inspection', 'punch_list', 'handover', 'approval', 'retrospective', 'release_notes', 'custom'] },
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'documentType', label: 'Document Type', kind: 'text', optional: true },
  { name: 'isRequired', label: 'Is Required', kind: 'boolean', optional: false },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number', optional: false },
  { name: 'templateId', label: 'Closuretemplate', kind: 'relation', optional: true, relation: { resource: 'closuretemplate', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'documentType', label: 'Document Type', kind: 'text' },
  { name: 'isRequired', label: 'Is Required', kind: 'boolean' },
  { name: 'templateId', label: 'Closuretemplate', kind: 'relation', relation: { resource: 'closuretemplate', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    title: '',
    documentType: '',
    isRequired: false,
    sortOrder: undefined,
    templateId: '',
    organizationId: '',
  },
};
