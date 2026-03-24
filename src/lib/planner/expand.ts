import type {
  ClassificationResult,
  PlanStructure,
  ExpandedPlan,
  ExpandedMilestone,
  TaskExpansion,
  CrossMilestoneDependency,
} from "./types";
import type { DomainTemplate } from "@/lib/templates/types";
import { getProviderForStep } from "@/lib/inference/router";

function buildSystemPrompt(template: DomainTemplate): string {
  const heuristics = template.task_heuristics;
  return `You are a task expansion engine. Given a milestone and its context, generate concrete tasks.

You MUST respond with valid JSON only — no markdown, no explanation, no code fences.

Output format:
{
  "tasks": [
    {
      "title": "string",
      "description": "string - what the learner does",
      "status": "todo",
      "priority": "low" | "medium" | "high" | "critical",
      "effort_estimate": "string (e.g., '30min', '1hr', '2hrs', '1day')",
      "completion_criteria": "string - specific, measurable way to know this is done",
      "rationale": "string - why this task exists in the plan",
      "task_type": "concept" | "practice" | "setup" | "checkpoint" | "project",
      "sort_order": number (starting from 1),
      "depends_on": [number] (sort_order values of tasks THIS task depends on, within this milestone)
    }
  ]
}

TASK GENERATION RULES:
${heuristics.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Generate 3-6 tasks per milestone. Make completion criteria specific and measurable.
Do NOT use vague criteria like "understand X" — use "can explain X" or "can build Y" instead.`;
}

function buildMilestonePrompt(
  milestone: { title: string; description: string; milestone_type: string },
  classification: ClassificationResult,
  milestoneIndex: number,
  totalMilestones: number
): string {
  return `Expand this milestone into tasks:

Milestone ${milestoneIndex + 1} of ${totalMilestones}: "${milestone.title}"
Type: ${milestone.milestone_type}
Description: ${milestone.description}

Context:
- Domain: ${classification.domain}
- Skill Level: ${classification.constraints.skill_level ?? "beginner"}
- Prior Knowledge: ${classification.constraints.prior_knowledge.length > 0 ? classification.constraints.prior_knowledge.join(", ") : "none"}
- Goal: ${classification.summary}`;
}

function parseTasksResponse(content: string): TaskExpansion[] {
  const cleaned = content.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return parsed.tasks as TaskExpansion[];
}

export async function expand(
  planStructure: PlanStructure,
  classification: ClassificationResult,
  template: DomainTemplate
): Promise<ExpandedPlan> {
  const { provider } = await getProviderForStep("expand");
  const system = buildSystemPrompt(template);

  const expandedMilestones: ExpandedMilestone[] = [];

  // Calculate target dates based on cumulative duration
  let cumulativeDays = 0;
  const startDate = new Date();

  for (let i = 0; i < planStructure.milestones.length; i++) {
    const milestone = planStructure.milestones[i];
    const prompt = buildMilestonePrompt(
      milestone,
      classification,
      i,
      planStructure.milestones.length
    );

    const response = await provider.generate({
      system,
      prompt,
      step: "expand",
      temperature: 0.3,
      max_tokens: 2048,
    });

    let tasks: TaskExpansion[];
    try {
      tasks = parseTasksResponse(response.content);
    } catch {
      // Retry once
      const retryResponse = await provider.generate({
        system:
          system +
          "\n\nIMPORTANT: Your previous response was not valid JSON. Respond with ONLY valid JSON.",
        prompt,
        step: "expand",
        temperature: 0.1,
        max_tokens: 2048,
      });
      tasks = parseTasksResponse(retryResponse.content);
    }

    cumulativeDays += milestone.duration_days;
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + cumulativeDays);

    expandedMilestones.push({
      title: milestone.title,
      description: milestone.description,
      duration_days: milestone.duration_days,
      milestone_type: milestone.milestone_type,
      sort_order: milestone.sort_order,
      target_date: targetDate.toISOString().split("T")[0],
      tasks,
    });
  }

  // Build cross-milestone dependencies:
  // Each milestone's first task recommends completion of the previous milestone's last task
  const crossDeps: CrossMilestoneDependency[] = [];
  for (let i = 1; i < expandedMilestones.length; i++) {
    const prevMilestone = expandedMilestones[i - 1];
    if (prevMilestone.tasks.length > 0 && expandedMilestones[i].tasks.length > 0) {
      crossDeps.push({
        from_milestone_index: i - 1,
        from_task_index: prevMilestone.tasks.length - 1,
        to_milestone_index: i,
        to_task_index: 0,
        dependency_type: "recommends",
      });
    }
  }

  return {
    milestones: expandedMilestones,
    cross_milestone_dependencies: crossDeps,
    total_duration_days: planStructure.total_duration_days,
    summary: planStructure.summary,
  };
}
