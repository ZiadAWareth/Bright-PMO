import { Project } from "./project";

export type PortfolioStatus = 'active' | 'completed' | 'on_hold' | 'archived';
export type PortfolioPriority = 'high' | 'medium' | 'low';



export interface PortfolioWithRelations {
  portfolio_id: number;
  name: string;
  description: string | null;
  manager_id: number;
  created_at: Date;
  updated_at: Date;
  strategic_objective: string | null;
  status: PortfolioStatus;
  priority: PortfolioPriority;
  tags: string[];
  manager: {
    user_id: number;
    first_name: string;
    last_name: string;
    account: {
      first_name: string;
      last_name: string;
    }
  };
  projects: Project[];
  total_budget: number;
  total_actual_cost: number;
  avg_progress: number;
  project_count: number;
  metrics: {
    projects_by_status: Record<string, number>;
    overbudget_projects: number;
    delayed_tasks: number;
    open_risks_by_impact: Record<string, number>;
    risky_projects: number;
    average_spi: number;
    average_cpi: number;
    health_index: number;
    health_status: string;
    underperforming_projects: Array<{
      project_id: number;
      reasons: string[];
    }>;
    summary_generated_at: string;
  };
} 