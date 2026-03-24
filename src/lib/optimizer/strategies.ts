import { SupabaseClient } from "@supabase/supabase-js";
import type { TriggerContext } from "./triggers";
import type { ProposedChange } from "./suggestion";
import {
  listDependents,
  listTasks,
  listMilestones,
  getTask,
} from "@/lib/db/queries";
import type { Task, Dependency } from "@/types";

// ---------------------------------------------------------------------------
// Strategy result — what the optimizer wants to propose
// ---------------------------------------------------------------------------

export interface StrategyResult {
  changes: ProposedChange[];
}

// ---------------------------------------------------------------------------
// Task Completed Strategy
// ---------------------------------------------------------------------------

export async function taskCompletedStrategy(
  db: SupabaseClient,
  ctx: TriggerContext
): Promise<StrategyResult> {
  const changes: ProposedChange[] = [];
  if (!ctx.task) return { changes };

  // 1. Unlock dependent tasks (blocked → todo)
  const dependents = await listDependents(db, ctx.task.id);
  const blockingDeps = dependents.filter(
    (d: Dependency) => d.dependency_type === "blocks"
  );

  for (const dep of blockingDeps) {
    try {
      const depTask = await getTask(db, dep.task_id);
      if (depTask.status === "blocked") {
        changes.push({
          action: "update_task_status",
          target_type: "task",
          target_id: dep.task_id,
          details: {
            field: "status",
            from: "blocked",
            to: "todo",
          },
          justification: `"${ctx.task.title}" is complete, so "${depTask.title}" is no longer blocked and can be started.`,
          confidence: 0.95,
        });
      }
    } catch {
      // Task may not exist
    }
  }

  // 2. Check if milestone is complete
  if (ctx.task.milestone_id) {
    const tasks = await listTasks(db, ctx.task.milestone_id);
    const allDone = tasks.every(
      (t: Task) =>
        t.status === "done" ||
        t.status === "skipped" ||
        t.status === "already_known" ||
        t.id === ctx.task!.id // the one we just completed
    );

    if (allDone) {
      changes.push({
        action: "update_milestone_status",
        target_type: "milestone",
        target_id: ctx.task.milestone_id,
        details: {
          field: "status",
          from: "in_progress",
          to: "completed",
        },
        justification: `All tasks in this milestone are complete. The milestone should be marked as completed.`,
        confidence: 0.99,
      });
    }
  }

  return { changes };
}

// ---------------------------------------------------------------------------
// Task Blocked Strategy
// ---------------------------------------------------------------------------

export async function taskBlockedStrategy(
  db: SupabaseClient,
  ctx: TriggerContext
): Promise<StrategyResult> {
  const changes: ProposedChange[] = [];
  if (!ctx.task) return { changes };

  // Find what's blocking this task
  const { listDependencies } = await import("@/lib/db/queries");
  const deps = await listDependencies(db, ctx.task.id);
  const blockers = deps.filter(
    (d: Dependency) => d.dependency_type === "blocks"
  );

  if (blockers.length === 0) return { changes };

  // Check each blocker — suggest resequencing if possible
  for (const blocker of blockers) {
    try {
      const blockerTask = await getTask(db, blocker.depends_on_task_id);
      if (
        blockerTask.status === "todo" &&
        blockerTask.priority !== "critical"
      ) {
        changes.push({
          action: "reprioritize_task",
          target_type: "task",
          target_id: blocker.depends_on_task_id,
          details: {
            field: "priority",
            from: blockerTask.priority,
            to: "high",
          },
          justification: `"${blockerTask.title}" is blocking "${ctx.task.title}". Increasing its priority so it gets addressed sooner.`,
          confidence: 0.8,
        });
      }
    } catch {
      // Task may not exist
    }
  }

  return { changes };
}

// ---------------------------------------------------------------------------
// Already Known Strategy
// ---------------------------------------------------------------------------

export async function alreadyKnownStrategy(
  db: SupabaseClient,
  ctx: TriggerContext
): Promise<StrategyResult> {
  const changes: ProposedChange[] = [];
  if (!ctx.task) return { changes };

  // 1. Unlock dependents (same as completed)
  const dependents = await listDependents(db, ctx.task.id);
  for (const dep of dependents) {
    try {
      const depTask = await getTask(db, dep.task_id);
      if (depTask.status === "blocked" || depTask.status === "todo") {
        changes.push({
          action: "update_task_status",
          target_type: "task",
          target_id: dep.task_id,
          details: {
            field: "status",
            from: depTask.status,
            to: "todo",
          },
          justification: `"${ctx.task.title}" is already known, so "${depTask.title}" can proceed without waiting.`,
          confidence: 0.9,
        });
      }
    } catch {
      // Task may not exist
    }
  }

  // 2. Check if companion practice tasks can be skipped
  if (ctx.task.milestone_id) {
    const tasks = await listTasks(db, ctx.task.milestone_id);
    const practiceTasks = tasks.filter(
      (t: Task) =>
        t.status === "todo" &&
        t.description?.toLowerCase().includes("practice") &&
        t.sort_order > ctx.task!.sort_order
    );

    for (const practiceTask of practiceTasks.slice(0, 1)) {
      changes.push({
        action: "suggest_skip_task",
        target_type: "task",
        target_id: practiceTask.id,
        details: {
          field: "status",
          from: "todo",
          to: "skipped",
        },
        justification: `Since you already know "${ctx.task.title}", the related practice task "${practiceTask.title}" may not be necessary. Consider skipping it to save time.`,
        confidence: 0.7,
      });
    }
  }

  // 3. Suggest timeline acceleration
  if (ctx.milestone) {
    const milestones = await listMilestones(db, ctx.plan_version_id);
    const remaining = milestones.filter(
      (m) => m.status === "pending" || m.status === "in_progress"
    );
    if (remaining.length > 1) {
      changes.push({
        action: "suggest_acceleration",
        target_type: "plan",
        target_id: ctx.plan_version_id,
        details: {
          reason: "knowledge_skip",
          tasks_skipped: 1,
        },
        justification: `Marking "${ctx.task.title}" as already known frees up time. Consider whether downstream milestones can be started earlier.`,
        confidence: 0.6,
      });
    }
  }

  return { changes };
}

// ---------------------------------------------------------------------------
// Deadline Changed Strategy
// ---------------------------------------------------------------------------

export async function deadlineChangedStrategy(
  db: SupabaseClient,
  ctx: TriggerContext
): Promise<StrategyResult> {
  const changes: ProposedChange[] = [];

  const milestones = await listMilestones(db, ctx.plan_version_id);
  const now = new Date();

  for (const milestone of milestones) {
    if (
      milestone.target_date &&
      milestone.status !== "completed" &&
      milestone.status !== "skipped"
    ) {
      const targetDate = new Date(milestone.target_date);
      const daysRemaining = Math.ceil(
        (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining < 0) {
        changes.push({
          action: "flag_overdue",
          target_type: "milestone",
          target_id: milestone.id,
          details: {
            days_overdue: Math.abs(daysRemaining),
          },
          justification: `Milestone "${milestone.title}" is ${Math.abs(daysRemaining)} days overdue. Consider extending the deadline or reducing scope.`,
          confidence: 0.95,
        });
      } else if (daysRemaining <= 3) {
        const tasks = await listTasks(db, milestone.id);
        const remaining = tasks.filter(
          (t: Task) =>
            t.status !== "done" &&
            t.status !== "skipped" &&
            t.status !== "already_known"
        );
        if (remaining.length > 2) {
          changes.push({
            action: "flag_at_risk",
            target_type: "milestone",
            target_id: milestone.id,
            details: {
              days_remaining: daysRemaining,
              tasks_remaining: remaining.length,
            },
            justification: `Milestone "${milestone.title}" has ${remaining.length} tasks remaining with only ${daysRemaining} days left. It may be at risk.`,
            confidence: 0.85,
          });
        }
      }
    }
  }

  return { changes };
}

// ---------------------------------------------------------------------------
// Priority Reordered Strategy
// ---------------------------------------------------------------------------

export async function priorityReorderedStrategy(
  db: SupabaseClient,
  ctx: TriggerContext
): Promise<StrategyResult> {
  const changes: ProposedChange[] = [];
  if (!ctx.task) return { changes };

  // Check if the new priority conflicts with dependencies
  const { listDependencies } = await import("@/lib/db/queries");
  const deps = await listDependencies(db, ctx.task.id);

  for (const dep of deps) {
    try {
      const prerequisite = await getTask(db, dep.depends_on_task_id);
      const newPriority = ctx.new_value as string;
      const priorityRank: Record<string, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };

      if (
        dep.dependency_type === "blocks" &&
        (priorityRank[newPriority] ?? 0) >
          (priorityRank[prerequisite.priority] ?? 0) &&
        prerequisite.status !== "done" &&
        prerequisite.status !== "skipped"
      ) {
        changes.push({
          action: "flag_priority_conflict",
          target_type: "task",
          target_id: ctx.task.id,
          details: {
            task_priority: newPriority,
            prerequisite_id: prerequisite.id,
            prerequisite_title: prerequisite.title,
            prerequisite_priority: prerequisite.priority,
          },
          justification: `"${ctx.task.title}" is now ${newPriority} priority but depends on "${prerequisite.title}" which is only ${prerequisite.priority}. Consider raising the prerequisite's priority too.`,
          confidence: 0.85,
        });
      }
    } catch {
      // Task may not exist
    }
  }

  return { changes };
}
