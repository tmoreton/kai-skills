# kai-mcp-helper

Quickly connect Kai skills to Claude Desktop or Claude Code.

**No Kai CLI required.** Just Node.js and Claude.

## Install

```bash
# Option 1: From npm (when published)
npm install -g kai-skills-cli

# Option 2: From GitHub (current)
git clone https://github.com/tmoreton/kai-skills.git
cd kai-skills/packages/kai-mcp
npm link
```

## Quick Start

```bash
# 1. Install Kai skills (one-time)
kai-skills install

# 2. Add all skills to Claude
kai-skills add all

# 3. Restart Claude Desktop - done!
```

## Commands

| Command | Description |
|---------|-------------|
| `kai-skills` | List installed skills with ready-to-copy MCP commands |
| `kai-skills add <skill>` | Add a specific skill to Claude |
| `kai-skills add all` | Add ALL skills to Claude |
| `kai-skills remove <skill>` | Remove a skill from Claude |
| `kai-skills install` | Install Kai skills from GitHub |

## Example

```bash
# See available skills
kai-skills

# Add YouTube skill
kai-skills add youtube

# Add everything
kai-skills add all

# Test in Claude:
# "Get my YouTube stats for channel UCBa659QWEk1AI4Tg--mrJ2A"
```

## What is Kai?

Kai is a portable skill system that works with multiple AI assistants. Skills are simple JavaScript files that expose actions Claude can call.

Learn more: https://github.com/tmoreton/kai-skills

## License

MIT
