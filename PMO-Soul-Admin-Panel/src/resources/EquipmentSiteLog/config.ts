import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface EquipmentSiteLog {
  id: number;
  resourceId: number;
  siteId: number;
  loggedById: number;
  checkedInAt: string;
  checkedOutAt?: string;
  usageHours?: string;
  conditionBefore?: string;
  conditionAfter?: string;
  notes?: string;
  createdAt: string;
  organizationId?: number;
}

export const equipmentsitelogHooks = makeResourceHooks<EquipmentSiteLog & { id: number }>('equipmentsitelog', 'Equipment Site Log');

const schema = z.object({
    checkedInAt: z.string().min(1, 'Checked In At is required'),
    checkedOutAt: z.string().optional(),
    usageHours: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    conditionBefore: z.string().optional(),
    conditionAfter: z.string().optional(),
    notes: z.string().optional(),
    resourceId: z.string().optional().or(z.literal('')),
    siteId: z.string().optional().or(z.literal('')),
    loggedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'equipmentsitelog',
  routeBase: '/equipmentsitelog',
  label: 'Equipment Site Log',
  labelPlural: 'Equipment Site Logs',
  organizationOwned: true,
  hooks: equipmentsitelogHooks,
  fields: [
  { name: 'checkedInAt', label: 'Checked In At', kind: 'datetime', optional: false },
  { name: 'checkedOutAt', label: 'Checked Out At', kind: 'datetime', optional: true },
  { name: 'usageHours', label: 'Usage Hours', kind: 'decimal', optional: true },
  { name: 'conditionBefore', label: 'Condition Before', kind: 'text', optional: true },
  { name: 'conditionAfter', label: 'Condition After', kind: 'text', optional: true },
  { name: 'notes', label: 'Notes', kind: 'textarea', optional: true },
  { name: 'resourceId', label: 'Resource', kind: 'relation', optional: true, relation: { resource: 'resource', displayField: 'name', refField: 'id' } },
  { name: 'siteId', label: 'Site', kind: 'relation', optional: true, relation: { resource: 'site', displayField: 'code', refField: 'id' } },
  { name: 'loggedById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'checkedInAt', label: 'Checked In At', kind: 'datetime' },
  { name: 'checkedOutAt', label: 'Checked Out At', kind: 'datetime' },
  { name: 'usageHours', label: 'Usage Hours', kind: 'decimal' },
  { name: 'conditionBefore', label: 'Condition Before', kind: 'text' },
  { name: 'resourceId', label: 'Resource', kind: 'relation', relation: { resource: 'resource', displayField: 'name', refField: 'id' } },
  { name: 'siteId', label: 'Site', kind: 'relation', relation: { resource: 'site', displayField: 'code', refField: 'id' } },
  { name: 'loggedById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    checkedInAt: '',
    checkedOutAt: '',
    usageHours: '',
    conditionBefore: '',
    conditionAfter: '',
    notes: '',
    resourceId: '',
    siteId: '',
    loggedById: '',
    organizationId: '',
  },
};
