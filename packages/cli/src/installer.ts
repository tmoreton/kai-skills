/**
 * Skill installer - handles installation and management of Kai skills
 */

import { execSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { homedir } from "os";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const REGISTRY_URL = "https://raw.githubusercontent.com/tmoreton/kai-skills/main/registry/skills.json";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface SkillInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  downloadUrl: string;
  npmPackage?: string;
  tools: Array<{ name: string; description: string }>;
}

export interface InstallOptions {
  target: "kai" | "mcp" | "local";
  config?: string;
  claudeConfig?: string;
}

/**
 * Fetch skills from registry
 */
export async function listSkills(): Promise<SkillInfo[]> {
  try {
    const response = await fetch(REGISTRY_URL);
    const data = await response.json() as { skills: SkillInfo[] };
    return data.skills;
  } catch {
    // Fallback: load from local filesystem during development
    return loadLocalSkills();
  }
}

/**
 * Load skills from local filesystem (development mode or when bundled with skills)
 */
function loadLocalSkills(): SkillInfo[] {
  // Try to find skills relative to the package installation
  const possiblePaths = [
    path.join(__dirname, "..", "..", "..", "skills"), // Development: cli/dist/ -> packages/cli/ -> root
    path.join(__dirname, "..", "skills"),            // Global install: cli/dist/ -> kai-skills/skills
    path.join(process.cwd(), "skills"),              // Local project with kai-skills installed
  ];

  let skillsDir: string | null = null;
  for (const dir of possiblePaths) {
    if (existsSync(dir)) {
      skillsDir = dir;
      break;
    }
  }

  if (!skillsDir) {
    console.error("Could not find skills directory. Checked:", possiblePaths);
    return [];
  }

  const skills: SkillInfo[] = [];

  try {
    const entries = require("fs").readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(skillsDir, entry.name, "skill.yaml");
      if (!existsSync(manifestPath)) continue;

      const yaml = require("yaml");
      const manifest = yaml.parse(readFileSync(manifestPath, "utf-8"));
      skills.push({
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || "",
        author: manifest.author || "unknown",
        tags: manifest.tags || [],
        downloadUrl: `file://${manifestPath}`,
        tools: manifest.tools.map((t: any) => ({
          name: t.name,
          description: t.description,
        })),
      });
    }
  } catch {
    // No local skills found
  }

  return skills;
}

/**
 * Install a skill to the specified target
 */
export async function installSkill(skillId: string, options: InstallOptions): Promise<void> {
  const skills = await listSkills();
  const skill = skills.find(s => s.id === skillId);
  if (!skill) {
    throw new Error(`Skill "${skillId}" not found`);
  }

  switch (options.target) {
    case "kai":
      await installToKai(skill);
      break;
    case "mcp":
      await installToMcp(skill, options.claudeConfig);
      break;
    case "local":
      await installLocal(skill);
      break;
    default:
      throw new Error(`Unknown target: ${options.target}`);
  }
}

/**
 * Install skill to ~/.kai/skills/
 */
async function installToKai(skill: SkillInfo): Promise<void> {
  const kaiDir = path.join(homedir(), ".kai", "skills", skill.id);

  if (!existsSync(kaiDir)) {
    mkdirSync(kaiDir, { recursive: true });
  }

  // Download skill files
  await downloadSkill(skill, kaiDir);

  // Run npm install if there's a package.json
  const pkgPath = path.join(kaiDir, "package.json");
  if (existsSync(pkgPath)) {
    execSync("npm install", { cwd: kaiDir, stdio: "pipe" });
  }
}

/**
 * Install skill as MCP server for Claude Desktop
 */
async function installToMcp(skill: SkillInfo, claudeConfigPath?: string): Promise<void> {
  const configPath = claudeConfigPath || getDefaultClaudeConfigPath();

  let config: any = {};
  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Install skill globally or locally
  const skillDir = path.join(homedir(), ".kai", "skills", skill.id);
  if (!existsSync(skillDir)) {
    await installToKai(skill);
  }

  config.mcpServers[skill.id] = {
    command: "npx",
    args: ["-y", "@kai-skills/mcp-adapter", skillDir],
    env: {},
  };

  // Ensure config directory exists
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Get default Claude Desktop config path
 */
function getDefaultClaudeConfigPath(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return path.join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  } else if (platform === "win32") {
    return path.join(process.env.APPDATA || homedir(), "Claude", "claude_desktop_config.json");
  } else {
    return path.join(homedir(), ".config", "Claude", "claude_desktop_config.json");
  }
}

/**
 * Install skill to local project
 */
async function installLocal(skill: SkillInfo): Promise<void> {
  const targetDir = path.join(process.cwd(), ".kai-skills", skill.id);
  
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  await downloadSkill(skill, targetDir);

  // Install dependencies
  const pkgPath = path.join(targetDir, "package.json");
  if (existsSync(pkgPath)) {
    execSync("npm install", { cwd: targetDir, stdio: "pipe" });
  }
}

/**
 * Download skill files from URL
 */
async function downloadSkill(skill: SkillInfo, targetDir: string): Promise<void> {
  if (skill.downloadUrl.startsWith("file://")) {
    // Local file - copy from filesystem
    const sourceDir = path.dirname(skill.downloadUrl.replace("file://", ""));
    copyDirectory(sourceDir, targetDir);
  } else {
    // Remote URL - download tarball
    await downloadAndExtract(skill.downloadUrl, targetDir);
  }
}

/**
 * Copy directory recursively
 */
function copyDirectory(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  const entries = require("fs").readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      writeFileSync(targetPath, readFileSync(sourcePath));
    }
  }
}

/**
 * Download and extract tarball
 */
async function downloadAndExtract(url: string, targetDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      // For now, just download - in production, use tar library
      const tarballPath = path.join(targetDir, "skill.tar.gz");
      const fileStream = createWriteStream(tarballPath);
      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        // TODO: Extract tarball - requires tar dependency
        resolve();
      });

      fileStream.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * Uninstall a skill
 */
export async function uninstallSkill(skillId: string, options: InstallOptions): Promise<void> {
  switch (options.target) {
    case "kai":
      const kaiDir = path.join(homedir(), ".kai", "skills", skillId);
      if (existsSync(kaiDir)) {
        rmSync(kaiDir, { recursive: true });
      }
      break;

    case "mcp":
      const configPath = options.claudeConfig || getDefaultClaudeConfigPath();
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, "utf-8"));
        if (config.mcpServers?.[skillId]) {
          delete config.mcpServers[skillId];
          writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
      }
      break;

    case "local":
      const localDir = path.join(process.cwd(), ".kai-skills", skillId);
      if (existsSync(localDir)) {
        rmSync(localDir, { recursive: true });
      }
      break;
  }
}

/**
 * Update all installed skills
 */
export async function updateSkills(options: InstallOptions): Promise<number> {
  // NOT IMPLEMENTED: Requires version comparison logic and registry cache
  throw new Error("Skill update not implemented. Please reinstall skills to get latest versions.");
}
