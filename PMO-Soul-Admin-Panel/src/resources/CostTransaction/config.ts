import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface CostTransaction {
  id: number;
  projectId: number;
  budgetLineId?: number;
  amount: string;
  costType: string;
  source: string;
  externalRef?: string;
  occurredOn: string;
  description?: string;
  createdAt: string;
  organizationId?: number;
}

export const costtransactionHooks = makeResourceHooks<CostTransaction & { id: number }>('costtransaction', 'Cost Transaction');

const schema = z.object({
    amount: z.string().min(1, 'Amount is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    costType: z.enum(['labor', 'material', 'equipment', 'subcontract', 'overhead', 'other'] as [string, ...string[]], { required_error: 'Cost Type is required' }),
    source: z.enum(['manual', 'finance_sync', 'timesheet', 'procurement'] as [string, ...string[]], { required_error: 'Source is required' }),
    externalRef: z.string().optional(),
    occurredOn: z.string().min(1, 'Occurred On is required'),
    description: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    budgetLineId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'costtransaction',
  routeBase: '/costtransaction',
  label: 'Cost Transaction',
  labelPlural: 'Cost Transactions',
  organizationOwned: true,
  hooks: costtransactionHooks,
  fields: [
  { name: 'amount', label: 'Amount', kind: 'decimal', optional: false },
  { name: 'costType', label: 'Cost Type', kind: 'enum', optional: false, options: ['labor', 'material', 'equipment', 'subcontract', 'overhead', 'other'] },
  { name: 'source', label: 'Source', kind: 'enum', optional: false, options: ['manual', 'finance_sync', 'timesheet', 'procurement'] },
  { name: 'externalRef', label: 'External Ref', kind: 'text', optional: true },
  { name: 'occurredOn', label: 'Occurred On', kind: 'datetime', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'budgetLineId', label: 'Budgetline', kind: 'relation', optional: true, relation: { resource: 'budgetline', displayField: 'description', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'amount', label: 'Amount', kind: 'decimal' },
  { name: 'costType', label: 'Cost Type', kind: 'enum' },
  { name: 'source', label: 'Source', kind: 'enum' },
  { name: 'externalRef', label: 'External Ref', kind: 'text' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'budgetLineId', label: 'Budgetline', kind: 'relation', relation: { resource: 'budgetline', displayField: 'description', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    amount: '',
    costType: '',
    source: '',
    externalRef: '',
    occurredOn: '',
    description: '',
    projectId: '',
    budgetLineId: '',
    organizationId: '',
  },
};
