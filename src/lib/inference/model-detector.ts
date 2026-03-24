import type { PipelineStep } from "@/lib/planner/types";

// ---------------------------------------------------------------------------
// Model capability tiers — used to rank discovered models per step
// ---------------------------------------------------------------------------

interface ModelProfile {
  pattern: RegExp;
  tier: "small" | "medium" | "large" | "xlarge";
  parameterSize?: string;
}

// Known model patterns ranked by capability
const MODEL_PROFILES: ModelProfile[] = [
  // X-Large (70B+)
  { pattern: /llama.*:?70b/i, tier: "xlarge", parameterSize: "70B" },
  { pattern: /qwen.*:?72b/i, tier: "xlarge", parameterSize: "72B" },
  { pattern: /deepseek.*:?67b/i, tier: "xlarge", parameterSize: "67B" },
  { pattern: /mixtral.*8x22b/i, tier: "xlarge", parameterSize: "176B" },

  // Large (13B-34B)
  { pattern: /llama.*:?13b/i, tier: "large", parameterSize: "13B" },
  { pattern: /codellama.*:?34b/i, tier: "large", parameterSize: "34B" },
  { pattern: /mixtral.*8x7b/i, tier: "large", parameterSize: "56B" },
  { pattern: /deepseek.*:?33b/i, tier: "large", parameterSize: "33B" },
  { pattern: /qwen.*:?14b/i, tier: "large", parameterSize: "14B" },
  { pattern: /gemma.*:?27b/i, tier: "large", parameterSize: "27B" },

  // Medium (7B-8B)
  { pattern: /llama.*:?8b/i, tier: "medium", parameterSize: "8B" },
  { pattern: /mistral(?!.*mixtral)/i, tier: "medium", parameterSize: "7B" },
  { pattern: /deepseek.*:?7b/i, tier: "medium", parameterSize: "7B" },
  { pattern: /qwen.*:?7b/i, tier: "medium", parameterSize: "7B" },
  { pattern: /gemma.*:?7b/i, tier: "medium", parameterSize: "7B" },
  { pattern: /codellama.*:?7b/i, tier: "medium", parameterSize: "7B" },

  // Small (1B-3B)
  { pattern: /llama.*:?3b/i, tier: "small", parameterSize: "3B" },
  { pattern: /llama.*:?1b/i, tier: "small", parameterSize: "1B" },
  { pattern: /phi.*:?mini/i, tier: "small", parameterSize: "3.8B" },
  { pattern: /phi.*:?3/i, tier: "small", parameterSize: "3.8B" },
  { pattern: /gemma.*:?2b/i, tier: "small", parameterSize: "2B" },
  { pattern: /qwen.*:?1/i, tier: "small", parameterSize: "1.8B" },
];

// Preferred tier per pipeline step
const STEP_PREFERRED_TIER: Record<PipelineStep, string[]> = {
  classify: ["small", "medium", "large", "xlarge"],
  structure: ["xlarge", "large", "medium", "small"],
  expand: ["medium", "large", "small", "xlarge"],
  optimize: ["large", "xlarge", "medium", "small"],
};

const TIER_RANK: Record<string, number> = {
  small: 1,
  medium: 2,
  large: 3,
  xlarge: 4,
};

export interface DetectedModel {
  name: string;
  tier: "small" | "medium" | "large" | "xlarge" | "unknown";
  parameterSize: string | null;
}

export interface ModelAssignment {
  classify: string;
  structure: string;
  expand: string;
  optimize: string;
}

// ---------------------------------------------------------------------------
// Auto-detect installed Ollama models
// ---------------------------------------------------------------------------

export async function detectOllamaModels(
  baseUrl?: string
): Promise<DetectedModel[]> {
  const url = baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  try {
    const response = await fetch(`${url}/api/tags`);
    if (!response.ok) return [];

    const data = await response.json();
    const models: DetectedModel[] = [];

    for (const model of data.models ?? []) {
      const name: string = model.name ?? model.model;
      const profile = MODEL_PROFILES.find((p) => p.pattern.test(name));
      models.push({
        name,
        tier: profile?.tier ?? "unknown",
        parameterSize: profile?.parameterSize ?? null,
      });
    }

    // Sort by tier (largest first)
    models.sort(
      (a, b) =>
        (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0)
    );

    return models;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Assign best model per pipeline step
// ---------------------------------------------------------------------------

export function assignModels(models: DetectedModel[]): ModelAssignment {
  const fallback = models[0]?.name ?? "llama3.2";

  function bestForStep(step: PipelineStep): string {
    // Check env override first
    const envKey = `${step.toUpperCase()}_MODEL`;
    const envModel = process.env[envKey];
    if (envModel) return envModel;

    const preferredTiers = STEP_PREFERRED_TIER[step];
    for (const tier of preferredTiers) {
      const match = models.find((m) => m.tier === tier);
      if (match) return match.name;
    }

    return fallback;
  }

  return {
    classify: bestForStep("classify"),
    structure: bestForStep("structure"),
    expand: bestForStep("expand"),
    optimize: bestForStep("optimize"),
  };
}
