"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MilestoneCard } from "@/components/plan-view/milestone-card";
import type { Goal, Milestone, Task, Dependency } from "@/types";
import { toast } from "sonner";

type FullMilestone = Milestone & {
  tasks: (Task & { dependencies: Dependency[] })[];
};

interface PlanViewClientProps {
  goal: Goal;
  milestones: FullMilestone[];
  versionSummary: string | null;
  versionNumber: number | null;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  planning: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-purple-100 text-purple-700",
  archived: "bg-yellow-100 text-yellow-700",
};

export function PlanViewClient({
  goal,
  milestones,
  versionSummary,
  versionNumber,
}: PlanViewClientProps) {
  const router = useRouter();

  function handleTaskStatusChange(taskId: string, newStatus: string) {
    // Optimistic — just refresh to get new state
    void taskId;
    void newStatus;
    router.refresh();
  }

  async function handleGeneratePlan() {
    toast.info("Generating plan... This may take a moment.");
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_id: goal.id,
          goal_title: goal.title,
          goal_description: goal.description ?? "",
          workspace_id: goal.workspace_id,
          template: goal.domain_template,
        }),
      });
      if (res.ok) {
        toast.success("Plan generated!");
        router.refresh();
      } else {
        toast.error("Plan generation failed");
      }
    } catch {
      toast.error("Plan generation failed");
    }
  }

  const totalTasks = milestones.reduce((s, m) => s + m.tasks.length, 0);
  const doneTasks = milestones.reduce(
    (s, m) =>
      s +
      m.tasks.filter(
        (t) =>
          t.status === "done" ||
          t.status === "skipped" ||
          t.status === "already_known"
      ).length,
    0
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{goal.title}</h1>
          <Badge
            variant="outline"
            className={statusColors[goal.status] ?? ""}
          >
            {goal.status}
          </Badge>
        </div>
        {goal.description && (
          <p className="text-sm text-muted-foreground">{goal.description}</p>
        )}
        {versionNumber && (
          <p className="text-xs text-muted-foreground mt-1">
            Plan v{versionNumber}
            {versionSummary ? ` — ${versionSummary}` : ""}
            {totalTasks > 0
              ? ` · ${doneTasks}/${totalTasks} tasks complete`
              : ""}
          </p>
        )}
      </div>

      {/* Plan content */}
      {milestones.length > 0 ? (
        <div className="space-y-3">
          {milestones
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((milestone, i) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                defaultExpanded={i === 0}
                onTaskStatusChange={handleTaskStatusChange}
              />
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              No plan has been generated for this goal yet.
            </p>
            <button
              onClick={handleGeneratePlan}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Generate Plan
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
