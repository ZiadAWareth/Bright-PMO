import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface IntegrationConnection {
  id: number;
  organizationId: number;
  provider: string;
  baseUrl?: string;
  config: unknown;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const integrationconnectionHooks = makeResourceHooks<IntegrationConnection & { id: number }>('integrationconnection', 'Integration Connection');

const schema = z.object({
    provider: z.enum(['idp', 'hr', 'inventory', 'finance', 'metabase'] as [string, ...string[]], { required_error: 'Provider is required' }),
    baseUrl: z.string().optional(),
    config: z.string().min(1, 'Config is required'),
    isEnabled: z.boolean().default(false),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'integrationconnection',
  routeBase: '/integrationconnection',
  label: 'Integration Connection',
  labelPlural: 'Integration Connections',
  organizationOwned: true,
  hooks: integrationconnectionHooks,
  fields: [
  { name: 'provider', label: 'Provider', kind: 'enum', optional: false, options: ['idp', 'hr', 'inventory', 'finance', 'metabase'] },
  { name: 'baseUrl', label: 'Base Url', kind: 'url', optional: true },
  { name: 'config', label: 'Config', kind: 'json', optional: false },
  { name: 'isEnabled', label: 'Is Enabled', kind: 'boolean', optional: false },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'provider', label: 'Provider', kind: 'enum' },
  { name: 'baseUrl', label: 'Base Url', kind: 'url' },
  { name: 'isEnabled', label: 'Is Enabled', kind: 'boolean' },
  { name: 'createdAt', label: 'Created At', kind: 'datetime' },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    provider: '',
    baseUrl: '',
    config: '',
    isEnabled: false,
    organizationId: '',
  },
};
