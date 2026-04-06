import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { SkillManifest, SkillHandler } from "../../core/dist/types.js";

/**
 * Convert Kai skill parameters to JSON Schema
 */
function convertParamsToJsonSchema(
  parameters: Record<string, { type: string; description?: string; enum?: string[]; required?: boolean }>
): { type: "object"; properties: Record<string, any>; required?: string[] } {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [name, param] of Object.entries(parameters)) {
    properties[name] = {
      type: param.type,
      description: param.description,
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

/**
 * Create MCP tools from skill manifest
 */
function createMcpTools(manifest: SkillManifest): Tool[] {
  return manifest.tools.map((tool) => ({
    name: tool.name,
    description: `[${manifest.name}] ${tool.description}`,
    inputSchema: convertParamsToJsonSchema(tool.parameters),
  }));
}

/**
 * Create an MCP server from a Kai skill
 */
export function createMcpServer(
  manifest: SkillManifest,
  handler: SkillHandler
): Server {
  const server = new Server({
    name: manifest.id,
    version: manifest.version,
  });

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: createMcpTools(manifest),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const action = handler.actions[name];
    if (!action) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: `Tool "${name}" not found in skill "${manifest.id}"`,
            }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await action(args || {});

      // Handle different result formats
      if (typeof result === "string") {
        return {
          content: [{ type: "text", text: result }],
        };
      }

      if (result && typeof result === "object") {
        // Check if it's already an MCP-formatted result
        if (result.content && Array.isArray(result.content)) {
          return result;
        }

        // Check for image results
        if (result.type === "image" && result.data) {
          return {
            content: [
              {
                type: "image",
                data: result.data,
                mimeType: result.mimeType || "image/png",
              },
            ],
          };
        }

        // Default: JSON stringify
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: String(result) }],
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: errorMessage }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start an MCP server with stdio transport
 */
export async function startMcpServer(
  manifest: SkillManifest,
  handler: SkillHandler
): Promise<void> {
  const server = createMcpServer(manifest, handler);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
