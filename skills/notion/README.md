# Notion Skill

Notion integration for AI assistants. Works with **Claude Desktop** (the chat app) via MCP, or with Kai.

**Not for Claude Code** — if you're using the `claude` CLI tool, use [claude-skills](https://github.com/alirezarezvani/claude-skills) instead.

## Claude Desktop Installation

**Step 1:** Install the MCP adapter globally:
```bash
npm install -g @kai-skills/mcp-adapter
```

**Step 2:** Get your Notion API key:
- Go to https://www.notion.so/my-integrations
- Create a new integration
- Copy the "Internal Integration Token"

**Step 3:** Edit Claude Desktop config:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Step 4:** Add the Notion skill with your API key:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "kai-skill-mcp", "/path/to/kai-skills/skills/notion"],
      "env": {
        "NOTION_API_KEY": "secret_xxx...your_key_here"
      }
    }
  }
}
```

**Step 5:** Share pages/databases with your integration:
- In Notion, open the page/database you want to access
- Click the "..." menu → "Add connections"
- Select your integration

**Step 6:** Restart Claude Desktop. The skill is ready to use.

## Requirements

- Notion account
- Notion Integration (free)
- Pages/databases shared with the integration

## Tools

| Tool | Description |
|------|-------------|
| `search` | Search pages and databases |
| `get_page` | Get page properties |
| `get_page_content` | Get page block content |
| `create_page` | Create a new page |
| `update_page` | Update page properties |
| `query_database` | Query with filters |
| `get_database` | Get database schema |
| `append_blocks` | Add blocks to a page |
| `delete_block` | Delete a block |

## Example Usage (in Claude Desktop)

Just ask Claude naturally:
- "Search my Notion for 'Project Roadmap'"
- "Create a new task in my Tasks database"
- "Get the content of my meeting notes page"
- "Update the status of page XYZ to Done"

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `NOTION_API_KEY` | Notion integration API key | **Yes** |
| `NOTION_VERSION` | API version | No (default: 2022-06-28) |

## Notion IDs

- **Page IDs**: Look like `abc123de-f456-7890-abcd-ef1234567890`
- **Database IDs**: Similar format, can be found in Notion URL when viewing a database
- Extract from URL: `https://www.notion.so/workspace/ABC123?v=...` -> `ABC123`

## Programmatic Usage

```javascript
// Search for pages
const results = await notionSkill.actions.search({
  query: "Project roadmap",
  filter: "page"
});

// Get page content
const content = await notionSkill.actions.get_page_content({
  page_id: "abc123..."
});

// Create a page
const page = await notionSkill.actions.create_page({
  parent: "database_id_or_page_id",
  title: "New Task",
  properties: {
    Status: { select: { name: "In Progress" } }
  },
  content: [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ text: { content: "Task description here" } }]
      }
    }
  ]
});
```
