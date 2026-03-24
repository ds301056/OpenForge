import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyStatusChange } from "@/lib/optimizer/triggers";
import { runOptimizer } from "@/lib/optimizer";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const db = getServiceClient();
  const body = await request.json();

  // Get current task state before update
  const { data: oldTask } = await db
    .from("tasks")
    .select()
    .eq("id", taskId)
    .single();

  // Apply update
  const { data, error } = await db
    .from("tasks")
    .update(body)
    .eq("id", taskId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  // Fire optimizer if status changed
  let suggestions_created = 0;
  if (oldTask && body.status && oldTask.status !== body.status) {
    const triggerEvent = classifyStatusChange(oldTask.status, body.status);
    if (triggerEvent) {
      try {
        // Look up goal and plan version via milestone
        const { data: milestone } = await db
          .from("milestones")
          .select("id, plan_version_id, plan_versions(goal_id)")
          .eq("id", data.milestone_id)
          .single();

        if (milestone) {
          const planVersionId = milestone.plan_version_id;
          const goalId = (
            milestone.plan_versions as unknown as { goal_id: string }
          ).goal_id;

          const suggestionIds = await runOptimizer(db, {
            event: triggerEvent,
            goal_id: goalId,
            plan_version_id: planVersionId,
            task: data,
            previous_value: oldTask.status,
            new_value: body.status,
          });
          suggestions_created = suggestionIds.length;
        }
      } catch (e) {
        console.error("[task-patch] Optimizer error:", e);
        // Don't fail the task update if optimizer fails
      }
    }
  }

  // Fire optimizer if priority changed
  if (oldTask && body.priority && oldTask.priority !== body.priority) {
    try {
      const { data: milestone } = await db
        .from("milestones")
        .select("id, plan_version_id, plan_versions(goal_id)")
        .eq("id", data.milestone_id)
        .single();

      if (milestone) {
        const planVersionId = milestone.plan_version_id;
        const goalId = (
          milestone.plan_versions as unknown as { goal_id: string }
        ).goal_id;

        await runOptimizer(db, {
          event: "priority_reordered",
          goal_id: goalId,
          plan_version_id: planVersionId,
          task: data,
          previous_value: oldTask.priority,
          new_value: body.priority,
        });
      }
    } catch (e) {
      console.error("[task-patch] Optimizer error:", e);
    }
  }

  return NextResponse.json({ ...data, suggestions_created });
}
