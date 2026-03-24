"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Suggestion } from "@/types";

interface SuggestionCardProps {
  suggestion: Suggestion;
  onResolved?: () => void;
}

export function SuggestionCard({ suggestion, onResolved }: SuggestionCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "approved" | "rejected") {
    setLoading(true);
    try {
      const res = await fetch(`/api/suggestions/${suggestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(
          action === "approved" ? "Suggestion applied" : "Suggestion rejected"
        );
        onResolved?.();
      } else {
        toast.error("Failed to process suggestion");
      }
    } catch {
      toast.error("Failed to process suggestion");
    } finally {
      setLoading(false);
    }
  }

  const change = suggestion.proposed_change as Record<string, unknown>;
  const confidencePct = Math.round(suggestion.confidence * 100);

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ZapIcon className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {suggestion.trigger_event.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {suggestion.target_entity_type}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Progress value={confidencePct} className="h-1 w-12" />
              <span>{confidencePct}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {typeof change.action === "string" && change.action && (
          <p className="text-sm font-medium">
            {formatAction(String(change.action))}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {suggestion.justification}
        </p>

        {suggestion.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => handleAction("approved")}
              disabled={loading}
            >
              <CheckIcon className="h-3 w-3" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("rejected")}
              disabled={loading}
            >
              <XIcon className="h-3 w-3" />
              Reject
            </Button>
          </div>
        )}

        {suggestion.status !== "pending" && (
          <Badge
            variant={
              suggestion.status === "accepted" ? "default" : "secondary"
            }
            className="text-xs"
          >
            {suggestion.status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    update_task_status: "Update task status",
    update_milestone_status: "Complete milestone",
    reprioritize_task: "Raise task priority",
    suggest_skip_task: "Skip practice task",
    suggest_acceleration: "Accelerate timeline",
    flag_overdue: "Milestone overdue",
    flag_at_risk: "Milestone at risk",
    flag_priority_conflict: "Priority conflict detected",
  };
  return map[action] ?? action.replace(/_/g, " ");
}
