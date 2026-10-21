import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface CalendarException {
  id: number;
  calendarId: number;
  date: string;
  isWorking: boolean;
  name?: string;
  organizationId?: number;
}

export const calendarexceptionHooks = makeResourceHooks<CalendarException & { id: number }>('calendarexception', 'Calendar Exception');

const schema = z.object({
    date: z.string().min(1, 'Date is required'),
    isWorking: z.boolean().default(false),
    name: z.string().optional(),
    calendarId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'calendarexception',
  routeBase: '/calendarexception',
  label: 'Calendar Exception',
  labelPlural: 'Calendar Exceptions',
  organizationOwned: true,
  hooks: calendarexceptionHooks,
  fields: [
  { name: 'date', label: 'Date', kind: 'datetime', optional: false },
  { name: 'isWorking', label: 'Is Working', kind: 'boolean', optional: false },
  { name: 'name', label: 'Name', kind: 'text', optional: true },
  { name: 'calendarId', label: 'Workcalendar', kind: 'relation', optional: true, relation: { resource: 'workcalendar', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'date', label: 'Date', kind: 'datetime' },
  { name: 'isWorking', label: 'Is Working', kind: 'boolean' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'calendarId', label: 'Workcalendar', kind: 'relation', relation: { resource: 'workcalendar', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    date: '',
    isWorking: false,
    name: '',
    calendarId: '',
    organizationId: '',
  },
};
