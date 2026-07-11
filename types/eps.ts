// EPS type for frontend usage
export interface EPS {
  eps_id: number;
  eps_code: string;
  name: string;
  description?: string;
  parent_eps_id?: number;
  level: number;
  created_at: string;
  updated_at: string;
  projects?: any[];
  children?: EPS[];
}
