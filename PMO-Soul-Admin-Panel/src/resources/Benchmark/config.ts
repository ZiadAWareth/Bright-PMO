import { z } from 'zod';
import { makeResourceHooks } from '@/lib/use-resource';
import type { ResourceConfig } from '@/lib/field-types';

export interface Benchmark {
  id: number;
  categoryId: number;
  costPerM2?: string;
  durationPerM2?: string;
  expectedRoi?: string;
  costOverrunMax?: string;
  scheduleSlipMax?: string;
  cpiThreshold?: string;
  spiThreshold?: string;
  efficiencyRatio?: string;
  avgTaskDelayMax?: string;
  criticalPathDelayMax?: number;
  expectedTaskCompletionRate?: string;
  maxBudgetThresholdViolation?: number;
  velocityStabilityMin?: string;
  sprintCompletionRateMin?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: number;
}

export const benchmarkHooks = makeResourceHooks<Benchmark & { id: number }>('benchmark', 'Benchmark');

const schema = z.object({
    costPerM2: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    durationPerM2: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    expectedRoi: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    costOverrunMax: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    scheduleSlipMax: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    cpiThreshold: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    spiThreshold: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    efficiencyRatio: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    avgTaskDelayMax: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    criticalPathDelayMax: z.coerce.number().optional(),
    expectedTaskCompletionRate: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    maxBudgetThresholdViolation: z.coerce.number().optional(),
    velocityStabilityMin: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    sprintCompletionRateMin: z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a number').optional().or(z.literal('')),
    categoryId: z.string().optional().or(z.literal('')),
    organizationId: z.string().optional().or(z.literal('')),
});

export const config: ResourceConfig = {
  resource: 'benchmark',
  routeBase: '/benchmark',
  label: 'Benchmark',
  labelPlural: 'Benchmarks',
  organizationOwned: true,
  hooks: benchmarkHooks,
  fields: [
  { name: 'costPerM2', label: 'Cost Per M2', kind: 'decimal', optional: true },
  { name: 'durationPerM2', label: 'Duration Per M2', kind: 'decimal', optional: true },
  { name: 'expectedRoi', label: 'Expected Roi', kind: 'decimal', optional: true },
  { name: 'costOverrunMax', label: 'Cost Overrun Max', kind: 'decimal', optional: true },
  { name: 'scheduleSlipMax', label: 'Schedule Slip Max', kind: 'decimal', optional: true },
  { name: 'cpiThreshold', label: 'Cpi Threshold', kind: 'decimal', optional: true },
  { name: 'spiThreshold', label: 'Spi Threshold', kind: 'decimal', optional: true },
  { name: 'efficiencyRatio', label: 'Efficiency Ratio', kind: 'decimal', optional: true },
  { name: 'avgTaskDelayMax', label: 'Avg Task Delay Max', kind: 'decimal', optional: true },
  { name: 'criticalPathDelayMax', label: 'Critical Path Delay Max', kind: 'number', optional: true },
  { name: 'expectedTaskCompletionRate', label: 'Expected Task Completion Rate', kind: 'decimal', optional: true },
  { name: 'maxBudgetThresholdViolation', label: 'Max Budget Threshold Violation', kind: 'number', optional: true },
  { name: 'velocityStabilityMin', label: 'Velocity Stability Min', kind: 'decimal', optional: true },
  { name: 'sprintCompletionRateMin', label: 'Sprint Completion Rate Min', kind: 'decimal', optional: true },
  { name: 'categoryId', label: 'Projectcategory', kind: 'relation', optional: true, relation: { resource: 'projectcategory', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', optional: true, relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  columns: [
  { name: 'id', label: 'ID', kind: 'number' },
  { name: 'costPerM2', label: 'Cost Per M2', kind: 'decimal' },
  { name: 'durationPerM2', label: 'Duration Per M2', kind: 'decimal' },
  { name: 'expectedRoi', label: 'Expected Roi', kind: 'decimal' },
  { name: 'costOverrunMax', label: 'Cost Overrun Max', kind: 'decimal' },
  { name: 'categoryId', label: 'Projectcategory', kind: 'relation', relation: { resource: 'projectcategory', displayField: 'code', refField: 'id' } },
  { name: 'organizationId', label: 'Organization', kind: 'relation', relation: { resource: 'organization', displayField: 'name', refField: 'id' } },
  ],
  schema,
  defaultValues: {
    costPerM2: '',
    durationPerM2: '',
    expectedRoi: '',
    costOverrunMax: '',
    scheduleSlipMax: '',
    cpiThreshold: '',
    spiThreshold: '',
    efficiencyRatio: '',
    avgTaskDelayMax: '',
    criticalPathDelayMax: undefined,
    expectedTaskCompletionRate: '',
    maxBudgetThresholdViolation: undefined,
    velocityStabilityMin: '',
    sprintCompletionRateMin: '',
    categoryId: '',
    organizationId: '',
  },
};
