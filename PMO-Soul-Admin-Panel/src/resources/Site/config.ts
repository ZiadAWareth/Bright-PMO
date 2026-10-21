import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Site {
  id: number;
  code: string;
  projectId: number;
  name: string;
  description?: string;
  address?: string;
  coordinates?: string;
  siteType?: string;
  managerId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const siteHooks = makeResourceHooks<Site & { id: number }>('site', 'Site');

const schema = z.object({
    code: z.string().min(1, 'Code is required'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    address: z.string().optional(),
    coordinates: z.string().optional(),
    siteType: z.string().optional(),
    isActive: z.boolean().default(false),
    projectId: z.string().optional().or(z.literal('')),
    managerId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'site',
  routeBase: '/site',
  label: 'Site',
  labelPlural: 'Sites',
  organizationOwned: true,
  hooks: siteHooks,
  fields: [
  { name: 'code', label: 'Code', kind: 'text', optional: false },
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'address', label: 'Address', kind: 'textarea', optional: true },
  { name: 'coordinates', label: 'Coordinates', kind: 'text', optional: true },
  { name: 'siteType', label: 'Site Type', kind: 'text', optional: true },
  { name: 'isActive', label: 'Is Active', kind: 'boolean', optional: false },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'managerId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'code', label: 'Code', kind: 'text' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'coordinates', label: 'Coordinates', kind: 'text' },
  { name: 'siteType', label: 'Site Type', kind: 'text' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'managerId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    code: '',
    name: '',
    description: '',
    address: '',
    coordinates: '',
    siteType: '',
    isActive: false,
    projectId: '',
    managerId: '',
    organizationId: '',
  },
};
