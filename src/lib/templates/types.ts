import type {
  ClassificationResult,
  ExpandedPlan,
  Violation,
} from "@/lib/planner/types";

export interface ClassificationHints {
  relevant_constraints: string[];
  example_questions: string[];
  default_values: Record<string, unknown>;
}

export interface StructuralRules {
  max_milestone_duration_days: number;
  min_milestones: number;
  max_milestones: number;
  required_milestone_types: string[];
  milestone_ordering_rules: string[];
}

export interface TaskHeuristics {
  rules: string[];
  effort_multipliers: Record<string, number>;
}

export interface DomainTemplate {
  name: string;
  slug: string;
  description: string;
  classification_hints: ClassificationHints;
  structural_rules: StructuralRules;
  task_heuristics: TaskHeuristics;
  validate(
    plan: ExpandedPlan,
    classification: ClassificationResult
  ): Violation[];
}
