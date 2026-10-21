import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface EvmSnapshot {
  id: number;
  projectId: number;
  fiscalPeriod: string;
  reportingDate: string;
  plannedValue: string;
  earnedValue: string;
  actualCost: string;
  cpi: string;
  spi: string;
  eac: string;
  etc: string;
  vac: string;
  createdAt: string;
  organizationId?: number;
}

export const evmsnapshotHooks = makeResourceHooks<EvmSnapshot & { id: number }>('evmsnapshot', 'Evm Snapshot');

const schema = z.object({
    fiscalPeriod: z.string().min(1, 'Fiscal Period is required'),
    reportingDate: z.string().min(1, 'Reporting Date is required'),
    plannedValue: z.string().min(1, 'Planned Value is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    earnedValue: z.string().min(1, 'Earned Value is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    actualCost: z.string().min(1, 'Actual Cost is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    cpi: z.string().min(1, 'Cpi is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    spi: z.string().min(1, 'Spi is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    eac: z.string().min(1, 'Eac is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    etc: z.string().min(1, 'Etc is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    vac: z.string().min(1, 'Vac is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    projectId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'evmsnapshot',
  routeBase: '/evmsnapshot',
  label: 'Evm Snapshot',
  labelPlural: 'Evm Snapshots',
  organizationOwned: true,
  hooks: evmsnapshotHooks,
  fields: [
  { name: 'fiscalPeriod', label: 'Fiscal Period', kind: 'text', optional: false },
  { name: 'reportingDate', label: 'Reporting Date', kind: 'datetime', optional: false },
  { name: 'plannedValue', label: 'Planned Value', kind: 'decimal', optional: false },
  { name: 'earnedValue', label: 'Earned Value', kind: 'decimal', optional: false },
  { name: 'actualCost', label: 'Actual Cost', kind: 'decimal', optional: false },
  { name: 'cpi', label: 'Cpi', kind: 'decimal', optional: false },
  { name: 'spi', label: 'Spi', kind: 'decimal', optional: false },
  { name: 'eac', label: 'Eac', kind: 'decimal', optional: false },
  { name: 'etc', label: 'Etc', kind: 'decimal', optional: false },
  { name: 'vac', label: 'Vac', kind: 'decimal', optional: false },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'fiscalPeriod', label: 'Fiscal Period', kind: 'text' },
  { name: 'reportingDate', label: 'Reporting Date', kind: 'datetime' },
  { name: 'plannedValue', label: 'Planned Value', kind: 'decimal' },
  { name: 'earnedValue', label: 'Earned Value', kind: 'decimal' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    fiscalPeriod: '',
    reportingDate: '',
    plannedValue: '',
    earnedValue: '',
    actualCost: '',
    cpi: '',
    spi: '',
    eac: '',
    etc: '',
    vac: '',
    projectId: '',
    organizationId: '',
  },
};
