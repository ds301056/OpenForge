import { SupabaseClient } from "@supabase/supabase-js";
import { createSuggestion, createDecisionLog } from "@/lib/db/queries";
import type { TriggerContext } from "./triggers";
import type { StrategyResult } from "./strategies";
import type { SuggestionInsert } from "@/types";

// ---------------------------------------------------------------------------
// Proposed Change — what a strategy wants to do
// ---------------------------------------------------------------------------

export interface ProposedChange {
  action: string;
  target_type: "task" | "milestone" | "plan";
  target_id: string;
  details: Record<string, unknown>;
  justification: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Build and persist suggestions from strategy results
// ---------------------------------------------------------------------------

export async function buildSuggestions(
  db: SupabaseClient,
  ctx: TriggerContext,
  result: StrategyResult
): Promise<string[]> {
  const suggestionIds: string[] = [];

  for (const change of result.changes) {
    // Auto-apply high-confidence unlocks (>= 0.95) without requiring approval
    const autoApply = change.confidence >= 0.95 && (
      change.action === "update_task_status" ||
      change.action === "update_milestone_status"
    );

    const insert: SuggestionInsert = {
      goal_id: ctx.goal_id,
      plan_version_id: ctx.plan_version_id,
      trigger_event: ctx.event,
      target_entity_type: change.target_type,
      target_entity_id: change.target_id,
      proposed_change: {
        action: change.action,
        ...change.details,
      },
      justification: change.justification,
      confidence: change.confidence,
      requires_approval: !autoApply,
      status: autoApply ? "accepted" : "pending",
    };

    const suggestion = await createSuggestion(db, insert);
    suggestionIds.push(suggestion.id);

    // Auto-apply if high confidence
    if (autoApply) {
      await applySuggestion(db, change);
      await createDecisionLog(db, {
        goal_id: ctx.goal_id,
        suggestion_id: suggestion.id,
        action: "approved",
        previous_state: { status: change.details.from },
        new_state: { status: change.details.to },
        user_reason: "Auto-applied (high confidence)",
      });
    }
  }

  return suggestionIds;
}

// ---------------------------------------------------------------------------
// Apply a suggestion's change to the database
// ---------------------------------------------------------------------------

export async function applySuggestion(
  db: SupabaseClient,
  change: ProposedChange
): Promise<void> {
  if (
    change.action === "update_task_status" ||
    change.action === "reprioritize_task" ||
    change.action === "suggest_skip_task"
  ) {
    const field = change.details.field as string;
    const value = change.details.to;
    await db
      .from("tasks")
      .update({ [field]: value })
      .eq("id", change.target_id);
  } else if (change.action === "update_milestone_status") {
    const field = change.details.field as string;
    const value = change.details.to;
    await db
      .from("milestones")
      .update({ [field]: value })
      .eq("id", change.target_id);
  }
  // Other actions (flag_overdue, flag_at_risk, suggest_acceleration, flag_priority_conflict)
  // are informational — they create suggestions but don't auto-apply
}
