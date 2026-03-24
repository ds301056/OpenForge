import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createDecisionLog } from "@/lib/db/queries";
import { applySuggestion, type ProposedChange } from "@/lib/optimizer/suggestion";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getServiceClient();
  const body = await request.json();
  const { action, user_reason } = body; // "approved" | "rejected"

  // Get the suggestion
  const { data: suggestion, error: fetchError } = await db
    .from("suggestions")
    .select()
    .eq("id", id)
    .single();

  if (fetchError || !suggestion)
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

  // Update suggestion status
  const newStatus = action === "approved" ? "accepted" : "rejected";
  const { data, error } = await db
    .from("suggestions")
    .update({
      status: newStatus,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  // If approved, apply the change
  if (action === "approved" && suggestion.proposed_change) {
    const change: ProposedChange = {
      action: suggestion.proposed_change.action as string,
      target_type: suggestion.target_entity_type as "task" | "milestone" | "plan",
      target_id: suggestion.target_entity_id ?? "",
      details: suggestion.proposed_change as Record<string, unknown>,
      justification: suggestion.justification,
      confidence: Number(suggestion.confidence),
    };

    try {
      await applySuggestion(db, change);
    } catch (e) {
      console.error("[suggestion-approve] Apply error:", e);
    }
  }

  // Log the decision
  await createDecisionLog(db, {
    goal_id: suggestion.goal_id,
    suggestion_id: id,
    action: action === "approved" ? "approved" : "rejected",
    previous_state: suggestion.proposed_change as Record<string, unknown>,
    new_state: { status: newStatus },
    user_reason: user_reason ?? null,
  });

  return NextResponse.json(data);
}
