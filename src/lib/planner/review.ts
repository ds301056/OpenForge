import type {
  ClassificationResult,
  ExpandedPlan,
  ValidationResult,
  InferenceProvider,
} from "./types";
import type { SuggestionInsert } from "@/types";

export type ReviewTrigger = "on_request" | "always" | "on_warnings" | "on_schedule";

export interface ReviewResult {
  suggestions: SuggestionInsert[];
  model: string;
  review_summary: string;
}

function buildReviewPrompt(
  plan: ExpandedPlan,
  classification: ClassificationResult,
  validation: ValidationResult
): { system: string; prompt: string } {
  const system = `You are an expert plan reviewer. You receive a structured learning plan and provide targeted, actionable critique.

You MUST respond with valid JSON only — no markdown, no explanation, no code fences.

Output format:
{
  "review_summary": "string — one paragraph overall assessment",
  "suggestions": [
    {
      "target_entity_type": "plan" | "milestone" | "task",
      "target_milestone_index": number | null,
      "target_task_index": number | null,
      "proposed_change": {
        "action": "reorder" | "add" | "remove" | "modify" | "split" | "merge",
        "details": "string — what specifically to change"
      },
      "justification": "string — why this change improves the plan",
      "confidence": number (0.0-1.0)
    }
  ]
}

Review criteria:
1. Logical sequencing — are prerequisites in the right order?
2. Completion criteria quality — are they specific and measurable, not vague?
3. Scope appropriateness — is the plan realistic for the stated timeline and skill level?
4. Gap detection — are any critical topics or skills missing?
5. Redundancy — are any tasks unnecessarily duplicated?
6. Pacing — is effort distributed reasonably across milestones?

Only suggest changes where you have high confidence (>= 0.7). Do not suggest changes for the sake of making suggestions. If the plan is solid, return an empty suggestions array.`;

  const milestonesSummary = plan.milestones
    .map(
      (m, i) =>
        `Milestone ${i + 1}: "${m.title}" (${m.milestone_type}, ${m.duration_days} days)\n` +
        m.tasks
          .map(
            (t) =>
              `  - [${t.task_type}] ${t.title} (${t.effort_estimate}, ${t.priority})\n    Criteria: ${t.completion_criteria}\n    Rationale: ${t.rationale}`
          )
          .join("\n")
    )
    .join("\n\n");

  const prompt = `Review this plan:

Goal: ${classification.summary}
Domain: ${classification.domain}
Skill Level: ${classification.constraints.skill_level ?? "beginner"}
Timeline: ${classification.constraints.timeline ?? "flexible"}
Time Commitment: ${classification.constraints.time_commitment ?? "unspecified"}

Validation Result: ${validation.valid ? "PASSED" : `FAILED — ${validation.error_count} errors, ${validation.warning_count} warnings`}
${validation.violations.length > 0 ? `Violations:\n${validation.violations.map((v) => `- [${v.severity}] ${v.message}`).join("\n")}` : ""}

Plan (${plan.milestones.length} milestones, ${plan.total_duration_days} days total):

${milestonesSummary}`;

  return { system, prompt };
}

export async function reviewPlan(
  provider: InferenceProvider,
  plan: ExpandedPlan,
  classification: ClassificationResult,
  validation: ValidationResult,
  goalId: string
): Promise<ReviewResult> {
  const { system, prompt } = buildReviewPrompt(plan, classification, validation);

  const response = await provider.generate({
    system,
    prompt,
    step: "optimize", // review uses the optimize step config
    temperature: 0.3,
    max_tokens: 4096,
  });

  const cleaned = response.content
    .replace(/```(?:json)?\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  const parsed = JSON.parse(cleaned);

  const suggestions: SuggestionInsert[] = (parsed.suggestions ?? []).map(
    (s: {
      target_entity_type: string;
      target_milestone_index?: number | null;
      target_task_index?: number | null;
      proposed_change: Record<string, unknown>;
      justification: string;
      confidence: number;
    }) => ({
      goal_id: goalId,
      trigger_event: "plan_review",
      target_entity_type: s.target_entity_type,
      proposed_change: s.proposed_change,
      justification: s.justification,
      confidence: s.confidence,
      requires_approval: true,
      status: "pending" as const,
    })
  );

  return {
    suggestions,
    model: response.model,
    review_summary: parsed.review_summary ?? "",
  };
}

export function shouldReview(
  trigger: ReviewTrigger,
  validation: ValidationResult
): boolean {
  switch (trigger) {
    case "always":
      return true;
    case "on_request":
      return false; // only when user explicitly requests
    case "on_warnings":
      return validation.warning_count > 0 || !validation.valid;
    case "on_schedule":
      return false; // handled by external scheduler
    default:
      return false;
  }
}
