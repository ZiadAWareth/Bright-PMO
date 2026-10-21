import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  projectRole: string;
  title?: string;
  department?: string;
  isLead: boolean;
  allocationPct: string;
  joinedAt: string;
  leftAt?: string;
  organizationId?: number;
}

export const projectmemberHooks = makeResourceHooks<ProjectMember & { id: number }>('projectmember', 'Project Member');

const schema = z.object({
    projectRole: z.enum(['manager', 'product_owner', 'scrum_master', 'member', 'stakeholder', 'viewer'] as [string, ...string[]], { required_error: 'Project Role is required' }),
    title: z.string().optional(),
    department: z.string().optional(),
    isLead: z.boolean().default(false),
    allocationPct: z.string().min(1, 'Allocation Pct is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    joinedAt: z.string().min(1, 'Joined At is required'),
    leftAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    userId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'projectmember',
  routeBase: '/projectmember',
  label: 'Project Member',
  labelPlural: 'Project Members',
  organizationOwned: true,
  hooks: projectmemberHooks,
  fields: [
  { name: 'projectRole', label: 'Project Role', kind: 'enum', optional: false, options: ['manager', 'product_owner', 'scrum_master', 'member', 'stakeholder', 'viewer'] },
  { name: 'title', label: 'Title', kind: 'text', optional: true },
  { name: 'department', label: 'Department', kind: 'text', optional: true },
  { name: 'isLead', label: 'Is Lead', kind: 'boolean', optional: false },
  { name: 'allocationPct', label: 'Allocation Pct', kind: 'decimal', optional: false },
  { name: 'joinedAt', label: 'Joined At', kind: 'datetime', optional: false },
  { name: 'leftAt', label: 'Left At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'projectRole', label: 'Project Role', kind: 'enum' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'department', label: 'Department', kind: 'text' },
  { name: 'isLead', label: 'Is Lead', kind: 'boolean' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    projectRole: '',
    title: '',
    department: '',
    isLead: false,
    allocationPct: '',
    joinedAt: '',
    leftAt: '',
    projectId: '',
    userId: '',
    organizationId: '',
  },
};
