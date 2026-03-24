import type { InferenceProvider, PipelineStep } from "@/lib/planner/types";
import { AnthropicProvider } from "./anthropic";
import { OllamaProvider } from "./ollama";

type ProviderName = "anthropic" | "ollama";

const STEP_PROVIDER_ENV: Record<PipelineStep, string> = {
  classify: "CLASSIFICATION_PROVIDER",
  structure: "STRUCTURE_PROVIDER",
  expand: "EXPANSION_PROVIDER",
  optimize: "DEFAULT_PROVIDER",
};

let anthropicInstance: AnthropicProvider | null = null;
let ollamaInstance: OllamaProvider | null = null;

function getProvider(name: ProviderName): InferenceProvider {
  switch (name) {
    case "anthropic":
      if (!anthropicInstance) anthropicInstance = new AnthropicProvider();
      return anthropicInstance;
    case "ollama":
      if (!ollamaInstance) ollamaInstance = new OllamaProvider();
      return ollamaInstance;
    default:
      throw new Error(`Unknown inference provider: ${name}`);
  }
}

export function getProviderForStep(step: PipelineStep): InferenceProvider {
  const envKey = STEP_PROVIDER_ENV[step];
  const providerName =
    (process.env[envKey] as ProviderName) ??
    (process.env.DEFAULT_PROVIDER as ProviderName) ??
    "anthropic";

  return getProvider(providerName);
}
