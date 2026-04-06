# Docker Skill

Docker container management for AI assistants. Works with Kai, Claude Desktop, or any MCP-compatible client.

## Installation

### Via Kai CLI
```bash
kai skills install docker
```

### Via Standalone CLI
```bash
npx kai-skills install docker --target=kai
```

### For Claude Desktop (MCP)
```bash
npx kai-skills install docker --target=mcp
```

## Tools

- `docker_build` - Build Docker image with intelligent tagging
- `docker_run` - Run Docker container with smart defaults
- `docker_compose_up` - Start services with docker-compose
- `docker_compose_down` - Stop and remove docker-compose services
- `docker_logs` - View container logs with filtering
- `docker_status` - Show running containers and resource usage

## Configuration

No configuration required. Automatically detects docker compose v1 vs v2.

## Requirements

- Docker CLI
- docker-compose (v1) or docker compose (v2)

## Example Usage

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
