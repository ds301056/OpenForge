import type { DomainTemplate } from "./types";
import type {
  ClassificationResult,
  ExpandedPlan,
  Violation,
} from "@/lib/planner/types";

export const learningPlanTemplate: DomainTemplate = {
  name: "Learning Plan",
  slug: "learning-plan",
  description:
    "Optimized for 'learn X' goals. Understands prerequisites, concept-practice loops, skill progression, and pacing.",

  classification_hints: {
    relevant_constraints: [
      "timeline",
      "time_commitment",
      "skill_level",
      "prior_knowledge",
      "learning_style",
      "target_proficiency",
      "tools",
    ],
    example_questions: [
      "How much time per week can you dedicate?",
      "What is your current skill level with related topics?",
      "Do you have a deadline or target date?",
      "What tools or resources do you already have access to?",
      "What specific outcome do you want (build something, pass an exam, etc)?",
    ],
    default_values: {
      skill_level: "beginner",
      time_commitment: "5 hours per week",
      learning_style: "mixed",
      target_proficiency: "practical competence",
    },
  },

  structural_rules: {
    max_milestone_duration_days: 14,
    min_milestones: 3,
    max_milestones: 8,
    required_milestone_types: ["foundation", "capstone"],
    milestone_ordering_rules: [
      "The first milestone must be of type 'foundation' covering setup and fundamentals.",
      "The last milestone must be of type 'capstone' or 'project' involving a hands-on deliverable.",
      "Concept milestones should be followed by practice milestones when possible.",
      "Milestones should progress from foundational to advanced topics.",
    ],
  },

  task_heuristics: {
    rules: [
      "Every concept task must have a companion practice task in the same milestone.",
      "Include a 'checkpoint' task at the end of each milestone to verify understanding.",
      "Always include environment/tooling setup tasks early in the first milestone.",
      "Estimate effort based on skill level: beginner = 1.5x, intermediate = 1x, advanced = 0.7x.",
      "Practice tasks should reference specific exercises, projects, or problems.",
      "Each task must have concrete completion criteria, not vague statements like 'understand X'.",
    ],
    effort_multipliers: {
      beginner: 1.5,
      intermediate: 1.0,
      advanced: 0.7,
    },
  },

  validate(
    plan: ExpandedPlan,
    classification: ClassificationResult
  ): Violation[] {
    const violations: Violation[] = [];

    // Rule: No milestone > 14 days
    plan.milestones.forEach((m, i) => {
      if (m.duration_days > 14) {
        violations.push({
          rule: "max_milestone_duration",
          message: `Milestone "${m.title}" is ${m.duration_days} days, exceeding the 14-day maximum.`,
          severity: "error",
          milestone_index: i,
        });
      }
    });

    // Rule: Minimum 3 milestones
    if (plan.milestones.length < 3) {
      violations.push({
        rule: "min_milestones",
        message: `Plan has ${plan.milestones.length} milestones, minimum is 3.`,
        severity: "error",
      });
    }

    // Rule: Maximum 8 milestones
    if (plan.milestones.length > 8) {
      violations.push({
        rule: "max_milestones",
        message: `Plan has ${plan.milestones.length} milestones, maximum is 8.`,
        severity: "warning",
      });
    }

    // Rule: First milestone must be foundation
    if (
      plan.milestones.length > 0 &&
      plan.milestones[0].milestone_type !== "foundation"
    ) {
      violations.push({
        rule: "first_milestone_foundation",
        message: `First milestone must be type 'foundation', got '${plan.milestones[0].milestone_type}'.`,
        severity: "error",
        milestone_index: 0,
      });
    }

    // Rule: Last milestone must be capstone or project
    if (plan.milestones.length > 0) {
      const last = plan.milestones[plan.milestones.length - 1];
      if (last.milestone_type !== "capstone" && last.milestone_type !== "project") {
        violations.push({
          rule: "last_milestone_capstone",
          message: `Last milestone must be type 'capstone' or 'project', got '${last.milestone_type}'.`,
          severity: "error",
          milestone_index: plan.milestones.length - 1,
        });
      }
    }

    // Rule: Every task must have a rationale
    plan.milestones.forEach((m, mi) => {
      m.tasks.forEach((t, ti) => {
        if (!t.rationale || t.rationale.trim().length === 0) {
          violations.push({
            rule: "task_requires_rationale",
            message: `Task "${t.title}" in milestone "${m.title}" has no rationale.`,
            severity: "error",
            milestone_index: mi,
            task_index: ti,
          });
        }
      });
    });

    // Rule: Every task must have completion criteria
    plan.milestones.forEach((m, mi) => {
      m.tasks.forEach((t, ti) => {
        if (!t.completion_criteria || t.completion_criteria.trim().length === 0) {
          violations.push({
            rule: "task_requires_completion_criteria",
            message: `Task "${t.title}" in milestone "${m.title}" has no completion criteria.`,
            severity: "error",
            milestone_index: mi,
            task_index: ti,
          });
        }
      });
    });

    // Rule: Every concept task should have a companion practice task
    plan.milestones.forEach((m, mi) => {
      const conceptTasks = m.tasks.filter((t) => t.task_type === "concept");
      const practiceTasks = m.tasks.filter((t) => t.task_type === "practice");
      if (conceptTasks.length > 0 && practiceTasks.length === 0) {
        violations.push({
          rule: "concept_needs_practice",
          message: `Milestone "${m.title}" has concept tasks but no practice tasks.`,
          severity: "warning",
          milestone_index: mi,
        });
      }
    });

    // Rule: At least one capstone/project task in the plan
    const hasProjectTask = plan.milestones.some((m) =>
      m.tasks.some(
        (t) => t.task_type === "project" || t.task_type === "checkpoint"
      )
    );
    if (!hasProjectTask) {
      violations.push({
        rule: "needs_project_task",
        message:
          "Plan should include at least one project or checkpoint task.",
        severity: "warning",
      });
    }

    // Rule: Tasks should have effort estimates
    plan.milestones.forEach((m, mi) => {
      m.tasks.forEach((t, ti) => {
        if (!t.effort_estimate || t.effort_estimate.trim().length === 0) {
          violations.push({
            rule: "task_requires_effort",
            message: `Task "${t.title}" in milestone "${m.title}" has no effort estimate.`,
            severity: "warning",
            milestone_index: mi,
            task_index: ti,
          });
        }
      });
    });

    // Suppress unused variable warning - classification is available for
    // future constraint-aware validation rules
    void classification;

    return violations;
  },
};
