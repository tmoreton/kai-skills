#!/usr/bin/env node
/**
 * MCP Wrapper - Injects Kai config as environment variables before running skills
 * 
 * Usage: node mcp-wrapper.js /path/to/skill
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';

const KAI_CONFIG_FILE = join(homedir(), '.kai', 'config.json');
const SKILLS_DIR = join(homedir(), '.kai', 'skills');

function loadKaiConfig() {
  if (!existsSync(KAI_CONFIG_FILE)) {
    return { skills: {} };
  }
  try {
    return JSON.parse(readFileSync(KAI_CONFIG_FILE, 'utf-8'));
  } catch {
    return { skills: {} };
  }
}

function loadSkillCredentials(skillName) {
  const credsFile = join(SKILLS_DIR, skillName, '.credentials');
  if (!existsSync(credsFile)) return null;
  
  try {
    // Return as-is, skill will decrypt
    return { __encrypted_creds_file: credsFile };
  } catch {
    return null;
  }
}

// Get skill directory from args
const skillDir = resolve(process.argv[2]);
const skillName = skillDir.split('/').pop();

// Load configs in priority order
const kaiConfig = loadKaiConfig();
const skillConfig = kaiConfig.skills?.[skillName] || {};

// Build environment with config values
// Priority: process.env > kai config.json > defaults
const env = {
  ...skillConfig,      // Kai CLI config (lowest priority)
  ...process.env       // Existing env vars win (web UI or system)
};

// Spawn the skill handler with config-injected environment
const handlerPath = join(skillDir, 'handler.js');

const child = spawn('node', [handlerPath], {
  env,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
