import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Resource {
  id: number;
  organizationId: number;
  name: string;
  type: string;
  role?: string;
  userId?: number;
  department?: string;
  skills: string[];
  rating: number;
  rate: string;
  capacityHoursPerDay: string;
  availability: string;
  unit?: string;
  quantity?: string;
  email?: string;
  phoneNumber?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export const resourceHooks = makeResourceHooks<Resource & { id: number }>('resource', 'Resource');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['labor', 'equipment', 'material'] as [string, ...string[]], { required_error: 'Type is required' }),
    role: z.string().optional(),
    department: z.string().optional(),
    skills: z.string().optional(),
    rating: z.coerce.number({ invalid_type_error: 'Rating is required' }),
    rate: z.string().min(1, 'Rate is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    capacityHoursPerDay: z.string().min(1, 'Capacity Hours Per Day is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    availability: z.enum(['available', 'on_leave', 'inactive'] as [string, ...string[]], { required_error: 'Availability is required' }),
    unit: z.string().optional(),
    quantity: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phoneNumber: z.string().optional(),
    location: z.string().optional(),
    userId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'resource',
  routeBase: '/resource',
  label: 'Resource',
  labelPlural: 'Resources',
  organizationOwned: true,
  hooks: resourceHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['labor', 'equipment', 'material'] },
  { name: 'role', label: 'Role', kind: 'text', optional: true },
  { name: 'department', label: 'Department', kind: 'text', optional: true },
  { name: 'skills', label: 'Skills', kind: 'text', optional: false, list: true },
  { name: 'rating', label: 'Rating', kind: 'number', optional: false },
  { name: 'rate', label: 'Rate', kind: 'decimal', optional: false },
  { name: 'capacityHoursPerDay', label: 'Capacity Hours Per Day', kind: 'decimal', optional: false },
  { name: 'availability', label: 'Availability', kind: 'enum', optional: false, options: ['available', 'on_leave', 'inactive'] },
  { name: 'unit', label: 'Unit', kind: 'text', optional: true },
  { name: 'quantity', label: 'Quantity', kind: 'decimal', optional: true },
  { name: 'email', label: 'Email', kind: 'email', optional: true },
  { name: 'phoneNumber', label: 'Phone Number', kind: 'text', optional: true },
  { name: 'location', label: 'Location', kind: 'text', optional: true },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'role', label: 'Role', kind: 'text' },
  { name: 'department', label: 'Department', kind: 'text' },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    type: '',
    role: '',
    department: '',
    skills: '',
    rating: undefined,
    rate: '',
    capacityHoursPerDay: '',
    availability: '',
    unit: '',
    quantity: '',
    email: '',
    phoneNumber: '',
    location: '',
    userId: '',
    organizationId: '',
  },
};
