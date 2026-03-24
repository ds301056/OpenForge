import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { listPlanVersions, listDecisionLogs } from "@/lib/db/queries";

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
    const [versions, decisions] = await Promise.all([
      listPlanVersions(db, goalId),
      listDecisionLogs(db, goalId),
    ]);
    return NextResponse.json({ versions, decisions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
