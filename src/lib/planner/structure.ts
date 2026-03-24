import type {
  ClassificationResult,
  PlanStructure,
} from "./types";
import type { DomainTemplate } from "@/lib/templates/types";
import { getProviderForStep } from "@/lib/inference/router";

function buildSystemPrompt(template: DomainTemplate): string {
  const rules = template.structural_rules;
  return `You are a plan structuring engine. Given a classified goal, generate an ordered list of milestones.

You MUST respond with valid JSON only — no markdown, no explanation, no code fences.

Output format:
{
  "milestones": [
    {
      "title": "string",
      "description": "string - what the learner accomplishes in this milestone",
      "duration_days": number (1-${rules.max_milestone_duration_days}),
      "milestone_type": "foundation" | "concept" | "practice" | "project" | "capstone",
      "sort_order": number (starting from 1)
    }
  ],
  "total_duration_days": number,
  "summary": "string - one sentence describing the overall plan structure"
}

HARD CONSTRAINTS — these must all be satisfied:
- Each milestone must be ${rules.max_milestone_duration_days} days or fewer
- Minimum ${rules.min_milestones} milestones, maximum ${rules.max_milestones} milestones
- Required milestone types: ${rules.required_milestone_types.join(", ")}

ORDERING RULES:
${rules.milestone_ordering_rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Design milestones that build on each other progressively. Each milestone should have a clear learning outcome.`;
}

function buildPrompt(classification: ClassificationResult): string {
  return `Create a milestone structure for this classified goal:

Domain: ${classification.domain}
Summary: ${classification.summary}
Skill Level: ${classification.constraints.skill_level ?? "beginner"}
Timeline: ${classification.constraints.timeline ?? "flexible"}
Time Commitment: ${classification.constraints.time_commitment ?? "5 hours per week"}
Prior Knowledge: ${classification.constraints.prior_knowledge.length > 0 ? classification.constraints.prior_knowledge.join(", ") : "none specified"}
Target Proficiency: ${classification.constraints.target_proficiency ?? "practical competence"}`;
}

function parseResponse(content: string): PlanStructure {
  const cleaned = content.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned) as PlanStructure;
}

export async function structure(
  classification: ClassificationResult,
  template: DomainTemplate
): Promise<PlanStructure> {
  const { provider } = await getProviderForStep("structure");
  const system = buildSystemPrompt(template);
  const prompt = buildPrompt(classification);

  const response = await provider.generate({
    system,
    prompt,
    step: "structure",
    temperature: 0.3,
    max_tokens: 2048,
  });

  try {
    return parseResponse(response.content);
  } catch {
    const retryResponse = await provider.generate({
      system:
        system +
        "\n\nIMPORTANT: Your previous response was not valid JSON. Respond with ONLY valid JSON, no other text.",
      prompt,
      step: "structure",
      temperature: 0.1,
      max_tokens: 2048,
    });
    return parseResponse(retryResponse.content);
  }
}
