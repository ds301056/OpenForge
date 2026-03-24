import type { ClassificationResult, PipelineContext } from "./types";
import type { DomainTemplate } from "@/lib/templates/types";
import { getProviderForStep } from "@/lib/inference/router";

function buildSystemPrompt(template: DomainTemplate): string {
  const hints = template.classification_hints;
  return `You are a goal classification engine. Your job is to analyze a user's goal description and extract structured information.

You MUST respond with valid JSON only — no markdown, no explanation, no code fences.

Extract the following:
- domain: The subject area (e.g., "programming", "music", "fitness")
- domain_template: Always set to "${template.slug}"
- constraints: An object with these keys:
  - timeline: How long the user has (e.g., "6 weeks", "3 months") or null if not specified
  - time_commitment: How much time per week (e.g., "10 hours per week") or null
  - skill_level: One of "beginner", "intermediate", "advanced", or null
  - prior_knowledge: Array of strings listing what the user already knows
  - learning_style: Preferred learning approach or null
  - target_proficiency: What level they want to reach or null
  - tools: Array of tools/software/resources mentioned
  - budget: Budget constraints or null
- ambiguities: Array of strings listing what's unclear or missing from the goal
- summary: A one-sentence summary of what the user wants to achieve

Relevant constraints to look for: ${hints.relevant_constraints.join(", ")}

If information is missing, use these defaults:
${JSON.stringify(hints.default_values, null, 2)}

Flag missing information as ambiguities even when using defaults.`;
}

function buildPrompt(context: PipelineContext): string {
  return `Classify this goal:

Title: ${context.goal_title}
Description: ${context.goal_description}`;
}

function parseResponse(content: string): ClassificationResult {
  // Strip markdown code fences if present
  const cleaned = content.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned) as ClassificationResult;
}

export async function classify(
  context: PipelineContext,
  template: DomainTemplate
): Promise<ClassificationResult> {
  const provider = getProviderForStep("classify");
  const system = buildSystemPrompt(template);
  const prompt = buildPrompt(context);

  const response = await provider.generate({
    system,
    prompt,
    step: "classify",
    temperature: 0.2,
    max_tokens: 1024,
  });

  try {
    return parseResponse(response.content);
  } catch {
    // Retry once on parse failure
    const retryResponse = await provider.generate({
      system:
        system +
        "\n\nIMPORTANT: Your previous response was not valid JSON. Respond with ONLY valid JSON, no other text.",
      prompt,
      step: "classify",
      temperature: 0.1,
      max_tokens: 1024,
    });
    return parseResponse(retryResponse.content);
  }
}
