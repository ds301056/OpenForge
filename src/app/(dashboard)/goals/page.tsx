import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Goal } from "@/types";

async function getGoals(): Promise<Goal[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("goals")
    .select()
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch goals:", error.message);
    return [];
  }

  return data as Goal[];
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  planning: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-purple-100 text-purple-700",
  archived: "bg-yellow-100 text-yellow-700",
};

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await getGoals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Goal Inbox</h1>
        <Badge variant="secondary">{goals.length} goals</Badge>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No goals yet. Create your first goal to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <Link key={goal.id} href={`/plan/${goal.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[goal.status] ?? ""}`}
                    >
                      {goal.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {goal.description}
                    </p>
                  )}
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>Template: {goal.domain_template}</span>
                    <span>
                      Created:{" "}
                      {new Date(goal.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
