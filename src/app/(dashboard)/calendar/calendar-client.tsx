"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
} from "lucide-react";
import Link from "next/link";

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  effort_estimate: string | null;
  milestone_title: string;
  goal_title: string;
  goal_id: string;
  target_date: string | null;
}

const priorityDots: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-gray-400",
};

const statusBg: Record<string, string> = {
  done: "opacity-50 line-through",
  skipped: "opacity-50 line-through",
  already_known: "opacity-50 line-through",
};

type ViewMode = "week" | "month";

interface CalendarClientProps {
  tasks: CalendarTask[];
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(start.getDate() - startOffset);

  // Always show 6 weeks for consistent height
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarClient({ tasks }: CalendarClientProps) {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Group tasks by target_date
  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    for (const task of tasks) {
      if (!task.target_date) continue;
      const key = task.target_date;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    }
    return map;
  }, [tasks]);

  const dates =
    view === "week" ? getWeekDates(currentDate) : getMonthDates(currentDate);
  const today = dateKey(new Date());

  function navigate(dir: number) {
    const next = new Date(currentDate);
    if (view === "week") {
      next.setDate(next.getDate() + dir * 7);
    } else {
      next.setMonth(next.getMonth() + dir);
    }
    setCurrentDate(next);
  }

  function formatHeader(): string {
    if (view === "week") {
      const start = dates[0];
      const end = dates[6];
      const opts: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
      };
      return `${start.toLocaleDateString(undefined, opts)} — ${end.toLocaleDateString(undefined, opts)}, ${end.getFullYear()}`;
    }
    return currentDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">{formatHeader()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <div className="ml-2 flex rounded-lg border">
            <button
              className={`px-3 py-1 text-sm rounded-l-lg ${view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-r-lg ${view === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => setView("month")}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day names header */}
          <div className="grid grid-cols-7 border-b">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7">
            {dates.map((date) => {
              const key = dateKey(date);
              const dayTasks = tasksByDate[key] ?? [];
              const isToday = key === today;
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={key}
                  className={`border-b border-r ${view === "week" ? "min-h-[140px]" : "min-h-[90px]"} p-1.5 ${
                    !isCurrentMonth && view === "month"
                      ? "bg-muted/30"
                      : ""
                  }`}
                >
                  <div
                    className={`text-xs mb-1 ${isToday ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks
                      .slice(0, view === "week" ? 6 : 3)
                      .map((task) => (
                        <Popover key={task.id}>
                          <PopoverTrigger
                            render={<button />}
                            className={`w-full text-left text-[11px] leading-tight px-1 py-0.5 rounded hover:bg-muted truncate flex items-center gap-1 ${statusBg[task.status] ?? ""}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityDots[task.priority] ?? "bg-gray-400"}`}
                            />
                            <span className="truncate">{task.title}</span>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3">
                            <div className="space-y-2">
                              <p className="font-medium text-sm">
                                {task.title}
                              </p>
                              <div className="flex gap-1.5">
                                <Badge variant="outline" className="text-[10px]">
                                  {task.status.replace("_", " ")}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {task.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {task.goal_title} &middot; {task.milestone_title}
                              </p>
                              {task.effort_estimate && (
                                <p className="text-xs text-muted-foreground">
                                  Effort: {task.effort_estimate}
                                </p>
                              )}
                              <Link
                                href={`/plan/${task.goal_id}`}
                                className="text-xs text-primary hover:underline"
                              >
                                View in plan →
                              </Link>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ))}
                    {dayTasks.length > (view === "week" ? 6 : 3) && (
                      <p className="text-[10px] text-muted-foreground px-1">
                        +{dayTasks.length - (view === "week" ? 6 : 3)} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {tasks.filter((t) => !t.target_date).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDaysIcon className="h-4 w-4" />
              Unscheduled Tasks ({tasks.filter((t) => !t.target_date).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Tasks from milestones without target dates are not shown on the
              calendar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
