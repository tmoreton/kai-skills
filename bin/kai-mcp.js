#!/usr/bin/env node
/**
 * Kai MCP Helper - Generates short MCP commands for Claude Desktop/Code
 */

import { homedir } from 'os';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const SKILLS_DIR = join(homedir(), '.kai', 'skills');

function listSkills() {
  if (!existsSync(SKILLS_DIR)) {
    console.log('No skills found. Install skills first with:');
    console.log('  git clone https://github.com/tmoreton/kai-skills ~/.kai/skills');
    return;
  }
  
  const skills = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  console.log('\nInstalled Kai Skills:');
  console.log('=====================');
  
  for (const skill of skills) {
    const handlerPath = join(SKILLS_DIR, skill, 'handler.js');
    if (existsSync(handlerPath)) {
      console.log(`\n📦 ${skill}`);
      console.log(`   Claude Desktop: claude mcp add kai-${skill} -- node ${handlerPath}`);
      console.log(`   Claude Code:    claude mcp add kai-${skill} -- node ${handlerPath}`);
    }
  }
  
  console.log('\n\nQuick Setup (copy & paste):');
  console.log('=============================');
  
  // Generate one-liner for all skills
  const commands = skills
    .filter(s => existsSync(join(SKILLS_DIR, s, 'handler.js')))
    .map(s => `claude mcp add kai-${s} -- node ${join(SKILLS_DIR, s, 'handler.js')}`);
  
  if (commands.length > 0) {
    console.log('\n# Add all skills to Claude Desktop:');
    console.log(commands.join(' && \\\n'));
  }
  
  console.log('\n\n# Or add individually:');
  for (const skill of skills.slice(0, 3)) {
    console.log(`claude mcp add kai-${skill} -- node ${join(SKILLS_DIR, skill, 'handler.js')}`);
  }
  if (skills.length > 3) {
    console.log(`# ... and ${skills.length - 3} more`);
  }
}

function addSkill(skillName) {
  const handlerPath = join(SKILLS_DIR, skillName, 'handler.js');
  
  if (!existsSync(handlerPath)) {
    console.error(`❌ Skill "${skillName}" not found at ${handlerPath}`);
    console.log('\nAvailable skills:');
    listSkills();
    process.exit(1);
  }
  
  console.log(`\n✅ Add ${skillName} to Claude:`);
  console.log('=============================');
  console.log(`\nclaude mcp add kai-${skillName} -- node ${handlerPath}`);
  console.log('\nOr run this command directly:');
  console.log(`\x1b[36mclaude mcp add kai-${skillName} -- node ${handlerPath}\x1b[0m`);
}

function removeSkill(skillName) {
  console.log(`\n🗑️  Remove ${skillName} from Claude:`);
  console.log('==================================');
  console.log(`\nclaude mcp remove kai-${skillName}`);
}

function listMCP() {
  console.log('\n📋 To list your current MCP servers:');
  console.log('   claude mcp list');
  console.log('\n📋 To see Kai MCP config location:');
  console.log('   ls ~/Library/Application\ Support/Claude/claude_desktop_config.json');
}

// Parse arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'list') {
  listSkills();
} else if (command === 'add') {
  const skillName = args[1];
  if (!skillName) {
    console.error('Usage: kai-mcp add <skill-name>');
    process.exit(1);
  }
  addSkill(skillName);
} else if (command === 'remove') {
  const skillName = args[1];
  if (!skillName) {
    console.error('Usage: kai-mcp remove <skill-name>');
    process.exit(1);
  }
  removeSkill(skillName);
} else if (command === 'help' || command === '--help' || command === '-h') {
  console.log(`
Kai MCP Helper - Connect Kai skills to Claude

Usage:
  kai-mcp              List all skills with MCP commands
  kai-mcp add <skill>  Show command to add a skill
  kai-mcp remove <skill> Show command to remove a skill

Examples:
  kai-mcp              # List all installed skills
  kai-mcp add youtube  # Get command to add YouTube skill
  kai-mcp add all      # Get commands for all skills

Note: Claude Desktop and Claude Code use the same MCP system.
`);
} else {
  console.error(`Unknown command: ${command}`);
  console.log('Run "kai-mcp help" for usage');
  process.exit(1);
}

console.log('');
