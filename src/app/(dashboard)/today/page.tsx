import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TodayPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Today</h1>
        <Badge variant="secondary">Phase 0 - Placeholder</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>What to Work On Next</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This view will recommend the highest-priority unblocked task across
            all active goals, with context about why it was chosen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
