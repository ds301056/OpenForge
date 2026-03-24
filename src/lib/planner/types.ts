// ---------------------------------------------------------------------------
// Planner Pipeline I/O Types
// ---------------------------------------------------------------------------

// Step 1: Classification
export interface ClassificationResult {
  domain: string;
  domain_template: string;
  constraints: {
    timeline: string | null;
    time_commitment: string | null;
    skill_level: "beginner" | "intermediate" | "advanced" | null;
    prior_knowledge: string[];
    learning_style: string | null;
    target_proficiency: string | null;
    tools: string[];
    budget: string | null;
    [key: string]: unknown;
  };
  ambiguities: string[];
  summary: string;
}

// Step 2: Structure
export interface MilestoneStructure {
  title: string;
  description: string;
  duration_days: number;
  milestone_type: "foundation" | "concept" | "practice" | "project" | "capstone";
  sort_order: number;
}

export interface PlanStructure {
  milestones: MilestoneStructure[];
  total_duration_days: number;
  summary: string;
}

// Step 3: Expand
export interface TaskExpansion {
  title: string;
  description: string;
  status: "todo";
  priority: "low" | "medium" | "high" | "critical";
  effort_estimate: string;
  completion_criteria: string;
  rationale: string;
  task_type: "concept" | "practice" | "setup" | "checkpoint" | "project";
  sort_order: number;
  depends_on: number[]; // indexes into the task array within this milestone
}

export interface ExpandedMilestone {
  title: string;
  description: string;
  duration_days: number;
  milestone_type: string;
  sort_order: number;
  target_date: string | null;
  tasks: TaskExpansion[];
}

export interface ExpandedPlan {
  milestones: ExpandedMilestone[];
  cross_milestone_dependencies: CrossMilestoneDependency[];
  total_duration_days: number;
  summary: string;
}

export interface CrossMilestoneDependency {
  from_milestone_index: number;
  from_task_index: number;
  to_milestone_index: number;
  to_task_index: number;
  dependency_type: "blocks" | "recommends";
}

// Step 4: Validate
export type ViolationSeverity = "error" | "warning";

export interface Violation {
  rule: string;
  message: string;
  severity: ViolationSeverity;
  milestone_index?: number;
  task_index?: number;
}

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
  error_count: number;
  warning_count: number;
}

// ---------------------------------------------------------------------------
// Inference Interface
// ---------------------------------------------------------------------------

export type PipelineStep = "classify" | "structure" | "expand" | "optimize";

export interface InferenceRequest {
  system: string;
  prompt: string;
  step: PipelineStep;
  temperature?: number;
  max_tokens?: number;
}

export interface InferenceResponse {
  content: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface InferenceProvider {
  name: string;
  generate(request: InferenceRequest): Promise<InferenceResponse>;
}

// ---------------------------------------------------------------------------
// Pipeline Context
// ---------------------------------------------------------------------------

export interface PipelineContext {
  goal_title: string;
  goal_description: string;
  goal_id: string;
  workspace_id: string;
}

export interface PipelineResult {
  plan_version_id: string;
  classification: ClassificationResult;
  structure: PlanStructure;
  expanded: ExpandedPlan;
  validation: ValidationResult;
}
