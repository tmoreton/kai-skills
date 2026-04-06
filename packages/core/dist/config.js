/**
 * Configuration utilities for skills
 *
 * Loads config from environment variables based on schema.
 * Supports both Kai-style injection and standalone env var usage.
 */
/**
 * Load configuration based on schema
 *
 * Checks in order:
 * 1. Provided input config (for Kai injection)
 * 2. Environment variable (field.env or key name)
 * 3. Default value from schema
 */
export function loadConfig(schema, options = {}) {
    const config = {};
    const env = options.env || process.env;
    const input = options.input || {};
    const prefix = options.prefix || "";
    for (const [key, field] of Object.entries(schema)) {
        const envKeys = [
            input[key] !== undefined ? key : null,
            field.env ? env[field.env] !== undefined ? field.env : null : null,
            env[key] !== undefined ? key : null,
            prefix ? (env[`${prefix}${key}`] !== undefined ? `${prefix}${key}` : null) : null,
        ].filter(Boolean);
        // Find first available value
        let value = undefined;
        for (const envKey of envKeys) {
            if (input[envKey] !== undefined) {
                value = input[envKey];
                break;
            }
            if (env[envKey] !== undefined) {
                value = parseValue(env[envKey], field.type);
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
export function validateConfig(config, schema) {
    const missing = [];
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
function parseValue(value, type) {
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
