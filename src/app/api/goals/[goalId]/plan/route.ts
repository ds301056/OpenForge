import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLatestPlanVersion, getFullPlan } from "@/lib/db/queries";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await params;
  const db = getServiceClient();

  try {
    const version = await getLatestPlanVersion(db, goalId);
    const milestones = await getFullPlan(db, version.id);
    return NextResponse.json({ version, milestones });
  } catch {
    return NextResponse.json(
      { error: "No plan found for this goal" },
      { status: 404 }
    );
  }
}
