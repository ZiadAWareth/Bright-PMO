import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Vendor {
  id: number;
  organizationId: number;
  name: string;
  category: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  performanceRating: string;
  createdAt: string;
  updatedAt: string;
}

export const vendorHooks = makeResourceHooks<Vendor & { id: number }>('vendor', 'Vendor');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    contactPerson: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    performanceRating: z.string().min(1, 'Performance Rating is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'vendor',
  routeBase: '/vendor',
  label: 'Vendor',
  labelPlural: 'Vendors',
  organizationOwned: true,
  hooks: vendorHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'category', label: 'Category', kind: 'text', optional: false },
  { name: 'contactPerson', label: 'Contact Person', kind: 'text', optional: true },
  { name: 'email', label: 'Email', kind: 'email', optional: true },
  { name: 'phone', label: 'Phone', kind: 'text', optional: true },
  { name: 'address', label: 'Address', kind: 'textarea', optional: true },
  { name: 'performanceRating', label: 'Performance Rating', kind: 'decimal', optional: false },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'category', label: 'Category', kind: 'text' },
  { name: 'contactPerson', label: 'Contact Person', kind: 'text' },
  { name: 'email', label: 'Email', kind: 'email' },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    category: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    performanceRating: '',
    organizationId: '',
  },
};
