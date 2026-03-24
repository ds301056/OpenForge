import { createClient } from "@supabase/supabase-js";
import type { Goal } from "@/types";
import { GoalCard } from "@/components/goal-inbox/goal-card";
import { NewGoalForm } from "@/components/goal-inbox/new-goal-form";
import { getGoalProgress } from "@/lib/db/queries";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getGoals(): Promise<Goal[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("goals")
    .select()
    .order("created_at", { ascending: false });
  if (error) return [];
  return data as Goal[];
}

export const dynamic = "force-dynamic";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const goals = await getGoals();
  const db = getServiceClient();

  // Fetch progress for each goal
  const progressMap: Record<string, { total: number; done: number }> = {};
  await Promise.all(
    goals.map(async (goal) => {
      progressMap[goal.id] = await getGoalProgress(db, goal.id);
    })
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground">
            {goals.length} goal{goals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NewGoalForm defaultOpen={params.new === "true"} />
      </div>

      {goals.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No goals yet. Create your first goal to get started.
          </p>
          <NewGoalForm />
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              progress={progressMap[goal.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
