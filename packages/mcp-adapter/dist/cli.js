#!/usr/bin/env node
/**
 * CLI entry point for running a Kai skill as an MCP server
 *
 * Usage: kai-skill-mcp <skill-path>
 * Example: kai-skill-mcp ./skills/git
 */
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { parseArgs } from "util";
import YAML from "yaml";
import { startMcpServer } from "./index.js";
const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
        help: { type: "boolean", short: "h" },
        config: { type: "string", short: "c" },
    },
    allowPositionals: true,
});
if (values.help || positionals.length === 0) {
    console.log(`
kai-skill-mcp - Run a Kai skill as an MCP server

Usage:
  kai-skill-mcp <skill-path>

Options:
  -h, --help       Show this help
  -c, --config     Path to config JSON file

Examples:
  kai-skill-mcp ./skills/git
  kai-skill-mcp ./skills/email --config ./email-config.json
`);
    process.exit(0);
}
const skillPath = positionals[0];
async function main() {
    // Load manifest
    const manifestPath = `${skillPath}/skill.yaml`;
    const manifest = YAML.parse(readFileSync(manifestPath, "utf-8"));
    // Load config if provided
    let config = {};
    if (values.config) {
        config = JSON.parse(readFileSync(values.config, "utf-8"));
    }
    // Import handler
    const handlerModule = await import(pathToFileURL(`${skillPath}/handler.js`).href);
    const handler = handlerModule.default || handlerModule;
    // Run install hook if present
    if (handler.install) {
        await handler.install(config);
    }
    // Start MCP server
    await startMcpServer(manifest, handler);
}
main().catch((err) => {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
});
