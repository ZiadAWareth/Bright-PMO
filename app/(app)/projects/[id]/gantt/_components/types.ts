export interface User {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: {
    role_id: number;
    name: string;
  };
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
}

export interface GanttTask {
  id: string;
  wbsId?: string;
  wbsName?: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  progress: number;
  status: "todo" | "in_progress" | "completed" | "on_hold";
  priority: "low" | "medium" | "high" | "critical";
  assignedTo: string[];
  dependencies: string[];
  projectId: string;
  projectName: string;
  isMilestone: boolean;
  isOnCriticalPath: boolean;
  actualStartDate?: Date;
  actualEndDate?: Date;
  estimatedEffort: number;
  actualEffort?: number;
  resourceAllocation: number;
  cost: number;
  parentTaskId?: string;
  children?: GanttTask[];
  baseline?: {
    startDate: Date;
    endDate: Date;
    duration: number;
  };
}

export interface ProjectDetails {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  manager: string;
  budget: number;
  team: string[];
}

export interface GanttResourceAllocation {
  userId: string;
  userName: string;
  allocatedHours: number;
  availableHours: number;
  utilization: number;
  conflicts: string[];
}

export interface ResourceWorkload {
  resource_id: number;
  name: string;
  role: string;
  department: string;
  capacity_hours: number;
  planned_hours: number;
  actual_hours: number;
  planned_utilization_rate: number;
  actual_utilization_rate: number;
  status: "overloaded" | "optimal" | "under_utilized";
}

export interface ResourceWorkloadResponse {
  period: {
    start_date: string;
    end_date: string;
  };
  thresholds: {
    overloaded_threshold: number;
    under_utilized_threshold: number;
  };
  summary: {
    total_resources: number;
    overloaded_count: number;
    under_utilized_count: number;
    optimal_count: number;
  };
  resources: ResourceWorkload[];
}

export interface TimelineColumn {
  date: Date;
  label: string;
  isWeekend?: boolean;
}

export type UserRole = "admin" | "project-manager" | "technical" | "pmo" | "executive";
