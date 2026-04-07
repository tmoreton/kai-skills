# kai-mcp

Quickly connect Kai skills to Claude Desktop or Claude Code.

**No Kai CLI required.** Just Node.js and Claude.

## Install

```bash
npm install -g kai-mcp
```

## Quick Start

```bash
# 1. Install Kai skills (one-time)
kai-mcp install

# 2. Add all skills to Claude
kai-mcp add all

# 3. Restart Claude Desktop - done!
```

## Commands

| Command | Description |
|---------|-------------|
| `kai-mcp` | List installed skills with ready-to-copy MCP commands |
| `kai-mcp add <skill>` | Add a specific skill to Claude |
| `kai-mcp add all` | Add ALL skills to Claude |
| `kai-mcp remove <skill>` | Remove a skill from Claude |
| `kai-mcp install` | Install Kai skills from GitHub |

## Example

```bash
# See available skills
kai-mcp

# Add YouTube skill
kai-mcp add youtube

# Add everything
kai-mcp add all

# Test in Claude:
# "Get my YouTube stats for channel UCBa659QWEk1AI4Tg--mrJ2A"
```

## What is Kai?

Kai is a portable skill system that works with multiple AI assistants. Skills are simple JavaScript files that expose actions Claude can call.

Learn more: https://github.com/tmoreton/kai-skills

## License

MIT
