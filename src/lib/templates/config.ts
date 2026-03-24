// ---------------------------------------------------------------------------
// TemplateConfig — the canonical JSON schema for all templates
// ---------------------------------------------------------------------------

export interface ValidationRuleConfig {
  id: string;
  description: string;
  severity: "error" | "warning";
  scope: "plan" | "milestone" | "task";
  condition: string; // expression evaluated at runtime
}

export interface TemplateConfig {
  name: string;
  slug: string;
  version: string;
  description: string;
  extends: string | null;

  classification_hints: {
    relevant_constraints: string[];
    example_questions: string[];
    default_values: Record<string, unknown>;
  };

  structural_rules: {
    max_milestone_duration_days: number;
    min_milestones: number;
    max_milestones: number;
    required_milestone_types: string[];
    milestone_ordering_rules: string[];
  };

  task_heuristics: {
    rules: string[];
    effort_multipliers: Record<string, number>;
  };

  validation_rules: ValidationRuleConfig[];
}
