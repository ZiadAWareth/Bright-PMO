import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface SprintCapacity {
  id: number;
  sprintId: number;
  userId: number;
  availableHours: string;
  availablePoints?: string;
  daysOff: number;
  organizationId?: number;
}

export const sprintcapacityHooks = makeResourceHooks<SprintCapacity & { id: number }>('sprintcapacity', 'Sprint Capacity');

const schema = z.object({
    availableHours: z.string().min(1, 'Available Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    availablePoints: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    daysOff: z.coerce.number({ invalid_type_error: 'Days Off is required' }),
    sprintId: z.string().optional().or(z.literal('')),
    userId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'sprintcapacity',
  routeBase: '/sprintcapacity',
  label: 'Sprint Capacity',
  labelPlural: 'Sprint Capacities',
  organizationOwned: true,
  hooks: sprintcapacityHooks,
  fields: [
  { name: 'availableHours', label: 'Available Hours', kind: 'decimal', optional: false },
  { name: 'availablePoints', label: 'Available Points', kind: 'decimal', optional: true },
  { name: 'daysOff', label: 'Days Off', kind: 'number', optional: false },
  { name: 'sprintId', label: 'Sprint', kind: 'relation', optional: true, relation: { resource: 'sprint', displayField: 'name', refField: 'id' } },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'availableHours', label: 'Available Hours', kind: 'decimal' },
  { name: 'availablePoints', label: 'Available Points', kind: 'decimal' },
  { name: 'daysOff', label: 'Days Off', kind: 'number' },
  { name: 'sprintId', label: 'Sprint', kind: 'relation', relation: { resource: 'sprint', displayField: 'name', refField: 'id' } },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    availableHours: '',
    availablePoints: '',
    daysOff: undefined,
    sprintId: '',
    userId: '',
    organizationId: '',
  },
};
