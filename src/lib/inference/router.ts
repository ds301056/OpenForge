import type { InferenceProvider, PipelineStep } from "@/lib/planner/types";
import { AnthropicProvider } from "./anthropic";
import { OllamaProvider } from "./ollama";
import { GoogleProvider } from "./google";
import {
  detectOllamaModels,
  assignModels,
  type ModelAssignment,
} from "./model-detector";

// ---------------------------------------------------------------------------
// Provider instances (lazy singletons)
// ---------------------------------------------------------------------------

type CloudProviderName = "anthropic" | "google" | "openai";

let anthropicInstance: AnthropicProvider | null = null;
let googleInstance: GoogleProvider | null = null;
let ollamaInstance: OllamaProvider | null = null;
let modelAssignment: ModelAssignment | null = null;
let detectionDone = false;

function getCloudProvider(name: CloudProviderName): InferenceProvider {
  switch (name) {
    case "anthropic":
      if (!anthropicInstance) anthropicInstance = new AnthropicProvider();
      return anthropicInstance;
    case "google":
      if (!googleInstance) googleInstance = new GoogleProvider();
      return googleInstance;
    case "openai":
      throw new Error(
        "OpenAI provider not yet implemented. Use anthropic or google."
      );
    default:
      throw new Error(`Unknown cloud provider: ${name}`);
  }
}

function getOllamaProvider(): OllamaProvider {
  if (!ollamaInstance) ollamaInstance = new OllamaProvider();
  return ollamaInstance;
}

// ---------------------------------------------------------------------------
// Auto-detect and assign local models (runs once)
// ---------------------------------------------------------------------------

async function ensureModelDetection(): Promise<ModelAssignment> {
  if (modelAssignment && detectionDone) return modelAssignment;

  const models = await detectOllamaModels();
  modelAssignment = assignModels(models);
  detectionDone = true;

  if (models.length > 0) {
    console.log(
      `[inference] Auto-detected ${models.length} Ollama models:`,
      models.map((m) => `${m.name} (${m.tier})`).join(", ")
    );
    console.log(
      `[inference] Model assignment — classify: ${modelAssignment.classify}, structure: ${modelAssignment.structure}, expand: ${modelAssignment.expand}`
    );
  } else {
    console.log(
      "[inference] No Ollama models detected. Using default model names."
    );
  }

  return modelAssignment;
}

// ---------------------------------------------------------------------------
// Public API: get provider for a pipeline step
// ---------------------------------------------------------------------------

/**
 * Get the inference provider for a pipeline step.
 * Steps 1-4 (classify, structure, expand, optimize) use Ollama (local).
 * The Ollama provider will use the auto-detected best model for the step.
 */
export async function getProviderForStep(
  step: PipelineStep
): Promise<{ provider: InferenceProvider; model: string }> {
  const assignment = await ensureModelDetection();

  const ollama = getOllamaProvider();
  const model =
    assignment[step as keyof ModelAssignment] ?? assignment.classify;

  // Override the Ollama provider's model for this step
  return {
    provider: new OllamaProvider(undefined, model),
    model,
  };
}

/**
 * Get the review provider (cloud). User configures which cloud provider via env.
 */
export function getReviewProvider(): InferenceProvider {
  const providerName =
    (process.env.REVIEW_PROVIDER as CloudProviderName) ?? "anthropic";
  return getCloudProvider(providerName);
}

/**
 * Check if a review provider is configured (has an API key).
 */
export function isReviewAvailable(): boolean {
  const provider = process.env.REVIEW_PROVIDER ?? "anthropic";
  switch (provider) {
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "google":
      return !!process.env.GOOGLE_AI_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    default:
      return false;
  }
}

/**
 * Get the configured review trigger mode.
 */
export function getReviewTrigger(): string {
  return process.env.REVIEW_TRIGGER ?? "on_request";
}

// Re-export for backward compatibility
export { getOllamaProvider, getCloudProvider };
