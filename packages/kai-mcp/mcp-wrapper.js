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

function loadConfig() {
  if (!existsSync(KAI_CONFIG_FILE)) {
    return { skills: {} };
  }
  try {
    return JSON.parse(readFileSync(KAI_CONFIG_FILE, 'utf-8'));
  } catch {
    return { skills: {} };
  }
}

// Get skill directory from args
const skillDir = resolve(process.argv[2]);
const skillName = skillDir.split('/').pop();

// Load Kai config
const config = loadConfig();
const skillConfig = config.skills?.[skillName] || {};

// Build environment with config values
const env = {
  ...process.env,
  ...skillConfig
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
