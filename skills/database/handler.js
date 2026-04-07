/**
 * Database Skill Handler - Database Operations
 * 
 * Provides migrations, queries, schema inspection, and management
 * Works with Kai and Claude Desktop via MCP.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function exec(command, options = {}) {
  try {
    return { success: true, output: execSync(command, { encoding: "utf-8", stdio: "pipe", ...options }) };
  } catch (e) {
    return { success: false, output: e.stdout || e.stderr || e.message, exitCode: e.status };
  }
}

function fileExists(filepath) {
  try {
    fs.accessSync(filepath);
    return true;
  } catch {
    return false;
  }
}

function dirExists(dirpath) {
  try {
    const stats = fs.statSync(dirpath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function findFiles(pattern) {
  try {
    const result = exec(`find . -type f -name "${pattern}" -maxdepth 2 2>/dev/null | head -5`);
    return result.output?.trim().split("\n").filter(Boolean) || [];
  } catch {
    return [];
  }
}

// Cache for detected framework
let detectedDBFramework = null;

function detectDBFramework() {
  if (detectedDBFramework) return detectedDBFramework;
  
  if (fileExists("prisma/schema.prisma")) return "prisma";
  if (fileExists("package.json")) {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    if (pkg.dependencies?.["@prisma/client"]) return "prisma";
    if (pkg.dependencies?.typeorm) return "typeorm";
    if (pkg.dependencies?.sequelize) return "sequelize";
    if (pkg.dependencies?.knex) return "knex";
  }
  if (fileExists("alembic.ini")) return "alembic";
  if (fileExists("flyway.conf")) return "flyway";
  
  return "unknown";
}

function getMigrateCommand(framework, direction, count) {
  switch (framework) {
    case "prisma":
      if (direction === "down") return `npx prisma migrate ${direction}${count ? ` --skip-generate` : ""}`;
      return `npx prisma migrate ${direction}${count ? ` ${count}` : ""}`;
    case "typeorm":
      return direction === "down" 
        ? `npx typeorm migration:revert` 
        : `npx typeorm migration:run`;
    case "sequelize":
      return direction === "down"
        ? `npx sequelize-cli db:migrate:undo${count ? `:all` : ""}`
        : `npx sequelize-cli db:migrate`;
    case "knex":
      return direction === "down"
        ? `npx knex migrate:rollback${count ? ` --all` : ""}`
        : `npx knex migrate:latest`;
    case "alembic":
      return direction === "down"
        ? `alembic downgrade${count ? ` -${count}` : " base"}`
        : "alembic upgrade head";
    case "flyway":
      return direction === "down"
        ? `flyway undo${count ? ` -target=${count}` : ""}`
        : "flyway migrate";
    default:
      return "echo 'Unknown framework'";
  }
}

export default {
  actions: {
    db_migrate_run: async (params) => {
      const { framework = "auto", direction = "latest", count, dry_run = false } = params;
      
      const fw = framework === "auto" ? detectDBFramework() : framework;
      
      if (fw === "unknown") {
        return { content: "Could not detect migration framework. Please specify framework." };
      }
      
      const cmd = getMigrateCommand(fw, direction, count);
      
      if (dry_run) {
        if (fw === "prisma") {
          const result = exec("npx prisma migrate status");
          return { content: `Dry run (Prisma):\n${result.output || "No status available"}` };
        }
        return { content: `Would run: ${cmd}` };
      }
      
      const result = exec(cmd, { timeout: 120000 });
      
      return { 
        content: result.output || "Migration completed",
        success: result.success
      };
    },

    db_migrate_status: async (params) => {
      const { framework = "auto" } = params;
      
      const fw = framework === "auto" ? detectDBFramework() : framework;
      
      if (fw === "unknown") {
        return { content: "Could not detect migration framework." };
      }
      
      let cmd;
      
      switch (fw) {
        case "prisma":
          cmd = "npx prisma migrate status";
          break;
        case "typeorm":
          cmd = "npx typeorm migration:show";
          break;
        case "sequelize":
          cmd = "npx sequelize-cli db:migrate:status";
          break;
        case "knex":
          cmd = "npx knex migrate:status";
          break;
        case "alembic":
          cmd = "alembic current";
          break;
        case "flyway":
          cmd = "flyway info";
          break;
        default:
          return { content: "Unknown framework for status check" };
      }
      
      const result = exec(cmd, { timeout: 30000 });
      return { content: result.output || "No status available" };
    },

    db_query: async (params) => {
      const { query, connection, format = "table", max_rows = 100 } = params;
      
      // Try to find connection string
      let connStr = connection || process.env.DATABASE_URL;
      if (!connStr && fileExists(".env")) {
        const envContent = fs.readFileSync(".env", "utf-8");
        const match = envContent.match(/DATABASE_URL=(.+)/);
        if (match) connStr = match[1];
      }
      
      if (!connStr) {
        return { content: "No database connection string found. Set DATABASE_URL or pass connection parameter." };
      }
      
      // Detect database type from connection string
      const isPostgres = connStr.includes("postgresql") || connStr.includes("postgres");
      const isSQLite = connStr.includes("sqlite");
      
      let cmd;
      
      if (isPostgres) {
        // Use psql for PostgreSQL
        cmd = `psql "${connStr}" -c "${query.replace(/"/g, '\\"')}"`;
        if (format === "json") {
          cmd = `psql "${connStr}" -c "${query.replace(/"/g, '\\"')}" --format=json`;
        }
      } else if (isSQLite) {
        // Use sqlite3 for SQLite
        const dbFile = connStr.replace("sqlite://", "").replace("sqlite:", "");
        cmd = `sqlite3 "${dbFile}" "${query.replace(/"/g, '\\"')}"`;
      } else {
        return { content: "Unsupported database type. Currently supports PostgreSQL and SQLite." };
      }
      
      const result = exec(cmd, { timeout: 30000 });
      
      let output = result.output || "";
      
      // Truncate if too long
      const lines = output.split("\n");
      if (lines.length > max_rows) {
        output = lines.slice(0, max_rows).join("\n");
        output += `\n... (${lines.length - max_rows} more rows)`;
      }
      
      return { content: output || "Query executed successfully" };
    },

    db_schema_inspect: async (params) => {
      const { tables, format = "markdown", include_data = false, connection } = params;
      
      // Try to find connection string
      let connStr = connection || process.env.DATABASE_URL;
      if (!connStr && fileExists(".env")) {
        const envContent = fs.readFileSync(".env", "utf-8");
        const match = envContent.match(/DATABASE_URL=(.+)/);
        if (match) connStr = match[1];
      }
      
      if (!connStr) {
        return { content: "No database connection string found." };
      }
      
      const isPostgres = connStr.includes("postgresql") || connStr.includes("postgres");
      
      if (!isPostgres) {
        return { content: "Schema inspection currently only supports PostgreSQL." };
      }
      
      let output = "# Database Schema\n\n";
      
      // Get list of tables
      let tableList = tables;
      if (!tableList) {
        const result = exec(`psql "${connStr}" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public'" -t`);
        tableList = result.output?.split("\n").map(t => t.trim()).filter(Boolean) || [];
      } else {
        tableList = Array.isArray(tables) ? tables : [tables];
      }
      
      for (const table of tableList) {
        output += `## ${table}\n\n`;
        
        // Get columns
        const columnsResult = exec(`psql "${connStr}" -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='${table}'"`);
        output += "### Columns\n\n";
        output += "| Column | Type | Nullable |\n";
        output += "|--------|------|----------|\n";
        
        const lines = columnsResult.output?.split("\n").filter(l => l.includes("|")) || [];
        for (const line of lines.slice(2)) { // Skip header
          const parts = line.split("|").map(p => p.trim()).filter(Boolean);
          if (parts.length >= 3) {
            output += `| ${parts[0]} | ${parts[1]} | ${parts[2]} |\n`;
          }
        }
        
        if (include_data) {
          const dataResult = exec(`psql "${connStr}" -c "SELECT * FROM ${table} LIMIT 5"`);
          output += "\n### Sample Data (5 rows)\n\n";
          output += "```\n" + dataResult.output + "\n```\n";
        }
        
        output += "\n";
      }
      
      return { content: output };
    },

    db_backup: async (params) => {
      const { tables, format = "sql", compress = true, connection } = params;
      
      // Try to find connection string
      let connStr = connection || process.env.DATABASE_URL;
      if (!connStr && fileExists(".env")) {
        const envContent = fs.readFileSync(".env", "utf-8");
        const match = envContent.match(/DATABASE_URL=(.+)/);
        if (match) connStr = match[1];
      }
      
      if (!connStr) {
        return { content: "No database connection string found." };
      }
      
      const isPostgres = connStr.includes("postgresql") || connStr.includes("postgres");
      const isSQLite = connStr.includes("sqlite");
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `backup-${timestamp}.${format}${compress ? ".gz" : ""}`;
      
      if (isPostgres) {
        const tableArgs = tables ? tables.map(t => `-t ${t}`).join(" ") : "";
        const compressCmd = compress ? " | gzip" : "";
        const cmd = `pg_dump "${connStr}" ${tableArgs} -F p${compressCmd} > ${filename}`;
        
        const result = exec(cmd, { timeout: 120000 });
        
        if (result.success) {
          return { content: `Backup created: ${filename}` };
        } else {
          return { content: `Backup failed: ${result.output}`, error: true };
        }
      } else if (isSQLite) {
        const dbFile = connStr.replace("sqlite://", "").replace("sqlite:", "");
        const compressCmd = compress ? " | gzip" : "";
        const cmd = `sqlite3 "${dbFile}" .dump${compressCmd} > ${filename}`;
        
        const result = exec(cmd, { timeout: 60000 });
        
        if (result.success) {
          return { content: `Backup created: ${filename}` };
        } else {
          return { content: `Backup failed: ${result.output}`, error: true };
        }
      }
      
      return { content: "Backup only supported for PostgreSQL and SQLite" };
    },

    db_seed: async (params) => {
      const { environment = "development", reset = false, framework = "auto" } = params;
      
      const fw = framework === "auto" ? detectDBFramework() : framework;
      
      let cmd;
      
      if (fw === "prisma") {
        if (fileExists("prisma/seed.ts") || fileExists("prisma/seed.js")) {
          cmd = "npx prisma db seed";
        } else if (fileExists("package.json")) {
          const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
          if (pkg.scripts?.seed) {
            cmd = "npm run seed";
          } else {
            return { content: "No seed script found. Add a seed script to package.json or prisma/seed.ts" };
          }
        } else {
          return { content: "No seed mechanism detected" };
        }
        
        if (reset) {
          cmd += " -- --reset";
        }
        
        const result = exec(cmd, { timeout: 60000 });
        
        return { 
          content: result.output || "Seeding completed",
          success: result.success
        };
      }
      
      return { content: `Seeding not implemented for framework: ${fw}` };
    },
  },
};
