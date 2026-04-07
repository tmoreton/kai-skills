#!/usr/bin/env node
/**
 * kai-skills - Quick MCP setup for Kai skills
 * No Kai CLI required! Just Node.js and Claude Desktop/Code
 */

import { homedir } from 'os';
import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

const KAI_DIR = join(homedir(), '.kai');
const SKILLS_DIR = join(KAI_DIR, 'skills');
const CONFIG_FILE = join(KAI_DIR, 'config.json');
const CLAUDE_CONFIG_DIR = join(homedir(), 'Library/Application Support/Claude');
const CLAUDE_CONFIG_FILE = join(CLAUDE_CONFIG_DIR, 'claude_desktop_config.json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function print(color, message) {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

// Config management functions
function ensureKaiDir() {
  if (!existsSync(KAI_DIR)) {
    mkdirSync(KAI_DIR, { recursive: true });
  }
}

function loadConfig() {
  ensureKaiDir();
  if (!existsSync(CONFIG_FILE)) {
    return { skills: {} };
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return { skills: {} };
  }
}

function saveConfig(config) {
  ensureKaiDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function setSkillConfig(skill, key, value) {
  const config = loadConfig();
  if (!config.skills) config.skills = {};
  if (!config.skills[skill]) config.skills[skill] = {};
  config.skills[skill][key] = value;
  saveConfig(config);
}

function getSkillConfig(skill, key) {
  const config = loadConfig();
  if (!config.skills || !config.skills[skill]) return undefined;
  if (key) return config.skills[skill][key];
  return config.skills[skill];
}

function removeSkillConfig(skill, key) {
  const config = loadConfig();
  if (!config.skills[skill]) return;
  if (key) {
    delete config.skills[skill][key];
  } else {
    delete config.skills[skill];
  }
  saveConfig(config);
}

function listConfig() {
  const config = loadConfig();
  if (Object.keys(config.skills).length === 0) {
    print('yellow', '\n⚠️  No skill configurations set.\n');
    print('dim', 'Set config with: kai-skills config set <skill> <key> <value>\n');
    return;
  }

  print('bold', '\n🔐 Skill Configurations');
  print('dim', '======================\n');

  for (const [skill, keys] of Object.entries(config.skills)) {
    print('green', `${skill}:`);
    for (const key of Object.keys(keys)) {
      const value = keys[key];
      const masked = value.length > 8 
        ? value.substring(0, 4) + '****' + value.substring(value.length - 4)
        : '****';
      print('dim', `  ${key}: ${masked}`);
    }
  }
  print('');
}

// Load Claude Desktop config
function loadClaudeConfig() {
  if (!existsSync(CLAUDE_CONFIG_FILE)) {
    return { mcpServers: {} };
  }
  try {
    return JSON.parse(readFileSync(CLAUDE_CONFIG_FILE, 'utf-8'));
  } catch {
    return { mcpServers: {} };
  }
}

function saveClaudeConfig(config) {
  if (!existsSync(CLAUDE_CONFIG_DIR)) {
    mkdirSync(CLAUDE_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CLAUDE_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Sync Kai config to Claude Desktop config
function syncConfig() {
  const kaiConfig = loadConfig();
  const claudeConfig = loadClaudeConfig();
  
  if (!kaiConfig.skills || Object.keys(kaiConfig.skills).length === 0) {
    print('yellow', '\n⚠️  No skill configurations to sync.\n');
    print('dim', 'Set config first: kai-skills config set <skill> <key> <value>\n');
    return false;
  }

  let updated = 0;
  
  for (const [skillName, config] of Object.entries(kaiConfig.skills)) {
    const serverName = `kai-${skillName}`;
    
    if (!claudeConfig.mcpServers[serverName]) {
      print('dim', `  Skipping ${skillName} - not added to Claude Desktop yet\n`);
      continue;
    }
    
    // Add env section if not exists
    if (!claudeConfig.mcpServers[serverName].env) {
      claudeConfig.mcpServers[serverName].env = {};
    }
    
    // Copy all config keys to env
    for (const [key, value] of Object.entries(config)) {
      if (key.startsWith('_')) continue; // Skip metadata
      claudeConfig.mcpServers[serverName].env[key] = value;
      updated++;
    }
    
    print('green', `  ✅ Synced ${skillName}`);
  }
  
  if (updated > 0) {
    saveClaudeConfig(claudeConfig);
    print('bold', `\n✅ Synced ${updated} API keys to Claude Desktop config\n`);
    print('dim', 'Restart Claude Desktop for changes to take effect.\n');
    return true;
  } else {
    print('yellow', '\n⚠️  No skills to sync. Add skills first with: kai-skills add <skill>\n');
    return false;
  }
}

function getSkills() {
  const locations = [SKILLS_DIR, join(SKILLS_DIR, 'skills')];
  
  for (const dir of locations) {
    if (!existsSync(dir)) continue;
    
    const skills = readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
      .map(d => ({
        name: d.name,
        path: join(dir, d.name, 'handler.js')
      }))
      .filter(s => existsSync(s.path));
    
    if (skills.length > 0) return skills;
  }
  
  return [];
}

function listSkills() {
  const skills = getSkills();
  
  if (skills.length === 0) {
    print('red', '\n❌ No skills installed\n');
    print('dim', 'Run: kai-skills install\n');
    return;
  }
  
  const config = loadConfig();
  
  print('bold', '\n📦 Kai Skills Available');
  print('dim', '=======================\n');
  
  for (const skill of skills) {
    const hasConfig = config.skills?.[skill.name];
    const status = hasConfig ? '✓' : '○';
    print(hasConfig ? 'green' : 'dim', `  ${status} ${skill.name}`);
  }
  
  print('bold', '\n\n🔌 Quick MCP Commands');
  print('dim', '====================\n');
  
  for (const skill of skills) {
    const shortPath = `~/.kai/skills/${skill.name}/handler.js`;
    print('dim', `# Add ${skill.name}:`);
    print('cyan', `claude mcp add kai-${skill.name} -- node ${shortPath}\n`);
  }
  
  print('dim', '# Or add all at once:');
  print('cyan', `kai-skills add all\n`);
}

function addSkill(skillName, all = false) {
  if (skillName === 'all') {
    const skills = getSkills();
    if (skills.length === 0) {
      print('red', '\n❌ No skills to add. Run: git clone https://github.com/tmoreton/kai-skills ~/.kai/skills\n');
      return;
    }
    
    let success = 0;
    for (const skill of skills) {
      if (addSingleSkill(skill.name, true)) success++;
    }
    print('green', `\n✅ Added ${success}/${skills.length} skills\n`);
    print('dim', 'Next: kai-skills sync-config (to copy API keys)\n');
    return;
  }
  
  addSingleSkill(skillName);
}

function addSingleSkill(skillName, quiet = false) {
  const locations = [
    join(SKILLS_DIR, skillName, 'handler.js'),
    join(SKILLS_DIR, 'skills', skillName, 'handler.js')
  ];
  
  let handlerPath = null;
  let actualSkillDir = null;
  
  for (const path of locations) {
    if (existsSync(path)) {
      handlerPath = path;
      actualSkillDir = dirname(path);
      break;
    }
  }
  
  if (!handlerPath) {
    if (!quiet) {
      print('red', `\n❌ Skill "${skillName}" not found\n`);
      print('dim', 'Available skills:\n');
      listSkills();
    }
    return false;
  }
  
  try {
    execSync('which claude', { stdio: 'pipe' });
    
    const cliPath = new URL(import.meta.url).pathname;
    const wrapperPath = join(dirname(cliPath), 'mcp-wrapper.js');
    
    execSync(`claude mcp add kai-${skillName} -- node "${wrapperPath}" "${actualSkillDir}"`, {
      stdio: quiet ? 'pipe' : 'inherit'
    });
    
    if (!quiet) {
      print('green', `\n✅ Added kai-${skillName}\n`);
      print('dim', 'Next: kai-skills config set ' + skillName + ' <API_KEY> <value>\n');
      print('dim', 'Then: kai-skills sync-config\n');
    }
    return true;
  } catch (e) {
    const wrapperShortPath = `$(npm root -g)/kai-skills/mcp-wrapper.js`;
    
    if (!quiet) {
      print('yellow', '\n⚠️  Claude CLI not found. Install it or run manually:\n');
      print('cyan', `\n  claude mcp add kai-${skillName} -- node ${wrapperShortPath} ~/.kai/skills/${skillName}\n`);
      print('dim', '\nOr edit Claude Desktop config directly:');
      print('dim', `  ${CLAUDE_CONFIG_FILE}\n`);
    }
    return false;
  }
}

function removeSkill(skillName) {
  try {
    execSync(`claude mcp remove kai-${skillName}`, { stdio: 'inherit' });
    print('green', `\n✅ Removed kai-${skillName}\n`);
  } catch (e) {
    print('yellow', `\n⚠️  Run manually: claude mcp remove kai-${skillName}\n`);
  }
}

function installSkills() {
  print('bold', '\n📥 Installing Kai Skills');
  print('dim', '========================\n');
  
  const kaiDir = join(homedir(), '.kai');
  const skillsDir = join(kaiDir, 'skills');
  const tempDir = join(kaiDir, '.tmp-skills-repo');
  
  if (!existsSync(kaiDir)) {
    mkdirSync(kaiDir, { recursive: true });
  }
  
  try {
    if (existsSync(tempDir)) {
      print('dim', 'Cleaning up temp directory...\n');
      execSync(`rm -rf "${tempDir}"`);
    }
    
    print('dim', 'Cloning kai-skills repo...\n');
    execSync(
      `git clone https://github.com/tmoreton/kai-skills.git "${tempDir}"`,
      { stdio: 'inherit' }
    );
    
    if (existsSync(skillsDir)) {
      print('dim', 'Removing old skills...\n');
      execSync(`rm -rf "${skillsDir}"`);
    }
    
    const skillsSource = join(tempDir, 'skills');
    if (existsSync(skillsSource)) {
      print('dim', 'Installing skills...\n');
      execSync(`mv "${skillsSource}" "${skillsDir}"`);
    } else {
      throw new Error('Skills folder not found in cloned repo');
    }
    
    // Copy lib/ to ~/.kai/lib (outside skills to avoid detection as skill)
    const libSource = join(tempDir, 'skills', 'lib');
    const libDest = join(kaiDir, 'lib');
    if (existsSync(libSource)) {
      if (!existsSync(libDest)) {
        mkdirSync(libDest, { recursive: true });
      }
      execSync(`cp -r "${libSource}"/* "${libDest}/" 2>/dev/null || true`);
    }
    
    if (existsSync(tempDir)) {
      execSync(`rm -rf "${tempDir}"`);
    }
    
    print('green', '\n✅ Skills installed to ~/.kai/skills\n');
    print('dim', 'Next steps:\n');
    print('dim', '  1. kai-skills add all\n');
    print('dim', '  2. kai-skills config set youtube YOUTUBE_API_KEY your_key\n');
    print('dim', '  3. kai-skills sync-config\n');
    print('dim', '  4. Restart Claude Desktop\n');
  } catch (e) {
    if (existsSync(tempDir)) {
      execSync(`rm -rf "${tempDir}"`);
    }
    print('red', '\n❌ Failed to install\n');
    print('dim', e.message + '\n');
  }
}

function showHelp() {
  console.log(`
${colors.bold}kai-skills${colors.reset} - Connect Kai skills to Claude Desktop

${colors.dim}Usage:${colors.reset}
  kai-skills                    List installed skills
  kai-skills add <skill|all>    Add skill(s) to Claude
  kai-skills remove <skill>     Remove skill from Claude
  kai-skills install            Install Kai skills from GitHub
  kai-skills config             Manage API keys (see below)
  kai-skills sync-config        Copy API keys to Claude Desktop

${colors.dim}Config Commands:${colors.reset}
  kai-skills config list                    Show all API keys
  kai-skills config get <skill>             Show keys for a skill
  kai-skills config set <skill> <key> <value>   Set an API key
  kai-skills config remove <skill>          Remove all keys for skill

${colors.dim}Quick Start for Non-Developers:${colors.reset}
  1. npm install -g kai-skills
  2. kai-skills install
  3. kai-skills add all
  4. kai-skills config set youtube YOUTUBE_API_KEY your_key_here
  5. kai-skills sync-config
  6. Restart Claude Desktop

${colors.dim}Where to get API keys:${colors.reset}
  • YouTube: https://console.cloud.google.com/apis/credentials
  • OpenRouter: https://openrouter.ai/keys
  • Tavily (Twitter/TikTok search): https://tavily.com/
`);
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'list') {
  listSkills();
} else if (command === 'add') {
  const skillName = args[1];
  if (!skillName) {
    print('red', 'Usage: kai-skills add <skill-name> or kai-skills add all\n');
    process.exit(1);
  }
  addSkill(skillName);
} else if (command === 'remove') {
  const skillName = args[1];
  if (!skillName) {
    print('red', 'Usage: kai-skills remove <skill-name>\n');
    process.exit(1);
  }
  removeSkill(skillName);
} else if (command === 'install') {
  installSkills();
} else if (command === 'sync-config') {
  syncConfig();
} else if (command === 'config') {
  const subcommand = args[1];
  const skill = args[2];
  const key = args[3];
  const value = args.slice(4).join(' ');

  switch (subcommand) {
    case 'list':
    case 'ls':
      listConfig();
      break;
    case 'get':
      if (!skill) {
        print('red', 'Usage: kai-skills config get <skill> [key]\n');
        process.exit(1);
      }
      const result = getSkillConfig(skill, key);
      if (result === undefined) {
        print('yellow', `\n⚠️  No config found for ${skill}${key ? `/${key}` : ''}\n`);
      } else if (typeof result === 'object') {
        print('green', `\n${skill}:`);
        for (const [k, v] of Object.entries(result)) {
          print('dim', `  ${k}: ${v.substring(0, 4)}****`);
        }
        print('');
      } else {
        console.log(result);
      }
      break;
    case 'set':
      if (!skill || !key || !value) {
        print('red', 'Usage: kai-skills config set <skill> <key> <value>\n');
        print('dim', 'Example: kai-skills config set youtube YOUTUBE_API_KEY xxx\n');
        process.exit(1);
      }
      setSkillConfig(skill, key, value);
      print('green', `\n✅ Set ${skill}/${key}\n`);
      print('dim', 'Run "kai-skills sync-config" to apply to Claude Desktop\n');
      break;
    case 'remove':
    case 'rm':
    case 'delete':
      if (!skill) {
        print('red', 'Usage: kai-skills config remove <skill> [key]\n');
        process.exit(1);
      }
      removeSkillConfig(skill, key);
      print('green', `\n✅ Removed ${skill}${key ? `/${key}` : ''}\n`);
      break;
    default:
      print('yellow', '\nConfig Commands:\n');
      print('dim', '  kai-skills config list\n');
      print('dim', '  kai-skills config get <skill> [key]\n');
      print('dim', '  kai-skills config set <skill> <key> <value>\n');
      print('dim', '  kai-skills config remove <skill> [key]\n');
  }
} else if (command === 'help' || command === '--help' || command === '-h') {
  showHelp();
} else {
  print('red', `Unknown command: ${command}\n`);
  showHelp();
  process.exit(1);
}
