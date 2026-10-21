import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface WbsNode {
  id: number;
  projectId: number;
  parentId?: number;
  code: string;
  name: string;
  description?: string;
  level: number;
  sortOrder: number;
  isPhase: boolean;
  progressWeight?: string;
  startDate?: string;
  endDate?: string;
  progressPct: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const wbsnodeHooks = makeResourceHooks<WbsNode & { id: number }>('wbsnode', 'Wbs Node');

const schema = z.object({
    code: z.string().min(1, 'Code is required'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    level: z.coerce.number({ invalid_type_error: 'Level is required' }),
    sortOrder: z.coerce.number({ invalid_type_error: 'Sort Order is required' }),
    isPhase: z.boolean().default(false),
    progressWeight: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    progressPct: z.string().min(1, 'Progress Pct is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    projectId: z.string().optional().or(z.literal('')),
    parentId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'wbsnode',
  routeBase: '/wbsnode',
  label: 'Wbs Node',
  labelPlural: 'Wbs Nodes',
  organizationOwned: true,
  hooks: wbsnodeHooks,
  fields: [
  { name: 'code', label: 'Code', kind: 'text', optional: false },
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'level', label: 'Level', kind: 'number', optional: false },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number', optional: false },
  { name: 'isPhase', label: 'Is Phase', kind: 'boolean', optional: false },
  { name: 'progressWeight', label: 'Progress Weight', kind: 'decimal', optional: true },
  { name: 'startDate', label: 'Start Date', kind: 'datetime', optional: true },
  { name: 'endDate', label: 'End Date', kind: 'datetime', optional: true },
  { name: 'progressPct', label: 'Progress Pct', kind: 'decimal', optional: false },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'parentId', label: 'Wbsnode', kind: 'relation', optional: true, relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'code', label: 'Code', kind: 'text' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'level', label: 'Level', kind: 'number' },
  { name: 'sortOrder', label: 'Sort Order', kind: 'number' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'parentId', label: 'Wbsnode', kind: 'relation', relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    code: '',
    name: '',
    description: '',
    level: undefined,
    sortOrder: undefined,
    isPhase: false,
    progressWeight: '',
    startDate: '',
    endDate: '',
    progressPct: '',
    projectId: '',
    parentId: '',
    organizationId: '',
  },
};
