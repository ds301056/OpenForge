"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { TaskRow } from "./task-row";
import type { Milestone, Task, Dependency } from "@/types";

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  skipped: "bg-yellow-100 text-yellow-700",
};

interface MilestoneCardProps {
  milestone: Milestone & {
    tasks: (Task & { dependencies: Dependency[] })[];
  };
  defaultExpanded?: boolean;
  onTaskStatusChange?: (taskId: string, status: string) => void;
}

export function MilestoneCard({
  milestone,
  defaultExpanded = false,
  onTaskStatusChange,
}: MilestoneCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const totalTasks = milestone.tasks.length;
  const doneTasks = milestone.tasks.filter(
    (t) =>
      t.status === "done" ||
      t.status === "skipped" ||
      t.status === "already_known"
  ).length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">
                {milestone.title}
              </h3>
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ${statusColors[milestone.status] ?? ""}`}
              >
                {milestone.status.replace("_", " ")}
              </Badge>
            </div>
            {milestone.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {milestone.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {milestone.target_date && (
              <span className="text-xs text-muted-foreground">
                {new Date(milestone.target_date).toLocaleDateString()}
              </span>
            )}
            <div className="flex items-center gap-2 w-24">
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {doneTasks}/{totalTasks}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-2 px-2">
          <div className="divide-y divide-border/50">
            {milestone.tasks
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={onTaskStatusChange}
                />
              ))}
          </div>
          {milestone.tasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tasks in this milestone
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
