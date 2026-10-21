import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Sprint {
  id: number;
  projectId: number;
  phaseWbsNodeId?: number;
  name: string;
  goal?: string;
  state: string;
  startDate: string;
  endDate: string;
  committedPoints?: string;
  committedHours?: string;
  completedPoints?: string;
  completedHours?: string;
  startedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const sprintHooks = makeResourceHooks<Sprint & { id: number }>('sprint', 'Sprint');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    goal: z.string().optional(),
    state: z.enum(['planned', 'active', 'closed'] as [string, ...string[]], { required_error: 'State is required' }),
    startDate: z.string().min(1, 'Start Date is required'),
    endDate: z.string().min(1, 'End Date is required'),
    committedPoints: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    committedHours: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    completedPoints: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    completedHours: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    startedAt: z.string().optional(),
    closedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    phaseWbsNodeId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'sprint',
  routeBase: '/sprint',
  label: 'Sprint',
  labelPlural: 'Sprints',
  organizationOwned: true,
  hooks: sprintHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'goal', label: 'Goal', kind: 'text', optional: true },
  { name: 'state', label: 'State', kind: 'enum', optional: false, options: ['planned', 'active', 'closed'] },
  { name: 'startDate', label: 'Start Date', kind: 'datetime', optional: false },
  { name: 'endDate', label: 'End Date', kind: 'datetime', optional: false },
  { name: 'committedPoints', label: 'Committed Points', kind: 'decimal', optional: true },
  { name: 'committedHours', label: 'Committed Hours', kind: 'decimal', optional: true },
  { name: 'completedPoints', label: 'Completed Points', kind: 'decimal', optional: true },
  { name: 'completedHours', label: 'Completed Hours', kind: 'decimal', optional: true },
  { name: 'startedAt', label: 'Started At', kind: 'datetime', optional: true },
  { name: 'closedAt', label: 'Closed At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'phaseWbsNodeId', label: 'Wbsnode', kind: 'relation', optional: true, relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'goal', label: 'Goal', kind: 'text' },
  { name: 'state', label: 'State', kind: 'enum' },
  { name: 'startDate', label: 'Start Date', kind: 'datetime' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'phaseWbsNodeId', label: 'Wbsnode', kind: 'relation', relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    goal: '',
    state: '',
    startDate: '',
    endDate: '',
    committedPoints: '',
    committedHours: '',
    completedPoints: '',
    completedHours: '',
    startedAt: '',
    closedAt: '',
    projectId: '',
    phaseWbsNodeId: '',
    organizationId: '',
  },
};
