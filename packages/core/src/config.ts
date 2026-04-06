/**
 * Configuration utilities for skills
 * 
 * Loads config from environment variables based on schema.
 * Supports both Kai-style injection and standalone env var usage.
 */

import type { SkillConfigField } from "./types.js";

/**
 * Load configuration based on schema
 * 
 * Checks in order:
 * 1. Provided input config (for Kai injection)
 * 2. Environment variable (field.env or key name)
 * 3. Default value from schema
 */
export function loadConfig(
  schema: Record<string, SkillConfigField>,
  options: {
    input?: Record<string, any>;
    env?: Record<string, string | undefined>;
    prefix?: string;
  } = {}
): Record<string, any> {
  const config: Record<string, any> = {};
  const env = options.env || process.env;
  const input = options.input || {};
  const prefix = options.prefix || "";

  for (const [key, field] of Object.entries(schema)) {
    const envKeys = [
      input[key] !== undefined ? key : null,
      field.env ? env[field.env] !== undefined ? field.env : null : null,
      env[key] !== undefined ? key : null,
      prefix ? (env[`${prefix}${key}`] !== undefined ? `${prefix}${key}` : null) : null,
    ].filter(Boolean) as string[];

    // Find first available value
    let value: any = undefined;
    for (const envKey of envKeys) {
      if (input[envKey] !== undefined) {
        value = input[envKey];
        break;
      }
      if (env[envKey] !== undefined) {
        value = parseValue(env[envKey]!, field.type);
        break;
      }
    }

    // Use default if no value found
    if (value === undefined && field.default !== undefined) {
      value = field.default;
    }

    config[key] = value;
  }

  return config;
}

/**
 * Validate that required config fields are present
 */
export function validateConfig(
  config: Record<string, any>,
  schema: Record<string, SkillConfigField>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const [key, field] of Object.entries(schema)) {
    if (field.required && config[key] === undefined) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Parse a string value to the appropriate type
 */
function parseValue(value: string, type: string): any {
  switch (type) {
    case "number":
      const num = Number(value);
      return isNaN(num) ? value : num;
    case "boolean":
      return value === "true" || value === "1" || value === "yes";
    case "array":
      return value.split(",").map(s => s.trim());
    default:
      return value;
  }
}
