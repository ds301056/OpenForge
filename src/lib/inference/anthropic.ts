import Anthropic from "@anthropic-ai/sdk";
import type {
  InferenceProvider,
  InferenceRequest,
  InferenceResponse,
} from "@/lib/planner/types";

const MODEL_MAP: Record<string, string> = {
  classify: "claude-haiku-4-5-20251001",
  structure: "claude-sonnet-4-6",
  expand: "claude-sonnet-4-6",
  optimize: "claude-sonnet-4-6",
};

export class AnthropicProvider implements InferenceProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const model = MODEL_MAP[request.step] ?? "claude-sonnet-4-6";

    const response = await this.client.messages.create({
      model,
      max_tokens: request.max_tokens ?? 4096,
      temperature: request.temperature ?? 0.3,
      system: request.system,
      messages: [{ role: "user", content: request.prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const content = textBlock?.text ?? "";

    return {
      content,
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  }
}
