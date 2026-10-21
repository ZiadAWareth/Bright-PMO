import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface RfqResponse {
  id: number;
  procurementId: number;
  vendorId: number;
  quoteAmount: string;
  deliveryDays?: number;
  technicalScore: number;
  commercialScore: number;
  totalScore: number;
  status: string;
  submittedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const rfqresponseHooks = makeResourceHooks<RfqResponse & { id: number }>('rfqresponse', 'Rfq Response');

const schema = z.object({
    quoteAmount: z.string().min(1, 'Quote Amount is required').regex(/^-?\d+(\.\d+)?$/, 'Enter a number'),
    deliveryDays: z.coerce.number().optional(),
    technicalScore: z.coerce.number({ invalid_type_error: 'Technical Score is required' }),
    commercialScore: z.coerce.number({ invalid_type_error: 'Commercial Score is required' }),
    totalScore: z.coerce.number({ invalid_type_error: 'Total Score is required' }),
    status: z.enum(['submitted', 'under_review', 'shortlisted', 'awarded', 'rejected'] as [string, ...string[]], { required_error: 'Status is required' }),
    submittedAt: z.string().min(1, 'Submitted At is required'),
    notes: z.string().optional(),
    procurementId: z.string().optional().or(z.literal('')),
    vendorId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'rfqresponse',
  routeBase: '/rfqresponse',
  label: 'Rfq Response',
  labelPlural: 'Rfq Responses',
  organizationOwned: true,
  hooks: rfqresponseHooks,
  fields: [
  { name: 'quoteAmount', label: 'Quote Amount', kind: 'decimal', optional: false },
  { name: 'deliveryDays', label: 'Delivery Days', kind: 'number', optional: true },
  { name: 'technicalScore', label: 'Technical Score', kind: 'number', optional: false },
  { name: 'commercialScore', label: 'Commercial Score', kind: 'number', optional: false },
  { name: 'totalScore', label: 'Total Score', kind: 'number', optional: false },
  { name: 'status', label: 'Status', kind: 'enum', optional: false, options: ['submitted', 'under_review', 'shortlisted', 'awarded', 'rejected'] },
  { name: 'submittedAt', label: 'Submitted At', kind: 'datetime', optional: false },
  { name: 'notes', label: 'Notes', kind: 'textarea', optional: true },
  { name: 'procurementId', label: 'Procurement', kind: 'relation', optional: true, relation: { resource: 'procurement', displayField: 'description', refField: 'id' } },
  { name: 'vendorId', label: 'Vendor', kind: 'relation', optional: true, relation: { resource: 'vendor', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'quoteAmount', label: 'Quote Amount', kind: 'decimal' },
  { name: 'deliveryDays', label: 'Delivery Days', kind: 'number' },
  { name: 'technicalScore', label: 'Technical Score', kind: 'number' },
  { name: 'commercialScore', label: 'Commercial Score', kind: 'number' },
  { name: 'procurementId', label: 'Procurement', kind: 'relation', relation: { resource: 'procurement', displayField: 'description', refField: 'id' } },
  { name: 'vendorId', label: 'Vendor', kind: 'relation', relation: { resource: 'vendor', displayField: 'name', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    quoteAmount: '',
    deliveryDays: undefined,
    technicalScore: undefined,
    commercialScore: undefined,
    totalScore: undefined,
    status: '',
    submittedAt: '',
    notes: '',
    procurementId: '',
    vendorId: '',
    organizationId: '',
  },
};
