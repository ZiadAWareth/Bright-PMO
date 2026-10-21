import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface MaintenanceLog {
  id: number;
  scheduleId?: number;
  resourceId: number;
  type: string;
  performedAt: string;
  performedById: number;
  workDescription: string;
  partsUsed?: string;
  laborHours?: string;
  partsCost?: string;
  laborCost?: string;
  totalCost?: string;
  conditionBefore?: string;
  conditionAfter?: string;
  nextServiceDate?: string;
  notes?: string;
  createdAt: string;
  organizationId?: number;
}

export const maintenancelogHooks = makeResourceHooks<MaintenanceLog & { id: number }>('maintenancelog', 'Maintenance Log');

const schema = z.object({
    type: z.enum(['routine', 'repair', 'inspection', 'compliance', 'emergency'] as [string, ...string[]], { required_error: 'Type is required' }),
    performedAt: z.string().min(1, 'Performed At is required'),
    workDescription: z.string().min(1, 'Work Description is required'),
    partsUsed: z.string().optional(),
    laborHours: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    partsCost: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    laborCost: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    totalCost: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    conditionBefore: z.string().optional(),
    conditionAfter: z.string().optional(),
    nextServiceDate: z.string().optional(),
    notes: z.string().optional(),
    scheduleId: z.string().optional().or(z.literal('')),
    resourceId: z.string().optional().or(z.literal('')),
    performedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'maintenancelog',
  routeBase: '/maintenancelog',
  label: 'Maintenance Log',
  labelPlural: 'Maintenance Logs',
  organizationOwned: true,
  hooks: maintenancelogHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['routine', 'repair', 'inspection', 'compliance', 'emergency'] },
  { name: 'performedAt', label: 'Performed At', kind: 'datetime', optional: false },
  { name: 'workDescription', label: 'Work Description', kind: 'textarea', optional: false },
  { name: 'partsUsed', label: 'Parts Used', kind: 'text', optional: true },
  { name: 'laborHours', label: 'Labor Hours', kind: 'decimal', optional: true },
  { name: 'partsCost', label: 'Parts Cost', kind: 'decimal', optional: true },
  { name: 'laborCost', label: 'Labor Cost', kind: 'decimal', optional: true },
  { name: 'totalCost', label: 'Total Cost', kind: 'decimal', optional: true },
  { name: 'conditionBefore', label: 'Condition Before', kind: 'text', optional: true },
  { name: 'conditionAfter', label: 'Condition After', kind: 'text', optional: true },
  { name: 'nextServiceDate', label: 'Next Service Date', kind: 'datetime', optional: true },
  { name: 'notes', label: 'Notes', kind: 'textarea', optional: true },
  { name: 'scheduleId', label: 'Maintenanceschedule', kind: 'relation', optional: true, relation: { resource: 'maintenanceschedule', displayField: 'triggerValue', refField: 'id' } },
  { name: 'resourceId', label: 'Resource', kind: 'relation', optional: true, relation: { resource: 'resource', displayField: 'name', refField: 'id' } },
  { name: 'performedById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'performedAt', label: 'Performed At', kind: 'datetime' },
  { name: 'partsUsed', label: 'Parts Used', kind: 'text' },
  { name: 'laborHours', label: 'Labor Hours', kind: 'decimal' },
  { name: 'scheduleId', label: 'Maintenanceschedule', kind: 'relation', relation: { resource: 'maintenanceschedule', displayField: 'triggerValue', refField: 'id' } },
  { name: 'resourceId', label: 'Resource', kind: 'relation', relation: { resource: 'resource', displayField: 'name', refField: 'id' } },
  { name: 'performedById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    performedAt: '',
    workDescription: '',
    partsUsed: '',
    laborHours: '',
    partsCost: '',
    laborCost: '',
    totalCost: '',
    conditionBefore: '',
    conditionAfter: '',
    nextServiceDate: '',
    notes: '',
    scheduleId: '',
    resourceId: '',
    performedById: '',
    organizationId: '',
  },
};
