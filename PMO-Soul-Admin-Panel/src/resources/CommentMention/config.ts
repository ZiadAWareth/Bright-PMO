import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface CommentMention {
  id: number;
  commentId: number;
  userId: number;
  organizationId?: number;
}

export const commentmentionHooks = makeResourceHooks<CommentMention & { id: number }>('commentmention', 'Comment Mention');

const schema = z.object({
    commentId: z.string().optional().or(z.literal('')),
    userId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'commentmention',
  routeBase: '/commentmention',
  label: 'Comment Mention',
  labelPlural: 'Comment Mentions',
  organizationOwned: true,
  hooks: commentmentionHooks,
  fields: [
  { name: 'commentId', label: 'Comment', kind: 'relation', optional: true, relation: { resource: 'comment', displayField: 'body', refField: 'id' } },
  { name: 'userId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'commentId', label: 'Comment', kind: 'relation', relation: { resource: 'comment', displayField: 'body', refField: 'id' } },
  { name: 'userId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    commentId: '',
    userId: '',
    organizationId: '',
  },
};
