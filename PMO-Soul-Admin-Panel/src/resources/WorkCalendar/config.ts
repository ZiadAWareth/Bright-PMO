import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface WorkCalendar {
  id: number;
  organizationId: number;
  name: string;
  workingWeekdays: number[];
  hoursPerDay: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const workcalendarHooks = makeResourceHooks<WorkCalendar & { id: number }>('workcalendar', 'Work Calendar');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    workingWeekdays: z.string().optional(),
    hoursPerDay: z.string().min(1, 'Hours Per Day is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    isDefault: z.boolean().default(false),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'workcalendar',
  routeBase: '/workcalendar',
  label: 'Work Calendar',
  labelPlural: 'Work Calendars',
  organizationOwned: true,
  hooks: workcalendarHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'workingWeekdays', label: 'Working Weekdays', kind: 'number', optional: false, list: true },
  { name: 'hoursPerDay', label: 'Hours Per Day', kind: 'decimal', optional: false },
  { name: 'isDefault', label: 'Is Default', kind: 'boolean', optional: false },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'workingWeekdays', label: 'Working Weekdays', kind: 'number', list: true },
  { name: 'hoursPerDay', label: 'Hours Per Day', kind: 'decimal' },
  { name: 'isDefault', label: 'Is Default', kind: 'boolean' },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    workingWeekdays: '',
    hoursPerDay: '',
    isDefault: false,
    organizationId: '',
  },
};
