import { createClient } from "@supabase/supabase-js";
import { getGoal, getLatestPlanVersion, getFullPlan } from "@/lib/db/queries";
import type { Goal, Milestone, Task, Dependency } from "@/types";
import { PlanViewClient } from "./plan-view-client";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

type FullMilestone = Milestone & {
  tasks: (Task & { dependencies: Dependency[] })[];
};

export default async function PlanPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;
  const db = getServiceClient();

  let goal: Goal;
  try {
    goal = await getGoal(db, goalId);
  } catch {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Goal not found</h1>
        <p className="text-muted-foreground">
          This goal does not exist or has been deleted.
        </p>
      </div>
    );
  }

  let milestones: FullMilestone[] = [];
  let versionSummary: string | null = null;
  let versionNumber: number | null = null;

  try {
    const version = await getLatestPlanVersion(db, goalId);
    milestones = await getFullPlan(db, version.id);
    versionSummary = version.summary;
    versionNumber = version.version_number;
  } catch {
    // No plan yet
  }

  return (
    <PlanViewClient
      goal={goal}
      milestones={milestones}
      versionSummary={versionSummary}
      versionNumber={versionNumber}
    />
  );
}
