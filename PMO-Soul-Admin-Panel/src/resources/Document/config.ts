import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Document {
  id: number;
  organizationId: number;
  name: string;
  description?: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  previousVersionId?: number;
  projectId?: number;
  wbsNodeId?: number;
  workItemId?: number;
  uploadedById: number;
  createdAt: string;
}

export const documentHooks = makeResourceHooks<Document & { id: number }>('document', 'Document');

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    storageKey: z.string().min(1, 'Storage Key is required'),
    mimeType: z.string().min(1, 'Mime Type is required'),
    sizeBytes: z.coerce.number({ invalid_type_error: 'Size Bytes is required' }),
    version: z.coerce.number({ invalid_type_error: 'Version is required' }),
    previousVersionId: z.string().optional().or(z.literal('')),
    projectId: z.string().optional().or(z.literal('')),
    wbsNodeId: z.string().optional().or(z.literal('')),
    workItemId: z.string().optional().or(z.literal('')),
    uploadedById: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'document',
  routeBase: '/document',
  label: 'Document',
  labelPlural: 'Documents',
  organizationOwned: true,
  hooks: documentHooks,
  fields: [
  { name: 'name', label: 'Name', kind: 'text', optional: false },
  { name: 'description', label: 'Description', kind: 'textarea', optional: true },
  { name: 'storageKey', label: 'Storage Key', kind: 'text', optional: false },
  { name: 'mimeType', label: 'Mime Type', kind: 'text', optional: false },
  { name: 'sizeBytes', label: 'Size Bytes', kind: 'number', optional: false },
  { name: 'version', label: 'Version', kind: 'number', optional: false },
  { name: 'previousVersionId', label: 'Document', kind: 'relation', optional: true, relation: { resource: 'document', displayField: 'name', refField: 'id' } },
  { name: 'projectId', label: 'Project', kind: 'relation', optional: true, relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', optional: true, relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', optional: true, relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'uploadedById', label: 'User', kind: 'relation', optional: true, relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'name', label: 'Name', kind: 'text' },
  { name: 'storageKey', label: 'Storage Key', kind: 'text' },
  { name: 'mimeType', label: 'Mime Type', kind: 'text' },
  { name: 'sizeBytes', label: 'Size Bytes', kind: 'number' },
  { name: 'previousVersionId', label: 'Document', kind: 'relation', relation: { resource: 'document', displayField: 'name', refField: 'id' } },
  { name: 'projectId', label: 'Project', kind: 'relation', relation: { resource: 'project', displayField: 'code', refField: 'id' } },
  { name: 'wbsNodeId', label: 'Wbsnode', kind: 'relation', relation: { resource: 'wbsnode', displayField: 'code', refField: 'id' } },
  { name: 'workItemId', label: 'Workitem', kind: 'relation', relation: { resource: 'workitem', displayField: 'title', refField: 'id' } },
  { name: 'uploadedById', label: 'User', kind: 'relation', relation: { resource: 'user', displayField: 'firstName', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    name: '',
    description: '',
    storageKey: '',
    mimeType: '',
    sizeBytes: undefined,
    version: undefined,
    previousVersionId: '',
    projectId: '',
    wbsNodeId: '',
    workItemId: '',
    uploadedById: '',
    organizationId: '',
  },
};
