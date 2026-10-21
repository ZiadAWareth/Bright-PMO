import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Project {
  id: number;
  organizationId: number;
  code: string;
  keyPrefix: string;
  workItemSeq: number;
  name: string;
  description?: string;
  categoryId: number;
  methodology: string;
  agileFramework?: string;
  estimationUnit: string;
  progressMethod: string;
  status: string;
  priority: string;
  strategicValue: string;
  compliance: string;
  epsId: number;
  portfolioId: number;
  managerId: number;
  createdById: number;
  calendarId?: number;
  startDate: string;
  plannedEndDate?: string;
  mustFinishBy?: string;
  actualEndDate?: string;
  sprintLengthDays?: number;
  enforceDependencies: boolean;
  budgetAmount: string;
  pendingBudgetAmount?: string;
  expectedRoi?: string;
  location?: string;
  client?: string;
  contractor?: string;
  size?: string;
  tags: string[];
  feasibilityScore?: string;
  lastAnalyzedAt?: string;
  progressPct: string;
  actualCost: string;
  allocatedCost: string;
  roi?: string;
  healthScore: string;
  riskScore: string;
  qualityScore: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const projectHooks = makeResourceHooks<Project & { id: number }>('project', 'Project');

const schema = z.object({
    code: z.string().min(1, 'Code is required'),
    keyPrefix: z.string().min(1, 'Key Prefix is required'),
    workItemSeq: z.coerce.number({ invalid_type_error: 'Work Item Seq is required' }),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    methodology: z.enum(['waterfall', 'agile', 'hybrid'] as [string, ...string[]], { required_error: 'Methodology is required' }),
    agileFramework: z.enum(['scrum', 'kanban'] as [string, ...string[]]).optional().or(z.literal('')),
    estimationUnit: z.enum(['hours', 'story_points'] as [string, ...string[]], { required_error: 'Estimation Unit is required' }),
    progressMethod: z.enum(['duration_weighted', 'wbs_weighted', 'story_points', 'item_count', 'manual'] as [string, ...string[]], { required_error: 'Progress Method is required' }),
    status: z.enum(['draft', 'pending_approval', 'rejected', 'planning', 'active', 'on_hold', 'closing', 'closed', 'cancelled'] as [string, ...string[]], { required_error: 'Status is required' }),
    priority: z.enum(['low', 'medium', 'high', 'critical'] as [string, ...string[]], { required_error: 'Priority is required' }),
    strategicValue: z.enum(['low', 'medium', 'high'] as [string, ...string[]], { required_error: 'Strategic Value is required' }),
    compliance: z.enum(['pending', 'compliant', 'non_compliant'] as [string, ...string[]], { required_error: 'Compliance is required' }),
    startDate: z.string().min(1, 'Start Date is required'),
    plannedEndDate: z.string().optional(),
    mustFinishBy: z.string().optional(),
    actualEndDate: z.string().optional(),
    sprintLengthDays: z.coerce.number().optional(),
    enforceDependencies: z.boolean().default(false),
    budgetAmount: z.string().min(1, 'Budget Amount is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    pendingBudgetAmount: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    expectedRoi: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    location: z.string().optional(),
    client: z.string().optional(),
    contractor: z.string().optional(),
    size: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    tags: z.string().optional(),
    feasibilityScore: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    lastAnalyzedAt: z.string().optional(),
    progressPct: z.string().min(1, 'Progress Pct is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    actualCost: z.string().min(1, 'Actual Cost is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    allocatedCost: z.string().min(1, 'Allocated Cost is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    roi: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    healthScore: z.string().min(1, 'Health Score is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    riskScore: z.string().min(1, 'Risk Score is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    qualityScore: z.string().min(1, 'Quality Score is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    archivedAt: z.string().optional(),
    categoryId: z.string().optional().or(z.literal('')),
    epsId: z.string().optional().or(z.literal('')),
    portfolioId: z.string().optional().or(z.literal('')),
    managerId: z.string().optional().or(z.literal('')),
    createdById: z.string().optional().or(z.literal('')),
    calendarId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'project',
  routeBase: '/project',
  label: 'Project',
  labelPlural: 'Projects',
  organizationOwned: true,
  hooks: projectHooks,
  fields: [
  { name: 'code', label: 'Code', kind: 'text', optional: false },
  { name: 'keyPrefix', label: 'Key Prefix', kind: 'text', optional: false },
  { name: 'workItemSeq', label: 'Work Item Seq', kind: 'number', optional: false },
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'methodology', label: 'Methodology', kind: 'enum', optional: false, options: ['waterfall', 'agile', 'hybrid'] },
  { name: 'agileFramework', label: 'Agile Framework', kind: 'enum', optional: true, options: ['scrum', 'kanban'] },
  { name: 'estimationUnit', label: 'Estimation Unit', kind: 'enum', optional: false, options: ['hours', 'story_points'] },
  { name: 'progressMethod', label: 'Progress Method', kind: 'enum', optional: false, options: ['duration_weighted', 'wbs_weighted', 'story_points', 'item_count', 'manual'] },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['draft', 'pending_approval', 'rejected', 'planning', 'active', 'on_hold', 'closing', 'closed', 'cancelled'] },
  { name: 'priority', label: 'Priority', kind: 'enum', optional: false, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'strategicValue', label: 'Strategic Value', kind: 'enum', optional: false, options: ['low', 'medium', 'high'] },
  { name: 'compliance', label: 'Compliance', kind: 'enum', optional: false, options: ['pending', 'compliant', 'non_compliant'] },
  { name: 'startDate', label: 'Start Date', kind: 'datetime', optional: false },
  { name: 'plannedEndDate', label: 'Planned End Date', kind: 'datetime', optional: true },
  { name: 'mustFinishBy', label: 'Must Finish By', kind: 'datetime', optional: true },
  { name: 'actualEndDate', label: 'Actual End Date', kind: 'datetime', optional: true },
  { name: 'sprintLengthDays', label: 'Sprint Length Days', kind: 'number', optional: true },
  { name: 'enforceDependencies', label: 'Enforce Dependencies', kind: 'boolean', optional: false },
  { name: 'budgetAmount', label: 'Budget Amount', kind: 'decimal', optional: false },
  { name: 'pendingBudgetAmount', label: 'Pending Budget Amount', kind: 'decimal', optional: true },
  { name: 'expectedRoi', label: 'Expected Roi', kind: 'decimal', optional: true },
  { name: 'location', label: 'Location', kind: 'text', optional: true },
  { name: 'client', label: 'Client', kind: 'text', optional: true },
  { name: 'contractor', label: 'Contractor', kind: 'text', optional: true },
  { name: 'size', label: 'Size', kind: 'decimal', optional: true },
  { name: 'tags', label: 'Tags', kind: 'text', optional: false, list: true },
  { name: 'feasibilityScore', label: 'Feasibility Score', kind: 'decimal', optional: true },
  { name: 'lastAnalyzedAt', label: 'Last Analyzed At', kind: 'datetime', optional: true },
  { name: 'progressPct', label: 'Progress Pct', kind: 'decimal', optional: false },
  { name: 'actualCost', label: 'Actual Cost', kind: 'decimal', optional: false },
  { name: 'allocatedCost', label: 'Allocated Cost', kind: 'decimal', optional: false },
  { name: 'roi', label: 'Roi', kind: 'decimal', optional: true },
  { name: 'healthScore', label: 'Health Score', kind: 'decimal', optional: false },
  { name: 'riskScore', label: 'Risk Score', kind: 'decimal', optional: false },
  { name: 'qualityScore', label: 'Quality Score', kind: 'decimal', optional: false },
  { name: 'archivedAt', label: 'Archived At', kind: 'datetime', optional: true },
  { name: 'categoryId', label: 'Projectcategory', kind: 'relation', optional: true, relation: { resource: 'projectcategory', displayField: 'code', refField: 'id' } },
  { name: 'epsId', label: 'Eps', kind: 'relation', optional: true, relation: { resource: 'eps', displayField: 'code', refField: 'id' } },
  { name: 'portfolioId', label: 'Portfolio', kind: 'relation', optional: true, relation: { resource: 'portfolio', displayField: 'name', refField: 'id' } },
  { name: 'managerId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'createdById', label: 'User Created By', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'calendarId', label: 'Workcalendar', kind: 'relation', optional: true, relation: { resource: 'workcalendar', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'code', label: 'Code', kind: 'text' },
  { name: 'keyPrefix', label: 'Key Prefix', kind: 'text' },
  { name: 'workItemSeq', label: 'Work Item Seq', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'categoryId', label: 'Projectcategory', kind: 'relation', relation: { resource: 'projectcategory', displayField: 'code', refField: 'id' } },
  { name: 'epsId', label: 'Eps', kind: 'relation', relation: { resource: 'eps', displayField: 'code', refField: 'id' } },
  { name: 'portfolioId', label: 'Portfolio', kind: 'relation', relation: { resource: 'portfolio', displayField: 'name', refField: 'id' } },
  { name: 'managerId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'createdById', label: 'User Created By', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'calendarId', label: 'Workcalendar', kind: 'relation', relation: { resource: 'workcalendar', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    code: '',
    keyPrefix: '',
    workItemSeq: undefined,
    name: '',
    description: '',
    methodology: '',
    agileFramework: '',
    estimationUnit: '',
    progressMethod: '',
    status: '',
    priority: '',
    strategicValue: '',
    compliance: '',
    startDate: '',
    plannedEndDate: '',
    mustFinishBy: '',
    actualEndDate: '',
    sprintLengthDays: undefined,
    enforceDependencies: false,
    budgetAmount: '',
    pendingBudgetAmount: '',
    expectedRoi: '',
    location: '',
    client: '',
    contractor: '',
    size: '',
    tags: '',
    feasibilityScore: '',
    lastAnalyzedAt: '',
    progressPct: '',
    actualCost: '',
    allocatedCost: '',
    roi: '',
    healthScore: '',
    riskScore: '',
    qualityScore: '',
    archivedAt: '',
    categoryId: '',
    epsId: '',
    portfolioId: '',
    managerId: '',
    createdById: '',
    calendarId: '',
    organizationId: '',
  },
};
