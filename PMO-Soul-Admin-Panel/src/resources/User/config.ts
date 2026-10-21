import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  roleId?: number;
  businessUnitId?: number;
  createdAt: string;
  updatedAt: string;
  isPlatformAdmin: boolean;
  organizationId?: number;
}

export const userHooks = makeResourceHooks<User & { id: number }>('user', 'User');

const schema = z.object({
    firstName: z.string().min(1, 'First Name is required'),
    lastName: z.string().min(1, 'Last Name is required'),
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    password: z.string().optional(),
    roleId: z.string().optional().or(z.literal('')),
    businessUnitId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'user',
  routeBase: '/user',
  label: 'User',
  labelPlural: 'Users',
  hooks: userHooks,
  fields: [
  { name: 'firstName', label: 'First Name', kind: 'text', optional: false },
  { name: 'lastName', label: 'Last Name', kind: 'text', optional: false },
  { name: 'email', label: 'Email', kind: 'email', optional: false },
  { name: 'password', label: 'Password', kind: 'password', optional: true },
  { name: 'roleId', label: 'Rolesandpermissions', kind: 'relation', optional: true, relation: { resource: 'rolesandpermissions', displayField: 'role', refField: 'id' } },
  { name: 'businessUnitId', label: 'Businessunit', kind: 'relation', optional: true, relation: { resource: 'businessunit', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'firstName', label: 'First Name', kind: 'text' },
  { name: 'lastName', label: 'Last Name', kind: 'text' },
  { name: 'email', label: 'Email', kind: 'email' },
  { name: 'createdAt', label: 'Created At', kind: 'datetime' },
  { name: 'roleId', label: 'Rolesandpermissions', kind: 'relation', relation: { resource: 'rolesandpermissions', displayField: 'role', refField: 'id' } },
  { name: 'businessUnitId', label: 'Businessunit', kind: 'relation', relation: { resource: 'businessunit', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: '',
    businessUnitId: '',
    organizationId: '',
  },
  invites: true,
};
