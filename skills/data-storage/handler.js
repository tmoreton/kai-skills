/**
 * Data Storage Skill Handler
 *
 * Simple file I/O operations for JSON, Markdown, and text files.
 */

import fs from "fs";
import path from "path";

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export default {
  actions: {
    // Generic read/write that auto-detect file type (for backward compatibility)
    read: async (params) => {
      const filePath = params.file_path || params.file;
      const defaultValue = params.default;
      if (!filePath) throw new Error("file_path or file parameter required");
      if (!fs.existsSync(filePath)) {
        if (defaultValue !== undefined) return { content: JSON.stringify(defaultValue, null, 2) };
        throw new Error(`File not found: ${filePath}`);
      }
      const content = fs.readFileSync(filePath, "utf-8");
      // Try to parse as JSON, otherwise return as text
      try {
        const parsed = JSON.parse(content);
        return { content: JSON.stringify(parsed, null, 2) };
      } catch {
        return { content };
      }
    },

    write: async (params) => {
      const filePath = params.file_path || params.file;
      if (!filePath) throw new Error("file_path or file parameter required");
      ensureDir(filePath);
      const toWrite = params.data !== undefined ? (typeof params.data === "string" ? params.data : JSON.stringify(params.data, null, 2)) : params.content || "";
      fs.writeFileSync(filePath, toWrite, "utf-8");
      return { content: `Wrote to ${filePath}` };
    },

    append: async (params) => {
      const filePath = params.file_path || params.file;
      const content = params.data !== undefined ? (typeof params.data === "string" ? params.data : JSON.stringify(params.data, null, 2)) : params.content || "";
      if (!filePath) throw new Error("file_path or file parameter required");
      ensureDir(filePath);
      fs.appendFileSync(filePath, content, "utf-8");
      return { content: `Appended to ${filePath}` };
    },

    read_json: async (params) => {
      const content = fs.readFileSync(params.file_path, "utf-8");
      return { content: JSON.stringify(JSON.parse(content), null, 2) };
    },

    write_json: async (params) => {
      ensureDir(params.file_path);
      let data = params.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {}
      }
      const json = params.pretty !== false ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      fs.writeFileSync(params.file_path, json, "utf-8");
      return { content: `Wrote ${json.length} bytes to ${params.file_path}` };
    },

    read_markdown: async (params) => {
      const content = fs.readFileSync(params.file_path, "utf-8");
      return { content };
    },

    write_markdown: async (params) => {
      ensureDir(params.file_path);
      if (params.append) {
        fs.appendFileSync(params.file_path, params.content, "utf-8");
        return { content: `Appended to ${params.file_path}` };
      } else {
        fs.writeFileSync(params.file_path, params.content, "utf-8");
        return { content: `Wrote ${params.content.length} bytes to ${params.file_path}` };
      }
    },

    read_text: async (params) => {
      const content = fs.readFileSync(params.file_path, "utf-8");
      return { content };
    },

    write_text: async (params) => {
      ensureDir(params.file_path);
      if (params.append) {
        fs.appendFileSync(params.file_path, params.content, "utf-8");
        return { content: `Appended to ${params.file_path}` };
      } else {
        fs.writeFileSync(params.file_path, params.content, "utf-8");
        return { content: `Wrote ${params.content.length} bytes to ${params.file_path}` };
      }
    },
  },
};
