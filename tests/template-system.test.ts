import { describe, it, expect } from "vitest";
import { compile, decompile, mergeConfigs } from "@/lib/templates/compiler";
import type { TemplateConfig } from "@/lib/templates/config";
import {
  registerTemplate,
  getTemplate,
  getTemplateConfig,
  listTemplates,
  unregisterTemplate,
} from "@/lib/templates/registry";
import learningPlanConfig from "@/lib/templates/configs/learning-plan.json";

const baseConfig = learningPlanConfig as TemplateConfig;

describe("Template Compiler", () => {
  it("should compile a JSON config into a runtime template", () => {
    const template = compile(baseConfig);
    expect(template.name).toBe("Learning Plan");
    expect(template.slug).toBe("learning-plan");
    expect(typeof template.validate).toBe("function");
  });

  it("should decompile a runtime template back to JSON config", () => {
    const template = compile(baseConfig);
    const config = decompile(template, { version: "1.0.0", validation_rules: baseConfig.validation_rules });
    expect(config.name).toBe("Learning Plan");
    expect(config.slug).toBe("learning-plan");
    expect(config.validation_rules.length).toBeGreaterThan(0);
  });

  it("should round-trip compile/decompile preserving structure", () => {
    const compiled = compile(baseConfig);
    const decompiled = decompile(compiled, {
      version: baseConfig.version,
      validation_rules: baseConfig.validation_rules,
    });
    expect(decompiled.structural_rules.max_milestone_duration_days).toBe(14);
    expect(decompiled.structural_rules.min_milestones).toBe(3);
    expect(decompiled.classification_hints.relevant_constraints).toContain(
      "timeline"
    );
  });
});

describe("Template Config Merging", () => {
  it("should merge overrides onto a base config", () => {
    const merged = mergeConfigs(baseConfig, {
      name: "Fast Learning",
      slug: "fast-learning",
      structural_rules: {
        ...baseConfig.structural_rules,
        max_milestone_duration_days: 7,
        min_milestones: 4,
      },
    });

    expect(merged.name).toBe("Fast Learning");
    expect(merged.extends).toBe("learning-plan");
    expect(merged.structural_rules.max_milestone_duration_days).toBe(7);
    expect(merged.structural_rules.min_milestones).toBe(4);
    // Unoverridden fields preserved from base
    expect(merged.structural_rules.max_milestones).toBe(8);
    expect(merged.classification_hints.relevant_constraints).toContain("timeline");
  });

  it("should deep-merge effort multipliers", () => {
    const merged = mergeConfigs(baseConfig, {
      task_heuristics: {
        rules: baseConfig.task_heuristics.rules,
        effort_multipliers: { beginner: 2.0 },
      },
    });
    expect(merged.task_heuristics.effort_multipliers.beginner).toBe(2.0);
    expect(merged.task_heuristics.effort_multipliers.intermediate).toBe(1.0);
  });
});

describe("Template Registry", () => {
  it("should list shipped templates", () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(1);
    expect(templates.some((t) => t.slug === "learning-plan")).toBe(true);
  });

  it("should get shipped template config", () => {
    const config = getTemplateConfig("learning-plan");
    expect(config).toBeDefined();
    expect(config?.name).toBe("Learning Plan");
  });

  it("should register a custom template", () => {
    const customConfig: TemplateConfig = {
      ...baseConfig,
      name: "Test Template",
      slug: "test-template",
      extends: null,
    };

    registerTemplate(customConfig);
    const template = getTemplate("test-template");
    expect(template).toBeDefined();
    expect(template?.name).toBe("Test Template");

    // Cleanup
    unregisterTemplate("test-template");
  });

  it("should register a template that extends another", () => {
    const childConfig: TemplateConfig = {
      ...baseConfig,
      name: "Extended Learning",
      slug: "extended-learning",
      extends: "learning-plan",
      structural_rules: {
        ...baseConfig.structural_rules,
        max_milestone_duration_days: 21,
      },
    };

    const template = registerTemplate(childConfig);
    expect(template.name).toBe("Extended Learning");
    expect(template.structural_rules.max_milestone_duration_days).toBe(21);
    // Inherited fields
    expect(template.structural_rules.min_milestones).toBe(3);

    unregisterTemplate("extended-learning");
  });

  it("should not allow removing shipped templates", () => {
    const result = unregisterTemplate("learning-plan");
    expect(result).toBe(false);
    expect(getTemplate("learning-plan")).toBeDefined();
  });
});
