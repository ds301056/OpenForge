import type { Task, Milestone } from "@/types";

// ---------------------------------------------------------------------------
// Trigger Events — the 5 events that can fire optimization
// ---------------------------------------------------------------------------

export const TRIGGER_EVENTS = [
  "task_completed",
  "task_blocked",
  "already_known",
  "deadline_changed",
  "priority_reordered",
] as const;

export type TriggerEvent = (typeof TRIGGER_EVENTS)[number];

export interface TriggerContext {
  event: TriggerEvent;
  goal_id: string;
  plan_version_id: string;
  task?: Task;
  milestone?: Milestone;
  previous_value?: unknown;
  new_value?: unknown;
}

/**
 * Determine which trigger event a task status change represents.
 */
export function classifyStatusChange(
  oldStatus: string,
  newStatus: string
): TriggerEvent | null {
  if (
    newStatus === "done" ||
    newStatus === "skipped"
  ) {
    return "task_completed";
  }
  if (newStatus === "already_known") {
    return "already_known";
  }
  if (newStatus === "blocked") {
    return "task_blocked";
  }
  return null;
}
