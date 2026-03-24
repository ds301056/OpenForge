import type {
  InferenceProvider,
  InferenceRequest,
  InferenceResponse,
} from "@/lib/planner/types";

export class GoogleProvider implements InferenceProvider {
  name = "google";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY ?? "";
  }

  async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const model = "gemini-2.0-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.3,
            maxOutputTokens: request.max_tokens ?? 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google AI request failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return {
      content,
      model,
      usage: {
        input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
        output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}
