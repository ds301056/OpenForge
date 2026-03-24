import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestClient } from "./db-client";
import {
  createWorkspace,
  getWorkspace,
  createGoal,
  getGoal,
  listGoals,
  updateGoal,
  deleteGoal,
  createPlanVersion,
  getPlanVersion,
  listPlanVersions,
  getLatestPlanVersion,
  createMilestone,
  listMilestones,
  updateMilestone,
  deleteMilestone,
  createTask,
  listTasks,
  updateTask,
  deleteTask,
  createDependency,
  listDependencies,
  listDependents,
  createSuggestion,
  getSuggestion,
  listSuggestions,
  updateSuggestion,
  createDecisionLog,
  listDecisionLogs,
  getFullPlan,
} from "@/lib/db/queries";

const db = getTestClient();

// Track IDs for cleanup
let workspaceId: string;
let goalId: string;
let planVersionId: string;
let milestoneId: string;
let taskId1: string;
let taskId2: string;
let suggestionId: string;

describe("Data Layer Integration Tests", () => {
  // -----------------------------------------------------------------------
  // Workspaces
  // -----------------------------------------------------------------------
  describe("Workspaces", () => {
    it("should create a workspace", async () => {
      const workspace = await createWorkspace(db, { name: "Test Workspace" });
      workspaceId = workspace.id;
      expect(workspace.name).toBe("Test Workspace");
      expect(workspace.id).toBeDefined();
    });

    it("should get a workspace by ID", async () => {
      const workspace = await getWorkspace(db, workspaceId);
      expect(workspace.name).toBe("Test Workspace");
    });
  });

  // -----------------------------------------------------------------------
  // Goals
  // -----------------------------------------------------------------------
  describe("Goals", () => {
    it("should create a goal", async () => {
      const goal = await createGoal(db, {
        workspace_id: workspaceId,
        title: "Test Goal",
        description: "A goal for testing",
        domain_template: "learning-plan",
        constraints: { timeline: "4 weeks" },
      });
      goalId = goal.id;
      expect(goal.title).toBe("Test Goal");
      expect(goal.status).toBe("draft");
      expect(goal.domain_template).toBe("learning-plan");
    });

    it("should get a goal by ID", async () => {
      const goal = await getGoal(db, goalId);
      expect(goal.title).toBe("Test Goal");
      expect(goal.constraints).toEqual({ timeline: "4 weeks" });
    });

    it("should list goals by workspace", async () => {
      const goals = await listGoals(db, workspaceId);
      expect(goals.length).toBeGreaterThanOrEqual(1);
      expect(goals.some((g) => g.id === goalId)).toBe(true);
    });

    it("should update a goal", async () => {
      const updated = await updateGoal(db, goalId, {
        status: "active",
        title: "Updated Test Goal",
      });
      expect(updated.status).toBe("active");
      expect(updated.title).toBe("Updated Test Goal");
    });
  });

  // -----------------------------------------------------------------------
  // Plan Versions
  // -----------------------------------------------------------------------
  describe("Plan Versions", () => {
    it("should create a plan version", async () => {
      const version = await createPlanVersion(db, {
        goal_id: goalId,
        version_number: 1,
        trigger: "initial",
        summary: "Test plan version",
      });
      planVersionId = version.id;
      expect(version.version_number).toBe(1);
      expect(version.trigger).toBe("initial");
    });

    it("should get a plan version by ID", async () => {
      const version = await getPlanVersion(db, planVersionId);
      expect(version.summary).toBe("Test plan version");
    });

    it("should list plan versions for a goal", async () => {
      const versions = await listPlanVersions(db, goalId);
      expect(versions.length).toBe(1);
    });

    it("should get the latest plan version", async () => {
      const latest = await getLatestPlanVersion(db, goalId);
      expect(latest.id).toBe(planVersionId);
    });
  });

  // -----------------------------------------------------------------------
  // Milestones
  // -----------------------------------------------------------------------
  describe("Milestones", () => {
    it("should create a milestone", async () => {
      const milestone = await createMilestone(db, {
        plan_version_id: planVersionId,
        title: "Test Milestone",
        description: "First milestone",
        sort_order: 1,
      });
      milestoneId = milestone.id;
      expect(milestone.title).toBe("Test Milestone");
      expect(milestone.status).toBe("pending");
    });

    it("should list milestones for a plan version", async () => {
      const milestones = await listMilestones(db, planVersionId);
      expect(milestones.length).toBe(1);
      expect(milestones[0].title).toBe("Test Milestone");
    });

    it("should update a milestone", async () => {
      const updated = await updateMilestone(db, milestoneId, {
        status: "in_progress",
      });
      expect(updated.status).toBe("in_progress");
    });
  });

  // -----------------------------------------------------------------------
  // Tasks
  // -----------------------------------------------------------------------
  describe("Tasks", () => {
    it("should create tasks", async () => {
      const task1 = await createTask(db, {
        milestone_id: milestoneId,
        title: "Task 1",
        description: "First task",
        sort_order: 1,
        priority: "high",
        completion_criteria: "Tests pass",
        rationale: "Need to verify functionality",
      });
      taskId1 = task1.id;
      expect(task1.title).toBe("Task 1");
      expect(task1.status).toBe("todo");

      const task2 = await createTask(db, {
        milestone_id: milestoneId,
        title: "Task 2",
        description: "Second task",
        sort_order: 2,
      });
      taskId2 = task2.id;
    });

    it("should list tasks for a milestone", async () => {
      const tasks = await listTasks(db, milestoneId);
      expect(tasks.length).toBe(2);
      expect(tasks[0].sort_order).toBeLessThan(tasks[1].sort_order);
    });

    it("should update a task", async () => {
      const updated = await updateTask(db, taskId1, {
        status: "in_progress",
      });
      expect(updated.status).toBe("in_progress");
    });
  });

  // -----------------------------------------------------------------------
  // Dependencies
  // -----------------------------------------------------------------------
  describe("Dependencies", () => {
    it("should create a dependency", async () => {
      const dep = await createDependency(db, {
        task_id: taskId2,
        depends_on_task_id: taskId1,
        dependency_type: "blocks",
      });
      expect(dep.task_id).toBe(taskId2);
      expect(dep.depends_on_task_id).toBe(taskId1);
    });

    it("should list dependencies for a task", async () => {
      const deps = await listDependencies(db, taskId2);
      expect(deps.length).toBe(1);
      expect(deps[0].depends_on_task_id).toBe(taskId1);
    });

    it("should list dependents of a task", async () => {
      const dependents = await listDependents(db, taskId1);
      expect(dependents.length).toBe(1);
      expect(dependents[0].task_id).toBe(taskId2);
    });
  });

  // -----------------------------------------------------------------------
  // Suggestions
  // -----------------------------------------------------------------------
  describe("Suggestions", () => {
    it("should create a suggestion", async () => {
      const suggestion = await createSuggestion(db, {
        goal_id: goalId,
        plan_version_id: planVersionId,
        trigger_event: "task_completed",
        target_entity_type: "task",
        target_entity_id: taskId1,
        proposed_change: { action: "unlock_dependent", task_id: taskId2 },
        justification: "Task 1 is complete, Task 2 can now proceed",
        confidence: 0.95,
      });
      suggestionId = suggestion.id;
      expect(suggestion.status).toBe("pending");
      expect(suggestion.confidence).toBe(0.95);
    });

    it("should get a suggestion by ID", async () => {
      const suggestion = await getSuggestion(db, suggestionId);
      expect(suggestion.trigger_event).toBe("task_completed");
    });

    it("should list suggestions for a goal", async () => {
      const suggestions = await listSuggestions(db, goalId);
      expect(suggestions.length).toBe(1);
    });

    it("should filter suggestions by status", async () => {
      const pending = await listSuggestions(db, goalId, "pending");
      expect(pending.length).toBe(1);

      const accepted = await listSuggestions(db, goalId, "accepted");
      expect(accepted.length).toBe(0);
    });

    it("should update a suggestion", async () => {
      const updated = await updateSuggestion(db, suggestionId, {
        status: "accepted",
        resolved_at: new Date().toISOString(),
      });
      expect(updated.status).toBe("accepted");
      expect(updated.resolved_at).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Decision Log
  // -----------------------------------------------------------------------
  describe("Decision Log", () => {
    it("should create a decision log entry", async () => {
      const log = await createDecisionLog(db, {
        goal_id: goalId,
        suggestion_id: suggestionId,
        action: "approved",
        previous_state: { status: "blocked" },
        new_state: { status: "todo" },
        user_reason: "Looks good",
      });
      expect(log.action).toBe("approved");
      expect(log.user_reason).toBe("Looks good");
    });

    it("should list decision logs for a goal", async () => {
      const logs = await listDecisionLogs(db, goalId);
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe("approved");
    });
  });

  // -----------------------------------------------------------------------
  // Composite Queries
  // -----------------------------------------------------------------------
  describe("Composite Queries", () => {
    it("should fetch full plan with nested milestones, tasks, and dependencies", async () => {
      const plan = await getFullPlan(db, planVersionId);
      expect(plan.length).toBe(1);
      expect(plan[0].title).toBe("Test Milestone");
      expect(plan[0].tasks.length).toBe(2);

      const task2 = plan[0].tasks.find((t) => t.id === taskId2);
      expect(task2?.dependencies.length).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Seed Data Verification
  // -----------------------------------------------------------------------
  describe("Seed Data", () => {
    it("should have the seeded Learn Rust goal", async () => {
      const { data } = await db
        .from("goals")
        .select()
        .eq("id", "b0000000-0000-0000-0000-000000000001")
        .single();
      expect(data).toBeDefined();
      expect(data.title).toBe(
        "Learn Rust well enough to build a CLI tool"
      );
      expect(data.status).toBe("active");
    });

    it("should have 3 seeded milestones", async () => {
      const { data } = await db
        .from("milestones")
        .select()
        .eq(
          "plan_version_id",
          "c0000000-0000-0000-0000-000000000001"
        )
        .order("sort_order");
      expect(data?.length).toBe(3);
      expect(data?.[0].title).toBe("Foundations");
    });

    it("should have 8 seeded tasks", async () => {
      const { data } = await db.from("tasks").select(
        "*, milestones!inner(plan_version_id)"
      ).eq(
        "milestones.plan_version_id",
        "c0000000-0000-0000-0000-000000000001"
      );
      expect(data?.length).toBe(8);
    });

    it("should have 7 seeded dependencies", async () => {
      const { data } = await db
        .from("dependencies")
        .select()
        .in("task_id", [
          "e0000000-0000-0000-0000-000000000002",
          "e0000000-0000-0000-0000-000000000003",
          "e0000000-0000-0000-0000-000000000004",
          "e0000000-0000-0000-0000-000000000005",
          "e0000000-0000-0000-0000-000000000006",
          "e0000000-0000-0000-0000-000000000007",
          "e0000000-0000-0000-0000-000000000008",
        ]);
      expect(data?.length).toBe(7);
    });
  });

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  describe("Cleanup", () => {
    it("should delete test task", async () => {
      await deleteTask(db, taskId2);
      await deleteTask(db, taskId1);
      const tasks = await listTasks(db, milestoneId);
      expect(tasks.length).toBe(0);
    });

    it("should delete test milestone", async () => {
      await deleteMilestone(db, milestoneId);
      const milestones = await listMilestones(db, planVersionId);
      expect(milestones.length).toBe(0);
    });

    it("should delete test goal (cascades plan versions, suggestions, decisions)", async () => {
      await deleteGoal(db, goalId);
      await expect(getGoal(db, goalId)).rejects.toThrow();
    });

    it("should delete test workspace", async () => {
      await db.from("workspaces").delete().eq("id", workspaceId);
      await expect(getWorkspace(db, workspaceId)).rejects.toThrow();
    });
  });
});
