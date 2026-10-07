export interface Task {
  task_id: number;
  name: string;
  description: string | null;
  wbs_id?: number;
  start_date: string;
  end_date: string;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  duration?: number;
  progress_percentage: number;
  is_milestone: boolean;
  is_critical_path?: boolean;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "completed" | "on_hold";
  created_at?: string;
  updated_at?: string;
  estimated_hours: number;
  actual_hours: number;
  work_package: string | null;
  wbs?: {
    wbs_id: number;
    name: string;
    wbs_code: string;
    level: number;
  };
  budgets?: Array<{
    planned_amount: number;
    actual_amount: number;
    cost_type: string;
  }>;
  resource_assignments?: Array<{
    assignment_id: number;
    resource: {
      resource_id: number;
      name: string;
      type: string;
      role: string;
      availability_status: string;
      department: string;
      rate: number;
    };
    allocation_percentage: number;
    planned_hours: number;
    actual_hours: number;
    progress: number;
    start_date: string;
    end_date: string;
  }>;
  predecessor_dependencies?: Array<{
    dependency_id: number;
    predecessor_task_id: number;
    dependency_type:
      | "finish_to_start"
      | "start_to_start"
      | "finish_to_finish"
      | "start_to_finish";
    lag_time: number;
    predecessor: {
      task_id: number;
      name: string;
      status: "todo" | "in_progress" | "completed" | "on_hold";
      progress_percentage: number;
      end_date: string;
    };
  }>;
}

export interface TimeLog {
  id: number;
  hours: number;
  description: string;
  date: string;
  user_name: string;
}

export interface FieldDataEntry {
  id: number;
  task_id: number;
  resource_assignment_id: number;
  reported_by: number;
  actual_progress: number;
  actual_hours: number;
  notes?: string;
  timestamp: string;
  is_according_to_plan: boolean;
  reporter: {
    first_name: string;
    last_name: string;
    department: string;
  };
  resource_assignment: {
    assignment_id: number;
    resource: {
      name: string;
      type: string;
      role: string;
      rate: number;
    };
  };
  task: {
    name: string;
    progress_percentage: number;
    estimated_hours: number;
    actual_hours: number;
  };
}

export interface Comment {
  comment_id: number;
  message: string;
  created_at: string;
  is_edited: boolean;
  author: {
    user_id: number;
    username: string;
    email: string;
    account: {
      first_name: string;
      last_name: string;
    };
  };
  mentions?: Array<{
    mentioned_user: {
      user_id: number;
      username: string;
      email: string;
      account: {
        first_name: string;
        last_name: string;
      };
    };
  }>;
  replies?: Comment[];
}

export interface Document {
  document_id: number;
  name: string;
  description?: string;
  file_path: string;
  file_type: string;
  size: number;
  project_id?: number;
  wbs_id?: number;
  task_id?: number;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
  version: number;
  uploader?: {
    first_name: string;
    last_name: string;
    email?: string;
    account_id?: number;
  };
}
