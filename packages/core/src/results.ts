/**
 * Result utilities for skill actions
 * 
 * Standardizes return formats for different consumers (Kai, MCP, etc.)
 */

export interface TextResult {
  type: "text";
  text: string;
}

export interface ImageResult {
  type: "image";
  data: string; // base64
  mimeType: string;
}

export interface ErrorResult {
  type: "error";
  error: string;
  code?: string;
}

export type SkillResult = TextResult | ImageResult | ErrorResult;

/**
 * Create a text result
 */
export function text(content: string): TextResult {
  return { type: "text", text: content };
}

/**
 * Create an error result
 */
export function error(message: string, code?: string): ErrorResult {
  return { type: "error", error: message, code };
}

/**
 * Create an image result from a buffer
 */
export function image(buffer: Buffer, mimeType = "image/png"): ImageResult {
  return {
    type: "image",
    data: buffer.toString("base64"),
    mimeType,
  };
}

/**
 * Format any value as a text result (JSON stringified)
 */
export function json(data: any): TextResult {
  return text(JSON.stringify(data, null, 2));
}
