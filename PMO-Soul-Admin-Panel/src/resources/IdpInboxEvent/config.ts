import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface IdpInboxEvent {
  id: number;
  idempotencyKey: string;
  event: string;
  payload: unknown;
  status: string;
  lastError?: string;
  createdAt: string;
  processedAt?: string;
  organizationId?: number;
}

export const idpinboxeventHooks = makeResourceHooks<IdpInboxEvent & { id: number }>('idpinboxevent', 'Idp Inbox Event');

const schema = z.object({
    idempotencyKey: z.string().min(1, 'Idempotency Key is required'),
    event: z.string().min(1, 'Event is required'),
    payload: z.string().min(1, 'Payload is required'),
    status: z.enum(['received', 'processing', 'processed', 'failed'] as [string, ...string[]], { required_error: 'Status is required' }),
    lastError: z.string().optional(),
    processedAt: z.string().optional(),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'idpinboxevent',
  routeBase: '/idpinboxevent',
  label: 'Idp Inbox Event',
  labelPlural: 'Idp Inbox Events',
  organizationOwned: true,
  hooks: idpinboxeventHooks,
  fields: [
  { name: 'idempotencyKey', label: 'Idempotency Key', kind: 'text', optional: false },
  { name: 'event', label: 'Event', kind: 'text', optional: false },
  { name: 'payload', label: 'Payload', kind: 'json', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['received', 'processing', 'processed', 'failed'] },
  { name: 'lastError', label: 'Last Error', kind: 'text', optional: true },
  { name: 'processedAt', label: 'Processed At', kind: 'datetime', optional: true },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'idempotencyKey', label: 'Idempotency Key', kind: 'text' },
  { name: 'event', label: 'Event', kind: 'text' },
  { name: 'status', label: 'Status', kind: 'enum' },
  { name: 'lastError', label: 'Last Error', kind: 'text' },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    idempotencyKey: '',
    event: '',
    payload: '',
    status: '',
    lastError: '',
    processedAt: '',
    organizationId: '',
  },
};
