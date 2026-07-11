// path to your prisma client

import { prisma } from "./prisma";

export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'json'
  | 'relation';

export type Field = {
  name: string;
  type: FieldType;
  isRequired: boolean;
  isUnique?: boolean;
  enumValues?: string[];
  relation?: {
    target: string;
    type: 'one' | 'many';
  };
};

export type EntityConfig = {
  label: string;
  include: Record<string, boolean>;
  fields: Field[];
};

export const entityConfig: Record<string, EntityConfig> = {
  projects: {
    label: 'Projects',
    include: { 
      portfolio: true, 
      eps: true,
      risks: true,
      budgets: true,
      documents: true,
      lessons: true,
      baselines: true,
      evms: true,
      wbs: true,
      procurements: true
    },
    fields: [
      { name: 'project_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'project_code', type: 'string', isRequired: true, isUnique: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'start_date', type: 'date', isRequired: true },
      { name: 'planned_end_date', type: 'date', isRequired: true },
      { name: 'actual_end_date', type: 'date', isRequired: false },
      { name: 'status', type: 'enum', isRequired: true, enumValues: ['planning', 'execution', 'completed', 'on_hold'] },
      { name: 'budget_amount', type: 'number', isRequired: true },
      { name: 'actual_cost', type: 'number', isRequired: true },
      { name: 'progress_percentage', type: 'number', isRequired: true },
      { name: 'eps_level_id', type: 'number', isRequired: true },
      { name: 'portfolio_id', type: 'number', isRequired: true },
      { name: 'created_by', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'eps', type: 'relation', isRequired: true, relation: { target: 'eps', type: 'one' } },
      { name: 'portfolio', type: 'relation', isRequired: true, relation: { target: 'portfolio', type: 'one' } },
      { name: 'risks', type: 'relation', isRequired: false, relation: { target: 'risk', type: 'many' } },
      { name: 'budgets', type: 'relation', isRequired: false, relation: { target: 'budget', type: 'many' } },
      { name: 'documents', type: 'relation', isRequired: false, relation: { target: 'document', type: 'many' } },
      { name: 'lessons', type: 'relation', isRequired: false, relation: { target: 'lesson', type: 'many' } },
      { name: 'baselines', type: 'relation', isRequired: false, relation: { target: 'baseline', type: 'many' } },
      { name: 'evms', type: 'relation', isRequired: false, relation: { target: 'evm', type: 'many' } },
      { name: 'wbs', type: 'relation', isRequired: false, relation: { target: 'wbs', type: 'many' } },
      { name: 'procurements', type: 'relation', isRequired: false, relation: { target: 'procurement', type: 'many' } }
    ]
  },
  portfolios: {
    label: 'Portfolios',
    include: { 
      projects: true,
      manager: true
    },
    fields: [
      { name: 'portfolio_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'manager_id', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'manager', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } },
      { name: 'projects', type: 'relation', isRequired: false, relation: { target: 'project', type: 'many' } }
    ]
  },
  eps: {
    label: 'EPS',
    include: { 
      projects: true,
      parent: true,
      children: true
    },
    fields: [
      { name: 'eps_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'eps_code', type: 'string', isRequired: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'parent_eps_id', type: 'number', isRequired: false },
      { name: 'level', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'parent', type: 'relation', isRequired: false, relation: { target: 'eps', type: 'one' } },
      { name: 'children', type: 'relation', isRequired: false, relation: { target: 'eps', type: 'many' } },
      { name: 'projects', type: 'relation', isRequired: false, relation: { target: 'project', type: 'many' } }
    ]
  },
  wbs: {
    label: 'WBS',
    include: {
      project: true,
      parent: true,
      children: true,
      wbsItems: true,
      tasks: true,
      budgets: true,
      documents: true,
      procurements: true
    },
    fields: [
      { name: 'wbs_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'wbs_code', type: 'string', isRequired: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'project_id', type: 'number', isRequired: true },
      { name: 'parent_wbs_id', type: 'number', isRequired: false },
      { name: 'level', type: 'number', isRequired: true },
      { name: 'progress_percentage', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'project', type: 'relation', isRequired: true, relation: { target: 'project', type: 'one' } },
      { name: 'parent', type: 'relation', isRequired: false, relation: { target: 'wbs', type: 'one' } },
      { name: 'children', type: 'relation', isRequired: false, relation: { target: 'wbs', type: 'many' } },
      { name: 'wbsItems', type: 'relation', isRequired: false, relation: { target: 'wbsItem', type: 'many' } },
      { name: 'tasks', type: 'relation', isRequired: false, relation: { target: 'task', type: 'many' } },
      { name: 'budgets', type: 'relation', isRequired: false, relation: { target: 'budget', type: 'many' } },
      { name: 'documents', type: 'relation', isRequired: false, relation: { target: 'document', type: 'many' } },
      { name: 'procurements', type: 'relation', isRequired: false, relation: { target: 'procurement', type: 'many' } }
    ]
  },
  wbsItems: {
    label: 'WBS Items',
    include: {
      wbs: true
    },
    fields: [
      { name: 'wbs_item_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'wbs_item_code', type: 'string', isRequired: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'start_date', type: 'date', isRequired: true },
      { name: 'end_date', type: 'date', isRequired: true },
      { name: 'budget_amount', type: 'number', isRequired: true },
      { name: 'actual_cost', type: 'number', isRequired: true },
      { name: 'progress_percentage', type: 'number', isRequired: true },
      { name: 'wbs_id', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'wbs', type: 'relation', isRequired: true, relation: { target: 'wbs', type: 'one' } }
    ]
  },
  tasks: {
    label: 'Tasks',
    include: {
      wbs: true,
      resourceAssignments: true,
      budgets: true,
      documents: true,
      predecessor_dependencies: true,
      successor_dependencies: true
    },
    fields: [
      { name: 'task_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'wbs_id', type: 'number', isRequired: true },
      { name: 'start_date', type: 'date', isRequired: true },
      { name: 'end_date', type: 'date', isRequired: true },
      { name: 'actual_start_date', type: 'date', isRequired: false },
      { name: 'actual_end_date', type: 'date', isRequired: false },
      { name: 'duration', type: 'number', isRequired: true },
      { name: 'progress_percentage', type: 'number', isRequired: true },
      { name: 'is_milestone', type: 'boolean', isRequired: true },
      { name: 'is_critical_path', type: 'boolean', isRequired: true },
      { name: 'priority', type: 'number', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'wbs', type: 'relation', isRequired: true, relation: { target: 'wbs', type: 'one' } },
      { name: 'resourceAssignments', type: 'relation', isRequired: false, relation: { target: 'resourceAssignment', type: 'many' } },
      { name: 'budgets', type: 'relation', isRequired: false, relation: { target: 'budget', type: 'many' } },
      { name: 'documents', type: 'relation', isRequired: false, relation: { target: 'document', type: 'many' } },
      { name: 'predecessor_dependencies', type: 'relation', isRequired: false, relation: { target: 'taskDependency', type: 'many' } },
      { name: 'successor_dependencies', type: 'relation', isRequired: false, relation: { target: 'taskDependency', type: 'many' } }
    ]
  },
  taskDependencies: {
    label: 'Task Dependencies',
    include: {
      predecessor: true,
      successor: true
    },
    fields: [
      { name: 'dependency_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'predecessor_task_id', type: 'number', isRequired: true },
      { name: 'successor_task_id', type: 'number', isRequired: true },
      { name: 'dependency_type', type: 'enum', isRequired: true, enumValues: ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'] },
      { name: 'lag_time', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'predecessor', type: 'relation', isRequired: true, relation: { target: 'task', type: 'one' } },
      { name: 'successor', type: 'relation', isRequired: true, relation: { target: 'task', type: 'one' } }
    ]
  },
  resources: {
    label: 'Resources',
    include: {
      assignments: true
    },
    fields: [
      { name: 'resource_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'type', type: 'enum', isRequired: true, enumValues: ['labor', 'equipment', 'material'] },
      { name: 'role', type: 'string', isRequired: true },
      { name: 'skills', type: 'json', isRequired: true },
      { name: 'rate', type: 'number', isRequired: true },
      { name: 'availability_status', type: 'string', isRequired: true },
      { name: 'department', type: 'string', isRequired: true },
      { name: 'contact_info', type: 'string', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'assignments', type: 'relation', isRequired: false, relation: { target: 'resourceAssignment', type: 'many' } }
    ]
  },
  resourceAssignments: {
    label: 'Resource Assignments',
    include: {
      resource: true,
      task: true
    },
    fields: [
      { name: 'assignment_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'resource_id', type: 'number', isRequired: true },
      { name: 'task_id', type: 'number', isRequired: true },
      { name: 'allocation_percentage', type: 'number', isRequired: true },
      { name: 'start_date', type: 'date', isRequired: true },
      { name: 'end_date', type: 'date', isRequired: true },
      { name: 'planned_hours', type: 'number', isRequired: true },
      { name: 'actual_hours', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'resource', type: 'relation', isRequired: true, relation: { target: 'resource', type: 'one' } },
      { name: 'task', type: 'relation', isRequired: true, relation: { target: 'task', type: 'one' } }
    ]
  },
  budgets: {
    label: 'Budgets',
    include: {
      project: true,
      wbs: true,
      task: true
    },
    fields: [
      { name: 'budget_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'project_id', type: 'number', isRequired: true },
      { name: 'wbs_id', type: 'number', isRequired: false },
      { name: 'task_id', type: 'number', isRequired: false },
      { name: 'cost_type', type: 'string', isRequired: true },
      { name: 'planned_amount', type: 'number', isRequired: true },
      { name: 'actual_amount', type: 'number', isRequired: true },
      { name: 'variance', type: 'number', isRequired: true },
      { name: 'fiscal_year', type: 'number', isRequired: true },
      { name: 'fiscal_period', type: 'string', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'project', type: 'relation', isRequired: true, relation: { target: 'project', type: 'one' } },
      { name: 'wbs', type: 'relation', isRequired: false, relation: { target: 'wbs', type: 'one' } },
      { name: 'task', type: 'relation', isRequired: false, relation: { target: 'task', type: 'one' } }
    ]
  },
  risks: {
    label: 'Risks',
    include: {
      project: true,
      owner: true,
      mitigations: true
    },
    fields: [
      { name: 'risk_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'project_id', type: 'number', isRequired: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'identified_date', type: 'date', isRequired: true },
      { name: 'impact', type: 'enum', isRequired: true, enumValues: ['high', 'medium', 'low'] },
      { name: 'probability', type: 'enum', isRequired: true, enumValues: ['high', 'medium', 'low'] },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'owner_id', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'project', type: 'relation', isRequired: true, relation: { target: 'project', type: 'one' } },
      { name: 'owner', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } },
      { name: 'mitigations', type: 'relation', isRequired: false, relation: { target: 'riskMitigation', type: 'many' } }
    ]
  },
  riskMitigations: {
    label: 'Risk Mitigations',
    include: {
      risk: true
    },
    fields: [
      { name: 'mitigation_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'risk_id', type: 'number', isRequired: true },
      { name: 'description', type: 'string', isRequired: true },
      { name: 'action_plan', type: 'string', isRequired: true },
      { name: 'start_date', type: 'date', isRequired: true },
      { name: 'due_date', type: 'date', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'responsible_id', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'risk', type: 'relation', isRequired: true, relation: { target: 'risk', type: 'one' } },
      { name: 'responsible', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } }
    ]
  },
  procurements: {
    label: 'Procurements',
    include: {
      project: true,
      wbs: true,
      contract: true
    },
    fields: [
      { name: 'procurement_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'project_id', type: 'number', isRequired: true },
      { name: 'wbs_id', type: 'number', isRequired: false },
      { name: 'type', type: 'enum', isRequired: true, enumValues: ['material', 'service', 'equipment'] },
      { name: 'description', type: 'string', isRequired: true },
      { name: 'estimated_cost', type: 'number', isRequired: true },
      { name: 'actual_cost', type: 'number', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'project', type: 'relation', isRequired: true, relation: { target: 'project', type: 'one' } },
      { name: 'wbs', type: 'relation', isRequired: false, relation: { target: 'wbs', type: 'one' } },
      { name: 'contracts', type: 'relation', isRequired: false, relation: { target: 'contract', type: 'many' } }
    ]
  },
  contracts: {
    label: 'Contracts',
    include: {
      vendor: true,
      procurements: true
    },
    fields: [
      { name: 'contract_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'procurement_id', type: 'number', isRequired: true },
      { name: 'vendor_id', type: 'number', isRequired: true },
      { name: 'contract_number', type: 'string', isRequired: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: true },
      { name: 'start_date', type: 'date', isRequired: true },
      { name: 'end_date', type: 'date', isRequired: true },
      { name: 'value', type: 'number', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'procurement', type: 'relation', isRequired: true, relation: { target: 'procurement', type: 'one' } },
      { name: 'vendor', type: 'relation', isRequired: true, relation: { target: 'vendor', type: 'one' } }
    ]
  },
  vendors: {
    label: 'Vendors',
    include: {
      contracts: true
    },
    fields: [
      { name: 'vendor_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'contact_person', type: 'string', isRequired: true },
      { name: 'contact_info', type: 'string', isRequired: true },
      { name: 'address', type: 'string', isRequired: true },
      { name: 'category', type: 'string', isRequired: true },
      { name: 'performance_rating', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'contracts', type: 'relation', isRequired: false, relation: { target: 'contract', type: 'many' } }
    ]
  },
  accounts: {
    label: 'Accounts',
    include: {
      user: true,
      managedPortfolios: true
    },
    fields: [
      { name: 'account_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'user_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'first_name', type: 'string', isRequired: true },
      { name: 'last_name', type: 'string', isRequired: true },
      { name: 'department', type: 'string', isRequired: true },
      { name: 'contact_info', type: 'string', isRequired: true },
      { name: 'is_active', type: 'boolean', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'user', type: 'relation', isRequired: true, relation: { target: 'user', type: 'one' } },
      { name: 'managed_portfolios', type: 'relation', isRequired: false, relation: { target: 'portfolio', type: 'many' } },
      { name: 'owned_risks', type: 'relation', isRequired: false, relation: { target: 'risk', type: 'many' } },
      { name: 'risk_mitigations', type: 'relation', isRequired: false, relation: { target: 'riskMitigation', type: 'many' } },
      { name: 'created_reports', type: 'relation', isRequired: false, relation: { target: 'report', type: 'many' } },
      { name: 'uploaded_documents', type: 'relation', isRequired: false, relation: { target: 'document', type: 'many' } },
      { name: 'submitted_lessons', type: 'relation', isRequired: false, relation: { target: 'lesson', type: 'many' } },
      { name: 'created_baselines', type: 'relation', isRequired: false, relation: { target: 'baseline', type: 'many' } }
    ]
  },
  users: {
    label: 'Users',
    include: {
      account: true,
      roles: true
    },
    fields: [
      { name: 'user_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'username', type: 'string', isRequired: true, isUnique: true },
      { name: 'email', type: 'string', isRequired: true, isUnique: true },
      { name: 'password_hash', type: 'string', isRequired: true },
      { name: 'role_id', type: 'number', isRequired: true },
      { name: 'status', type: 'string', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'account', type: 'relation', isRequired: false, relation: { target: 'account', type: 'one' } },
      { name: 'role', type: 'relation', isRequired: true, relation: { target: 'role', type: 'one' } }
    ]
  },
  roles: {
    label: 'Roles',
    include: {
      users: true
    },
    fields: [
      { name: 'role_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: true },
      { name: 'permissions', type: 'json', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'users', type: 'relation', isRequired: false, relation: { target: 'user', type: 'many' } }
    ]
  },
  reports: {
    label: 'Reports',
    include: {
      creator: true
    },
    fields: [
      { name: 'report_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'type', type: 'string', isRequired: true },
      { name: 'template', type: 'json', isRequired: true },
      { name: 'created_by', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'creator', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } }
    ]
  },
  documents: {
    label: 'Documents',
    include: {
      project: true,
      wbs: true,
      task: true
    },
    fields: [
      { name: 'document_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'file_path', type: 'string', isRequired: true },
      { name: 'file_type', type: 'string', isRequired: true },
      { name: 'size', type: 'number', isRequired: true },
      { name: 'project_id', type: 'number', isRequired: false },
      { name: 'wbs_id', type: 'number', isRequired: false },
      { name: 'task_id', type: 'number', isRequired: false },
      { name: 'uploaded_by', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'project', type: 'relation', isRequired: false, relation: { target: 'project', type: 'one' } },
      { name: 'wbs', type: 'relation', isRequired: false, relation: { target: 'wbs', type: 'one' } },
      { name: 'task', type: 'relation', isRequired: false, relation: { target: 'task', type: 'one' } },
      { name: 'uploader', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } }
    ]
  },
  lessons: {
    label: 'Lessons',
    include: {
      project: true
    },
    fields: [
      { name: 'lesson_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'project_id', type: 'number', isRequired: true },
      { name: 'title', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: true },
      { name: 'category', type: 'string', isRequired: true },
      { name: 'impact', type: 'string', isRequired: true },
      { name: 'recommendations', type: 'string', isRequired: true },
      { name: 'submitted_by', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'project', type: 'relation', isRequired: true, relation: { target: 'project', type: 'one' } },
      { name: 'submitter', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } }
    ]
  },
  baselines: {
    label: 'Baselines',
    include: {
      project: true
    },
    fields: [
      { name: 'baseline_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'project_id', type: 'number', isRequired: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: true },
      { name: 'baseline_date', type: 'date', isRequired: true },
      { name: 'baseline_type', type: 'enum', isRequired: true, enumValues: ['initial', 'revised', 're_baseline'] },
      { name: 'scope_snapshot', type: 'json', isRequired: true },
      { name: 'schedule_snapshot', type: 'json', isRequired: true },
      { name: 'cost_snapshot', type: 'json', isRequired: true },
      { name: 'created_by', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'project', type: 'relation', isRequired: true, relation: { target: 'project', type: 'one' } },
      { name: 'creator', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } }
    ]
  },
  evms: {
    label: 'EVMs',
    include: {
      project: true
    },
    fields: [
      { name: 'evm_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'project_id', type: 'number', isRequired: true },
      { name: 'fiscal_period', type: 'string', isRequired: true },
      { name: 'planned_value', type: 'number', isRequired: true },
      { name: 'earned_value', type: 'number', isRequired: true },
      { name: 'actual_cost', type: 'number', isRequired: true },
      { name: 'cost_performance_index', type: 'number', isRequired: true },
      { name: 'schedule_performance_index', type: 'number', isRequired: true },
      { name: 'estimate_at_completion', type: 'number', isRequired: true },
      { name: 'estimate_to_complete', type: 'number', isRequired: true },
      { name: 'variance_at_completion', type: 'number', isRequired: true },
      { name: 'reporting_date', type: 'date', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'project', type: 'relation', isRequired: true, relation: { target: 'project', type: 'one' } }
    ]
  },
  sites: {
    label: 'Sites',
    include: {
      project: true,
      manager: true,
      equipmentLogs: true
    },
    fields: [
      { name: 'site_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'site_code', type: 'string', isRequired: true, isUnique: true },
      { name: 'name', type: 'string', isRequired: true },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'address', type: 'string', isRequired: true },
      { name: 'project_id', type: 'number', isRequired: true },
      { name: 'manager_id', type: 'number', isRequired: true },
      { name: 'is_active', type: 'boolean', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'project', type: 'relation', isRequired: true, relation: { target: 'project', type: 'one' } },
      { name: 'manager', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } },
      { name: 'equipment_logs', type: 'relation', isRequired: false, relation: { target: 'equipmentSiteLog', type: 'many' } }
    ]
  },
  equipmentSiteLogs: {
    label: 'Equipment Site Logs',
    include: {
      resource: true,
      site: true,
      user: true
    },
    fields: [
      { name: 'log_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'resource_id', type: 'number', isRequired: true },
      { name: 'site_id', type: 'number', isRequired: true },
      { name: 'logged_in_date', type: 'date', isRequired: true },
      { name: 'logged_out_date', type: 'date', isRequired: false },
      { name: 'usage_hours', type: 'number', isRequired: false },
      { name: 'condition_before', type: 'string', isRequired: false },
      { name: 'condition_after', type: 'string', isRequired: false },
      { name: 'notes', type: 'string', isRequired: false },
      { name: 'logged_by', type: 'number', isRequired: true },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'resource', type: 'relation', isRequired: true, relation: { target: 'resource', type: 'one' } },
      { name: 'site', type: 'relation', isRequired: true, relation: { target: 'site', type: 'one' } },
      { name: 'user', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } }
    ]
  },
  maintenanceSchedules: {
    label: 'Maintenance Schedules',
    include: {
      resource: true,
      maintenanceLogs: true
    },
    fields: [
      { name: 'schedule_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'resource_id', type: 'number', isRequired: true },
      { name: 'maintenance_type', type: 'enum', isRequired: true, enumValues: ['routine', 'repair', 'inspection', 'compliance', 'emergency'] },
      { name: 'trigger_type', type: 'enum', isRequired: true, enumValues: ['time_based', 'usage_based', 'condition_based', 'regulatory'] },
      { name: 'trigger_value', type: 'string', isRequired: true },
      { name: 'next_due_date', type: 'date', isRequired: true },
      { name: 'status', type: 'enum', isRequired: true, enumValues: ['scheduled', 'in_progress', 'completed', 'overdue', 'cancelled'] },
      { name: 'priority', type: 'enum', isRequired: true, enumValues: ['low', 'medium', 'high', 'critical'] },
      { name: 'description', type: 'string', isRequired: false },
      { name: 'estimated_hours', type: 'number', isRequired: false },
      { name: 'estimated_cost', type: 'number', isRequired: false },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'resource', type: 'relation', isRequired: true, relation: { target: 'resource', type: 'one' } },
      { name: 'maintenance_logs', type: 'relation', isRequired: false, relation: { target: 'maintenanceLog', type: 'many' } }
    ]
  },
  maintenanceLogs: {
    label: 'Maintenance Logs',
    include: {
      schedule: true,
      resource: true,
      technician: true
    },
    fields: [
      { name: 'log_id', type: 'number', isRequired: true, isUnique: true },
      { name: 'schedule_id', type: 'number', isRequired: false },
      { name: 'resource_id', type: 'number', isRequired: true },
      { name: 'maintenance_type', type: 'enum', isRequired: true, enumValues: ['routine', 'repair', 'inspection', 'compliance', 'emergency'] },
      { name: 'performed_date', type: 'date', isRequired: true },
      { name: 'performed_by', type: 'number', isRequired: true },
      { name: 'work_description', type: 'string', isRequired: true },
      { name: 'parts_used', type: 'string', isRequired: false },
      { name: 'labor_hours', type: 'number', isRequired: false },
      { name: 'parts_cost', type: 'number', isRequired: false },
      { name: 'labor_cost', type: 'number', isRequired: false },
      { name: 'total_cost', type: 'number', isRequired: false },
      { name: 'condition_before', type: 'string', isRequired: false },
      { name: 'condition_after', type: 'string', isRequired: false },
      { name: 'next_service_date', type: 'date', isRequired: false },
      { name: 'notes', type: 'string', isRequired: false },
      { name: 'created_at', type: 'date', isRequired: true },
      { name: 'updated_at', type: 'date', isRequired: true },
      { name: 'schedule', type: 'relation', isRequired: false, relation: { target: 'maintenanceSchedule', type: 'one' } },
      { name: 'resource', type: 'relation', isRequired: true, relation: { target: 'resource', type: 'one' } },
      { name: 'technician', type: 'relation', isRequired: true, relation: { target: 'account', type: 'one' } }
    ]
  }
};

export type EntityKey = keyof typeof entityConfig;
