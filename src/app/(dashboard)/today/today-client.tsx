"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PlayIcon,
  CheckIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-700",
};

interface TodayClientProps {
  nextTask: Record<string, unknown> | null;
  inProgressTasks: Record<string, unknown>[];
  activeGoalCount: number;
}

export function TodayClient({
  nextTask,
  inProgressTasks,
  activeGoalCount,
}: TodayClientProps) {
  const router = useRouter();

  async function startTask(taskId: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      toast.success("Task started");
      router.refresh();
    } catch {
      toast.error("Failed to start task");
    }
  }

  async function completeTask(taskId: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      toast.success("Task completed!");
      router.refresh();
    } catch {
      toast.error("Failed to complete task");
    }
  }

  function getGoalTitle(task: Record<string, unknown>): string {
    const m = task.milestones as Record<string, unknown>;
    const pv = m?.plan_versions as Record<string, unknown>;
    const goal = pv?.goals as Record<string, unknown>;
    return (goal?.title as string) ?? "";
  }

  function getMilestoneTitle(task: Record<string, unknown>): string {
    const m = task.milestones as Record<string, unknown>;
    return (m?.title as string) ?? "";
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what to focus on
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column — main content */}
        <div className="md:col-span-2 space-y-4">
          {/* Next Task Hero */}
          {nextTask ? (
            <Card className="border-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Up Next
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      priorityColors[nextTask.priority as string] ?? ""
                    }
                  >
                    {nextTask.priority as string}
                  </Badge>
                </div>
                <CardTitle className="text-lg">
                  {nextTask.title as string}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {getGoalTitle(nextTask)} &middot;{" "}
                  {getMilestoneTitle(nextTask)}
                </p>
                {typeof nextTask.rationale === "string" && nextTask.rationale && (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      Why this task
                    </p>
                    <p className="text-sm">{String(nextTask.rationale)}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {typeof nextTask.effort_estimate === "string" && nextTask.effort_estimate && (
                    <span>Est: {String(nextTask.effort_estimate)}</span>
                  )}
                  {typeof nextTask.completion_criteria === "string" && nextTask.completion_criteria && (
                    <span className="truncate">
                      Done when: {String(nextTask.completion_criteria)}
                    </span>
                  )}
                </div>
                <Button onClick={() => startTask(nextTask.id as string)}>
                  <PlayIcon className="h-4 w-4" />
                  Start Working
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No tasks available. Create a goal and generate a plan to get
                  started.
                </p>
              </CardContent>
            </Card>
          )}

          {/* In Progress */}
          {inProgressTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  In Progress ({inProgressTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inProgressTasks.map((task) => (
                    <div
                      key={String(task.id)}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm truncate">
                          {String(task.title)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {String(getGoalTitle(task))}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => completeTask(String(task.id))}
                      >
                        <CheckIcon className="h-4 w-4" />
                        Done
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — stats */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <TargetIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeGoalCount}</p>
                  <p className="text-xs text-muted-foreground">Active goals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-green-500/10 p-2">
                  <TrendingUpIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {inProgressTasks.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tasks in progress
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
