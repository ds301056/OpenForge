import { SupabaseClient } from "@supabase/supabase-js";
import type { PipelineContext, PipelineResult } from "./types";
import { classify } from "./classify";
import { structure } from "./structure";
import { expand } from "./expand";
import { validate } from "./validate";
import { getTemplate, getDefaultTemplate } from "@/lib/templates/registry";
import {
  createPlanVersion,
  createMilestones,
  createTasks,
  createDependencies,
  updateGoal,
  getLatestPlanVersion,
} from "@/lib/db/queries";

export async function runPipeline(
  db: SupabaseClient,
  context: PipelineContext,
  templateSlug?: string
): Promise<PipelineResult> {
  const template = templateSlug
    ? getTemplate(templateSlug) ?? getDefaultTemplate()
    : getDefaultTemplate();

  // Update goal status to planning
  await updateGoal(db, context.goal_id, { status: "planning" });

  // Step 1: Classify
  const classification = await classify(context, template);

  // Step 2: Structure
  let planStructure = await structure(classification, template);

  // Step 3: Expand
  let expanded = await expand(planStructure, classification, template);

  // Step 4: Validate
  let validation = validate(expanded, classification, template);

  // Retry once if validation has errors
  if (!validation.valid) {
    // Re-run structure and expand with feedback
    planStructure = await structure(classification, template);
    expanded = await expand(planStructure, classification, template);
    validation = validate(expanded, classification, template);
  }

  // Persist to database
  const planVersionId = await persistPlan(db, context, expanded);

  // Update goal status to active
  await updateGoal(db, context.goal_id, {
    status: "active",
    domain_template: template.slug,
    constraints: classification.constraints as Record<string, unknown>,
  });

  return {
    plan_version_id: planVersionId,
    classification,
    structure: planStructure,
    expanded,
    validation,
  };
}

async function persistPlan(
  db: SupabaseClient,
  context: PipelineContext,
  expanded: import("./types").ExpandedPlan
): Promise<string> {
  // Determine next version number
  let versionNumber = 1;
  try {
    const latest = await getLatestPlanVersion(db, context.goal_id);
    versionNumber = latest.version_number + 1;
  } catch {
    // No existing versions
  }

  // Create plan version
  const planVersion = await createPlanVersion(db, {
    goal_id: context.goal_id,
    version_number: versionNumber,
    trigger: "initial",
    summary: expanded.summary,
  });

  // Create milestones and collect their IDs
  const milestoneInserts = expanded.milestones.map((m) => ({
    plan_version_id: planVersion.id,
    title: m.title,
    description: m.description,
    sort_order: m.sort_order,
    target_date: m.target_date,
  }));
  const milestones = await createMilestones(db, milestoneInserts);

  // Create tasks for each milestone, tracking IDs for dependencies
  const taskIdMap: Map<string, string> = new Map(); // "mi:sort_order" -> task UUID

  for (let mi = 0; mi < expanded.milestones.length; mi++) {
    const expandedMilestone = expanded.milestones[mi];
    const milestone = milestones[mi];

    const taskInserts = expandedMilestone.tasks.map((t) => ({
      milestone_id: milestone.id,
      title: t.title,
      description: t.description,
      status: t.status as "todo",
      priority: t.priority,
      effort_estimate: t.effort_estimate,
      completion_criteria: t.completion_criteria,
      rationale: t.rationale,
      sort_order: t.sort_order,
    }));

    const tasks = await createTasks(db, taskInserts);

    // Map sort_order to task ID
    tasks.forEach((task) => {
      taskIdMap.set(`${mi}:${task.sort_order}`, task.id);
    });
  }

  // Create intra-milestone dependencies
  const depInserts: { task_id: string; depends_on_task_id: string; dependency_type: "blocks" | "recommends" }[] = [];

  for (let mi = 0; mi < expanded.milestones.length; mi++) {
    for (const task of expanded.milestones[mi].tasks) {
      if (task.depends_on) {
        for (const depOrder of task.depends_on) {
          const taskId = taskIdMap.get(`${mi}:${task.sort_order}`);
          const depTaskId = taskIdMap.get(`${mi}:${depOrder}`);
          if (taskId && depTaskId) {
            depInserts.push({
              task_id: taskId,
              depends_on_task_id: depTaskId,
              dependency_type: "blocks",
            });
          }
        }
      }
    }
  }

  // Create cross-milestone dependencies
  for (const crossDep of expanded.cross_milestone_dependencies) {
    const fromMilestone = expanded.milestones[crossDep.from_milestone_index];
    const toMilestone = expanded.milestones[crossDep.to_milestone_index];
    if (fromMilestone && toMilestone) {
      const fromTask = fromMilestone.tasks[crossDep.from_task_index];
      const toTask = toMilestone.tasks[crossDep.to_task_index];
      if (fromTask && toTask) {
        const fromId = taskIdMap.get(
          `${crossDep.from_milestone_index}:${fromTask.sort_order}`
        );
        const toId = taskIdMap.get(
          `${crossDep.to_milestone_index}:${toTask.sort_order}`
        );
        if (fromId && toId) {
          depInserts.push({
            task_id: toId,
            depends_on_task_id: fromId,
            dependency_type: crossDep.dependency_type,
          });
        }
      }
    }
  }

  if (depInserts.length > 0) {
    await createDependencies(db, depInserts);
  }

  return planVersion.id;
}
