import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ApprovalPolicyStep {
  id: number;
  policyId: number;
  stepOrder: number;
  approverRoleId?: number;
  useProjectManager: boolean;
  organizationId?: number;
}

export const approvalpolicystepHooks = makeResourceHooks<ApprovalPolicyStep & { id: number }>('approvalpolicystep', 'Approval Policy Step');

const schema = z.object({
    stepOrder: z.coerce.number({ invalid_type_error: 'Step Order is required' }),
    useProjectManager: z.boolean().default(false),
    policyId: z.string().optional().or(z.literal('')),
    approverRoleId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'approvalpolicystep',
  routeBase: '/approvalpolicystep',
  label: 'Approval Policy Step',
  labelPlural: 'Approval Policy Steps',
  organizationOwned: true,
  hooks: approvalpolicystepHooks,
  fields: [
  { name: 'stepOrder', label: 'Step Order', kind: 'number', optional: false },
  { name: 'useProjectManager', label: 'Use Project Manager', kind: 'boolean', optional: false },
  { name: 'policyId', label: 'Approvalpolicy', kind: 'relation', optional: true, relation: { resource: 'approvalpolicy', displayField: 'name', refField: 'id' } },
  { name: 'approverRoleId', label: 'Rolesandpermissions', kind: 'relation', optional: true, relation: { resource: 'rolesandpermissions', displayField: 'role', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'stepOrder', label: 'Step Order', kind: 'number' },
  { name: 'useProjectManager', label: 'Use Project Manager', kind: 'boolean' },
  { name: 'policyId', label: 'Approvalpolicy', kind: 'relation', relation: { resource: 'approvalpolicy', displayField: 'name', refField: 'id' } },
  { name: 'approverRoleId', label: 'Rolesandpermissions', kind: 'relation', relation: { resource: 'rolesandpermissions', displayField: 'role', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    stepOrder: undefined,
    useProjectManager: false,
    policyId: '',
    approverRoleId: '',
    organizationId: '',
  },
};
