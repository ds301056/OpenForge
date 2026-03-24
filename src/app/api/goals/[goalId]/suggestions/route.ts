import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { listSuggestions } from "@/lib/db/queries";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await params;
  const db = getServiceClient();
  const status = request.nextUrl.searchParams.get("status") ?? undefined;

  try {
    const suggestions = await listSuggestions(db, goalId, status);
    return NextResponse.json(suggestions);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
