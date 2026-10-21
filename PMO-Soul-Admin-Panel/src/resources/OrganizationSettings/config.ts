import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface OrganizationSettings {
  id: number;
  organizationId: number;
  status: string;
  idpOrganizationId?: string;
  timezone: string;
  defaultCurrency: string;
  logoStorageKey?: string;
  settings?: unknown;
  createdAt: string;
  updatedAt: string;
}

export const organizationsettingsHooks = makeResourceHooks<OrganizationSettings & { id: number }>('organizationsettings', 'Organization Settings');

const schema = z.object({
    status: z.enum(['trial', 'active', 'suspended'] as [string, ...string[]], { required_error: 'Status is required' }),
    idpOrganizationId: z.string().optional(),
    timezone: z.string().min(1, 'Timezone is required'),
    defaultCurrency: z.string().min(1, 'Default Currency is required'),
    logoStorageKey: z.string().optional(),
    settings: z.string().optional(),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'organizationsettings',
  routeBase: '/organizationsettings',
  label: 'Organization Settings',
  labelPlural: 'Organization Settings',
  organizationOwned: true,
  hooks: organizationsettingsHooks,
  fields: [
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['trial', 'active', 'suspended'] },
  { name: 'idpOrganizationId', label: 'Idp Organization Id', kind: 'text', optional: true },
  { name: 'timezone', label: 'Timezone', kind: 'text', optional: false },
  { name: 'defaultCurrency', label: 'Default Currency', kind: 'text', optional: false },
  { name: 'logoStorageKey', label: 'Logo Storage Key', kind: 'text', optional: true },
  { name: 'settings', label: 'Settings', kind: 'json', optional: true },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'idpOrganizationId', label: 'Idp Organization Id', kind: 'text' },
  { name: 'timezone', label: 'Timezone', kind: 'text' },
  { name: 'defaultCurrency', label: 'Default Currency', kind: 'text' },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    status: '',
    idpOrganizationId: '',
    timezone: '',
    defaultCurrency: '',
    logoStorageKey: '',
    settings: '',
    organizationId: '',
  },
};
