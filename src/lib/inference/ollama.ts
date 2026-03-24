import type {
  InferenceProvider,
  InferenceRequest,
  InferenceResponse,
} from "@/lib/planner/types";

const DEFAULT_MODELS: Record<string, string> = {
  classify: "llama3.2",
  structure: "llama3.2",
  expand: "llama3.2",
  optimize: "llama3.2",
};

export class OllamaProvider implements InferenceProvider {
  name = "ollama";
  private baseUrl: string;
  private modelOverride: string | null;

  constructor(baseUrl?: string, modelOverride?: string) {
    this.baseUrl = baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    this.modelOverride = modelOverride ?? null;
  }

  async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const model = this.modelOverride ?? DEFAULT_MODELS[request.step] ?? "llama3.2";

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system: request.system,
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.3,
          num_predict: request.max_tokens ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${text}`);
    }

    const data = await response.json();

    return {
      content: data.response,
      model: data.model ?? model,
      usage: {
        input_tokens: data.prompt_eval_count ?? 0,
        output_tokens: data.eval_count ?? 0,
      },
    };
  }
}
