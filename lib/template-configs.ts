import { TemplateConfig } from '@/lib/template-utils';

export const taskTemplateConfig: TemplateConfig = {
  entity: 'Tasks',
  fields: [
    {
      key: 'name',
      label: 'Task Name',
      type: 'text',
      required: true,
      description: 'The name of the task',
      example: 'Design Phase Review'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      description: 'Task description',
      example: 'Review and approve design documents'
    },
    {
      key: 'wbs_id',
      label: 'WBS ID',
      type: 'number',
      required: true,
      description: 'ID of the WBS this task belongs to',
      example: '1'
    },
    {
      key: 'start_date',
      label: 'Start Date',
      type: 'date',
      required: true,
      description: 'Task start date in YYYY-MM-DD format',
      example: '2025-01-15'
    },
    {
      key: 'end_date',
      label: 'End Date',
      type: 'date',
      required: true,
      description: 'Task end date in YYYY-MM-DD format',
      example: '2025-01-30'
    },
    {
      key: 'duration',
      label: 'Duration (days)',
      type: 'number',
      required: true,
      description: 'Task duration in days',
      example: '15'
    },
    {
      key: 'estimated_hours',
      label: 'Estimated Hours',
      type: 'number',
      description: 'Estimated work hours for the task',
      example: '40'
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: ['low', 'medium', 'high', 'critical'],
      description: 'Task priority level',
      example: 'medium'
    },
    {
      key: 'is_milestone',
      label: 'Is Milestone',
      type: 'boolean',
      description: 'Whether this task is a milestone',
      example: 'false'
    },
    {
      key: 'work_package',
      label: 'Work Package',
      type: 'text',
      description: 'Work package identifier',
      example: 'WP-001'
    },
    {
      key: 'assigned_users',
      label: 'Assigned Users (comma-separated IDs)',
      type: 'text',
      description: 'User IDs assigned to this task, separated by commas',
      example: '1,2,3'
    }
  ],
  instructions: [
    '1. Fill in the Tasks sheet with your task data',
    '2. Required fields are marked with *',
    '3. Use the reference sheets for valid IDs',
    '4. Date format: YYYY-MM-DD (e.g., 2025-01-15)',
    '5. Duration should be in days',
    '6. For boolean fields, use true/false or 1/0',
    '7. For assigned users, use comma-separated user IDs (e.g., "1,2,3")',
    '8. Remove the sample data row before uploading'
  ]
};

export const riskTemplateConfig: TemplateConfig = {
  entity: 'Risks',
  fields: [
    {
      key: 'name',
      label: 'Risk Name',
      type: 'text',
      required: true,
      description: 'The name of the risk',
      example: 'Weather Delay Risk'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      description: 'Risk description',
      example: 'Potential delays due to adverse weather conditions'
    },
    {
      key: 'project_id',
      label: 'Project ID',
      type: 'number',
      required: true,
      description: 'ID of the project this risk belongs to',
      example: '1'
    },
    {
      key: 'owner_id',
      label: 'Owner ID',
      type: 'number',
      required: true,
      description: 'ID of the user who owns this risk',
      example: '1'
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: ['technical', 'financial', 'schedule', 'resource', 'external', 'other'],
      required: true,
      description: 'Risk category',
      example: 'external'
    },
    {
      key: 'impact',
      label: 'Impact Level',
      type: 'select',
      options: ['very_low', 'low', 'medium', 'high', 'very_high'],
      required: true,
      description: 'Impact level of the risk',
      example: 'medium'
    },
    {
      key: 'probability',
      label: 'Probability Level',
      type: 'select',
      options: ['very_low', 'low', 'medium', 'high', 'very_high'],
      required: true,
      description: 'Probability level of the risk',
      example: 'low'
    },
    {
      key: 'identified_date',
      label: 'Identified Date',
      type: 'date',
      required: true,
      description: 'Date when the risk was identified',
      example: '2025-01-01'
    },
    {
      key: 'next_review',
      label: 'Next Review Date',
      type: 'date',
      description: 'Date for next risk review',
      example: '2025-02-01'
    },
    {
      key: 'review_frequency',
      label: 'Review Frequency (days)',
      type: 'number',
      description: 'How often to review this risk in days',
      example: '30'
    }
  ],
  instructions: [
    '1. Fill in the Risks sheet with your risk data',
    '2. Required fields are marked with *',
    '3. Use the reference sheets for valid IDs',
    '4. Date format: YYYY-MM-DD (e.g., 2025-01-01)',
    '5. Impact and Probability levels: very_low, low, medium, high, very_high',
    '6. Categories: technical, financial, schedule, resource, external, other',
    '7. Review frequency should be in days',
    '8. Remove the sample data row before uploading'
  ]
};

export const budgetTemplateConfig: TemplateConfig = {
  entity: 'Budgets',
  fields: [
    {
      key: 'project_id',
      label: 'Project ID',
      type: 'number',
      required: true,
      description: 'ID of the project this budget belongs to',
      example: '1'
    },
    {
      key: 'wbs_id',
      label: 'WBS ID',
      type: 'number',
      description: 'ID of the WBS (optional)',
      example: '1'
    },
    {
      key: 'task_id',
      label: 'Task ID',
      type: 'number',
      description: 'ID of the task (optional)',
      example: '1'
    },
    {
      key: 'cost_type',
      label: 'Cost Type',
      type: 'text',
      required: true,
      description: 'Type of cost (e.g., Labor, Materials, Equipment)',
      example: 'Labor'
    },
    {
      key: 'planned_amount',
      label: 'Planned Amount',
      type: 'number',
      required: true,
      description: 'Planned budget amount',
      example: '50000'
    },
    {
      key: 'actual_amount',
      label: 'Actual Amount',
      type: 'number',
      description: 'Actual spent amount',
      example: '45000'
    },
    {
      key: 'threshold',
      label: 'Threshold',
      type: 'number',
      description: 'Budget threshold/limit',
      example: '55000'
    },
    {
      key: 'fiscal_year',
      label: 'Fiscal Year',
      type: 'number',
      required: true,
      description: 'Fiscal year for this budget',
      example: '2025'
    },
    {
      key: 'fiscal_period',
      label: 'Fiscal Period',
      type: 'text',
      required: true,
      description: 'Fiscal period (e.g., Q1, Q2, Q3, Q4)',
      example: 'Q1'
    }
  ],
  instructions: [
    '1. Fill in the Budgets sheet with your budget data',
    '2. Required fields are marked with *',
    '3. Use the reference sheets for valid IDs',
    '4. Either WBS ID or Task ID can be specified, or both can be left empty for project-level budgets',
    '5. Amounts should be in the project currency',
    '6. Fiscal periods: Q1, Q2, Q3, Q4, or specific month names',
    '7. Remove the sample data row before uploading'
  ]
};
