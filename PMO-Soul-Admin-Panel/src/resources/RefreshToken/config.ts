import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface RefreshToken {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: string;
  revokedAt?: string;
  userAgent?: string;
  createdAt: string;
  organizationId?: number;
}

export const refreshtokenHooks = makeResourceHooks<RefreshToken & { id: number }>('refreshtoken', 'Refresh Token');

const schema = z.object({
    tokenHash: z.string().min(1, 'Token Hash is required'),
    expiresAt: z.string().min(1, 'Expires At is required'),
    revokedAt: z.string().optional(),
    userAgent: z.string().optional(),
    userId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'refreshtoken',
  routeBase: '/refreshtoken',
  label: 'Refresh Token',
  labelPlural: 'Refresh Tokens',
  organizationOwned: true,
  hooks: refreshtokenHooks,
  fields: [
  { name: 'tokenHash', label: 'Token Hash', kind: 'text', optional: false },
  { name: 'expiresAt', label: 'Expires At', kind: 'datetime', optional: false },
  { name: 'revokedAt', label: 'Revoked At', kind: 'datetime', optional: true },
  { name: 'userAgent', label: 'User Agent', kind: 'text', optional: true },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'tokenHash', label: 'Token Hash', kind: 'text' },
  { name: 'expiresAt', label: 'Expires At', kind: 'datetime' },
  { name: 'revokedAt', label: 'Revoked At', kind: 'datetime' },
  { name: 'userAgent', label: 'User Agent', kind: 'text' },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    tokenHash: '',
    expiresAt: '',
    revokedAt: '',
    userAgent: '',
    userId: '',
    organizationId: '',
  },
};
