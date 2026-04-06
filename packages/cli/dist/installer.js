/**
 * Skill installer - handles installation to different targets
 */
import { execSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { homedir } from "os";
import path from "path";
import https from "https";
const REGISTRY_URL = "https://raw.githubusercontent.com/tim-moreton/kai-skills/main/registry/skills.json";
/**
 * Fetch skills from registry
 */
export async function listSkills() {
    try {
        const response = await fetch(REGISTRY_URL);
        const data = await response.json();
        return data.skills;
    }
    catch {
        // Fallback: load from local filesystem during development
        return loadLocalSkills();
    }
}
/**
 * Load skills from local filesystem (development mode)
 */
function loadLocalSkills() {
    const skillsDir = path.join(process.cwd(), "..", "..", "skills");
    const skills = [];
    try {
        const entries = require("fs").readdirSync(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const manifestPath = path.join(skillsDir, entry.name, "skill.yaml");
            if (!existsSync(manifestPath))
                continue;
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
                tools: manifest.tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                })),
            });
        }
    }
    catch {
        // No local skills found
    }
    return skills;
}
/**
 * Install a skill to the specified target
 */
export async function installSkill(skillId, options) {
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
async function installToKai(skill) {
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
async function installToMcp(skill, claudeConfigPath) {
    const configPath = claudeConfigPath || getDefaultClaudeConfigPath();
    let config = {};
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
function getDefaultClaudeConfigPath() {
    const platform = process.platform;
    if (platform === "darwin") {
        return path.join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
    }
    else if (platform === "win32") {
        return path.join(process.env.APPDATA || homedir(), "Claude", "claude_desktop_config.json");
    }
    else {
        return path.join(homedir(), ".config", "Claude", "claude_desktop_config.json");
    }
}
/**
 * Install skill to local project
 */
async function installLocal(skill) {
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
async function downloadSkill(skill, targetDir) {
    if (skill.downloadUrl.startsWith("file://")) {
        // Local file - copy from filesystem
        const sourceDir = path.dirname(skill.downloadUrl.replace("file://", ""));
        copyDirectory(sourceDir, targetDir);
    }
    else {
        // Remote URL - download tarball
        await downloadAndExtract(skill.downloadUrl, targetDir);
    }
}
/**
 * Copy directory recursively
 */
function copyDirectory(source, target) {
    mkdirSync(target, { recursive: true });
    const entries = require("fs").readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(target, entry.name);
        if (entry.isDirectory()) {
            copyDirectory(sourcePath, targetPath);
        }
        else {
            writeFileSync(targetPath, readFileSync(sourcePath));
        }
    }
}
/**
 * Download and extract tarball
 */
async function downloadAndExtract(url, targetDir) {
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
                // TODO: Extract tarball
                resolve();
            });
            fileStream.on("error", reject);
        }).on("error", reject);
    });
}
/**
 * Uninstall a skill
 */
export async function uninstallSkill(skillId, options) {
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
export async function updateSkills(options) {
    // TODO: Check versions and update outdated skills
    return 0;
}
