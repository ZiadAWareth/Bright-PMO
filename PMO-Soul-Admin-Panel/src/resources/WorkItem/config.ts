import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface WorkItem {
  id: number;
  projectId: number;
  key: string;
  type: string;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  parentId?: number;
  wbsNodeId?: number;
  sprintId?: number;
  releaseId?: number;
  statusId: number;
  priority: string;
  rank: string;
  tags: string[];
  reporterId?: number;
  createdById: number;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  constraintType?: string;
  constraintDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  earlyStart?: string;
  earlyFinish?: string;
  lateStart?: string;
  lateFinish?: string;
  totalFloatDays?: number;
  freeFloatDays?: number;
  isCritical: boolean;
  progressWeight?: string;
  workPackage?: string;
  storyPoints?: string;
  estimatedHours: string;
  remainingHours?: string;
  actualHours: string;
  progressPct: string;
  addedAfterSprintStart: boolean;
  completedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const workitemHooks = makeResourceHooks<WorkItem & { id: number }>('workitem', 'Work Item');

const schema = z.object({
    key: z.string().min(1, 'Key is required'),
    type: z.enum(['epic', 'feature', 'story', 'task', 'subtask', 'bug', 'milestone'] as [string, ...string[]], { required_error: 'Type is required' }),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    acceptanceCriteria: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical'] as [string, ...string[]], { required_error: 'Priority is required' }),
    rank: z.string().min(1, 'Rank is required'),
    tags: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    durationDays: z.coerce.number().optional(),
    constraintType: z.enum(['asap', 'alap', 'must_start_on', 'must_finish_on', 'start_no_earlier_than', 'start_no_later_than', 'finish_no_earlier_than', 'finish_no_later_than'] as [string, ...string[]]).optional().or(z.literal('')),
    constraintDate: z.string().optional(),
    actualStartDate: z.string().optional(),
    actualEndDate: z.string().optional(),
    earlyStart: z.string().optional(),
    earlyFinish: z.string().optional(),
    lateStart: z.string().optional(),
    lateFinish: z.string().optional(),
    totalFloatDays: z.coerce.number().optional(),
    freeFloatDays: z.coerce.number().optional(),
    isCritical: z.boolean().default(false),
    progressWeight: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    workPackage: z.string().optional(),
    storyPoints: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    estimatedHours: z.string().min(1, 'Estimated Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    remainingHours: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    actualHours: z.string().min(1, 'Actual Hours is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    progressPct: z.string().min(1, 'Progress Pct is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    addedAfterSprintStart: z.boolean().default(false),
    completedAt: z.string().optional(),
    deletedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    parentId: z.string().optional().or(z.literal('')),
    wbsNodeId: z.string().optional().or(z.literal('')),
    sprintId: z.string().optional().or(z.literal('')),
    releaseId: z.string().optional().or(z.literal('')),
    statusId: z.string().optional().or(z.literal('')),
    reporterId: z.string().optional().or(z.literal('')),
    createdById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'workitem',
  routeBase: '/workitem',
  label: 'Work Item',
  labelPlural: 'Work Items',
  organizationOwned: true,
  hooks: workitemHooks,
  fields: [
  { name: 'key', label: 'Key', kind: 'text', optional: false },
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['epic', 'feature', 'story', 'task', 'subtask', 'bug', 'milestone'] },
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'acceptanceCriteria', label: 'Acceptance Criteria', kind: 'text', optional: true },
  { name: 'priority', label: 'Priority', kind: 'enum', optional: false, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'rank', label: 'Rank', kind: 'text', optional: false },
  { name: 'tags', label: 'Tags', kind: 'text', optional: false, list: true },
  { name: 'startDate', label: 'Start Date', kind: 'datetime', optional: true },
  { name: 'endDate', label: 'End Date', kind: 'datetime', optional: true },
  { name: 'durationDays', label: 'Duration Days', kind: 'number', optional: true },
  { name: 'constraintType', label: 'Constraint Type', kind: 'enum', optional: true, options: ['asap', 'alap', 'must_start_on', 'must_finish_on', 'start_no_earlier_than', 'start_no_later_than', 'finish_no_earlier_than', 'finish_no_later_than'] },
  { name: 'constraintDate', label: 'Constraint Date', kind: 'datetime', optional: true },
  { name: 'actualStartDate', label: 'Actual Start Date', kind: 'datetime', optional: true },
  { name: 'actualEndDate', label: 'Actual End Date', kind: 'datetime', optional: true },
  { name: 'earlyStart', label: 'Early Start', kind: 'datetime', optional: true },
  { name: 'earlyFinish', label: 'Early Finish', kind: 'datetime', optional: true },
  { name: 'lateStart', label: 'Late Start', kind: 'datetime', optional: true },
  { name: 'lateFinish', label: 'Late Finish', kind: 'datetime', optional: true },
  { name: 'totalFloatDays', label: 'Total Float Days', kind: 'number', optional: true },
  { name: 'freeFloatDays', label: 'Free Float Days', kind: 'number', optional: true },
  { name: 'isCritical', label: 'Is Critical', kind: 'boolean', optional: false },
  { name: 'progressWeight', label: 'Progress Weight', kind: 'decimal', optional: true },
  { name: 'workPackage', label: 'Work Package', kind: 'text', optional: true },
  { name: 'storyPoints', label: 'Story Points', kind: 'decimal', optional: true },
  { name: 'estimatedHours', label: 'Estimated Hours', kind: 'decimal', optional: false },
  { name: 'remainingHours', label: 'Remaining Hours', kind: 'decimal', optional: true },
  { name: 'actualHours', label: 'Actual Hours', kind: 'decimal', optional: false },
  { name: 'progressPct', label: 'Progress Pct', kind: 'decimal', optional: false },
  { name: 'addedAfterSprintStart', label: 'Added After Sprint Start', kind: 'boolean', optional: false },
  { name: 'completedAt', label: 'Completed At', kind: 'datetime', optional: true },
  { name: 'deletedAt', label: 'Deleted At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'parentId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', optional: true, relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'sprintId', label: 'Sprint', kind: 'relation', optional: true, relation: { resource: 'sprint', displayField: 'name', refField: 'id' } },
  { name: 'releaseId', label: 'Release', kind: 'relation', optional: true, relation: { resource: 'release', displayField: 'name', refField: 'id' } },
  { name: 'statusId', label: 'Workitemstatus', kind: 'relation', optional: true, relation: { resource: 'workitemstatus', displayField: 'name', refField: 'id' } },
  { name: 'reporterId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'createdById', label: 'User Created By', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'key', label: 'Key', kind: 'text' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'acceptanceCriteria', label: 'Acceptance Criteria', kind: 'text' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'parentId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'sprintId', label: 'Sprint', kind: 'relation', relation: { resource: 'sprint', displayField: 'name', refField: 'id' } },
  { name: 'releaseId', label: 'Release', kind: 'relation', relation: { resource: 'release', displayField: 'name', refField: 'id' } },
  { name: 'statusId', label: 'Workitemstatus', kind: 'relation', relation: { resource: 'workitemstatus', displayField: 'name', refField: 'id' } },
  { name: 'reporterId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'createdById', label: 'User Created By', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    key: '',
    type: '',
    title: '',
    description: '',
    acceptanceCriteria: '',
    priority: '',
    rank: '',
    tags: '',
    startDate: '',
    endDate: '',
    durationDays: undefined,
    constraintType: '',
    constraintDate: '',
    actualStartDate: '',
    actualEndDate: '',
    earlyStart: '',
    earlyFinish: '',
    lateStart: '',
    lateFinish: '',
    totalFloatDays: undefined,
    freeFloatDays: undefined,
    isCritical: false,
    progressWeight: '',
    workPackage: '',
    storyPoints: '',
    estimatedHours: '',
    remainingHours: '',
    actualHours: '',
    progressPct: '',
    addedAfterSprintStart: false,
    completedAt: '',
    deletedAt: '',
    projectId: '',
    parentId: '',
    wbsNodeId: '',
    sprintId: '',
    releaseId: '',
    statusId: '',
    reporterId: '',
    createdById: '',
    organizationId: '',
  },
};
