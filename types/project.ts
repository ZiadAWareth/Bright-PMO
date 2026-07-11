import { ProjectStatus, ProjectPriority, projectCompliance, ProjectStrategicValue, TaskPriority, ClosureDocumentType } from '@prisma/client';

export interface WBSItem {
  wbs_id: number;
  project_id: number;
  parent_wbs_id: number | null;
  wbs_code: string;
  name: string;
  description: string;
  level: number;
  start_date: string;
  end_date: string;
  budget_amount: number;
  actual_cost: number;
  progress_percentage: number;
  status: string;
  created_at: string;
  updated_at: string;
  children?: WBSItem[];
  isExpanded?: boolean;
  isSelected?: boolean;
}

export interface WBS {
  wbs_id: number;
  wbs_code: string;
  name: string;
  description: string | null;
  project_id: number;
  parent_wbs_id: number | null;
  level: number;
  progress_percentage: number;
  start_date: Date;
  end_date: Date;
  created_at: Date;
  updated_at: Date;
  wbsItems: WBSItem[];
  children: WBS[];
  parent: WBS | null;
}

export enum ProjectType {
  residential = 'residential',
  commercial = 'commercial',
  industrial = 'industrial',
  infrastructure = 'infrastructure',
  healthcare = 'healthcare',
  educational = 'educational',
  government = 'government',
  mixed_use = 'mixed_use',
  renovation = 'renovation',
  religious = 'religious',
}

export interface Project {
  project_id: number;
  project_code: string;
  name: string;
  description: string | null;
  start_date: Date;
  planned_end_date: Date;
  actual_end_date: Date | null;
  status: ProjectStatus;
  budget_amount: number;
  pending_budget_amount: number | null;
  actual_cost: number;
  progress_percentage: number;
  eps_level_id: number;
  portfolio_id: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  required_approvals: number;
  priority: ProjectPriority;
  compliance: projectCompliance;
  roi: number | null;
  location: string | null;
  healthScore: number;
  riskScore: number;
  qualityScore: number ;
  client: string | null;
  contractor: string | null;
  tags: string[];
  strategicValue: ProjectStrategicValue;
  type: ProjectType;
  size: number | null;
  wbs: WBS[];
  closure_documents?: ClosureDocumentItem[];
  closure_checklists?: ClosureChecklistItem[];
  punch_list_items?: PunchListItem[];
  closure_approved_at?: Date | null;
  closure_approved_by?: number | null;
  closure_notes?: string | null;
  closure_approved_user?: {
    user_id: number;
    username: string;
    account?: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface ProjectTask {
  task_id: number;
  name: string;
  description: string | null;
  wbs_id: number;
  start_date: Date;
  end_date: Date;
  actual_start_date: Date | null;
  actual_end_date: Date | null;
  duration: number;
  progress_percentage: number;
  is_milestone: boolean;
  is_critical_path: boolean;
  priority: TaskPriority;
  status: 'todo' | 'in_progress' | 'completed' | 'on_hold';
  created_by: number;
  created_at: Date;
  updated_at: Date;
  estimated_hours: number;
  actual_hours: number;
  work_package: string | null;
  creator?: {
    user_id: number;
    username: string;
    email: string;
    account?: {
      first_name: string;
      last_name: string;
    };
  };
  assigned_users?: {
    user: {
      user_id: number;
      username: string;
      email: string;
      account?: {
        first_name: string;
        last_name: string;
      };
    };
  }[];
  resourceAssignments?: {
    resource: {
      resource_id: number;
      name: string;
      type: 'labor' | 'equipment' | 'material';
      role: string;
    };
    allocation_percentage: number;
    planned_hours: number;
    actual_hours: number;
  }[];
  budgets?: {
    budget_id: number;
    cost_type: string;
    planned_amount: number;
    actual_amount: number;
    variance: number;
  }[];
  documents?: {
    document_id: number;
    name: string;
    file_path: string;
    file_type: string;
  }[];
  predecessor_dependencies?: {
    dependency_id: number;
    dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
    lag_time: number;
    predecessor: ProjectTask;
    successor: ProjectTask;
  }[];
  successor_dependencies?: {
    dependency_id: number;
    dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
    lag_time: number;
    predecessor: ProjectTask;
    successor: ProjectTask;
  }[];
  PerformanceMetric?: {
    metric_id: number;
    cpi: number;
    spi: number;
    status: string;
    commentary: string | null;
  }[];
  Scorecard?: {
    scorecard_id: number;
    cpi: number;
    spi: number;
    status: string;
    commentary: string;
  }[];
  Escalation?: {
    escalation_id: number;
    triggered_at: Date;
    resolved_at: Date | null;
    escalated_to: string;
    reason: string;
    status: string;
  }[];
}

export interface Task {
    task_id: number;
    name: string;
    description: string | null;
    wbs_id: number;
    start_date: string;
    end_date: string;
    actual_start_date: string | null;
    actual_end_date: string | null;
    duration: number;
    progress_percentage: number;
    is_milestone: boolean;
    is_critical_path: boolean;
    priority: "low" | "medium" | "high";
    status: "todo" | "in_progress" | "completed" | "on_hold";
    created_at: string;
    updated_at: string;
    estimated_hours: number;
    actual_hours: number;
    work_package: string | null;
    wbs: {
        wbs_id: number;
        name: string;
        wbs_code: string;
        level: number;
    };
    predecessor_dependencies?: {
        predecessor_task_id: number;
        dependency_type: string;
        lag_time: number;
        dependency_id?: number;
        successor_task_id?: number;
    }[];
    successor_dependencies?: {
        successor_task_id: number;
        dependency_type: string;
        lag_time: number;
        dependency_id?: number;
        predecessor_task_id?: number;
    }[];
}

export type TaskStatus = "todo" | "in_progress" | "completed" | "on_hold";

export type TaskAddUpdate = {
    name: string;
    description: string;
    wbs_id: string;
    start_date: string;
    end_date: string;
    duration: number;
    estimated_hours: number;
    priority: TaskPriority;
    status: TaskStatus;
    is_milestone: boolean;
    progress_percentage: number;
    work_package: string;
};

export interface ProjectWithRelations extends Project {
  eps: {
    eps_id: number;
    eps_code: string;
    name: string;
    description: string | null;
    parent_eps_id: number | null;
    level: number;
    created_at: Date;
    updated_at: Date;
  };
  portfolio: {
    portfolio_id: number;
    name: string;
    description: string | null;
    manager_id: number;
    created_at: Date;
    updated_at: Date;
  };
  creator: {
    user_id: number;
    username: string;
    email: string;
    status: string;
    role_id: number;
    role: {
      role_id: number;
      name: string;
    };
    account: {
      first_name: string;
      last_name: string;
    };
  };
  team_members: {
    id: number;
    project_id: number;
    user_id: number;
    joined_at: Date;
    updated_at: Date;
    is_lead: boolean;
    workload: number;
    user: {
      user_id: number;
      username: string;
      email: string;
      status: string;
      role_id: number;
      role: {
        role_id: number;
        name: string;
      };
      account: {
        first_name: string;
        last_name: string;
      };
    };
  }[];
  wbs: WBS[];
  tasks: ProjectTask[];
  manager: {
    user_id: number;
    username: string;
    email: string;
    status: string;
    role_id: number;
    role: {
      role_id: number;
      name: string;
    };
    account: {
      first_name: string;
      last_name: string;
    };
  };
  department?: string;
  closure_documents?: ClosureDocumentItem[];
  closure_checklists?: ClosureChecklistItem[];
  punch_list_items?: PunchListItem[];
  final_inspection?: FinalInspection;
  handover?: Handover;
  closure_approved_user?: {
    user_id: number;
    username: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface ProjectSetup {
  id: number;
  project_id: number;
  wbs: boolean;
  schedule: boolean;
  budget: boolean;
  team: boolean;
  risk: boolean;
  baseline: boolean;
  execution: boolean;
  off_days: string[];
}

export interface ClosureDocumentItem {
  id: number;
  project_id: number;
  document_id: number | null;
  type: ClosureDocumentType;
  required: boolean;
  submitted: boolean;
  approved: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  document: {
    document_id: number;
    name: string;
    file_path: string;
    file_type: string;
    size: number;
  } | null;
}

export interface ClosureChecklistItem {
  id: number;
  project_id: number;
  title: string;
  type: string;
  status: string;
  auto_checked: boolean;
  completed_at: Date | null;
  completed_by: number | null;
  completedBy?: {
    user_id: number;
    username: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface PunchListItem {
  id: number;
  project_id: number;
  title: string;
  status: string;
  assigned_to: number | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
  assignee?: {
    user_id: number;
    username: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface FinalInspection {
  id: number;
  project_id: number;
  scheduled_date: Date;
  scheduled_time: string;
  inspector_id: number | null;
  status: string;
  notes: string | null;
  documents: any;
  approved: boolean;
  approval_notes: string | null;
  submitted_at: Date | null;
  submitted_by: number | null;
  approved_at: Date | null;
  approved_by: number | null;
  created_at: Date;
  updated_at: Date;
  inspector?: {
    user_id: number;
    username: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
  submitter?: {
    user_id: number;
    username: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
  approver?: {
    user_id: number;
    username: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface Handover {
  id: number;
  project_id: number;
  handover_date: Date;
  handover_time: string;
  handover_receipt_id: number | null;
  notes: string | null;
  status: string;
  handed_over_by: number;
  handed_over_to: string | null;
  submitted_at: Date | null;
  submitted_by: number | null;
  approved_at: Date | null;
  approved_by: number | null;
  created_at: Date;
  updated_at: Date;
  handover_receipt?: {
    document_id: number;
    name: string;
    file_path: string;
    file_type: string;
    size: number;
  };
  handover_user: {
    user_id: number;
    username: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
  submitter?: {
    user_id: number;
    username: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
  approver?: {
    user_id: number;
    username: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface Phase {
  id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: "upcoming" | "active" | "completed" | "delayed";
    progress: number;
    tasks: Task[];
    milestones: Task[];
    color: string;
}