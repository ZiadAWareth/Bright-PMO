import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface WorkflowRule {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  trigger: string;
  triggerItemId?: number;
  triggerCategory?: string;
  action: string;
  actionItemId?: number;
  actionConfig?: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const workflowruleHooks = makeResourceHooks<WorkflowRule & { id: number }>('workflowrule', 'Workflow Rule');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    trigger: z.enum(['status_category_changed', 'dependency_completed', 'sprint_started', 'sprint_completed'] as [string, ...string[]], { required_error: 'Trigger is required' }),
    triggerCategory: z.enum(['todo', 'in_progress', 'done'] as [string, ...string[]]).optional().or(z.literal('')),
    action: z.enum(['start_item', 'move_to_status', 'send_notification', 'assign_resource', 'create_recurring_item', 'escalate_item', 'update_project_status'] as [string, ...string[]], { required_error: 'Action is required' }),
    actionConfig: z.string().optional(),
    isActive: z.boolean().default(false),
    projectId: z.string().optional().or(z.literal('')),
    triggerItemId: z.string().optional().or(z.literal('')),
    actionItemId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'workflowrule',
  routeBase: '/workflowrule',
  label: 'Workflow Rule',
  labelPlural: 'Workflow Rules',
  organizationOwned: true,
  hooks: workflowruleHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'trigger', label: 'Trigger', kind: 'enum', optional: false, options: ['status_category_changed', 'dependency_completed', 'sprint_started', 'sprint_completed'] },
  { name: 'triggerCategory', label: 'Trigger Category', kind: 'enum', optional: true, options: ['todo', 'in_progress', 'done'] },
  { name: 'action', label: 'Action', kind: 'enum', optional: false, options: ['start_item', 'move_to_status', 'send_notification', 'assign_resource', 'create_recurring_item', 'escalate_item', 'update_project_status'] },
  { name: 'actionConfig', label: 'Action Config', kind: 'json', optional: true },
  { name: 'isActive', label: 'Is Active', kind: 'boolean', optional: false },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'triggerItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'actionItemId', label: 'Workitem Action Item', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'trigger', label: 'Trigger', kind: 'enum' },
  { name: 'triggerCategory', label: 'Trigger Category', kind: 'enum' },
  { name: 'action', label: 'Action', kind: 'enum' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'triggerItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'actionItemId', label: 'Workitem Action Item', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    description: '',
    trigger: '',
    triggerCategory: '',
    action: '',
    actionConfig: '',
    isActive: false,
    projectId: '',
    triggerItemId: '',
    actionItemId: '',
    organizationId: '',
  },
};
