import { createClient } from "@supabase/supabase-js";
import { TodayClient } from "./today-client";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const db = getServiceClient();

  // Get default workspace
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id")
    .limit(1);
  const workspaceId = workspaces?.[0]?.id;

  // Get active goals count
  const { count: activeGoalCount } = await db
    .from("goals")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Fetch today data from API (reuses the logic in /api/today)
  // For server component, we query directly
  let nextTask = null;
  let inProgressTasks: Record<string, unknown>[] = [];

  if (workspaceId) {
    try {
      const { getTasksWithContext } = await import("@/lib/db/queries");
      const allTasks = await getTasksWithContext(db, workspaceId);

      inProgressTasks = allTasks.filter(
        (t: Record<string, unknown>) => t.status === "in_progress"
      );

      const todoTasks = allTasks.filter(
        (t: Record<string, unknown>) => t.status === "todo"
      );

      // Simple unblocked check: tasks with no blocking dependencies
      const unblockedTodo = todoTasks.filter((t: Record<string, unknown>) => {
        const deps = (t.dependencies ?? []) as Array<Record<string, unknown>>;
        return !deps.some((d) => d.dependency_type === "blocks");
      });

      // Sort by priority
      const priorityRank: Record<string, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      unblockedTodo.sort((a, b) => {
        const pa = priorityRank[(a as Record<string, unknown>).priority as string] ?? 0;
        const pb = priorityRank[(b as Record<string, unknown>).priority as string] ?? 0;
        return pb - pa;
      });

      nextTask = unblockedTodo[0] ?? null;
    } catch {
      // No tasks yet
    }
  }

  return (
    <TodayClient
      nextTask={nextTask}
      inProgressTasks={inProgressTasks}
      activeGoalCount={activeGoalCount ?? 0}
    />
  );
}
