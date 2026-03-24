export type GoalStatus =
  | "draft"
  | "planning"
  | "active"
  | "completed"
  | "archived";

export interface Goal {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  domain_template: string;
  constraints: Record<string, unknown>;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface GoalInsert {
  workspace_id: string;
  title: string;
  description?: string | null;
  domain_template?: string;
  constraints?: Record<string, unknown>;
  status?: GoalStatus;
}

export interface GoalUpdate {
  title?: string;
  description?: string | null;
  domain_template?: string;
  constraints?: Record<string, unknown>;
  status?: GoalStatus;
}
