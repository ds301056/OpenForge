import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Plan View</h1>
        <Badge variant="secondary">Phase 0 - Placeholder</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Plan for Goal: {goalId}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This view will display milestones, tasks, dependencies, and status
            controls for the selected goal&apos;s plan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
