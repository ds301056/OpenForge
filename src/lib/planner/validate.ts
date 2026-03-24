import type {
  ClassificationResult,
  ExpandedPlan,
  ValidationResult,
  Violation,
} from "./types";
import type { DomainTemplate } from "@/lib/templates/types";

export function validate(
  plan: ExpandedPlan,
  classification: ClassificationResult,
  template: DomainTemplate
): ValidationResult {
  const violations: Violation[] = [];

  // Run template-specific validation
  const templateViolations = template.validate(plan, classification);
  violations.push(...templateViolations);

  // Universal validations (apply regardless of template)

  // Every milestone must have at least one task
  plan.milestones.forEach((m, i) => {
    if (m.tasks.length === 0) {
      violations.push({
        rule: "milestone_has_tasks",
        message: `Milestone "${m.title}" has no tasks.`,
        severity: "error",
        milestone_index: i,
      });
    }
  });

  // Task sort_order should be sequential within each milestone
  plan.milestones.forEach((m, mi) => {
    const orders = m.tasks.map((t) => t.sort_order);
    const sorted = [...orders].sort((a, b) => a - b);
    const hasDuplicates = new Set(orders).size !== orders.length;
    if (hasDuplicates) {
      violations.push({
        rule: "unique_sort_order",
        message: `Milestone "${m.title}" has duplicate task sort_order values.`,
        severity: "warning",
        milestone_index: mi,
      });
    }
    if (JSON.stringify(orders) !== JSON.stringify(sorted)) {
      violations.push({
        rule: "sequential_sort_order",
        message: `Tasks in milestone "${m.title}" are not in sort_order sequence.`,
        severity: "warning",
        milestone_index: mi,
      });
    }
  });

  // Dependencies must reference valid task indexes
  plan.milestones.forEach((m, mi) => {
    m.tasks.forEach((t, ti) => {
      if (t.depends_on) {
        for (const depOrder of t.depends_on) {
          const depExists = m.tasks.some((task) => task.sort_order === depOrder);
          if (!depExists) {
            violations.push({
              rule: "valid_dependency",
              message: `Task "${t.title}" in milestone "${m.title}" depends on sort_order ${depOrder} which does not exist.`,
              severity: "warning",
              milestone_index: mi,
              task_index: ti,
            });
          }
        }
      }
    });
  });

  // No circular dependencies within a milestone
  plan.milestones.forEach((m, mi) => {
    const taskMap = new Map(m.tasks.map((t) => [t.sort_order, t]));
    for (const task of m.tasks) {
      if (task.depends_on?.includes(task.sort_order)) {
        violations.push({
          rule: "no_self_dependency",
          message: `Task "${task.title}" in milestone "${m.title}" depends on itself.`,
          severity: "error",
          milestone_index: mi,
        });
      }
    }

    // Simple cycle detection via DFS
    const visited = new Set<number>();
    const inStack = new Set<number>();

    function hasCycle(order: number): boolean {
      if (inStack.has(order)) return true;
      if (visited.has(order)) return false;
      visited.add(order);
      inStack.add(order);
      const task = taskMap.get(order);
      if (task?.depends_on) {
        for (const dep of task.depends_on) {
          if (hasCycle(dep)) return true;
        }
      }
      inStack.delete(order);
      return false;
    }

    for (const task of m.tasks) {
      visited.clear();
      inStack.clear();
      if (hasCycle(task.sort_order)) {
        violations.push({
          rule: "no_circular_dependency",
          message: `Circular dependency detected in milestone "${m.title}".`,
          severity: "error",
          milestone_index: mi,
        });
        break;
      }
    }
  });

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;

  return {
    valid: errorCount === 0,
    violations,
    error_count: errorCount,
    warning_count: warningCount,
  };
}
