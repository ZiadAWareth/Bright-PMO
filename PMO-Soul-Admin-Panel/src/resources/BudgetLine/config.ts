import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface BudgetLine {
  id: number;
  projectId: number;
  wbsNodeId?: number;
  workItemId?: number;
  costType: string;
  description?: string;
  plannedAmount: string;
  actualAmount: string;
  thresholdPct: string;
  fiscalYear: number;
  fiscalPeriod: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const budgetlineHooks = makeResourceHooks<BudgetLine & { id: number }>('budgetline', 'Budget Line');

const schema = z.object({
    costType: z.enum(['labor', 'material', 'equipment', 'subcontract', 'overhead', 'other'] as [string, ...string[]], { required_error: 'Cost Type is required' }),
    description: z.string().optional(),
    plannedAmount: z.string().min(1, 'Planned Amount is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    actualAmount: z.string().min(1, 'Actual Amount is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    thresholdPct: z.string().min(1, 'Threshold Pct is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    fiscalYear: z.coerce.number({ invalid_type_error: 'Fiscal Year is required' }),
    fiscalPeriod: z.string().min(1, 'Fiscal Period is required'),
    projectId: z.string().optional().or(z.literal('')),
    wbsNodeId: z.string().optional().or(z.literal('')),
    workItemId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'budgetline',
  routeBase: '/budgetline',
  label: 'Budget Line',
  labelPlural: 'Budget Lines',
  organizationOwned: true,
  hooks: budgetlineHooks,
  fields: [
  { name: 'costType', label: 'Cost Type', kind: 'enum', optional: false, options: ['labor', 'material', 'equipment', 'subcontract', 'overhead', 'other'] },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'plannedAmount', label: 'Planned Amount', kind: 'decimal', optional: false },
  { name: 'actualAmount', label: 'Actual Amount', kind: 'decimal', optional: false },
  { name: 'thresholdPct', label: 'Threshold Pct', kind: 'decimal', optional: false },
  { name: 'fiscalYear', label: 'Fiscal Year', kind: 'number', optional: false },
  { name: 'fiscalPeriod', label: 'Fiscal Period', kind: 'text', optional: false },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', optional: true, relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'costType', label: 'Cost Type', kind: 'enum' },
  { name: 'plannedAmount', label: 'Planned Amount', kind: 'decimal' },
  { name: 'actualAmount', label: 'Actual Amount', kind: 'decimal' },
  { name: 'thresholdPct', label: 'Threshold Pct', kind: 'decimal' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    costType: '',
    description: '',
    plannedAmount: '',
    actualAmount: '',
    thresholdPct: '',
    fiscalYear: undefined,
    fiscalPeriod: '',
    projectId: '',
    wbsNodeId: '',
    workItemId: '',
    organizationId: '',
  },
};
