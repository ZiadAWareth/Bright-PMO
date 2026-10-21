import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface LifecycleTemplateStep {
  id: number;
  templateId: number;
  key: string;
  title: string;
  description?: string;
  sortOrder: number;
  isRequired: boolean;
  organizationId?: number;
}

export const lifecycletemplatestepHooks = makeResourceHooks<LifecycleTemplateStep & { id: number }>('lifecycletemplatestep', 'Lifecycle Template Step');

const schema = z.object({
    key: z.string().min(1, 'Key is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    sortOrder: z.coerce.number({ invalid_type_error: 'Sort Order is required' }),
    isRequired: z.boolean().default(false),
    templateId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'lifecycletemplatestep',
  routeBase: '/lifecycletemplatestep',
  label: 'Lifecycle Template Step',
  labelPlural: 'Lifecycle Template Steps',
  organizationOwned: true,
  hooks: lifecycletemplatestepHooks,
  fields: [
  { name: 'key', label: 'Key', kind: 'text', optional: false },
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number', optional: false },
  { name: 'isRequired', label: 'Is Required', kind: 'boolean', optional: false },
  { name: 'templateId', label: 'Lifecycletemplate', kind: 'relation', optional: true, relation: { resource: 'lifecycletemplate', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'key', label: 'Key', kind: 'text' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number' },
  { name: 'isRequired', label: 'Is Required', kind: 'boolean' },
  { name: 'templateId', label: 'Lifecycletemplate', kind: 'relation', relation: { resource: 'lifecycletemplate', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    key: '',
    title: '',
    description: '',
    sortOrder: undefined,
    isRequired: false,
    templateId: '',
    organizationId: '',
  },
};
