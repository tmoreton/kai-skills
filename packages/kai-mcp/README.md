# kai-skills

Quickly connect Kai skills to Claude Desktop or Claude Code.

**No Kai CLI required.** Just Node.js and Claude.

## Install

```bash
npm install -g kai-skills
```

## Quick Start

```bash
# 1. Install Kai skills (one-time)
kai-skills install

# 2. Add all skills to Claude
kai-skills add all

# 3. Configure API keys
kai-skills config set youtube YOUTUBE_API_KEY your_key_here
kai-skills config set bluesky identifier your_handle
kai-skills config set bluesky password your_password

# 4. Restart Claude Desktop - done!
```

## Commands

| Command | Description |
|---------|-------------|
| `kai-skills` | List installed skills with ready-to-copy MCP commands |
| `kai-skills install` | Install Kai skills from GitHub |
| `kai-skills add <skill>` | Add a specific skill to Claude |
| `kai-skills add all` | Add ALL skills to Claude |
| `kai-skills remove <skill>` | Remove a skill from Claude |

## Config Commands

```bash
# List all stored configs
kai-skills config list

# Set a config value
kai-skills config set <skill> <key> <value>

# Get config for a skill
kai-skills config get <skill>

# Remove config
kai-skills config remove <skill>
```

**Per-Skill Config Examples:**

```bash
# YouTube
kai-skills config set youtube YOUTUBE_API_KEY your_key_here

# Bluesky
kai-skills config set bluesky identifier your.bsky.social
kai-skills config set bluesky password your-password

# Notion
kai-skills config set notion NOTION_API_KEY secret_xxx

# Slack
kai-skills config set slack bot_token xoxb-xxx

# Google Sheets (OAuth)
kai-skills config set google-sheets GOOGLE_CLIENT_ID xxx
kai-skills config set google-sheets GOOGLE_CLIENT_SECRET xxx
kai-skills config set google-sheets GOOGLE_REFRESH_TOKEN xxx
```

Configs are stored in `~/.kai/config.json` and automatically injected when skills run.

## Example Usage

```bash
# See available skills
kai-skills

# Add YouTube skill
kai-skills add youtube

# Add everything
kai-skills add all

# Test in Claude:
# "Get my YouTube stats for channel UCBa659QWEk1AI4Tg--mrJ2A"
# "Post to Bluesky: Hello from Kai!"
```

## What is Kai?

Kai is a portable skill system that works with multiple AI assistants. Skills are simple JavaScript files that expose actions Claude can call.

Learn more: https://github.com/tmoreton/kai-skills

## License

MIT
