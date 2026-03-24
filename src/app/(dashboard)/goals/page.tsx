import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Goal Inbox</h1>
        <Badge variant="secondary">Phase 0 - Placeholder</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Create goals and generate structured plans. This view will include a
            goal creation form, goal list, and plan generation triggers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
