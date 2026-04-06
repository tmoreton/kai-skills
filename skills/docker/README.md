# Docker Skill

Docker container management for AI assistants. Works with **Claude Desktop** (the chat app) via MCP, or with Kai.

**Not for Claude Code** — if you're using the `claude` CLI tool, use [claude-skills](https://github.com/alirezarezvani/claude-skills) instead.

## Claude Desktop Installation

**Step 1:** Install the MCP adapter globally:
```bash
npm install -g @kai-skills/mcp-adapter
```

**Step 2:** Edit Claude Desktop config:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Step 3:** Add the Docker skill:

```json
{
  "mcpServers": {
    "docker": {
      "command": "npx",
      "args": ["-y", "kai-skill-mcp", "/path/to/kai-skills/skills/docker"]
    }
  }
}
```

**Step 4:** Restart Claude Desktop. The skill is ready to use.

## Requirements

- Docker CLI installed
- docker-compose (v1) or `docker compose` (v2)

## Tools

| Tool | Description |
|------|-------------|
| `docker_build` | Build Docker image with intelligent tagging |
| `docker_run` | Run Docker container with smart defaults |
| `docker_compose_up` | Start services with docker-compose |
| `docker_compose_down` | Stop and remove docker-compose services |
| `docker_logs` | View container logs with filtering |
| `docker_status` | Show running containers and resource usage |

## Example Usage (in Claude Desktop)

Just ask Claude naturally:
- "Build this Docker image"
- "Start my Docker containers"
- "Show me the container logs"
- "What containers are running?"

## Configuration

No configuration required. Automatically detects docker compose v1 vs v2.

## Programmatic Usage

```javascript
// Build and push image
const result = await dockerSkill.actions.docker_build({
  tag: "myapp:v1",
  push: true
});

// Run container
const container = await dockerSkill.actions.docker_run({
  image: "myapp:v1",
  ports: ["3000:3000"],
  env: { NODE_ENV: "production" }
});

// Start compose services
await dockerSkill.actions.docker_compose_up({ build: true });
```
