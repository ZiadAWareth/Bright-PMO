import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  primaryColor?: string;
  secondaryColor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const organizationHooks = makeResourceHooks<Organization & { id: number }>('organization', 'Organization');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    isActive: z.boolean().default(false),
});

export const config: ResourceConfig = {
  resource: 'organization',
  routeBase: '/organization',
  label: 'Organization',
  labelPlural: 'Organizations',
  hooks: organizationHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'slug', label: 'Slug', kind: 'text', optional: false },
  { name: 'primaryColor', label: 'Primary Color', kind: 'color', optional: true },
  { name: 'secondaryColor', label: 'Secondary Color', kind: 'color', optional: true },
  { name: 'isActive', label: 'Is Active', kind: 'boolean', optional: false },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'slug', label: 'Slug', kind: 'text' },
  { name: 'primaryColor', label: 'Primary Color', kind: 'color' },
  { name: 'secondaryColor', label: 'Secondary Color', kind: 'color' },
  ],
  schema,
  defaultValues: {
    name: '',
    slug: '',
    primaryColor: '',
    secondaryColor: '',
    isActive: false,
  },
};
