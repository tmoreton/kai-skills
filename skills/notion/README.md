# Notion Skill

Notion integration for AI assistants. Works with Kai, Claude Desktop, or any MCP-compatible client.

## Installation

### Via Kai CLI
```bash
kai skills install notion
```

### Via Standalone CLI
```bash
npx kai-skills install notion --target=kai
```

### For Claude Desktop (MCP)
```bash
npx kai-skills install notion --target=mcp
```

Or manually add to Claude Desktop config:

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["/path/to/notion/mcp-server.js"],
      "env": {
        "NOTION_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `NOTION_API_KEY` | Notion integration API key | Yes |
| `NOTION_VERSION` | API version | No (default: 2022-06-28) |

Get your API key at: https://www.notion.so/my-integrations

## Tools

- `search` - Search pages and databases
- `get_page` - Get page properties
- `get_page_content` - Get page block content
- `create_page` - Create a new page
- `update_page` - Update page properties
- `query_database` - Query with filters
- `get_database` - Get database schema
- `append_blocks` - Add blocks to a page
- `delete_block` - Delete a block

## Example Usage

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

## Notion IDs

- **Page IDs**: Look like `abc123de-f456-7890-abcd-ef1234567890`
- **Database IDs**: Similar format, can be found in Notion URL when viewing a database
- Extract from URL: `https://www.notion.so/workspace/ABC123?v=...` -> `ABC123`
