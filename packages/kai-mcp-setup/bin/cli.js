#!/usr/bin/env node
/**
 * Kai MCP Setup - One-command Claude Code integration
 * 
 * Usage: npx kai-mcp-setup <skill-name>
 * Example: npx kai-mcp-setup youtube
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const skillRegistry = {
  // Social Media
  youtube: { name: 'YouTube', env: ['YOUTUBE_API_KEY'] },
  twitter: { name: 'Twitter/X', env: ['TAVILY_API_KEY', 'X_API_KEY'] },
  instagram: { name: 'Instagram', env: ['INSTAGRAM_ACCESS_TOKEN'] },
  facebook: { name: 'Facebook', env: ['FACEBOOK_ACCESS_TOKEN'] },
  linkedin: { name: 'LinkedIn', env: ['LINKEDIN_ACCESS_TOKEN'] },
  tiktok: { name: 'TikTok', env: ['TAVILY_API_KEY'] },
  threads: { name: 'Threads', env: ['THREADS_ACCESS_TOKEN'] },
  bluesky: { name: 'Bluesky', env: ['BLUESKY_HANDLE', 'BLUESKY_PASSWORD'] },
  
  // Automation
  openrouter: { name: 'OpenRouter', env: ['OPENROUTER_API_KEY'] },
  'google-sheets': { name: 'Google Sheets', env: ['GOOGLE_SERVICE_ACCOUNT_JSON'] },
  slack: { name: 'Slack', env: ['SLACK_BOT_TOKEN'] },
  webhook: { name: 'Webhook', env: [] },
  
  // Utilities
  browser: { name: 'Browser', env: [] },
  'data-storage': { name: 'Data Storage', env: [] },
  database: { name: 'Database', env: ['DATABASE_URL'] },
  docker: { name: 'Docker', env: [] },
  email: { name: 'Email', env: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] },
  git: { name: 'Git', env: [] },
  notion: { name: 'Notion', env: ['NOTION_API_KEY'] },
  'web-tools': { name: 'Web Tools', env: ['TAVILY_API_KEY'] },
};

function getKaiSkillsDir() {
  // Check common locations
  const locations = [
    path.join(os.homedir(), '.kai/skills'),
    '/usr/local/lib/kai/skills',
    '/opt/kai/skills',
    path.join(process.cwd(), 'skills'),
  ];
  
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }
  return null;
}

function getClaudeConfigPath() {
  const configDir = path.join(os.homedir(), '.claude');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'settings.json');
}

function readClaudeConfig() {
  const configPath = getClaudeConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.warn('⚠️  Could not read existing Claude config');
  }
  return {};
}

function writeClaudeConfig(config) {
  const configPath = getClaudeConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Claude config updated: ${configPath}`);
}

function setupSkill(skillId) {
  const skill = skillRegistry[skillId];
  if (!skill) {
    console.error(`❌ Unknown skill: ${skillId}`);
    console.log('\nAvailable skills:');
    Object.keys(skillRegistry).forEach(id => {
      console.log(`  • ${id} - ${skillRegistry[id].name}`);
    });
    process.exit(1);
  }

  const skillsDir = getKaiSkillsDir();
  if (!skillsDir) {
    console.error('❌ Could not find Kai skills directory');
    console.log('\nMake sure Kai is installed and skills are available at:');
    console.log('  ~/.kai/skills/');
    process.exit(1);
  }

  const skillPath = path.join(skillsDir, skillId);
  if (!fs.existsSync(skillPath)) {
    console.error(`❌ Skill not found: ${skillPath}`);
    console.log(`\nInstall it first: kai skill install ${skillId}`);
    process.exit(1);
  }

  console.log(`🔧 Setting up ${skill.name} for Claude Code...`);

  // Read current config
  const config = readClaudeConfig();
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Build env vars from current environment
  const env = {};
  for (const envVar of skill.env) {
    const value = process.env[envVar];
    if (value) {
      env[envVar] = value;
    }
  }

  // Add MCP server config
  config.mcpServers[skillId] = {
    command: 'npx',
    args: ['-y', 'kai-skill-mcp', skillPath],
    env: env,
  };

  // Write config
  writeClaudeConfig(config);

  console.log(`\n✅ ${skill.name} added to Claude Code!`);
  
  if (skill.env.length > 0) {
    const missing = skill.env.filter(e => !process.env[e]);
    if (missing.length > 0) {
      console.log(`\n⚠️  Missing environment variables:`);
      missing.forEach(e => console.log(`   • ${e}`));
      console.log(`\nSet them with: export ${missing[0]}=your_key_here`);
    }
  }
  
  console.log(`\n🚀 Restart Claude Code and try:`);
  console.log(`   "Use ${skillId} to..."`);
}

function setupAll() {
  console.log('🔧 Setting up all Kai skills for Claude Code...\n');
  
  const skillsDir = getKaiSkillsDir();
  if (!skillsDir) {
    console.error('❌ Could not find Kai skills directory');
    process.exit(1);
  }

  const installedSkills = fs.readdirSync(skillsDir)
    .filter(dir => fs.statSync(path.join(skillsDir, dir)).isDirectory())
    .filter(dir => skillRegistry[dir]);

  console.log(`Found ${installedSkills.length} skills:\n`);
  
  for (const skillId of installedSkills) {
    try {
      setupSkill(skillId);
      console.log('');
    } catch (e) {
      console.error(`❌ Failed to setup ${skillId}: ${e.message}`);
    }
  }
  
  console.log('✅ All skills configured!');
  console.log('\n🚀 Restart Claude Code to use them');
}

function listSkills() {
  console.log('📦 Available Kai Skills:\n');
  
  const categories = {
    'Social Media': ['youtube', 'twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'threads', 'bluesky'],
    'Automation': ['openrouter', 'google-sheets', 'slack', 'webhook'],
    'Utilities': ['browser', 'data-storage', 'database', 'docker', 'email', 'git', 'notion', 'web-tools'],
  };
  
  for (const [category, skillIds] of Object.entries(categories)) {
    console.log(`${category}:`);
    for (const id of skillIds) {
      const skill = skillRegistry[id];
      const installed = getKaiSkillsDir() && fs.existsSync(path.join(getKaiSkillsDir(), id));
      const status = installed ? '✅' : '⬜';
      console.log(`  ${status} ${id} - ${skill.name}`);
    }
    console.log('');
  }
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'list') {
  listSkills();
} else if (command === 'all') {
  setupAll();
} else if (command === 'help' || command === '--help' || command === '-h') {
  console.log(`
Kai MCP Setup - Easy Claude Code Integration

Usage:
  npx kai-mcp-setup <skill-name>     Setup a specific skill
  npx kai-mcp-setup all              Setup all installed skills
  npx kai-mcp-setup list             List available skills

Examples:
  npx kai-mcp-setup youtube          Add YouTube skill to Claude
  npx kai-mcp-setup notion           Add Notion skill to Claude
  npx kai-mcp-setup all              Add all skills at once

Requirements:
  • Kai CLI installed with skills in ~/.kai/skills/
  • Claude Code CLI installed
  • Environment variables set for API keys

The tool will automatically:
  • Find your Kai skills directory
  • Read your Claude Code config
  • Add MCP server entries
  • Preserve existing config
  `);
} else {
  setupSkill(command);
}
