import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface ProjectConflict {
  id: number;
  projectId: number;
  type: string;
  severity: string;
  description: string;
  affectedWorkItemIds: number[];
  affectedResourceIds: number[];
  suggestedResolution?: string;
  resolvedAt?: string;
  createdAt: string;
  organizationId?: number;
}

export const projectconflictHooks = makeResourceHooks<ProjectConflict & { id: number }>('projectconflict', 'Project Conflict');

const schema = z.object({
    type: z.enum(['resource_overallocation', 'skill_mismatch', 'dependency_violation', 'timeline_conflict', 'budget_exceeded', 'resource_unavailable', 'team_conflict'] as [string, ...string[]], { required_error: 'Type is required' }),
    severity: z.enum(['low', 'medium', 'high', 'critical'] as [string, ...string[]], { required_error: 'Severity is required' }),
    description: z.string().min(1, 'Description is required'),
    affectedWorkItemIds: z.string().optional(),
    affectedResourceIds: z.string().optional(),
    suggestedResolution: z.string().optional(),
    resolvedAt: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'projectconflict',
  routeBase: '/Project/projectconflict',
  label: 'Project Conflict',
  labelPlural: 'Project Conflicts',
  organizationOwned: true,
  hooks: projectconflictHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['resource_overallocation', 'skill_mismatch', 'dependency_violation', 'timeline_conflict', 'budget_exceeded', 'resource_unavailable', 'team_conflict'] },
  { name: 'severity', label: 'Severity', kind: 'enum', optional: false, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'description', label: 'Description', kind: 'textarea', optional: false },
  { name: 'affectedWorkItemIds', label: 'Affected Work Item Ids', kind: 'number', optional: false, list: true },
  { name: 'affectedResourceIds', label: 'Affected Resource Ids', kind: 'number', optional: false, list: true },
  { name: 'suggestedResolution', label: 'Suggested Resolution', kind: 'text', optional: true },
  { name: 'resolvedAt', label: 'Resolved At', kind: 'datetime', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'severity', label: 'Severity', kind: 'enum' },
  { name: 'affectedWorkItemIds', label: 'Affected Work Item Ids', kind: 'number', list: true },
  { name: 'affectedResourceIds', label: 'Affected Resource Ids', kind: 'number', list: true },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    severity: '',
    description: '',
    affectedWorkItemIds: '',
    affectedResourceIds: '',
    suggestedResolution: '',
    resolvedAt: '',
    projectId: '',
    organizationId: '',
  },
};
