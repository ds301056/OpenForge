import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runPipeline } from "@/lib/planner";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const db = getServiceClient();

  const body = await request.json();
  const { goal_id, goal_title, goal_description, workspace_id, template } =
    body;

  if (!goal_id || !goal_title || !goal_description || !workspace_id) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: goal_id, goal_title, goal_description, workspace_id",
      },
      { status: 400 }
    );
  }

  try {
    const result = await runPipeline(
      db,
      {
        goal_id,
        goal_title,
        goal_description,
        workspace_id,
      },
      template
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Pipeline error:", error);
    const message =
      error instanceof Error ? error.message : "Pipeline failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
