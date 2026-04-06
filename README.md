# Kai Skills Library

A portable skill library that works with **Kai**, **Claude Desktop**, **ChatGPT**, and any MCP-compatible AI assistant.

## Quick Start

### One-Line Install

```bash
# Install into Kai
npx kai-skills install browser

# Add to Claude Desktop
npx kai-skills install browser --target=mcp

# Install all skills
npx kai-skills install --all
```

## Available Skills

| Skill | Description | Kai | MCP | Standalone |
|-------|-------------|-----|-----|------------|
| **git** | Smart commits, PR workflows, branch management | ✅ | ✅ | ✅ |
| **docker** | Container management, compose operations | ✅ | ✅ | ✅ |
| **browser** | Web browsing with Playwright | ✅ | ✅ | ✅ |
| **email** | Send/read emails via SMTP/IMAP | ✅ | ✅ | ✅ |
| **database** | Migrations, queries, schema inspection | ✅ | ✅ | ✅ |

## How It Works

### 1. Skill Structure

Each skill is a self-contained package:

```
skills/git/
├── skill.yaml      # Manifest with tools and schema
├── handler.js      # Implementation (ESM)
├── package.json    # Dependencies (if any)
└── README.md       # Documentation
```

### 2. Dual-Mode Compatibility

Skills work in multiple contexts:

**Kai Mode** (injected config):
```javascript
// Kai loads skill and injects config
await skill.install({ SMTP_HOST: "smtp.gmail.com" });
await skill.actions.send({ to: "user@example.com" });
```

**MCP Mode** (stdio server):
```bash
# Claude Desktop spawns skill as MCP server
npx kai-skill-mcp ./skills/email
```

**Standalone Mode** (direct import):
```javascript
import emailSkill from "@kai-skills/email";
await emailSkill.actions.send({ to: "user@example.com" });
```

### 3. Configuration

Skills read config from (in order):
1. Direct injection (`install(config)`)
2. Environment variables
3. Default values from schema

```yaml
# skill.yaml
config_schema:
  SMTP_HOST:
    type: string
    env: SMTP_HOST  # Read from env
    required: true
  SMTP_PORT:
    type: number
    default: 587    # Default value
```

## Architecture

```
kai-skills/
├── packages/
│   ├── core/          # Shared types & utilities
│   ├── mcp-adapter/   # MCP protocol wrapper
│   └── cli/           # One-click installer
├── skills/            # Individual skill packages
│   ├── git/
│   ├── docker/
│   └── ...
└── registry/          # Skill registry (JSON)
```

### Packages

#### `@kai-skills/core`
Core types and utilities:
- `SkillManifest` - Skill metadata and tool definitions
- `SkillHandler` - Action implementations
- `loadConfig()` - Environment-agnostic config loader
- Result utilities (`text()`, `image()`, `error()`)

#### `@kai-skills/mcp-adapter`
Converts Kai skills to MCP servers:
- `createMcpServer()` - Wrap skill as MCP server
- `startMcpServer()` - Start with stdio transport
- CLI: `kai-skill-mcp <skill-path>`

#### `@kai-skills/cli`
One-click installer:
- `kai-skills install <skill>`
- `kai-skills list`
- `kai-skills uninstall <skill>`

## Creating a New Skill

### 1. Use the Template

```bash
npm run new-skill my-skill
```

### 2. Define Tools (skill.yaml)

```yaml
id: my-skill
name: My Skill
version: 1.0.0
description: Does something useful
author: You

tools:
  - name: do_something
    description: Performs an action
    parameters:
      input:
        type: string
        description: Input value
        required: true
      count:
        type: number
        description: How many times
        default: 1
```

### 3. Implement Handler (handler.js)

```javascript
export default {
  actions: {
    do_something: async (params) => {
      const { input, count = 1 } = params;
      const result = input.repeat(count);
      return { content: result };
    }
  }
};
```

### 4. Test Locally

```bash
# Test with Kai
cp -r my-skill ~/.kai/skills/
kai

# Test as MCP server
npx kai-skill-mcp ./my-skill
```

### 5. Publish

Submit a PR to add your skill to the registry.

## Skill Registry

The registry is a JSON file hosted on GitHub:

```json
{
  "skills": [
    {
      "id": "git",
      "name": "Git",
      "version": "1.0.0",
      "downloadUrl": "https://github.com/kai-skills/skills/releases/download/v1.0.0/git.tar.gz"
    }
  ]
}
```

CLI reads from this to discover available skills.

## Roadmap

- [x] Core packages and types
- [x] MCP adapter
- [x] CLI installer
- [x] Git skill (reference implementation)
- [x] Docker skill (reference implementation)
- [ ] Browser skill (needs Playwright dep management)
- [ ] Email skill (needs Nodemailer dep management)
- [ ] Database skill (needs glob dep)
- [ ] Web-based skill marketplace
- [ ] Skill versioning and auto-updates
- [ ] VS Code extension for skill development

## Contributing

1. Fork the repository
2. Create a new skill or improve existing
3. Add tests and documentation
4. Submit a PR

See `CONTRIBUTING.md` for details.

## License

MIT
