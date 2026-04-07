# kai-skills

Quickly connect Kai skills to Claude Desktop or Claude Code.

**No Kai CLI required.** Just Node.js and Claude.

## Install

```bash
npm install -g kai-skills
```

## Quick Start (5 Steps)

```bash
# 1. Install Kai skills (one-time)
kai-skills install

# 2. Add all skills to Claude
kai-skills add all

# 3. Configure your API keys
kai-skills config set youtube YOUTUBE_API_KEY your_key_here

# 4. Sync keys to Claude Desktop
kai-skills sync-config

# 5. Restart Claude Desktop completely (Cmd+Q, then reopen)
```

**That's it!** Now test in Claude:
```
Get stats for YouTube channel UCvjgXvBlbQiydffZU7m1_aw
```

## Getting API Keys

| Skill | Where to get API key |
|-------|---------------------|
| **YouTube** | https://console.cloud.google.com/apis/credentials → Create API Key → Enable YouTube Data API v3 |
| **OpenRouter** (Images) | https://openrouter.ai/keys |
| **Twitter/X** | https://tavily.com (for web search) |
| **TikTok** | https://tavily.com (for web search) |
| **Instagram** | https://developers.facebook.com/apps (Basic Display API) |
| **Facebook** | https://developers.facebook.com/tools/explorer |
| **LinkedIn** | https://www.linkedin.com/developers/apps |
| **Notion** | https://www.notion.so/my-integrations |
| **Slack** | https://api.slack.com/apps → OAuth & Permissions |
| **Bluesky** | Use your handle + app password from Settings |

## Commands

| Command | Description |
|---------|-------------|
| `kai-skills` | List installed skills |
| `kai-skills install` | Install Kai skills from GitHub |
| `kai-skills add <skill>` | Add a specific skill to Claude |
| `kai-skills add all` | Add ALL skills to Claude |
| `kai-skills remove <skill>` | Remove a skill from Claude |
| `kai-skills sync-config` | Copy API keys to Claude Desktop |

## Config Commands

```bash
# List all stored API keys (masked)
kai-skills config list

# Set an API key
kai-skills config set <skill> <key> <value>

# Get config for a skill
kai-skills config get <skill>

# Remove a skill's config
kai-skills config remove <skill>
```

## Per-Skill Setup Examples

### YouTube
```bash
kai-skills config set youtube YOUTUBE_API_KEY AIzaSy...
kai-skills sync-config
# Restart Claude Desktop
```

### OpenRouter (Image Generation)
```bash
kai-skills config set openrouter OPENROUTER_API_KEY sk-or-...
kai-skills sync-config
# Restart Claude Desktop
```

### Twitter/X (Web Search)
```bash
kai-skills config set twitter TAVILY_API_KEY tvly-...
kai-skills sync-config
# Restart Claude Desktop
```

### Instagram
```bash
kai-skills config set instagram access_token your_token_here
kai-skills sync-config
# Restart Claude Desktop
```

### Notion
```bash
kai-skills config set notion NOTION_API_KEY secret_xxx
kai-skills sync-config
# Restart Claude Desktop
```

### Slack
```bash
kai-skills config set slack bot_token xoxb-xxx
kai-skills sync-config
# Restart Claude Desktop
```

### Bluesky
```bash
kai-skills config set bluesky identifier your.handle.bsky.social
kai-skills config set bluesky password your-app-password
kai-skills sync-config
# Restart Claude Desktop
```

## Test Your Skills

After setup, try these in Claude:

| Skill | Test Command |
|-------|-------------|
| YouTube | `Get stats for YouTube channel UCvjgXvBlbQiydffZU7m1_aw` |
| YouTube | `Search YouTube for "AI coding tutorials"` |
| Twitter | `Search Twitter for "indie hacker"` |
| OpenRouter | `Generate an image of a sunset over mountains` |
| Dashboard | `Start my social media dashboard on port 3002` |

## How It Works

1. **kai-skills config set** → Saves API keys to `~/.kai/config.json`
2. **kai-skills sync-config** → Copies keys to Claude Desktop's config
3. **Restart Claude Desktop** → MCP servers reload with new env vars
4. Claude can now call the skills with your API keys!

## Troubleshooting

**"API key not configured" error?**
1. Run `kai-skills config list` - is your key there?
2. Run `kai-skills sync-config` - did it copy to Claude?
3. Restart Claude Desktop completely (Cmd+Q, not just close window)

**"Server disconnected" errors?**
1. Run `kai-skills install` to get latest skills
2. Run `kai-skills sync-config`
3. Restart Claude Desktop

## What is Kai?

Kai is a portable skill system that works with multiple AI assistants. Skills are simple JavaScript files that expose actions Claude can call.

Learn more: https://github.com/tmoreton/kai-skills

## License

MIT
