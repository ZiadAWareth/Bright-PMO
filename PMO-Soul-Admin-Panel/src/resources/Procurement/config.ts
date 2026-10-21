import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Procurement {
  id: number;
  projectId: number;
  wbsNodeId?: number;
  type: string;
  description: string;
  estimatedCost: string;
  actualCost: string;
  status: string;
  neededBy?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const procurementHooks = makeResourceHooks<Procurement & { id: number }>('procurement', 'Procurement');

const schema = z.object({
    type: z.enum(['material', 'service', 'equipment'] as [string, ...string[]], { required_error: 'Type is required' }),
    description: z.string().min(1, 'Description is required'),
    estimatedCost: z.string().min(1, 'Estimated Cost is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    actualCost: z.string().min(1, 'Actual Cost is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    status: z.enum(['planned', 'rfq_open', 'evaluating', 'awarded', 'ordered', 'delivered', 'closed', 'cancelled'] as [string, ...string[]], { required_error: 'Status is required' }),
    neededBy: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    wbsNodeId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'procurement',
  routeBase: '/procurement',
  label: 'Procurement',
  labelPlural: 'Procurements',
  organizationOwned: true,
  hooks: procurementHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['material', 'service', 'equipment'] },
  { name: 'description', label: 'Description', kind: 'textarea', optional: false },
  { name: 'estimatedCost', label: 'Estimated Cost', kind: 'decimal', optional: false },
  { name: 'actualCost', label: 'Actual Cost', kind: 'decimal', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['planned', 'rfq_open', 'evaluating', 'awarded', 'ordered', 'delivered', 'closed', 'cancelled'] },
  { name: 'neededBy', label: 'Needed By', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', optional: true, relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'estimatedCost', label: 'Estimated Cost', kind: 'decimal' },
  { name: 'actualCost', label: 'Actual Cost', kind: 'decimal' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    description: '',
    estimatedCost: '',
    actualCost: '',
    status: '',
    neededBy: '',
    projectId: '',
    wbsNodeId: '',
    organizationId: '',
  },
};
