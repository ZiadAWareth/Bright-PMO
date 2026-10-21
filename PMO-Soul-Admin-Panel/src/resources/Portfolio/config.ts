import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Portfolio {
  id: number;
  organizationId: number;
  name: string;
  description?: string;
  strategicObjective?: string;
  status: string;
  priority: string;
  tags: string[];
  budgetCapacity?: string;
  managerId: number;
  createdAt: string;
  updatedAt: string;
}

export const portfolioHooks = makeResourceHooks<Portfolio & { id: number }>('portfolio', 'Portfolio');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    strategicObjective: z.string().optional(),
    status: z.enum(['active', 'on_hold', 'completed', 'archived'] as [string, ...string[]], { required_error: 'Status is required' }),
    priority: z.enum(['low', 'medium', 'high', 'critical'] as [string, ...string[]], { required_error: 'Priority is required' }),
    tags: z.string().optional(),
    budgetCapacity: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    managerId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'portfolio',
  routeBase: '/portfolio',
  label: 'Portfolio',
  labelPlural: 'Portfolios',
  organizationOwned: true,
  hooks: portfolioHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'strategicObjective', label: 'Strategic Objective', kind: 'text', optional: true },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['active', 'on_hold', 'completed', 'archived'] },
  { name: 'priority', label: 'Priority', kind: 'enum', optional: false, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'tags', label: 'Tags', kind: 'text', optional: false, list: true },
  { name: 'budgetCapacity', label: 'Budget Capacity', kind: 'decimal', optional: true },
  { name: 'managerId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'strategicObjective', label: 'Strategic Objective', kind: 'text' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'priority', label: 'Priority', kind: 'enum' },
  { name: 'managerId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    description: '',
    strategicObjective: '',
    status: '',
    priority: '',
    tags: '',
    budgetCapacity: '',
    managerId: '',
    organizationId: '',
  },
};
