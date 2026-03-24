import { describe, it, expect } from "vitest";
import { validate } from "@/lib/planner/validate";
import { learningPlanTemplate } from "@/lib/templates/learning-plan";
import type {
  ExpandedPlan,
  ClassificationResult,
  ExpandedMilestone,
  TaskExpansion,
} from "@/lib/planner/types";

function makeTask(overrides: Partial<TaskExpansion> = {}): TaskExpansion {
  return {
    title: "Test Task",
    description: "A test task",
    status: "todo",
    priority: "medium",
    effort_estimate: "1hr",
    completion_criteria: "Task is done",
    rationale: "Needed for testing",
    task_type: "concept",
    sort_order: 1,
    depends_on: [],
    ...overrides,
  };
}

function makeMilestone(
  overrides: Partial<ExpandedMilestone> = {}
): ExpandedMilestone {
  return {
    title: "Test Milestone",
    description: "A test milestone",
    duration_days: 7,
    milestone_type: "foundation",
    sort_order: 1,
    target_date: null,
    tasks: [makeTask()],
    ...overrides,
  };
}

function makePlan(milestones: ExpandedMilestone[]): ExpandedPlan {
  return {
    milestones,
    cross_milestone_dependencies: [],
    total_duration_days: milestones.reduce((s, m) => s + m.duration_days, 0),
    summary: "Test plan",
  };
}

const classification: ClassificationResult = {
  domain: "programming",
  domain_template: "learning-plan",
  constraints: {
    timeline: "6 weeks",
    time_commitment: "10 hours per week",
    skill_level: "beginner",
    prior_knowledge: [],
    learning_style: null,
    target_proficiency: "practical competence",
    tools: [],
    budget: null,
  },
  ambiguities: [],
  summary: "Learn Rust programming",
};

describe("Validate Step", () => {
  it("should pass a valid plan", () => {
    const plan = makePlan([
      makeMilestone({
        milestone_type: "foundation",
        sort_order: 1,
        tasks: [
          makeTask({ sort_order: 1, task_type: "setup" }),
          makeTask({ sort_order: 2, task_type: "concept" }),
          makeTask({ sort_order: 3, task_type: "practice", depends_on: [2] }),
        ],
      }),
      makeMilestone({
        title: "Core Concepts",
        milestone_type: "concept",
        sort_order: 2,
        tasks: [
          makeTask({ sort_order: 1, task_type: "concept" }),
          makeTask({ sort_order: 2, task_type: "practice", depends_on: [1] }),
          makeTask({ sort_order: 3, task_type: "checkpoint" }),
        ],
      }),
      makeMilestone({
        title: "Capstone",
        milestone_type: "capstone",
        sort_order: 3,
        tasks: [
          makeTask({ sort_order: 1, task_type: "project" }),
        ],
      }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    expect(result.valid).toBe(true);
    expect(result.error_count).toBe(0);
  });

  it("should flag milestone > 14 days as error", () => {
    const plan = makePlan([
      makeMilestone({ duration_days: 21, sort_order: 1 }),
      makeMilestone({ sort_order: 2 }),
      makeMilestone({ milestone_type: "capstone", sort_order: 3 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    const violation = result.violations.find(
      (v) => v.rule === "max_milestone_duration"
    );
    expect(violation).toBeDefined();
    expect(violation?.severity).toBe("error");
  });

  it("should flag fewer than 3 milestones", () => {
    const plan = makePlan([
      makeMilestone({ sort_order: 1 }),
      makeMilestone({ milestone_type: "capstone", sort_order: 2 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    expect(result.violations.some((v) => v.rule === "min_milestones")).toBe(
      true
    );
  });

  it("should flag non-foundation first milestone", () => {
    const plan = makePlan([
      makeMilestone({ milestone_type: "concept", sort_order: 1 }),
      makeMilestone({ sort_order: 2 }),
      makeMilestone({ milestone_type: "capstone", sort_order: 3 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    expect(
      result.violations.some((v) => v.rule === "first_milestone_foundation")
    ).toBe(true);
  });

  it("should flag non-capstone last milestone", () => {
    const plan = makePlan([
      makeMilestone({ sort_order: 1 }),
      makeMilestone({ sort_order: 2 }),
      makeMilestone({ milestone_type: "concept", sort_order: 3 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    expect(
      result.violations.some((v) => v.rule === "last_milestone_capstone")
    ).toBe(true);
  });

  it("should flag tasks without rationale", () => {
    const plan = makePlan([
      makeMilestone({
        sort_order: 1,
        tasks: [makeTask({ rationale: "" })],
      }),
      makeMilestone({ sort_order: 2 }),
      makeMilestone({ milestone_type: "capstone", sort_order: 3 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    expect(
      result.violations.some((v) => v.rule === "task_requires_rationale")
    ).toBe(true);
  });

  it("should flag tasks without completion criteria", () => {
    const plan = makePlan([
      makeMilestone({
        sort_order: 1,
        tasks: [makeTask({ completion_criteria: "" })],
      }),
      makeMilestone({ sort_order: 2 }),
      makeMilestone({ milestone_type: "capstone", sort_order: 3 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    expect(
      result.violations.some(
        (v) => v.rule === "task_requires_completion_criteria"
      )
    ).toBe(true);
  });

  it("should warn about concept tasks without practice tasks", () => {
    const plan = makePlan([
      makeMilestone({
        sort_order: 1,
        tasks: [makeTask({ task_type: "concept" })],
      }),
      makeMilestone({ sort_order: 2 }),
      makeMilestone({ milestone_type: "capstone", sort_order: 3 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    const violation = result.violations.find(
      (v) => v.rule === "concept_needs_practice"
    );
    expect(violation).toBeDefined();
    expect(violation?.severity).toBe("warning");
  });

  it("should flag empty milestones", () => {
    const plan = makePlan([
      makeMilestone({ sort_order: 1, tasks: [] }),
      makeMilestone({ sort_order: 2 }),
      makeMilestone({ milestone_type: "capstone", sort_order: 3 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    expect(
      result.violations.some((v) => v.rule === "milestone_has_tasks")
    ).toBe(true);
  });

  it("should flag self-dependencies", () => {
    const plan = makePlan([
      makeMilestone({
        sort_order: 1,
        tasks: [makeTask({ sort_order: 1, depends_on: [1] })],
      }),
      makeMilestone({ sort_order: 2 }),
      makeMilestone({ milestone_type: "capstone", sort_order: 3 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    expect(
      result.violations.some((v) => v.rule === "no_self_dependency")
    ).toBe(true);
  });

  it("should count errors and warnings correctly", () => {
    const plan = makePlan([
      makeMilestone({
        milestone_type: "concept", // error: not foundation
        sort_order: 1,
        duration_days: 21, // error: > 14 days
        tasks: [
          makeTask({ rationale: "" }), // error: no rationale
          makeTask({ sort_order: 2, task_type: "concept" }), // warning: no practice
        ],
      }),
      makeMilestone({ sort_order: 2 }),
      makeMilestone({ milestone_type: "capstone", sort_order: 3 }),
    ]);

    const result = validate(plan, classification, learningPlanTemplate);
    expect(result.valid).toBe(false);
    expect(result.error_count).toBeGreaterThanOrEqual(3);
    expect(result.warning_count).toBeGreaterThanOrEqual(1);
  });
});
