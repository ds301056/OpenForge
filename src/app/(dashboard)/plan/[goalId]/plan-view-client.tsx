"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MilestoneCard } from "@/components/plan-view/milestone-card";
import { SuggestionCard } from "@/components/plan-view/suggestion-card";
import type { Goal, Milestone, Task, Dependency, Suggestion } from "@/types";
import { toast } from "sonner";
import { ZapIcon } from "lucide-react";

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    fetch(`/api/goals/${goal.id}/suggestions?status=pending`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSuggestions(data);
      })
      .catch(() => {});
  }, [goal.id]);

  function handleTaskStatusChange() {
    router.refresh();
    // Re-fetch suggestions after status change
    setTimeout(() => {
      fetch(`/api/goals/${goal.id}/suggestions?status=pending`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setSuggestions(data);
        })
        .catch(() => {});
    }, 500);
  }

  function handleSuggestionResolved() {
    router.refresh();
    fetch(`/api/goals/${goal.id}/suggestions?status=pending`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSuggestions(data);
      })
      .catch(() => {});
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
  const pendingCount = suggestions.length;

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

      {/* Content */}
      {milestones.length > 0 ? (
        <Tabs defaultValue="plan">
          <TabsList>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-1.5">
              Suggestions
              {pendingCount > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="space-y-3 mt-4">
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
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-3 mt-4">
            {suggestions.length > 0 ? (
              suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  onResolved={handleSuggestionResolved}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <ZapIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">
                    No pending suggestions. Suggestions appear when you change
                    task statuses — the optimizer evaluates whether the plan
                    needs adjustment.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            <HistoryTab goalId={goal.id} />
          </TabsContent>
        </Tabs>
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

function HistoryTab({ goalId }: { goalId: string }) {
  const [history, setHistory] = useState<{
    versions: Array<Record<string, unknown>>;
    decisions: Array<Record<string, unknown>>;
  }>({ versions: [], decisions: [] });

  useEffect(() => {
    fetch(`/api/goals/${goalId}/history`)
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => {});
  }, [goalId]);

  return (
    <div className="space-y-3">
      {history.versions.length > 0 ? (
        history.versions.map((v) => (
          <Card key={String(v.id)}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Version {String(v.version_number)}
                  </p>
                  {typeof v.summary === "string" && v.summary && (
                    <p className="text-xs text-muted-foreground">
                      {v.summary}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px]">
                    {String(v.trigger)}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(String(v.created_at)).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No version history yet. History is created when plans are
              generated or suggestions are approved.
            </p>
          </CardContent>
        </Card>
      )}

      {history.decisions.length > 0 && (
        <div className="pt-4">
          <h3 className="text-sm font-medium mb-2">Decision Log</h3>
          {history.decisions.map((d) => (
            <Card key={String(d.id)} className="mb-2">
              <CardContent className="py-2 px-4">
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="outline">{String(d.action)}</Badge>
                  <span className="text-muted-foreground">
                    {new Date(String(d.created_at)).toLocaleDateString()}
                  </span>
                </div>
                {typeof d.user_reason === "string" && d.user_reason && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.user_reason}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
