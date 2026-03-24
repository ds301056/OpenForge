"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Weekly & Monthly Views</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            View your tasks and milestones on a calendar with weekly and monthly
            views.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
