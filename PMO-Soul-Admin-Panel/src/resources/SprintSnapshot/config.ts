import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface SprintSnapshot {
  id: number;
  sprintId: number;
  date: string;
  scopePoints: string;
  completedPoints: string;
  scopeHours: string;
  remainingHours: string;
  itemCount: number;
  doneCount: number;
  organizationId?: number;
}

export const sprintsnapshotHooks = makeResourceHooks<SprintSnapshot & { id: number }>('sprintsnapshot', 'Sprint Snapshot');

const schema = z.object({
    date: z.string().min(1, 'Date is required'),
    scopePoints: z.string().min(1, 'Scope Points is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    completedPoints: z.string().min(1, 'Completed Points is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    scopeHours: z.string().min(1, 'Scope Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    remainingHours: z.string().min(1, 'Remaining Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    itemCount: z.coerce.number({ invalid_type_error: 'Item Count is required' }),
    doneCount: z.coerce.number({ invalid_type_error: 'Done Count is required' }),
    sprintId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'sprintsnapshot',
  routeBase: '/sprintsnapshot',
  label: 'Sprint Snapshot',
  labelPlural: 'Sprint Snapshots',
  organizationOwned: true,
  hooks: sprintsnapshotHooks,
  fields: [
  { name: 'date', label: 'Date', kind: 'datetime', optional: false },
  { name: 'scopePoints', label: 'Scope Points', kind: 'decimal', optional: false },
  { name: 'completedPoints', label: 'Completed Points', kind: 'decimal', optional: false },
  { name: 'scopeHours', label: 'Scope Hours', kind: 'decimal', optional: false },
  { name: 'remainingHours', label: 'Remaining Hours', kind: 'decimal', optional: false },
  { name: 'itemCount', label: 'Item Count', kind: 'number', optional: false },
  { name: 'doneCount', label: 'Done Count', kind: 'number', optional: false },
  { name: 'sprintId', label: 'Sprint', kind: 'relation', optional: true, relation: { resource: 'sprint', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'date', label: 'Date', kind: 'datetime' },
  { name: 'scopePoints', label: 'Scope Points', kind: 'decimal' },
  { name: 'completedPoints', label: 'Completed Points', kind: 'decimal' },
  { name: 'scopeHours', label: 'Scope Hours', kind: 'decimal' },
  { name: 'sprintId', label: 'Sprint', kind: 'relation', relation: { resource: 'sprint', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    date: '',
    scopePoints: '',
    completedPoints: '',
    scopeHours: '',
    remainingHours: '',
    itemCount: undefined,
    doneCount: undefined,
    sprintId: '',
    organizationId: '',
  },
};
