import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ApprovalPolicy {
  id: number;
  organizationId: number;
  type: string;
  name: string;
  isActive: boolean;
}

export const approvalpolicyHooks = makeResourceHooks<ApprovalPolicy & { id: number }>('approvalpolicy', 'Approval Policy');

const schema = z.object({
    type: z.enum(['project_creation', 'budget_change', 'schedule_change', 'scope_change', 'phase_gate', 'checklist', 'project_closure'] as [string, ...string[]], { required_error: 'Type is required' }),
    name: z.string().min(1, 'Name is required'),
    isActive: z.boolean().default(false),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'approvalpolicy',
  routeBase: '/approvalpolicy',
  label: 'Approval Policy',
  labelPlural: 'Approval Policies',
  organizationOwned: true,
  hooks: approvalpolicyHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['project_creation', 'budget_change', 'schedule_change', 'scope_change', 'phase_gate', 'checklist', 'project_closure'] },
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'isActive', label: 'Is Active', kind: 'boolean', optional: false },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'isActive', label: 'Is Active', kind: 'boolean' },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    name: '',
    isActive: false,
    organizationId: '',
  },
};
