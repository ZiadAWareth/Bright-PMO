import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Contract {
  id: number;
  procurementId: number;
  vendorId: number;
  contractNumber: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  value: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const contractHooks = makeResourceHooks<Contract & { id: number }>('contract', 'Contract');

const schema = z.object({
    contractNumber: z.string().min(1, 'Contract Number is required'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    startDate: z.string().min(1, 'Start Date is required'),
    endDate: z.string().min(1, 'End Date is required'),
    value: z.string().min(1, 'Value is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    status: z.enum(['draft', 'active', 'completed', 'terminated', 'expired'] as [string, ...string[]], { required_error: 'Status is required' }),
    procurementId: z.string().optional().or(z.literal('')),
    vendorId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'contract',
  routeBase: '/contract',
  label: 'Contract',
  labelPlural: 'Contracts',
  organizationOwned: true,
  hooks: contractHooks,
  fields: [
  { name: 'contractNumber', label: 'Contract Number', kind: 'text', optional: false },
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'startDate', label: 'Start Date', kind: 'datetime', optional: false },
  { name: 'endDate', label: 'End Date', kind: 'datetime', optional: false },
  { name: 'value', label: 'Value', kind: 'decimal', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['draft', 'active', 'completed', 'terminated', 'expired'] },
  { name: 'procurementId', label: 'Procurement', kind: 'relation', optional: true, relation: { resource: 'procurement', displayField: 'description', refField: 'id' } },
  { name: 'vendorId', label: 'Vendor', kind: 'relation', optional: true, relation: { resource: 'vendor', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'contractNumber', label: 'Contract Number', kind: 'text' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'startDate', label: 'Start Date', kind: 'datetime' },
  { name: 'endDate', label: 'End Date', kind: 'datetime' },
  { name: 'procurementId', label: 'Procurement', kind: 'relation', relation: { resource: 'procurement', displayField: 'description', refField: 'id' } },
  { name: 'vendorId', label: 'Vendor', kind: 'relation', relation: { resource: 'vendor', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    contractNumber: '',
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    value: '',
    status: '',
    procurementId: '',
    vendorId: '',
    organizationId: '',
  },
};
