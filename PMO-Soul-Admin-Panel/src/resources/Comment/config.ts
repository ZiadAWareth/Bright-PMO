import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Comment {
  id: number;
  workItemId: number;
  authorId: number;
  parentId?: number;
  body: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  organizationId?: number;
}

export const commentHooks = makeResourceHooks<Comment & { id: number }>('comment', 'Comment');

const schema = z.object({
    body: z.string().min(1, 'Body is required'),
    editedAt: z.string().optional(),
    deletedAt: z.string().optional(),
    workItemId: z.string().optional().or(z.literal('')),
    authorId: z.string().optional().or(z.literal('')),
    parentId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'comment',
  routeBase: '/comment',
  label: 'Comment',
  labelPlural: 'Comments',
  organizationOwned: true,
  hooks: commentHooks,
  fields: [
  { name: 'body', label: 'Body', kind: 'text', optional: false },
  { name: 'editedAt', label: 'Edited At', kind: 'datetime', optional: true },
  { name: 'deletedAt', label: 'Deleted At', kind: 'datetime', optional: true },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'authorId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'parentId', label: 'Comment', kind: 'relation', optional: true, relation: { resource: 'comment', displayField: 'body', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'body', label: 'Body', kind: 'text' },
  { name: 'editedAt', label: 'Edited At', kind: 'datetime' },
  { name: 'deletedAt', label: 'Deleted At', kind: 'datetime' },
  { name: 'createdAt', label: 'Created At', kind: 'datetime' },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'authorId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'parentId', label: 'Comment', kind: 'relation', relation: { resource: 'comment', displayField: 'body', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    body: '',
    editedAt: '',
    deletedAt: '',
    workItemId: '',
    authorId: '',
    parentId: '',
    organizationId: '',
  },
};
