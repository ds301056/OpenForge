import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTasksWithContext } from "@/lib/db/queries";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export async function GET() {
  const db = getServiceClient();

  // Default workspace for v1
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id")
    .limit(1);
  const workspaceId = workspaces?.[0]?.id;
  if (!workspaceId) return NextResponse.json({ tasks: [] });

  try {
    const allTasks = await getTasksWithContext(db, workspaceId);

    // Filter to todo/in_progress tasks
    const actionable = allTasks.filter(
      (t: Record<string, unknown>) =>
        t.status === "todo" || t.status === "in_progress"
    );

    // Check which tasks are blocked
    const unblockedTasks = [];
    for (const task of actionable) {
      const deps = (task as Record<string, unknown>)
        .dependencies as Array<Record<string, unknown>>;
      const blockingDeps = (deps ?? []).filter(
        (d) => d.dependency_type === "blocks"
      );

      if (blockingDeps.length === 0) {
        unblockedTasks.push(task);
        continue;
      }

      // Check if all blocking dependencies are done
      const blockingIds = blockingDeps.map((d) => d.depends_on_task_id);
      const { data: blockingTasks } = await db
        .from("tasks")
        .select("id, status")
        .in("id", blockingIds as string[]);

      const allDone = (blockingTasks ?? []).every(
        (bt) =>
          bt.status === "done" ||
          bt.status === "skipped" ||
          bt.status === "already_known"
      );
      if (allDone) unblockedTasks.push(task);
    }

    // Sort by priority (critical first)
    unblockedTasks.sort((a, b) => {
      const pa = PRIORITY_RANK[(a as Record<string, unknown>).priority as string] ?? 0;
      const pb = PRIORITY_RANK[(b as Record<string, unknown>).priority as string] ?? 0;
      return pb - pa;
    });

    return NextResponse.json({
      next_task: unblockedTasks[0] ?? null,
      in_progress: actionable.filter(
        (t: Record<string, unknown>) => t.status === "in_progress"
      ),
      unblocked: unblockedTasks,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch today data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
