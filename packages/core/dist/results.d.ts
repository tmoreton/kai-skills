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
    data: string;
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
export declare function text(content: string): TextResult;
/**
 * Create an error result
 */
export declare function error(message: string, code?: string): ErrorResult;
/**
 * Create an image result from a buffer
 */
export declare function image(buffer: Buffer, mimeType?: string): ImageResult;
/**
 * Format any value as a text result (JSON stringified)
 */
export declare function json(data: any): TextResult;
