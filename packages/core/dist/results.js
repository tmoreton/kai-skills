/**
 * Result utilities for skill actions
 *
 * Standardizes return formats for different consumers (Kai, MCP, etc.)
 */
/**
 * Create a text result
 */
export function text(content) {
    return { type: "text", text: content };
}
/**
 * Create an error result
 */
export function error(message, code) {
    return { type: "error", error: message, code };
}
/**
 * Create an image result from a buffer
 */
export function image(buffer, mimeType = "image/png") {
    return {
        type: "image",
        data: buffer.toString("base64"),
        mimeType,
    };
}
/**
 * Format any value as a text result (JSON stringified)
 */
export function json(data) {
    return text(JSON.stringify(data, null, 2));
}
