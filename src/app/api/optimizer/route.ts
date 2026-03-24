import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runOptimizer } from "@/lib/optimizer";
import type { TriggerEvent } from "@/lib/optimizer/triggers";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const db = getServiceClient();
  const body = await request.json();

  const { event, goal_id, plan_version_id, task_id, milestone_id, previous_value, new_value } = body;

  if (!event || !goal_id || !plan_version_id) {
    return NextResponse.json(
      { error: "Missing required fields: event, goal_id, plan_version_id" },
      { status: 400 }
    );
  }

  // Fetch task and milestone if IDs provided
  let task = undefined;
  let milestone = undefined;

  if (task_id) {
    const { data } = await db.from("tasks").select().eq("id", task_id).single();
    task = data ?? undefined;
  }
  if (milestone_id) {
    const { data } = await db.from("milestones").select().eq("id", milestone_id).single();
    milestone = data ?? undefined;
  }

  try {
    const suggestionIds = await runOptimizer(db, {
      event: event as TriggerEvent,
      goal_id,
      plan_version_id,
      task,
      milestone,
      previous_value,
      new_value,
    });

    return NextResponse.json({
      suggestions_created: suggestionIds.length,
      suggestion_ids: suggestionIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Optimizer failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
