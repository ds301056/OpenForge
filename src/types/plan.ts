export type MilestoneStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "done"
  | "skipped"
  | "blocked"
  | "already_known";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type DependencyType = "blocks" | "recommends";

export type PlanVersionTrigger = "initial" | "optimization" | "manual_edit";

export interface PlanVersion {
  id: string;
  goal_id: string;
  version_number: number;
  trigger: string | null;
  summary: string | null;
  created_at: string;
}

export interface PlanVersionInsert {
  goal_id: string;
  version_number: number;
  trigger?: string | null;
  summary?: string | null;
}

export interface Milestone {
  id: string;
  plan_version_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  target_date: string | null;
  status: MilestoneStatus;
  created_at: string;
}

export interface MilestoneInsert {
  plan_version_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  target_date?: string | null;
  status?: MilestoneStatus;
}

export interface MilestoneUpdate {
  title?: string;
  description?: string | null;
  sort_order?: number;
  target_date?: string | null;
  status?: MilestoneStatus;
}

export interface Task {
  id: string;
  milestone_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  effort_estimate: string | null;
  completion_criteria: string | null;
  rationale: string | null;
  locked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskInsert {
  milestone_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  effort_estimate?: string | null;
  completion_criteria?: string | null;
  rationale?: string | null;
  locked?: boolean;
  sort_order: number;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  effort_estimate?: string | null;
  completion_criteria?: string | null;
  rationale?: string | null;
  locked?: boolean;
  sort_order?: number;
}

export interface Dependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
}

export interface DependencyInsert {
  task_id: string;
  depends_on_task_id: string;
  dependency_type?: DependencyType;
}
