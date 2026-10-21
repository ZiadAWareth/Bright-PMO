import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ApiKey {
  id: number;
  organizationId: number;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export const apikeyHooks = makeResourceHooks<ApiKey & { id: number }>('apikey', 'Api Key');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    keyPrefix: z.string().min(1, 'Key Prefix is required'),
    keyHash: z.string().min(1, 'Key Hash is required'),
    scopes: z.string().optional(),
    lastUsedAt: z.string().optional(),
    expiresAt: z.string().optional(),
    revokedAt: z.string().optional(),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'apikey',
  routeBase: '/apikey',
  label: 'Api Key',
  labelPlural: 'Api Keys',
  organizationOwned: true,
  hooks: apikeyHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'keyPrefix', label: 'Key Prefix', kind: 'text', optional: false },
  { name: 'keyHash', label: 'Key Hash', kind: 'text', optional: false },
  { name: 'scopes', label: 'Scopes', kind: 'text', optional: false, list: true },
  { name: 'lastUsedAt', label: 'Last Used At', kind: 'datetime', optional: true },
  { name: 'expiresAt', label: 'Expires At', kind: 'datetime', optional: true },
  { name: 'revokedAt', label: 'Revoked At', kind: 'datetime', optional: true },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'keyPrefix', label: 'Key Prefix', kind: 'text' },
  { name: 'keyHash', label: 'Key Hash', kind: 'text' },
  { name: 'scopes', label: 'Scopes', kind: 'text', list: true },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    keyPrefix: '',
    keyHash: '',
    scopes: '',
    lastUsedAt: '',
    expiresAt: '',
    revokedAt: '',
    organizationId: '',
  },
};
