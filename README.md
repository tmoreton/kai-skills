# Kai Skills Library

A portable skill library that works with **Kai**, **Claude Desktop**, **ChatGPT**, and any MCP-compatible AI assistant.

**Distribution Format:** All skills are **pre-compiled to plain JavaScript** — no build step needed. Just install and use.

## Quick Start: Social Media Dashboard

Build a cross-platform analytics dashboard in 5 minutes:

```bash
# 1. Clone the repo
git clone https://github.com/kai-skills/kai-skills.git
cd kai-skills

# 2. Edit Claude Desktop config
# Mac: ~/Library/Application Support/Claude/claude_desktop_config.json
# Windows: %APPDATA%\Claude\claude_desktop_config.json
```

Add YouTube + Twitter skills:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "kai-skill-mcp", "/path/to/kai-skills/skills/youtube"],
      "env": { "YOUTUBE_API_KEY": "your-youtube-api-key" }
    },
    "twitter": {
      "command": "npx",
      "args": ["-y", "kai-skill-mcp", "/path/to/kai-skills/skills/twitter"],
      "env": { 
        "TAVILY_API_KEY": "your-tavily-key",
        "X_API_KEY": "your-x-api-key"
      }
    }
  }
}
```

**Restart Claude Desktop**, then ask:

> "Show me a dashboard comparing my YouTube and Twitter performance this week"

Claude will pull stats from both platforms and create a unified view.

---

## IMPORTANT: These Are MCP Server Skills (Not Claude Code Skills)

These skills are **MCP servers** for **Claude Desktop** (the Mac/Windows chat app), NOT for Claude Code (the CLI coding agent).

- **Claude Desktop** = Chat app with tool support ← **These skills work here**
- **Claude Code** = CLI coding agent (`claude` command in terminal) ← Uses different skill format

If you're looking for Claude Code skills (markdown instructions for the CLI agent), check out [claude-skills](https://github.com/alirezarezvani/claude-skills) instead.

---

## Claude Desktop Installation (Step by Step)

### Step 1: Install the MCP adapter

```bash
npm install -g @kai-skills/mcp-adapter
```

### Step 2: Download skills

```bash
# Clone the repo
git clone https://github.com/kai-skills/kai-skills.git

# Or install via CLI
npx kai-skills install youtube
npx kai-skills install twitter
```

### Step 3: Add to Claude Desktop Config

Edit your Claude Desktop config file:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add each skill as an MCP server:

```json
{
  "mcpServers": {
    "git": {
      "command": "npx",
      "args": ["-y", "kai-skill-mcp", "/path/to/skills/git"]
    },
    "youtube": {
      "command": "npx",
      "args": ["-y", "kai-skill-mcp", "/path/to/skills/youtube"],
      "env": { "YOUTUBE_API_KEY": "..." }
    },
    "twitter": {
      "command": "npx",
      "args": ["-y", "kai-skill-mcp", "/path/to/skills/twitter"],
      "env": { "TAVILY_API_KEY": "..." }
    }
  }
}
```

**Restart Claude Desktop** — skills appear as tools Claude can use.

---

## Quick Start (Kai Users)

### One-Line Install

```bash
# Install into Kai
npx kai-skills install youtube
npx kai-skills install twitter

# Install all skills
npx kai-skills install --all
```

---

## Available Skills

### Social Media & Analytics

| Skill | Description | Config Required |
|-------|-------------|-----------------|
| **youtube** | YouTube analytics — channel stats, video metrics, comments, reports | `YOUTUBE_API_KEY` |
| **twitter** | Twitter/X — research + posting, sentiment tracking, analytics | `TAVILY_API_KEY`, X OAuth |

### Development & DevOps

| Skill | Description | Config Required |
|-------|-------------|-----------------|
| **git** | Smart commits, PR workflows, branch management | None |
| **docker** | Container management, compose operations | None |
| **browser** | Web browsing with Playwright | None |
| **database** | Migrations, queries, schema inspection | `DATABASE_URL` |

### Productivity & Communication

| Skill | Description | Config Required |
|-------|-------------|-----------------|
| **notion** | Query databases, create pages, search content | `NOTION_API_KEY` |
| **email** | Send/read emails via SMTP/IMAP | `SMTP_HOST`, `SMTP_USER` |
| **web-tools** | Web fetch and Tavily search | `TAVILY_API_KEY` |
| **data-storage** | Read/write JSON, Markdown, text files | None |

All skills work with **Kai**, **Claude Desktop (MCP)**, and **Standalone** usage.

### NPM Dependencies (Optional)

Some skills benefit from npm packages for enhanced functionality:

```bash
# For Browser skill (if you want to run Playwright)
cd ~/.kai/skills/browser && npm install playwright

# For Database skill (already included in most Node projects)
cd ~/.kai/skills/database && npm install glob

# For Email skill (for SMTP/IMAP functionality)
cd ~/.kai/skills/email && npm install nodemailer

# Or install globally in Kai's directory
cd /path/to/kai && npm install playwright glob nodemailer
```

Skills **work without these** — they'll throw clear error messages telling users exactly what to install if a specific feature needs it.

---

## How It Works

### 1. Skill Structure

Each skill is a self-contained package:

```
skills/youtube/
├── skill.yaml      # Manifest with tools and schema
├── handler.js      # Implementation (ESM)
├── package.json    # Dependencies (if any)
└── README.md       # Documentation
```

### 2. Dual-Mode Compatibility

**Kai Mode** (injected config):
```javascript
// Kai loads skill and injects config
await skill.install({ YOUTUBE_API_KEY: "..." });
await skill.actions.get_channel({ channel_id: "..." });
```

**MCP Mode** (stdio server for Claude):
```bash
# Claude Desktop spawns skill as MCP server
npx kai-skill-mcp ./skills/youtube
```

**Standalone Mode** (direct import):
```javascript
import youtubeSkill from "@kai-skills/youtube";
await youtubeSkill.actions.get_channel({ channel_id: "..." });
```

### 3. Configuration

Skills read config from (in order):
1. Claude Desktop config JSON (for MCP mode)
2. Kai's environment/config
3. Default values from schema

```yaml
# skill.yaml
config_schema:
  YOUTUBE_API_KEY:
    type: string
    env: YOUTUBE_API_KEY
    required: true
```

---

## Architecture

```
kai-skills/
├── packages/
│   ├── core/          # Shared types & utilities
│   ├── mcp-adapter/   # MCP protocol wrapper
│   └── cli/           # One-click installer
├── skills/            # Individual skill packages
│   ├── youtube/       # YouTube Analytics
│   ├── twitter/       # Twitter/X
│   ├── git/
│   ├── docker/
│   └── ...
└── registry/          # Skill registry (JSON)
```

### Packages

#### `@kai-skills/core`
Core types and utilities for skill development.

#### `@kai-skills/mcp-adapter`
Converts Kai skills to MCP servers for Claude Desktop.

#### `@kai-skills/cli`
One-click installer: `npx kai-skills install <skill>`

---

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
```

### 3. Implement Handler (handler.js)

```javascript
export default {
  actions: {
    do_something: async (params) => {
      const { input } = params;
      const result = await someOperation(input);
      return { content: JSON.stringify(result) };
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

---

## Roadmap

- [x] Core packages and types
- [x] MCP adapter
- [x] CLI installer
- [x] Git, Docker, Browser skills
- [x] YouTube, Twitter/X skills (social media analytics)
- [x] Notion, Email, Database, Web Tools, Data Storage skills
- [ ] Instagram, LinkedIn, Facebook skills
- [ ] Cross-platform analytics dashboard skill
- [ ] Web-based skill marketplace
- [ ] Skill versioning and auto-updates
- [ ] VS Code extension for skill development

---

## Contributing

1. Fork the repository
2. Create a new skill or improve existing
3. Add tests and documentation
4. Submit a PR

See `CONTRIBUTING.md` for details.

## License

MIT
