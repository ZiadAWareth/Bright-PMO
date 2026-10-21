import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface MaintenanceSchedule {
  id: number;
  resourceId: number;
  type: string;
  triggerType: string;
  triggerValue: string;
  nextDueDate: string;
  status: string;
  priority: string;
  description?: string;
  estimatedHours?: string;
  estimatedCost?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const maintenancescheduleHooks = makeResourceHooks<MaintenanceSchedule & { id: number }>('maintenanceschedule', 'Maintenance Schedule');

const schema = z.object({
    type: z.enum(['routine', 'repair', 'inspection', 'compliance', 'emergency'] as [string, ...string[]], { required_error: 'Type is required' }),
    triggerType: z.enum(['time_based', 'usage_based', 'condition_based', 'regulatory'] as [string, ...string[]], { required_error: 'Trigger Type is required' }),
    triggerValue: z.string().min(1, 'Trigger Value is required'),
    nextDueDate: z.string().min(1, 'Next Due Date is required'),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'overdue', 'cancelled'] as [string, ...string[]], { required_error: 'Status is required' }),
    priority: z.enum(['low', 'medium', 'high', 'critical'] as [string, ...string[]], { required_error: 'Priority is required' }),
    description: z.string().optional(),
    estimatedHours: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    estimatedCost: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    resourceId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'maintenanceschedule',
  routeBase: '/maintenanceschedule',
  label: 'Maintenance Schedule',
  labelPlural: 'Maintenance Schedules',
  organizationOwned: true,
  hooks: maintenancescheduleHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['routine', 'repair', 'inspection', 'compliance', 'emergency'] },
  { name: 'triggerType', label: 'Trigger Type', kind: 'enum', optional: false, options: ['time_based', 'usage_based', 'condition_based', 'regulatory'] },
  { name: 'triggerValue', label: 'Trigger Value', kind: 'text', optional: false },
  { name: 'nextDueDate', label: 'Next Due Date', kind: 'datetime', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['scheduled', 'in_progress', 'completed', 'overdue', 'cancelled'] },
  { name: 'priority', label: 'Priority', kind: 'enum', optional: false, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'estimatedHours', label: 'Estimated Hours', kind: 'decimal', optional: true },
  { name: 'estimatedCost', label: 'Estimated Cost', kind: 'decimal', optional: true },
  { name: 'resourceId', label: 'Resource', kind: 'relation', optional: true, relation: { resource: 'resource', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'triggerType', label: 'Trigger Type', kind: 'enum' },
  { name: 'triggerValue', label: 'Trigger Value', kind: 'text' },
  { name: 'nextDueDate', label: 'Next Due Date', kind: 'datetime' },
  { name: 'resourceId', label: 'Resource', kind: 'relation', relation: { resource: 'resource', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    triggerType: '',
    triggerValue: '',
    nextDueDate: '',
    status: '',
    priority: '',
    description: '',
    estimatedHours: '',
    estimatedCost: '',
    resourceId: '',
    organizationId: '',
  },
};
