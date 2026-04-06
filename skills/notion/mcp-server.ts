#!/usr/bin/env node
/**
 * Notion MCP Server
 * 
 * Runs the Notion skill as a Model Context Protocol server for Claude Desktop
 * 
 * Usage: node mcp-server.js
 * Requires: NOTION_API_KEY environment variable
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import notionSkill from "./handler.js";

const CONFIG = {
  apiKey: process.env.NOTION_API_KEY || "",
  version: process.env.NOTION_VERSION || "2022-06-28",
};

if (!CONFIG.apiKey) {
  console.error("ERROR: NOTION_API_KEY environment variable is required");
  console.error("Get your API key at: https://www.notion.so/my-integrations");
  process.exit(1);
}

// Initialize the skill
await notionSkill.install({
  NOTION_API_KEY: CONFIG.apiKey,
  NOTION_VERSION: CONFIG.version,
});

// Define tools based on skill.yaml
const tools: Tool[] = [
  {
    name: "search",
    description: "[Skill: Notion] Search pages and databases in Notion",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query text" },
        filter: { type: "string", enum: ["page", "database", "object"], description: "Filter by type" },
        page_size: { type: "number", description: "Number of results (max 100)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_page",
    description: "[Skill: Notion] Get a page by ID with its properties",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "Notion page ID" },
      },
      required: ["page_id"],
    },
  },
  {
    name: "get_page_content",
    description: "[Skill: Notion] Get the block content of a page",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "Notion page ID" },
        page_size: { type: "number", description: "Max blocks to return" },
      },
      required: ["page_id"],
    },
  },
  {
    name: "create_page",
    description: "[Skill: Notion] Create a new page in a database or as a child page",
    inputSchema: {
      type: "object",
      properties: {
        parent: { type: "string", description: "Parent database ID or page ID" },
        title: { type: "string", description: "Page title" },
        properties: { type: "object", description: "Database properties" },
        content: { type: "array", description: "Block content to add" },
      },
      required: ["parent", "title"],
    },
  },
  {
    name: "update_page",
    description: "[Skill: Notion] Update page properties",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "Page ID to update" },
        properties: { type: "object", description: "Properties to update" },
      },
      required: ["page_id", "properties"],
    },
  },
  {
    name: "query_database",
    description: "[Skill: Notion] Query a database with filters and sorts",
    inputSchema: {
      type: "object",
      properties: {
        database_id: { type: "string", description: "Database ID to query" },
        filter: { type: "object", description: "Filter object" },
        sorts: { type: "array", description: "Sort objects" },
        page_size: { type: "number", description: "Number of results" },
      },
      required: ["database_id"],
    },
  },
  {
    name: "get_database",
    description: "[Skill: Notion] Get database schema and properties",
    inputSchema: {
      type: "object",
      properties: {
        database_id: { type: "string", description: "Database ID" },
      },
      required: ["database_id"],
    },
  },
  {
    name: "append_blocks",
    description: "[Skill: Notion] Append blocks to a page or block",
    inputSchema: {
      type: "object",
      properties: {
        block_id: { type: "string", description: "Page ID or block ID to append to" },
        blocks: { type: "array", description: "Array of block objects" },
      },
      required: ["block_id", "blocks"],
    },
  },
  {
    name: "delete_block",
    description: "[Skill: Notion] Delete a block",
    inputSchema: {
      type: "object",
      properties: {
        block_id: { type: "string", description: "Block ID to delete" },
      },
      required: ["block_id"],
    },
  },
];

// Create MCP server
const server = new Server(
  { name: "notion", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const action = notionSkill.actions[name];
    if (!action) {
      return {
        content: [{ type: "text", text: `Tool "${name}" not found` }],
        isError: true,
      };
    }

    const result = await action(args);
    
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Notion MCP server running on stdio");
