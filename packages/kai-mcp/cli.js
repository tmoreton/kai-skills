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
  if (!config.skills[skill]) {
    config.skills[skill] = {};
  }
  config.skills[skill][key] = value;
  saveConfig(config);
}

function getSkillConfig(skill, key) {
  const config = loadConfig();
  if (!config.skills[skill]) return undefined;
  return key ? config.skills[skill][key] : config.skills[skill];
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

function getSkills() {
  // Check both locations (direct or in skills/ subdirectory)
  const locations = [
    SKILLS_DIR,
    join(SKILLS_DIR, 'skills')  // When cloned from GitHub, skills are in subfolder
  ];
  
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
    print('yellow', '\n⚠️  No Kai skills found.\n');
    print('dim', 'Install skills first:\n');
    print('cyan', '  git clone https://github.com/tmoreton/kai-skills ~/.kai/skills\n');
    return;
  }
  
  print('bold', '\n📦 Kai Skills Available');
  print('dim', '=======================\n');
  
  for (const skill of skills) {
    print('green', `  ✓ ${skill.name}`);
  }
  
  print('bold', '\n\n🔌 Quick MCP Commands');
  print('dim', '====================\n');
  
  // Generate short commands using ~ instead of full path
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
    
    print('bold', `\n🚀 Adding ${skills.length} skills to Claude...\n`);
    
    for (const skill of skills) {
      addSingleSkill(skill.name, true);
    }
    
    print('green', '\n✅ All skills added!');
    print('dim', '\nRestart Claude Desktop or run \'claude\' to use them.\n');
    print('yellow', 'Test: "Get my YouTube stats for channel UCBa659QWEk1AI4Tg--mrJ2A"\n');
    return;
  }
  
  addSingleSkill(skillName);
}

function addSingleSkill(skillName, quiet = false) {
  // Check both locations (direct or in skills/ subdirectory)
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
    // Check if claude CLI is available
    execSync('which claude', { stdio: 'pipe' });
    
    // Use MCP wrapper to run the skill
    // Get the path to this CLI script to find the wrapper
    const cliPath = new URL(import.meta.url).pathname;
    const wrapperPath = join(dirname(cliPath), 'mcp-wrapper.js');
    
    // Add via claude CLI with wrapper
    execSync(`claude mcp add kai-${skillName} -- node "${wrapperPath}" "${actualSkillDir}"`, {
      stdio: quiet ? 'pipe' : 'inherit'
    });
    
    if (!quiet) {
      print('green', `\n✅ Added kai-${skillName}\n`);
    }
    return true;
  } catch (e) {
    // Claude CLI not available, show manual command
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
    // Remove temp dir if it exists from previous failed attempt
    if (existsSync(tempDir)) {
      execSync(`rm -rf "${tempDir}"`);
    }
    
    // Clone to temp location
    execSync(
      `git clone https://github.com/tmoreton/kai-skills.git "${tempDir}"`,
      { stdio: 'inherit' }
    );
    
    // Clean up existing skills if any
    if (existsSync(skillsDir)) {
      execSync(`rm -rf "${skillsDir}"`);
    }
    
    // Move skills/* to ~/.kai/skills/
    const skillsSource = join(tempDir, 'skills');
    if (existsSync(skillsSource)) {
      execSync(`mv "${skillsSource}" "${skillsDir}"`);
    }
    
    // Also copy lib/ folder for shared utilities (credentials.js)
    const libSource = join(tempDir, 'skills', 'lib');
    const libDest = join(skillsDir, 'lib');
    if (existsSync(libSource)) {
      if (!existsSync(libDest)) {
        mkdirSync(libDest, { recursive: true });
      }
      execSync(`cp -r "${libSource}"/* "${libDest}/" 2>/dev/null || true`);
    }
    
    // Clean up temp repo
    execSync(`rm -rf "${tempDir}"`);
    
    print('green', '\n✅ Skills installed to ~/.kai/skills\n');
    print('dim', 'Now run: kai-skills add all\n');
  } catch (e) {
    // Clean up temp on error
    if (existsSync(tempDir)) {
      execSync(`rm -rf "${tempDir}"`);
    }
    print('red', '\n❌ Failed to install. Try manually:\n');
    print('cyan', '  git clone https://github.com/tmoreton/kai-skills /tmp/kai-skills\n');
    print('cyan', '  mv /tmp/kai-skills/skills ~/.kai/skills\n');
    print('cyan', '  rm -rf /tmp/kai-skills\n');
  }
}

function showHelp() {
  console.log(`
${colors.bold}kai-skills${colors.reset} - Connect Kai skills to Claude

${colors.dim}Usage:${colors.reset}
  kai-skills                    List installed skills
  kai-skills add <skill|all>    Add skill(s) to Claude
  kai-skills remove <skill>     Remove skill from Claude
  kai-skills install            Install Kai skills from GitHub
  kai-skills config             Manage skill configurations

${colors.dim}Config Commands:${colors.reset}
  kai-skills config list        List all configurations
  kai-skills config get <skill> [key]     Get config for a skill
  kai-skills config set <skill> <key> <value>   Set config value
  kai-skills config remove <skill> [key]  Remove config

${colors.dim}Examples:${colors.reset}
  kai-skills config set youtube YOUTUBE_API_KEY your_key_here
  kai-skills config set bluesky identifier your_handle
  kai-skills config set bluesky password your_password
  kai-skills config get youtube
  kai-skills config list

${colors.dim}Quick Start:${colors.reset}
  1. npm install -g kai-skills
  2. kai-skills install
  3. kai-skills add all
  4. kai-skills config set youtube YOUTUBE_API_KEY xxx
  5. Restart Claude Desktop

${colors.dim}No Kai CLI required!${colors.reset} Just Node.js + Claude Desktop/Code.
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
          print('dim', `  ${k}: ${v}`);
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
