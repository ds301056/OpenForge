import { SupabaseClient } from "@supabase/supabase-js";
import type {
  Goal,
  GoalInsert,
  GoalUpdate,
  PlanVersion,
  PlanVersionInsert,
  Milestone,
  MilestoneInsert,
  MilestoneUpdate,
  Task,
  TaskInsert,
  TaskUpdate,
  Dependency,
  DependencyInsert,
  Suggestion,
  SuggestionInsert,
  SuggestionUpdate,
  DecisionLog,
  DecisionLogInsert,
  Workspace,
  WorkspaceInsert,
} from "@/types";

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export async function createWorkspace(
  db: SupabaseClient,
  data: WorkspaceInsert
) {
  const { data: workspace, error } = await db
    .from("workspaces")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return workspace as Workspace;
}

export async function getWorkspace(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("workspaces")
    .select()
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Workspace;
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export async function createGoal(db: SupabaseClient, data: GoalInsert) {
  const { data: goal, error } = await db
    .from("goals")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return goal as Goal;
}

export async function getGoal(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("goals")
    .select()
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function listGoals(db: SupabaseClient, workspaceId: string) {
  const { data, error } = await db
    .from("goals")
    .select()
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Goal[];
}

export async function updateGoal(
  db: SupabaseClient,
  id: string,
  data: GoalUpdate
) {
  const { data: goal, error } = await db
    .from("goals")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return goal as Goal;
}

export async function deleteGoal(db: SupabaseClient, id: string) {
  const { error } = await db.from("goals").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Plan Versions (immutable — create and read only)
// ---------------------------------------------------------------------------

export async function createPlanVersion(
  db: SupabaseClient,
  data: PlanVersionInsert
) {
  const { data: version, error } = await db
    .from("plan_versions")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return version as PlanVersion;
}

export async function getPlanVersion(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("plan_versions")
    .select()
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as PlanVersion;
}

export async function listPlanVersions(db: SupabaseClient, goalId: string) {
  const { data, error } = await db
    .from("plan_versions")
    .select()
    .eq("goal_id", goalId)
    .order("version_number", { ascending: true });
  if (error) throw error;
  return data as PlanVersion[];
}

export async function getLatestPlanVersion(
  db: SupabaseClient,
  goalId: string
) {
  const { data, error } = await db
    .from("plan_versions")
    .select()
    .eq("goal_id", goalId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data as PlanVersion;
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function createMilestone(
  db: SupabaseClient,
  data: MilestoneInsert
) {
  const { data: milestone, error } = await db
    .from("milestones")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return milestone as Milestone;
}

export async function createMilestones(
  db: SupabaseClient,
  data: MilestoneInsert[]
) {
  const { data: milestones, error } = await db
    .from("milestones")
    .insert(data)
    .select();
  if (error) throw error;
  return milestones as Milestone[];
}

export async function getMilestone(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("milestones")
    .select()
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Milestone;
}

export async function listMilestones(
  db: SupabaseClient,
  planVersionId: string
) {
  const { data, error } = await db
    .from("milestones")
    .select()
    .eq("plan_version_id", planVersionId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as Milestone[];
}

export async function updateMilestone(
  db: SupabaseClient,
  id: string,
  data: MilestoneUpdate
) {
  const { data: milestone, error } = await db
    .from("milestones")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return milestone as Milestone;
}

export async function deleteMilestone(db: SupabaseClient, id: string) {
  const { error } = await db.from("milestones").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function createTask(db: SupabaseClient, data: TaskInsert) {
  const { data: task, error } = await db
    .from("tasks")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return task as Task;
}

export async function createTasks(db: SupabaseClient, data: TaskInsert[]) {
  const { data: tasks, error } = await db
    .from("tasks")
    .insert(data)
    .select();
  if (error) throw error;
  return tasks as Task[];
}

export async function getTask(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("tasks")
    .select()
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Task;
}

export async function listTasks(db: SupabaseClient, milestoneId: string) {
  const { data, error } = await db
    .from("tasks")
    .select()
    .eq("milestone_id", milestoneId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as Task[];
}

export async function updateTask(
  db: SupabaseClient,
  id: string,
  data: TaskUpdate
) {
  const { data: task, error } = await db
    .from("tasks")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return task as Task;
}

export async function deleteTask(db: SupabaseClient, id: string) {
  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Dependencies (read-only after creation, deleted via cascade)
// ---------------------------------------------------------------------------

export async function createDependency(
  db: SupabaseClient,
  data: DependencyInsert
) {
  const { data: dep, error } = await db
    .from("dependencies")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return dep as Dependency;
}

export async function createDependencies(
  db: SupabaseClient,
  data: DependencyInsert[]
) {
  const { data: deps, error } = await db
    .from("dependencies")
    .insert(data)
    .select();
  if (error) throw error;
  return deps as Dependency[];
}

export async function listDependencies(db: SupabaseClient, taskId: string) {
  const { data, error } = await db
    .from("dependencies")
    .select()
    .eq("task_id", taskId);
  if (error) throw error;
  return data as Dependency[];
}

export async function listDependents(db: SupabaseClient, taskId: string) {
  const { data, error } = await db
    .from("dependencies")
    .select()
    .eq("depends_on_task_id", taskId);
  if (error) throw error;
  return data as Dependency[];
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export async function createSuggestion(
  db: SupabaseClient,
  data: SuggestionInsert
) {
  const { data: suggestion, error } = await db
    .from("suggestions")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return suggestion as Suggestion;
}

export async function getSuggestion(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("suggestions")
    .select()
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Suggestion;
}

export async function listSuggestions(
  db: SupabaseClient,
  goalId: string,
  status?: string
) {
  let query = db.from("suggestions").select().eq("goal_id", goalId);
  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) throw error;
  return data as Suggestion[];
}

export async function updateSuggestion(
  db: SupabaseClient,
  id: string,
  data: SuggestionUpdate
) {
  const { data: suggestion, error } = await db
    .from("suggestions")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return suggestion as Suggestion;
}

// ---------------------------------------------------------------------------
// Decision Log (immutable — create and read only)
// ---------------------------------------------------------------------------

export async function createDecisionLog(
  db: SupabaseClient,
  data: DecisionLogInsert
) {
  const { data: log, error } = await db
    .from("decision_log")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return log as DecisionLog;
}

export async function listDecisionLogs(db: SupabaseClient, goalId: string) {
  const { data, error } = await db
    .from("decision_log")
    .select()
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as DecisionLog[];
}

// ---------------------------------------------------------------------------
// Composite queries (fetch full plan tree)
// ---------------------------------------------------------------------------

export async function getFullPlan(db: SupabaseClient, planVersionId: string) {
  const { data: milestones, error: mError } = await db
    .from("milestones")
    .select(
      `
      *,
      tasks (
        *,
        dependencies (*)
      )
    `
    )
    .eq("plan_version_id", planVersionId)
    .order("sort_order", { ascending: true });

  if (mError) throw mError;
  return milestones as (Milestone & {
    tasks: (Task & { dependencies: Dependency[] })[];
  })[];
}
