import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface RecurringWorkItem {
  id: number;
  projectId: number;
  wbsNodeId?: number;
  title: string;
  description?: string;
  type: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  lastCreatedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const recurringworkitemHooks = makeResourceHooks<RecurringWorkItem & { id: number }>('recurringworkitem', 'Recurring Work Item');

const schema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    type: z.enum(['epic', 'feature', 'story', 'task', 'subtask', 'bug', 'milestone'] as [string, ...string[]], { required_error: 'Type is required' }),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as [string, ...string[]], { required_error: 'Frequency is required' }),
    startDate: z.string().min(1, 'Start Date is required'),
    endDate: z.string().optional(),
    lastCreatedAt: z.string().optional(),
    isActive: z.boolean().default(false),
    projectId: z.string().optional().or(z.literal('')),
    wbsNodeId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'recurringworkitem',
  routeBase: '/recurringworkitem',
  label: 'Recurring Work Item',
  labelPlural: 'Recurring Work Items',
  organizationOwned: true,
  hooks: recurringworkitemHooks,
  fields: [
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['epic', 'feature', 'story', 'task', 'subtask', 'bug', 'milestone'] },
  { name: 'frequency', label: 'Frequency', kind: 'enum', optional: false, options: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
  { name: 'startDate', label: 'Start Date', kind: 'datetime', optional: false },
  { name: 'endDate', label: 'End Date', kind: 'datetime', optional: true },
  { name: 'lastCreatedAt', label: 'Last Created At', kind: 'datetime', optional: true },
  { name: 'isActive', label: 'Is Active', kind: 'boolean', optional: false },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', optional: true, relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'frequency', label: 'Frequency', kind: 'enum' },
  { name: 'startDate', label: 'Start Date', kind: 'datetime' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    title: '',
    description: '',
    type: '',
    frequency: '',
    startDate: '',
    endDate: '',
    lastCreatedAt: '',
    isActive: false,
    projectId: '',
    wbsNodeId: '',
    organizationId: '',
  },
};
