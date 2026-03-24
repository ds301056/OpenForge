import { SupabaseClient } from "@supabase/supabase-js";
import type { TriggerContext, TriggerEvent } from "./triggers";
import {
  taskCompletedStrategy,
  taskBlockedStrategy,
  alreadyKnownStrategy,
  deadlineChangedStrategy,
  priorityReorderedStrategy,
} from "./strategies";
import { buildSuggestions } from "./suggestion";

// ---------------------------------------------------------------------------
// Event Router — dispatches trigger events to the right strategy
// ---------------------------------------------------------------------------

const STRATEGY_MAP: Record<
  TriggerEvent,
  (
    db: SupabaseClient,
    ctx: TriggerContext
  ) => Promise<import("./strategies").StrategyResult>
> = {
  task_completed: taskCompletedStrategy,
  task_blocked: taskBlockedStrategy,
  already_known: alreadyKnownStrategy,
  deadline_changed: deadlineChangedStrategy,
  priority_reordered: priorityReorderedStrategy,
};

/**
 * Run the optimizer for a given trigger event.
 * Returns the IDs of any suggestions created.
 */
export async function runOptimizer(
  db: SupabaseClient,
  ctx: TriggerContext
): Promise<string[]> {
  const strategy = STRATEGY_MAP[ctx.event];
  if (!strategy) {
    console.warn(`[optimizer] No strategy for event: ${ctx.event}`);
    return [];
  }

  const result = await strategy(db, ctx);

  if (result.changes.length === 0) {
    return [];
  }

  return buildSuggestions(db, ctx, result);
}
