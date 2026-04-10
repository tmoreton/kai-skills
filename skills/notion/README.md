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

## Tools Reference

### Setup & Authentication

| Tool | Description |
|------|-------------|
| `setup` | Configure Notion API credentials |

### Search & Discovery

| Tool | Description |
|------|-------------|
| `search` | Search pages and databases across your workspace |
| `get_database` | Get database schema, properties, and structure |

### Pages (Create, Retrieve, Update)

| Tool | Description |
|------|-------------|
| `get_page` | Get page properties and metadata |
| `get_page_content` | Get page block content (text, headings, lists, etc.) |
| `create_page` | Create new pages in databases or as child pages |
| `update_page` | Update page properties (status, assignee, dates, etc.) |

### Databases (Query, Filter, Sort)

| Tool | Description |
|------|-------------|
| `query_database` | Query with filters, sorts, and pagination |

### Blocks (Append, Retrieve, Delete)

| Tool | Description |
|------|-------------|
| `append_blocks` | Add content blocks to pages (paragraphs, lists, headings, etc.) |
| `delete_block` | Delete a block by ID |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `NOTION_API_KEY` | Notion integration API key | **Yes** |
| `NOTION_VERSION` | API version | No (default: 2022-06-28) |

## Notion IDs

- **Page IDs**: Look like `abc123de-f456-7890-abcd-ef1234567890`
- **Database IDs**: Similar format, can be found in Notion URL when viewing a database
- Extract from URL: `https://www.notion.so/workspace/ABC123?v=...` -> `ABC123`

---

## Use Case Examples

### Content Calendar Management

Manage blog posts, social media, and publishing schedules:

```javascript
// Find your Content Calendar database
const databases = await notionSkill.actions.search({
  query: "Content Calendar",
  filter: "database"
});

// Query posts scheduled for this week
const thisWeekPosts = await notionSkill.actions.query_database({
  database_id: "your-database-id",
  filter: {
    and: [
      {
        property: "Publish Date",
        date: {
          on_or_after: "2024-01-01"
        }
      },
      {
        property: "Status",
        select: {
          equals: "In Progress"
        }
      }
    ]
  },
  sorts: [
    {
      property: "Publish Date",
      direction: "ascending"
    }
  ]
});

// Create a new content idea
const newPost = await notionSkill.actions.create_page({
  parent: "your-database-id",
  title: "10 Tips for Remote Work",
  properties: {
    "Content Type": { select: { name: "Blog Post" } },
    "Status": { select: { name: "Idea" } },
    "Assignee": { people: [{ id: "user-id" }] },
    "Tags": { multi_select: [{ name: "Productivity" }, { name: "Remote Work" }] }
  },
  content: [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ text: { content: "Outline" } }]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ text: { content: "Introduction to remote work challenges" } }]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ text: { content: "Tip 1: Set up a dedicated workspace" } }]
      }
    }
  ]
});

// Update post status when published
await notionSkill.actions.update_page({
  page_id: "post-page-id",
  properties: {
    "Status": { select: { name: "Published" } },
    "Published URL": { url: "https://example.com/blog/post" }
  }
});
```

### Team Wiki & Documentation

Build and maintain team knowledge bases:

```javascript
// Find the team wiki
const wiki = await notionSkill.actions.search({
  query: "Engineering Wiki",
  filter: "page"
});

// Get wiki structure
const wikiContent = await notionSkill.actions.get_page_content({
  page_id: "wiki-page-id"
});

// Create a new documentation page
const docPage = await notionSkill.actions.create_page({
  parent: "wiki-page-id",
  title: "API Authentication Guide",
  content: [
    {
      object: "block",
      type: "heading_1",
      heading_1: {
        rich_text: [{ text: { content: "API Authentication Guide" } }]
      }
    },
    {
      object: "block",
      type: "callout",
      callout: {
        rich_text: [{ text: { content: "⚠️ Keep your API keys secure!" } }],
        icon: { emoji: "⚠️" }
      }
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ text: { content: "Getting Started" } }]
      }
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { text: { content: "To authenticate with our API, you'll need to: " } },
          { text: { content: "create an API key", annotations: { bold: true } } },
          { text: { content: " from your dashboard." } }
        ]
      }
    },
    {
      object: "block",
      type: "code",
      code: {
        language: "bash",
        rich_text: [{ text: { content: "curl -H 'Authorization: Bearer YOUR_API_KEY' https://api.example.com/v1/users" } }]
      }
    },
    {
      object: "block",
      type: "divider",
      divider: {}
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ text: { content: "Related Pages" } }]
      }
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ text: { content: "Read Rate Limiting documentation" } }],
        checked: false
      }
    }
  ]
});

// Add more content to existing page
await notionSkill.actions.append_blocks({
  block_id: "doc-page-id",
  blocks: [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ text: { content: "Troubleshooting" } }]
      }
    },
    {
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: [{ text: { content: "401 Unauthorized Error" } }],
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ text: { content: "This usually means your API key is invalid or expired." } }]
            }
          }
        ]
      }
    }
  ]
});
```

### Project & Task Tracking

Manage projects, tasks, and sprints:

```javascript
// Query tasks by assignee and status
const myTasks = await notionSkill.actions.query_database({
  database_id: "tasks-db-id",
  filter: {
    and: [
      {
        property: "Assignee",
        people: {
          contains: "your-user-id"
        }
      },
      {
        property: "Status",
        status: {
          does_not_equal: "Complete"
        }
      },
      {
        property: "Priority",
        select: {
          equals: "High"
        }
      }
    ]
  },
  sorts: [
    { property: "Due Date", direction: "ascending" }
  ],
  page_size: 50
});

// Create a new project with sub-tasks
const project = await notionSkill.actions.create_page({
  parent: "projects-db-id",
  title: "Q1 Website Redesign",
  properties: {
    "Status": { select: { name: "Planning" } },
    "Priority": { select: { name: "High" } },
    "Start Date": { date: { start: "2024-01-15" } },
    "End Date": { date: { start: "2024-03-30" } },
    "Budget": { number: 50000 },
    "Team": { relation: [{ id: "team-id" }] }
  },
  content: [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { text: { content: "Objective: Redesign the company website to improve conversion rates by 25%." } }
        ]
      }
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ text: { content: "Key Deliverables" } }]
      }
    },
    {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ text: { content: "New homepage design" } }]
      }
    },
    {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ text: { content: "Product page templates" } }]
      }
    },
    {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ text: { content: "Mobile responsive implementation" } }]
      }
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ text: { content: "Timeline" } }]
      }
    },
    {
      object: "block",
      type: "table",
      table: {
        table_width: 3,
        has_column_header: true,
        has_row_header: false,
        children: [
          {
            object: "block",
            type: "table_row",
            table_row: {
              cells: [
                [{ text: { content: "Phase" } }],
                [{ text: { content: "Dates" } }],
                [{ text: { content: "Owner" } }]
              ]
            }
          },
          {
            object: "block",
            type: "table_row",
            table_row: {
              cells: [
                [{ text: { content: "Research" } }],
                [{ text: { content: "Jan 15-29" } }],
                [{ text: { content: "Design Team" } }]
              ]
            }
          }
        ]
      }
    }
  ]
});

// Update task status and add comment
await notionSkill.actions.update_page({
  page_id: "task-id",
  properties: {
    "Status": { status: { name: "In Review" } },
    "Last Updated": { date: { start: new Date().toISOString() } }}
  }
});

// Append a comment to the task page
await notionSkill.actions.append_blocks({
  block_id: "task-id",
  blocks: [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { text: { content: "Update: ", annotations: { bold: true } } },
          { text: { content: "Design mockups completed and ready for review. " } },
          { 
            text: { content: "@design-lead", annotations: { mention: { type: "user", user: { id: "user-id" } } } },
            annotations: { bold: true, color: "blue" }
          }
        ]
      }
    }
  ]
});

// Get detailed task information
const taskDetails = await notionSkill.actions.get_page({
  page_id: "task-id"
});

const taskContent = await notionSkill.actions.get_page_content({
  page_id: "task-id",
  page_size: 100
});
```

---

## Natural Language Usage (Claude Desktop)

Just ask Claude naturally:
- "Search my Notion for 'Project Roadmap'"
- "Create a new task in my Tasks database titled 'Fix login bug' with high priority"
- "Get the content of my meeting notes page"
- "Update the status of page XYZ to Done"
- "Add a heading to my wiki page about the new API changes"
- "Query all blog posts scheduled for next week"

---

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

## Block Types Reference

Common block types you can use with `create_page` and `append_blocks`:

| Block Type | Description |
|------------|-------------|
| `paragraph` | Regular text block |
| `heading_1`, `heading_2`, `heading_3` | Section headings |
| `bulleted_list_item` | Bullet list item |
| `numbered_list_item` | Numbered list item |
| `to_do` | Checkbox item |
| `code` | Code block with syntax highlighting |
| `quote` | Blockquote |
| `callout` | Highlighted box with icon |
| `divider` | Horizontal line |
| `toggle` | Collapsible section |
| `table` | Data table |
| `image` | Image block |
| `bookmark` | URL bookmark |
| `link_to_page` | Link to another page |

---

## Troubleshooting

**"API key is invalid"**
- Verify your NOTION_API_KEY is correct
- Ensure the integration has access to the page/database (add via "Add connections")

**"Object not found"**
- Check that the page/database ID is correct
- Confirm the integration has been added to that specific page

**"Validation error"**
- Verify database properties match the schema (use `get_database` to check)
- Ensure required properties are provided
- Check data types (select vs status vs multi_select)

**Rate limiting**
- Notion API has rate limits (3 requests per second)
- Add delays between requests if processing many items
