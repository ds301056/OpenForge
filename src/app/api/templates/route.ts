import { NextResponse } from "next/server";
import { listTemplates, getTemplateConfig } from "@/lib/templates/registry";

export async function GET() {
  const templates = listTemplates().map((t) => ({
    name: t.name,
    slug: t.slug,
    description: t.description,
    config: getTemplateConfig(t.slug),
  }));

  return NextResponse.json(templates);
}
