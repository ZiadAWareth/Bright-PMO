import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Lesson {
  id: number;
  projectId: number;
  sprintId?: number;
  type: string;
  title: string;
  description: string;
  category?: string;
  impact?: string;
  recommendations?: string;
  submittedById: number;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const lessonHooks = makeResourceHooks<Lesson & { id: number }>('lesson', 'Lesson');

const schema = z.object({
    type: z.enum(['lesson', 'retro_went_well', 'retro_to_improve', 'retro_action'] as [string, ...string[]], { required_error: 'Type is required' }),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    category: z.string().optional(),
    impact: z.string().optional(),
    recommendations: z.string().optional(),
    projectId: z.string().optional().or(z.literal('')),
    sprintId: z.string().optional().or(z.literal('')),
    submittedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'lesson',
  routeBase: '/lesson',
  label: 'Lesson',
  labelPlural: 'Lessons',
  organizationOwned: true,
  hooks: lessonHooks,
  fields: [
  { name: 'type', label: 'Type', kind: 'enum', optional: false, options: ['lesson', 'retro_went_well', 'retro_to_improve', 'retro_action'] },
  { name: 'title', label: 'Title', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: false },
  { name: 'category', label: 'Category', kind: 'text', optional: true },
  { name: 'impact', label: 'Impact', kind: 'text', optional: true },
  { name: 'recommendations', label: 'Recommendations', kind: 'text', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'sprintId', label: 'Sprint', kind: 'relation', optional: true, relation: { resource: 'sprint', displayField: 'name', refField: 'id' } },
  { name: 'submittedById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'type', label: 'Type', kind: 'enum' },
  { name: 'title', label: 'Title', kind: 'text' },
  { name: 'category', label: 'Category', kind: 'text' },
  { name: 'impact', label: 'Impact', kind: 'text' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'sprintId', label: 'Sprint', kind: 'relation', relation: { resource: 'sprint', displayField: 'name', refField: 'id' } },
  { name: 'submittedById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    type: '',
    title: '',
    description: '',
    category: '',
    impact: '',
    recommendations: '',
    projectId: '',
    sprintId: '',
    submittedById: '',
    organizationId: '',
  },
};
