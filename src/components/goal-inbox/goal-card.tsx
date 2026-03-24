"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Goal } from "@/types";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  planning: "secondary",
  active: "default",
  completed: "secondary",
  archived: "outline",
};

interface GoalCardProps {
  goal: Goal;
  progress?: { total: number; done: number };
}

export function GoalCard({ goal, progress }: GoalCardProps) {
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <Link href={`/plan/${goal.id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold truncate">
              {goal.title}
            </CardTitle>
            <div className="flex gap-1.5 shrink-0">
              <Badge variant={statusVariant[goal.status] ?? "outline"}>
                {goal.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {goal.domain_template}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {goal.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {goal.description}
            </p>
          )}
          {progress && progress.total > 0 && (
            <div className="flex items-center gap-3">
              <Progress value={pct} className="flex-1 h-1.5" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {progress.done}/{progress.total} tasks
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Created {new Date(goal.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
