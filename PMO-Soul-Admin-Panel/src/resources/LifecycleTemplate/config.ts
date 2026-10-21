import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface LifecycleTemplate {
  id: number;
  organizationId: number;
  name: string;
  methodology: string;
  gating: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const lifecycletemplateHooks = makeResourceHooks<LifecycleTemplate & { id: number }>('lifecycletemplate', 'Lifecycle Template');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    methodology: z.enum(['waterfall', 'agile', 'hybrid'] as [string, ...string[]], { required_error: 'Methodology is required' }),
    gating: z.enum(['sequential', 'free'] as [string, ...string[]], { required_error: 'Gating is required' }),
    isDefault: z.boolean().default(false),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'lifecycletemplate',
  routeBase: '/lifecycletemplate',
  label: 'Lifecycle Template',
  labelPlural: 'Lifecycle Templates',
  organizationOwned: true,
  hooks: lifecycletemplateHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'methodology', label: 'Methodology', kind: 'enum', optional: false, options: ['waterfall', 'agile', 'hybrid'] },
  { name: 'gating', label: 'Gating', kind: 'enum', optional: false, options: ['sequential', 'free'] },
  { name: 'isDefault', label: 'Is Default', kind: 'boolean', optional: false },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'methodology', label: 'Methodology', kind: 'enum' },
  { name: 'gating', label: 'Gating', kind: 'enum' },
  { name: 'isDefault', label: 'Is Default', kind: 'boolean' },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    methodology: '',
    gating: '',
    isDefault: false,
    organizationId: '',
  },
};
