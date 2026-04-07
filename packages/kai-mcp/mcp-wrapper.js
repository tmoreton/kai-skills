#!/usr/bin/env node
/**
 * MCP Wrapper for Kai Skills
 * 
 * Converts any Kai skill handler into an MCP server.
 * Usage: node mcp-wrapper.js /path/to/skill
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { pathToFileURL } from "url";
import YAML from "yaml";

const skillPath = process.argv[2];

if (!skillPath) {
  console.error("Usage: node mcp-wrapper.js /path/to/skill");
  process.exit(1);
}

const skillDir = resolve(skillPath);
const handlerPath = join(skillDir, "handler.js");
const yamlPath = join(skillDir, "skill.yaml");

// Load skill manifest
let manifest;
try {
  const yamlContent = readFileSync(yamlPath, "utf-8");
  manifest = YAML.parse(yamlContent);
} catch (e) {
  console.error(`Failed to load skill.yaml from ${skillDir}:`, e.message);
  process.exit(1);
}

// Convert skill parameters to JSON Schema
function convertParamsToJsonSchema(parameters = {}) {
  const properties = {};
  const required = [];

  for (const [name, param] of Object.entries(parameters)) {
    properties[name] = {
      type: param.type || "string",
      description: param.description || "",
    };
    if (param.enum) {
      properties[name].enum = param.enum;
    }
    if (param.required) {
      required.push(name);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

// Create MCP tools from manifest
const tools = manifest.tools?.map((tool) => ({
  name: tool.name,
  description: `[${manifest.name}] ${tool.description}`,
  inputSchema: convertParamsToJsonSchema(tool.parameters),
})) || [];

// Load handler module
async function loadHandler() {
  try {
    const handlerUrl = pathToFileURL(handlerPath).href;
    const module = await import(handlerUrl);
    return module.default || module;
  } catch (e) {
    console.error(`Failed to load handler from ${handlerPath}:`, e.message);
    process.exit(1);
  }
}

function formatResult(result) {
  if (typeof result === "string") {
    return { content: [{ type: "text", text: result }] };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

// Start server
async function main() {
  // Load handler first
  const handler = await loadHandler();

  // Create MCP server with capabilities declared
  const server = new Server(
    {
      name: manifest.id || "kai-skill",
      version: manifest.version || "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Find the tool definition
    const toolDef = manifest.tools?.find((t) => t.name === name);
    if (!toolDef) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: `Tool "${name}" not found` }) }],
        isError: true,
      };
    }

    try {
      // Check if handler has the action
      let action = handler[name];
      
      // If not at top level, check in actions property (Kai skill format)
      if (!action && handler.actions) {
        action = handler.actions[name];
      }
      
      // Try direct function call
      if (!action) {
        if (handler && typeof handler === "function") {
          const result = await handler({ action: name, ...args });
          return formatResult(result);
        }
        
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Action "${name}" not implemented` }) }],
          isError: true,
        };
      }

      const result = await action(args);
      return formatResult(result);
    } catch (e) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: e.message }) }],
        isError: true,
      };
    }
  });

  // Start transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("Server error:", e);
  process.exit(1);
});
