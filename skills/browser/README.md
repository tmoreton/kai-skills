# Browser Skill

Web browsing with Playwright for AI assistants. Works with Kai, Claude Desktop, or any MCP-compatible client.

## Installation

### Via Kai CLI
```bash
kai skills install browser
```

### Via Standalone CLI
```bash
npx kai-skills install browser --target=kai
```

### For Claude Desktop (MCP)
```bash
npx kai-skills install browser --target=mcp
```

## Tools

- `open` - Navigate to URL and return page content
- `click` - Click elements by selector or text
- `fill` - Fill form fields
- `screenshot` - Take screenshots (file or base64)
- `evaluate` - Run JavaScript in browser context
- `get_content` - Get current page content
- `close` - Close browser session

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSER_HEADLESS` | Run in headless mode | `true` |
| `BROWSER_TIMEOUT_MS` | Navigation timeout | `30000` |
| `BROWSER_CONTENT_LIMIT` | Max content to return | `80000` |
| `BROWSER_OUTPUT_DIR` | Screenshot directory | `~/.kai/agent-output/browser` |

## Requirements

- Playwright (auto-installed via postinstall script)
- Chromium browser (auto-installed)

## Example Usage

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
