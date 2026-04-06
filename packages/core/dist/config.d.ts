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
export declare function loadConfig(schema: Record<string, SkillConfigField>, options?: {
    input?: Record<string, any>;
    env?: Record<string, string | undefined>;
    prefix?: string;
}): Record<string, any>;
/**
 * Validate that required config fields are present
 */
export declare function validateConfig(config: Record<string, any>, schema: Record<string, SkillConfigField>): {
    valid: boolean;
    missing: string[];
};
