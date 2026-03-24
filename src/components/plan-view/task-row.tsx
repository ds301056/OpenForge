"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LockIcon,
  LinkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Task, Dependency } from "@/types";

const statusColors: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress:
    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  skipped:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  already_known:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

const priorityDots: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-gray-400",
};

interface TaskRowProps {
  task: Task & { dependencies?: Dependency[] };
  onStatusChange?: (taskId: string, status: string) => void;
}

export function TaskRow({ task, onStatusChange }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isBlocked =
    task.status === "blocked" ||
    (task.dependencies ?? []).some((d) => d.dependency_type === "blocks");
  const isDone =
    task.status === "done" ||
    task.status === "skipped" ||
    task.status === "already_known";

  async function toggleDone() {
    const newStatus = isDone ? "todo" : "done";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onStatusChange?.(task.id, newStatus);
        toast.success(newStatus === "done" ? "Task completed" : "Task reopened");
      }
    } catch {
      toast.error("Failed to update task");
    }
  }

  return (
    <div className={`${isDone ? "opacity-60" : ""}`}>
      <div
        className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isDone}
            onCheckedChange={toggleDone}
            disabled={isBlocked && !isDone}
          />
        </div>
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${priorityDots[task.priority] ?? ""}`}
        />
        <span
          className={`flex-1 text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}
        >
          {task.title}
        </span>
        <div className="flex items-center gap-2">
          {task.effort_estimate && (
            <span className="text-xs text-muted-foreground">
              {task.effort_estimate}
            </span>
          )}
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${statusColors[task.status] ?? ""}`}
          >
            {task.status.replace("_", " ")}
          </Badge>
          {task.locked && <LockIcon className="h-3 w-3 text-muted-foreground" />}
          {isBlocked && !isDone && (
            <LinkIcon className="h-3 w-3 text-red-500" />
          )}
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="ml-10 mr-3 mb-2 p-3 rounded-md bg-muted/30 space-y-2 text-sm">
          {task.description && (
            <p className="text-muted-foreground">{task.description}</p>
          )}
          {task.rationale && (
            <div>
              <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                Why this task
              </span>
              <p className="mt-0.5">{task.rationale}</p>
            </div>
          )}
          {task.completion_criteria && (
            <div>
              <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                Done when
              </span>
              <p className="mt-0.5">{task.completion_criteria}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
