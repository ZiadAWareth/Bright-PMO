import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ProjectCategory {
  id: number;
  organizationId: number;
  code: string;
  name: string;
  industry?: string;
  description?: string;
  defaultMethodology: string;
  defaultAgileFramework?: string;
  lifecycleTemplateId?: number;
  closureTemplateId?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const projectcategoryHooks = makeResourceHooks<ProjectCategory & { id: number }>('projectcategory', 'Project Category');

const schema = z.object({
    code: z.string().min(1, 'Code is required'),
    name: z.string().min(1, 'Name is required'),
    industry: z.string().optional(),
    description: z.string().optional(),
    defaultMethodology: z.enum(['waterfall', 'agile', 'hybrid'] as [string, ...string[]], { required_error: 'Default Methodology is required' }),
    defaultAgileFramework: z.enum(['scrum', 'kanban'] as [string, ...string[]]).optional().or(z.literal('')),
    isActive: z.boolean().default(false),
    sortOrder: z.coerce.number({ invalid_type_error: 'Sort Order is required' }),
    lifecycleTemplateId: z.string().optional().or(z.literal('')),
    closureTemplateId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'projectcategory',
  routeBase: '/projectcategory',
  label: 'Project Category',
  labelPlural: 'Project Categories',
  organizationOwned: true,
  hooks: projectcategoryHooks,
  fields: [
  { name: 'code', label: 'Code', kind: 'text', optional: false },
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'industry', label: 'Industry', kind: 'text', optional: true },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'defaultMethodology', label: 'Default Methodology', kind: 'enum', optional: false, options: ['waterfall', 'agile', 'hybrid'] },
  { name: 'defaultAgileFramework', label: 'Default Agile Framework', kind: 'enum', optional: true, options: ['scrum', 'kanban'] },
  { name: 'isActive', label: 'Is Active', kind: 'boolean', optional: false },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number', optional: false },
  { name: 'lifecycleTemplateId', label: 'Lifecycletemplate', kind: 'relation', optional: true, relation: { resource: 'lifecycletemplate', displayField: 'name', refField: 'id' } },
  { name: 'closureTemplateId', label: 'Closuretemplate', kind: 'relation', optional: true, relation: { resource: 'closuretemplate', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'code', label: 'Code', kind: 'text' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'industry', label: 'Industry', kind: 'text' },
  { name: 'defaultMethodology', label: 'Default Methodology', kind: 'enum' },
  { name: 'lifecycleTemplateId', label: 'Lifecycletemplate', kind: 'relation', relation: { resource: 'lifecycletemplate', displayField: 'name', refField: 'id' } },
  { name: 'closureTemplateId', label: 'Closuretemplate', kind: 'relation', relation: { resource: 'closuretemplate', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    code: '',
    name: '',
    industry: '',
    description: '',
    defaultMethodology: '',
    defaultAgileFramework: '',
    isActive: false,
    sortOrder: undefined,
    lifecycleTemplateId: '',
    closureTemplateId: '',
    organizationId: '',
  },
};
