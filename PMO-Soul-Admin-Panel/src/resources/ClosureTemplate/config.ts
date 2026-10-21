import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ClosureTemplate {
  id: number;
  organizationId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const closuretemplateHooks = makeResourceHooks<ClosureTemplate & { id: number }>('closuretemplate', 'Closure Template');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'closuretemplate',
  routeBase: '/closuretemplate',
  label: 'Closure Template',
  labelPlural: 'Closure Templates',
  organizationOwned: true,
  hooks: closuretemplateHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'createdAt', label: 'Created At', kind: 'datetime' },
  { name: 'updatedAt', label: 'Updated At', kind: 'datetime' },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    organizationId: '',
  },
};
