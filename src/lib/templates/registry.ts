import type { DomainTemplate } from "./types";
import { learningPlanTemplate } from "./learning-plan";

const templates: Record<string, DomainTemplate> = {
  "learning-plan": learningPlanTemplate,
};

export function getTemplate(slug: string): DomainTemplate | undefined {
  return templates[slug];
}

export function getDefaultTemplate(): DomainTemplate {
  return learningPlanTemplate;
}

export function listTemplates(): DomainTemplate[] {
  return Object.values(templates);
}
