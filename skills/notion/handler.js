/**
 * Notion Skill Handler
 * 
 * Integrates with Notion API for pages, databases, and blocks.
 * Works with Kai, MCP servers, or direct API usage.
 */

const NOTION_API_BASE = "https://api.notion.com/v1";

interface NotionConfig {
  apiKey: string;
  version: string;
}

let config: NotionConfig | null = null;

function getHeaders() {
  if (!config) throw new Error("Notion not configured. Set NOTION_API_KEY.");
  return {
    "Authorization": `Bearer ${config.apiKey}`,
    "Notion-Version": config.version,
    "Content-Type": "application/json",
  };
}

async function notionFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${NOTION_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Format a Notion page for display
function formatPage(page: any) {
  const title = page.properties?.title?.title?.[0]?.plain_text || 
                page.properties?.Name?.title?.[0]?.plain_text ||
                "Untitled";
  return {
    id: page.id,
    title,
    url: page.url,
    created: page.created_time,
    last_edited: page.last_edited_time,
  };
}

// Format a database for display
function formatDatabase(db: any) {
  return {
    id: db.id,
    title: db.title?.[0]?.plain_text || "Untitled",
    url: db.url,
    properties: Object.entries(db.properties).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type,
    })),
  };
}

// Format block content
function formatBlock(block: any, indent = 0) {
  const type = block.type;
  const content = block[type];
  
  let text = "";
  if (content?.rich_text) {
    text = content.rich_text.map((t: any) => t.plain_text).join("");
  } else if (content?.title) {
    text = content.title;
  }

  const prefix = "  ".repeat(indent);
  
  switch (type) {
    case "paragraph":
      return text ? `${prefix}${text}` : "";
    case "heading_1":
      return `${prefix}# ${text}`;
    case "heading_2":
      return `${prefix}## ${text}`;
    case "heading_3":
      return `${prefix}### ${text}`;
    case "bulleted_list_item":
      return `${prefix}- ${text}`;
    case "numbered_list_item":
      return `${prefix}1. ${text}`;
    case "to_do":
      const checked = content?.checked ? "[x]" : "[ ]";
      return `${prefix}- ${checked} ${text}`;
    case "code":
      const lang = content?.language || "";
      return `${prefix}\`\`\`${lang}\n${prefix}${text}\n${prefix}\`\`\``;
    case "quote":
      return `${prefix}> ${text}`;
    case "divider":
      return `${prefix}---`;
    case "child_page":
      return `${prefix}[Page: ${content?.title || "Untitled"}]`;
    case "bookmark":
    case "link_preview":
      return `${prefix}[Link: ${content?.url || ""}]`;
    default:
      return `${prefix}[${type}] ${text}`;
  }
}

export default {
  install: async (inputConfig: Record<string, any>) => {
    config = {
      apiKey: inputConfig.NOTION_API_KEY || process.env.NOTION_API_KEY || "",
      version: inputConfig.NOTION_VERSION || process.env.NOTION_VERSION || "2022-06-28",
    };
    
    if (!config.apiKey) {
      throw new Error("NOTION_API_KEY is required. Get one at notion.so/my-integrations");
    }
  },

  uninstall: async () => {
    config = null;
  },

  actions: {
    search: async (params: { query: string; filter?: "page" | "database" | "object"; page_size?: number }) => {
      const body: any = { query: params.query };
      if (params.filter && params.filter !== "object") {
        body.filter = { value: params.filter, property: "object" };
      }
      if (params.page_size) {
        body.page_size = Math.min(params.page_size, 100);
      }

      const data = await notionFetch("/search", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const results = data.results.map((r: any) => {
        if (r.object === "page") return formatPage(r);
        if (r.object === "database") return formatDatabase(r);
        return { id: r.id, object: r.object };
      });

      return {
        query: params.query,
        total: data.results.length,
        has_more: data.has_more,
        results,
      };
    },

    get_page: async (params: { page_id: string }) => {
      const page = await notionFetch(`/pages/${params.page_id}`);
      return formatPage(page);
    },

    get_page_content: async (params: { page_id: string; page_size?: number }) => {
      const data = await notionFetch(`/blocks/${params.page_id}/children?page_size=${params.page_size || 100}`);
      
      const blocks = data.results.map((b: any) => ({
        id: b.id,
        type: b.type,
        formatted: formatBlock(b),
      })).filter((b: any) => b.formatted);

      return {
        page_id: params.page_id,
        total: data.results.length,
        has_more: data.has_more,
        blocks,
        content: blocks.map((b: any) => b.formatted).join("\n"),
      };
    },

    create_page: async (params: { parent: string; title: string; properties?: Record<string, any>; content?: any[] }) => {
      const body: any = {
        parent: {},
        properties: {
          title: {
            title: [{ text: { content: params.title } }],
          },
        },
      };

      // Check if parent is a database (contains letters) or page (may not)
      // Database IDs typically contain mixed case, page IDs are UUIDs
      const isDatabase = params.parent.replace(/-/g, "").length === 32 && 
                         /[a-z]/.test(params.parent);

      if (isDatabase) {
        body.parent = { database_id: params.parent };
        // For databases, use the database's title property
        body.properties = {
          ...body.properties,
          ...params.properties,
        };
      } else {
        body.parent = { page_id: params.parent };
      }

      if (params.content) {
        body.children = params.content;
      }

      const page = await notionFetch("/pages", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        id: page.id,
        title: params.title,
        url: page.url,
        created: true,
      };
    },

    update_page: async (params: { page_id: string; properties: Record<string, any> }) => {
      const page = await notionFetch(`/pages/${params.page_id}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: params.properties }),
      });

      return {
        id: page.id,
        updated: true,
        url: page.url,
      };
    },

    query_database: async (params: { database_id: string; filter?: any; sorts?: any[]; page_size?: number }) => {
      const body: any = {
        page_size: Math.min(params.page_size || 100, 100),
      };
      
      if (params.filter) body.filter = params.filter;
      if (params.sorts) body.sorts = params.sorts;

      const data = await notionFetch(`/databases/${params.database_id}/query`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const results = data.results.map(formatPage);

      return {
        database_id: params.database_id,
        total: data.results.length,
        has_more: data.has_more,
        results,
      };
    },

    get_database: async (params: { database_id: string }) => {
      const db = await notionFetch(`/databases/${params.database_id}`);
      return formatDatabase(db);
    },

    append_blocks: async (params: { block_id: string; blocks: any[] }) => {
      const data = await notionFetch(`/blocks/${params.block_id}/children`, {
        method: "PATCH",
        body: JSON.stringify({ children: params.blocks }),
      });

      return {
        block_id: params.block_id,
        appended: data.results.length,
        results: data.results.map((r: any) => ({ id: r.id, type: r.type })),
      };
    },

    delete_block: async (params: { block_id: string }) => {
      await notionFetch(`/blocks/${params.block_id}`, {
        method: "DELETE",
      });

      return {
        block_id: params.block_id,
        deleted: true,
      };
    },
  },
};
