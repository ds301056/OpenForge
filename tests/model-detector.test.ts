import { describe, it, expect } from "vitest";
import { assignModels, type DetectedModel } from "@/lib/inference/model-detector";

describe("Model Detector - Assignment", () => {
  it("should assign best model per step based on tier", () => {
    const models: DetectedModel[] = [
      { name: "llama3.1:70b", tier: "xlarge", parameterSize: "70B" },
      { name: "llama3.1:8b", tier: "medium", parameterSize: "8B" },
      { name: "phi-3:mini", tier: "small", parameterSize: "3.8B" },
    ];

    const assignment = assignModels(models);
    expect(assignment.classify).toBe("phi-3:mini"); // prefers small
    expect(assignment.structure).toBe("llama3.1:70b"); // prefers xlarge
    expect(assignment.expand).toBe("llama3.1:8b"); // prefers medium
  });

  it("should fall back to first model when no tier match", () => {
    const models: DetectedModel[] = [
      { name: "custom-model:latest", tier: "unknown", parameterSize: null },
    ];

    const assignment = assignModels(models);
    expect(assignment.classify).toBe("custom-model:latest");
    expect(assignment.structure).toBe("custom-model:latest");
  });

  it("should fall back to default when no models detected", () => {
    const assignment = assignModels([]);
    expect(assignment.classify).toBe("llama3.2");
    expect(assignment.structure).toBe("llama3.2");
  });

  it("should handle single medium model for all steps", () => {
    const models: DetectedModel[] = [
      { name: "mistral:latest", tier: "medium", parameterSize: "7B" },
    ];

    const assignment = assignModels(models);
    expect(assignment.classify).toBe("mistral:latest");
    expect(assignment.structure).toBe("mistral:latest");
    expect(assignment.expand).toBe("mistral:latest");
  });
});
