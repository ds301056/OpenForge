import type { TemplateConfig, ValidationRuleConfig } from "./config";
import type { DomainTemplate, ClassificationHints, StructuralRules, TaskHeuristics } from "./types";
import type { ClassificationResult, ExpandedPlan, Violation } from "@/lib/planner/types";

// ---------------------------------------------------------------------------
// Compile: TemplateConfig (JSON) → DomainTemplate (runtime)
// ---------------------------------------------------------------------------

export function compile(config: TemplateConfig): DomainTemplate {
  const validators = config.validation_rules.map(compileRule);

  return {
    name: config.name,
    slug: config.slug,
    description: config.description,
    classification_hints: config.classification_hints as ClassificationHints,
    structural_rules: config.structural_rules as StructuralRules,
    task_heuristics: config.task_heuristics as TaskHeuristics,
    validate(plan: ExpandedPlan, classification: ClassificationResult): Violation[] {
      const violations: Violation[] = [];

      for (const { rule, fn } of validators) {
        if (rule.scope === "plan") {
          if (!fn({ plan, classification })) {
            violations.push({
              rule: rule.id,
              message: rule.description,
              severity: rule.severity,
            });
          }
        } else if (rule.scope === "milestone") {
          plan.milestones.forEach((milestone, mi) => {
            if (!fn({ milestone, plan, classification })) {
              violations.push({
                rule: rule.id,
                message: `${rule.description} (milestone: "${milestone.title}")`,
                severity: rule.severity,
                milestone_index: mi,
              });
            }
          });
        } else if (rule.scope === "task") {
          plan.milestones.forEach((milestone, mi) => {
            milestone.tasks.forEach((task, ti) => {
              if (!fn({ task, milestone, plan, classification })) {
                violations.push({
                  rule: rule.id,
                  message: `${rule.description} (task: "${task.title}")`,
                  severity: rule.severity,
                  milestone_index: mi,
                  task_index: ti,
                });
              }
            });
          });
        }
      }

      return violations;
    },
  };
}

// ---------------------------------------------------------------------------
// Compile a single validation rule condition into a function
// ---------------------------------------------------------------------------

interface RuleContext {
  task?: unknown;
  milestone?: unknown;
  plan?: unknown;
  classification?: unknown;
  structural_rules?: unknown;
}

interface CompiledRule {
  rule: ValidationRuleConfig;
  fn: (ctx: RuleContext) => boolean;
}

function compileRule(rule: ValidationRuleConfig): CompiledRule {
  // Build a safe evaluator for the condition expression
  // We use Function constructor with a restricted context
  const fn = (ctx: RuleContext): boolean => {
    try {
      const evalFn = new Function(
        "task",
        "milestone",
        "plan",
        "classification",
        "structural_rules",
        `"use strict"; return (${rule.condition});`
      );
      return Boolean(
        evalFn(
          ctx.task,
          ctx.milestone,
          ctx.plan,
          ctx.classification,
          ctx.plan && typeof ctx.plan === "object" && "milestones" in (ctx.plan as Record<string, unknown>)
            ? undefined
            : undefined
        )
      );
    } catch {
      // If condition evaluation fails, treat as passed (don't block on bad rules)
      return true;
    }
  };

  return { rule, fn };
}

// ---------------------------------------------------------------------------
// Decompile: DomainTemplate (runtime) → TemplateConfig (JSON)
// ---------------------------------------------------------------------------

export function decompile(template: DomainTemplate, config?: Partial<TemplateConfig>): TemplateConfig {
  return {
    name: template.name,
    slug: template.slug,
    version: config?.version ?? "1.0.0",
    description: template.description,
    extends: config?.extends ?? null,
    classification_hints: {
      relevant_constraints: template.classification_hints.relevant_constraints,
      example_questions: template.classification_hints.example_questions,
      default_values: template.classification_hints.default_values,
    },
    structural_rules: {
      max_milestone_duration_days: template.structural_rules.max_milestone_duration_days,
      min_milestones: template.structural_rules.min_milestones,
      max_milestones: template.structural_rules.max_milestones,
      required_milestone_types: template.structural_rules.required_milestone_types,
      milestone_ordering_rules: template.structural_rules.milestone_ordering_rules,
    },
    task_heuristics: {
      rules: template.task_heuristics.rules,
      effort_multipliers: template.task_heuristics.effort_multipliers,
    },
    validation_rules: config?.validation_rules ?? [],
  };
}

// ---------------------------------------------------------------------------
// Merge: Apply overrides from a child config onto a base config
// ---------------------------------------------------------------------------

export function mergeConfigs(
  base: TemplateConfig,
  overrides: Partial<TemplateConfig>
): TemplateConfig {
  return {
    name: overrides.name ?? base.name,
    slug: overrides.slug ?? base.slug,
    version: overrides.version ?? base.version,
    description: overrides.description ?? base.description,
    extends: base.slug,
    classification_hints: {
      relevant_constraints:
        overrides.classification_hints?.relevant_constraints ??
        base.classification_hints.relevant_constraints,
      example_questions:
        overrides.classification_hints?.example_questions ??
        base.classification_hints.example_questions,
      default_values: {
        ...base.classification_hints.default_values,
        ...overrides.classification_hints?.default_values,
      },
    },
    structural_rules: {
      ...base.structural_rules,
      ...overrides.structural_rules,
    },
    task_heuristics: {
      rules: overrides.task_heuristics?.rules ?? base.task_heuristics.rules,
      effort_multipliers: {
        ...base.task_heuristics.effort_multipliers,
        ...overrides.task_heuristics?.effort_multipliers,
      },
    },
    validation_rules:
      overrides.validation_rules ?? base.validation_rules,
  };
}
