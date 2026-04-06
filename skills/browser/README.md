# Browser Skill

Web browsing with Playwright for AI assistants. Works with **Claude Desktop** (the chat app) via MCP, or with Kai.

**Not for Claude Code** — if you're using the `claude` CLI tool, use [claude-skills](https://github.com/alirezarezvani/claude-skills) instead.

## Claude Desktop Installation

**Step 1:** Install the MCP adapter globally:
```bash
npm install -g @kai-skills/mcp-adapter
```

**Step 2:** Install Playwright (required):
```bash
npx playwright install chromium
```

**Step 3:** Edit Claude Desktop config:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Step 4:** Add the Browser skill:

```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "kai-skill-mcp", "/path/to/kai-skills/skills/browser"]
    }
  }
}
```

**Step 5:** Restart Claude Desktop. The skill is ready to use.

## Requirements

- Node.js 18+
- Playwright (auto-installs Chromium)

## Tools

| Tool | Description |
|------|-------------|
| `open` | Navigate to URL and return page content |
| `click` | Click elements by selector or text |
| `fill` | Fill form fields |
| `screenshot` | Take screenshots (saved to file or returned as base64) |
| `evaluate` | Run JavaScript in browser context |
| `get_content` | Get current page content |
| `close` | Close browser session |

## Example Usage (in Claude Desktop)

Just ask Claude naturally:
- "Go to example.com and tell me what you see"
- "Take a screenshot of this page"
- "Fill out the login form and submit it"
- "Search for 'AI tools' on this page"

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSER_HEADLESS` | Run in headless mode | `true` |
| `BROWSER_TIMEOUT_MS` | Navigation timeout | `30000` |
| `BROWSER_CONTENT_LIMIT` | Max content to return | `80000` |
| `BROWSER_OUTPUT_DIR` | Screenshot directory | `~/.kai/agent-output/browser` |

To use headless mode (see browser UI), set `BROWSER_HEADLESS=false` in the env section of your Claude config.

## Programmatic Usage

```javascript
// Navigate and extract content
const page = await browserSkill.actions.open({
  url: "https://example.com",
  wait_for: "main"
});

// Take screenshot as base64 (for MCP)
const screenshot = await browserSkill.actions.screenshot({
  full_page: true,
  return_type: "base64"
});

// Fill form and submit
await browserSkill.actions.fill({ selector: "#email", value: "user@example.com" });
await browserSkill.actions.click({ selector: "button[type=submit]" });
```
