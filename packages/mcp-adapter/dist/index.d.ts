import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { SkillManifest, SkillHandler } from "../../core/dist/types.js";
/**
 * Create an MCP server from a Kai skill
 */
export declare function createMcpServer(manifest: SkillManifest, handler: SkillHandler): Server;
/**
 * Start an MCP server with stdio transport
 */
export declare function startMcpServer(manifest: SkillManifest, handler: SkillHandler): Promise<void>;
