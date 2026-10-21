import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ChecklistItem {
  id: number;
  checklistId: number;
  label: string;
  isDone: boolean;
  doneAt?: string;
  doneById?: number;
  sortOrder: number;
  organizationId?: number;
}

export const checklistitemHooks = makeResourceHooks<ChecklistItem & { id: number }>('checklistitem', 'Checklist Item');

const schema = z.object({
    label: z.string().min(1, 'Label is required'),
    isDone: z.boolean().default(false),
    doneAt: z.string().optional(),
    sortOrder: z.coerce.number({ invalid_type_error: 'Sort Order is required' }),
    checklistId: z.string().optional().or(z.literal('')),
    doneById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'checklistitem',
  routeBase: '/checklistitem',
  label: 'Checklist Item',
  labelPlural: 'Checklist Items',
  organizationOwned: true,
  hooks: checklistitemHooks,
  fields: [
  { name: 'label', label: 'Label', kind: 'text', optional: false },
  { name: 'isDone', label: 'Is Done', kind: 'boolean', optional: false },
  { name: 'doneAt', label: 'Done At', kind: 'datetime', optional: true },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number', optional: false },
  { name: 'checklistId', label: 'Checklist', kind: 'relation', optional: true, relation: { resource: 'checklist', displayField: 'title', refField: 'id' } },
  { name: 'doneById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'label', label: 'Label', kind: 'text' },
  { name: 'isDone', label: 'Is Done', kind: 'boolean' },
  { name: 'doneAt', label: 'Done At', kind: 'datetime' },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number' },
  { name: 'checklistId', label: 'Checklist', kind: 'relation', relation: { resource: 'checklist', displayField: 'title', refField: 'id' } },
  { name: 'doneById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    label: '',
    isDone: false,
    doneAt: '',
    sortOrder: undefined,
    checklistId: '',
    doneById: '',
    organizationId: '',
  },
};
