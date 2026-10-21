import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface UserProfile {
  id: number;
  userId: number;
  username: string;
  idpUserId?: string;
  phoneNumber?: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const userprofileHooks = makeResourceHooks<UserProfile & { id: number }>('userprofile', 'User Profile');

const schema = z.object({
    username: z.string().min(1, 'Username is required'),
    idpUserId: z.string().optional(),
    phoneNumber: z.string().optional(),
    status: z.enum(['active', 'inactive', 'suspended'] as [string, ...string[]], { required_error: 'Status is required' }),
    lastLoginAt: z.string().optional(),
    userId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'userprofile',
  routeBase: '/userprofile',
  label: 'User Profile',
  labelPlural: 'User Profiles',
  organizationOwned: true,
  hooks: userprofileHooks,
  fields: [
  { name: 'username', label: 'Username', kind: 'text', optional: false },
  { name: 'idpUserId', label: 'Idp User Id', kind: 'text', optional: true },
  { name: 'phoneNumber', label: 'Phone Number', kind: 'text', optional: true },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['active', 'inactive', 'suspended'] },
  { name: 'lastLoginAt', label: 'Last Login At', kind: 'datetime', optional: true },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'username', label: 'Username', kind: 'text' },
  { name: 'idpUserId', label: 'Idp User Id', kind: 'text' },
  { name: 'phoneNumber', label: 'Phone Number', kind: 'text' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    username: '',
    idpUserId: '',
    phoneNumber: '',
    status: '',
    lastLoginAt: '',
    userId: '',
    organizationId: '',
  },
};
