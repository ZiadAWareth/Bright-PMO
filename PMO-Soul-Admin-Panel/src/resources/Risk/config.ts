import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Risk {
  id: number;
  projectId: number;
  ownerId: number;
  name: string;
  description?: string;
  category: string;
  impact: string;
  probability: string;
  level: string;
  score: number;
  likelihoodScore?: string;
  impactScore?: string;
  status: string;
  approvalStatus: string;
  identifiedOn: string;
  lastReviewedAt?: string;
  nextReviewOn?: string;
  reviewFrequencyDays?: number;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const riskHooks = makeResourceHooks<Risk & { id: number }>('risk', 'Risk');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    category: z.enum(['technical', 'schedule', 'cost', 'resource', 'quality', 'communication', 'external', 'regulatory', 'environmental', 'security', 'other'] as [string, ...string[]], { required_error: 'Category is required' }),
    impact: z.enum(['low', 'medium', 'high', 'critical'] as [string, ...string[]], { required_error: 'Impact is required' }),
    probability: z.enum(['low', 'medium', 'high', 'critical'] as [string, ...string[]], { required_error: 'Probability is required' }),
    level: z.enum(['low', 'medium', 'high', 'critical'] as [string, ...string[]], { required_error: 'Level is required' }),
    score: z.coerce.number({ invalid_type_error: 'Score is required' }),
    likelihoodScore: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    impactScore: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    status: z.enum(['identified', 'assessed', 'monitoring', 'mitigated', 'escalated', 'closed'] as [string, ...string[]], { required_error: 'Status is required' }),
    approvalStatus: z.enum(['not_submitted', 'pending', 'approved', 'rejected'] as [string, ...string[]], { required_error: 'Approval Status is required' }),
    identifiedOn: z.string().min(1, 'Identified On is required'),
    lastReviewedAt: z.string().optional(),
    nextReviewOn: z.string().optional(),
    reviewFrequencyDays: z.coerce.number().optional(),
    projectId: z.string().optional().or(z.literal('')),
    ownerId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'risk',
  routeBase: '/risk',
  label: 'Risk',
  labelPlural: 'Risks',
  organizationOwned: true,
  hooks: riskHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'category', label: 'Category', kind: 'enum', optional: false, options: ['technical', 'schedule', 'cost', 'resource', 'quality', 'communication', 'external', 'regulatory', 'environmental', 'security', 'other'] },
  { name: 'impact', label: 'Impact', kind: 'enum', optional: false, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'probability', label: 'Probability', kind: 'enum', optional: false, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'level', label: 'Level', kind: 'enum', optional: false, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'score', label: 'Score', kind: 'number', optional: false },
  { name: 'likelihoodScore', label: 'Likelihood Score', kind: 'decimal', optional: true },
  { name: 'impactScore', label: 'Impact Score', kind: 'decimal', optional: true },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['identified', 'assessed', 'monitoring', 'mitigated', 'escalated', 'closed'] },
  { name: 'approvalStatus', label: 'Approval Status', kind: 'enum', optional: false, options: ['not_submitted', 'pending', 'approved', 'rejected'] },
  { name: 'identifiedOn', label: 'Identified On', kind: 'datetime', optional: false },
  { name: 'lastReviewedAt', label: 'Last Reviewed At', kind: 'datetime', optional: true },
  { name: 'nextReviewOn', label: 'Next Review On', kind: 'datetime', optional: true },
  { name: 'reviewFrequencyDays', label: 'Review Frequency Days', kind: 'number', optional: true },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'ownerId', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'category', label: 'Category', kind: 'enum' },
  { name: 'impact', label: 'Impact', kind: 'enum' },
  { name: 'probability', label: 'Probability', kind: 'enum' },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'ownerId', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    description: '',
    category: '',
    impact: '',
    probability: '',
    level: '',
    score: undefined,
    likelihoodScore: '',
    impactScore: '',
    status: '',
    approvalStatus: '',
    identifiedOn: '',
    lastReviewedAt: '',
    nextReviewOn: '',
    reviewFrequencyDays: undefined,
    projectId: '',
    ownerId: '',
    organizationId: '',
  },
};
