import type { DomainTemplate } from "./types";
import type { TemplateConfig } from "./config";
import { compile, mergeConfigs } from "./compiler";
import { learningPlanTemplate } from "./learning-plan";

// Import JSON configs
import learningPlanConfig from "./configs/learning-plan.json";

// ---------------------------------------------------------------------------
// Registry: manages both shipped (coded) and JSON-based templates
// ---------------------------------------------------------------------------

const shippedTemplates: Record<string, DomainTemplate> = {
  "learning-plan": learningPlanTemplate,
};

const configStore: Record<string, TemplateConfig> = {
  "learning-plan": learningPlanConfig as TemplateConfig,
};

const customTemplates: Record<string, DomainTemplate> = {};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a template by slug. Checks custom templates first, then shipped.
 */
export function getTemplate(slug: string): DomainTemplate | undefined {
  return customTemplates[slug] ?? shippedTemplates[slug];
}

/**
 * Get the default template (learning-plan).
 */
export function getDefaultTemplate(): DomainTemplate {
  return learningPlanTemplate;
}

/**
 * List all available templates (shipped + custom).
 */
export function listTemplates(): DomainTemplate[] {
  const all = { ...shippedTemplates, ...customTemplates };
  return Object.values(all);
}

/**
 * Get the JSON config for a template. Used for export/decompile.
 */
export function getTemplateConfig(slug: string): TemplateConfig | undefined {
  return configStore[slug];
}

/**
 * Register a custom template from a JSON config.
 * If the config has "extends", it merges with the base template config.
 */
export function registerTemplate(config: TemplateConfig): DomainTemplate {
  let resolvedConfig = config;

  if (config.extends) {
    const baseConfig = configStore[config.extends];
    if (!baseConfig) {
      throw new Error(
        `Base template "${config.extends}" not found for "${config.slug}"`
      );
    }
    resolvedConfig = mergeConfigs(baseConfig, config);
  }

  const template = compile(resolvedConfig);
  customTemplates[template.slug] = template;
  configStore[template.slug] = resolvedConfig;
  return template;
}

/**
 * Register a template from a raw JSON string (e.g., user-uploaded file).
 */
export function registerTemplateFromJSON(json: string): DomainTemplate {
  const config = JSON.parse(json) as TemplateConfig;
  return registerTemplate(config);
}

/**
 * Remove a custom template. Cannot remove shipped templates.
 */
export function unregisterTemplate(slug: string): boolean {
  if (slug in shippedTemplates) {
    return false; // can't remove shipped templates
  }
  delete customTemplates[slug];
  delete configStore[slug];
  return true;
}
