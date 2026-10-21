import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Eps {
  id: number;
  organizationId: number;
  code: string;
  name: string;
  description?: string;
  level: number;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
}

export const epsHooks = makeResourceHooks<Eps & { id: number }>('eps', 'Eps');

const schema = z.object({
    code: z.string().min(1, 'Code is required'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    level: z.coerce.number({ invalid_type_error: 'Level is required' }),
    parentId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'eps',
  routeBase: '/eps',
  label: 'Eps',
  labelPlural: 'Eps',
  organizationOwned: true,
  hooks: epsHooks,
  fields: [
  { name: 'code', label: 'Code', kind: 'text', optional: false },
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'level', label: 'Level', kind: 'number', optional: false },
  { name: 'parentId', label: 'Eps', kind: 'relation', optional: true, relation: { resource: 'eps', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'code', label: 'Code', kind: 'text' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'level', label: 'Level', kind: 'number' },
  { name: 'createdAt', label: 'Created At', kind: 'datetime' },
  { name: 'parentId', label: 'Eps', kind: 'relation', relation: { resource: 'eps', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    code: '',
    name: '',
    description: '',
    level: undefined,
    parentId: '',
    organizationId: '',
  },
};
