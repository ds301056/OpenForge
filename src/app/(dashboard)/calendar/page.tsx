import { createClient } from "@supabase/supabase-js";
import { CalendarClient } from "./calendar-client";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

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

export default async function CalendarPage() {
  const db = getServiceClient();

  // Fetch all tasks from active goals with milestone dates
  const { data: milestones } = await db.from("milestones").select(`
    id, title, target_date, status,
    plan_versions!inner (
      id,
      goals!inner (
        id, title, status
      )
    ),
    tasks (
      id, title, status, priority, effort_estimate, sort_order
    )
  `);

  const tasks: CalendarTask[] = [];

  for (const m of milestones ?? []) {
    const pv = m.plan_versions as unknown as Record<string, unknown>;
    const goal = pv?.goals as unknown as Record<string, unknown>;
    if (goal?.status !== "active") continue;

    for (const t of (m.tasks as Array<Record<string, unknown>>) ?? []) {
      tasks.push({
        id: String(t.id),
        title: String(t.title),
        status: String(t.status),
        priority: String(t.priority),
        effort_estimate: t.effort_estimate ? String(t.effort_estimate) : null,
        milestone_title: m.title,
        goal_title: String(goal.title),
        goal_id: String(goal.id),
        target_date: m.target_date,
      });
    }
  }

  return <CalendarClient tasks={tasks} />;
}
