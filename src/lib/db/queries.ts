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

export async function getGoalProgress(db: SupabaseClient, goalId: string) {
  // Get latest plan version, then count task statuses
  const { data: version } = await db
    .from("plan_versions")
    .select("id")
    .eq("goal_id", goalId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  if (!version) return { total: 0, done: 0, in_progress: 0 };

  const { data: milestones } = await db
    .from("milestones")
    .select("id")
    .eq("plan_version_id", version.id);

  if (!milestones || milestones.length === 0)
    return { total: 0, done: 0, in_progress: 0 };

  const milestoneIds = milestones.map((m) => m.id);
  const { data: tasks } = await db
    .from("tasks")
    .select("status")
    .in("milestone_id", milestoneIds);

  if (!tasks) return { total: 0, done: 0, in_progress: 0 };

  return {
    total: tasks.length,
    done: tasks.filter(
      (t) => t.status === "done" || t.status === "skipped" || t.status === "already_known"
    ).length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
  };
}

export async function getUpcomingMilestones(
  db: SupabaseClient,
  workspaceId: string,
  days: number = 7
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const { data, error } = await db
    .from("milestones")
    .select(
      `
      *,
      plan_versions!inner (
        goal_id,
        goals!inner (
          id, title, workspace_id, status
        )
      ),
      tasks (id, status)
    `
    )
    .lte("target_date", cutoff.toISOString().split("T")[0])
    .neq("status", "completed")
    .neq("status", "skipped");

  if (error) throw error;

  // Filter by workspace and active goals
  return (data ?? []).filter((m: Record<string, unknown>) => {
    const pv = m.plan_versions as Record<string, unknown>;
    const goal = pv?.goals as Record<string, unknown>;
    return goal?.workspace_id === workspaceId && goal?.status === "active";
  });
}

export async function getTasksWithContext(
  db: SupabaseClient,
  workspaceId: string,
  filters?: { status?: string; priority?: string }
) {
  let query = db.from("tasks").select(
    `
    *,
    milestones!inner (
      id, title, target_date,
      plan_versions!inner (
        id,
        goals!inner (
          id, title, workspace_id, status
        )
      )
    ),
    dependencies:dependencies!task_id (
      depends_on_task_id,
      dependency_type
    )
  `
  );

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter by workspace and active goals
  return (data ?? []).filter((t: Record<string, unknown>) => {
    const m = t.milestones as Record<string, unknown>;
    const pv = m?.plan_versions as Record<string, unknown>;
    const goal = pv?.goals as Record<string, unknown>;
    return goal?.workspace_id === workspaceId && goal?.status === "active";
  });
}

export async function getFullPlan(db: SupabaseClient, planVersionId: string) {
  const { data: milestones, error: mError } = await db
    .from("milestones")
    .select(
      `
      *,
      tasks (
        *,
        dependencies:dependencies!task_id (*)
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
