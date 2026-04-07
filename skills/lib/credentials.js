/**
 * Shared credential management for Kai skills
 * 
 * Provides secure storage and retrieval of API keys.
 * Skills use this to get credentials from Kai CLI config.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const KAI_DIR = join(homedir(), '.kai');
const CONFIG_FILE = join(KAI_DIR, 'config.json');
const CREDENTIALS_DIR = join(KAI_DIR, '.credentials');

// Get skill name from calling module
function getCallerSkill() {
  // This is a heuristic - assumes skill is in ~/.kai/skills/{skillName}/
  const stack = new Error().stack;
  const match = stack.match(/\/\.kai\/skills\/([^\/]+)\//);
  return match ? match[1] : null;
}

/**
 * Check if credentials are configured for a skill
 */
export function hasCredentials(skillName) {
  const name = skillName || getCallerSkill();
  if (!name) return false;
  
  // Check Kai CLI config
  const kaiConfig = loadKaiConfig();
  if (kaiConfig.skills?.[name]) {
    return Object.keys(kaiConfig.skills[name]).length > 0;
  }
  
  // Check environment variables
  const envPrefix = name.toUpperCase().replace(/-/g, '_');
  const requiredKeys = getRequiredEnvKeys(name);
  return requiredKeys.some(key => process.env[key] || process.env[`${envPrefix}_${key}`]);
}

/**
 * Get required environment variable names for a skill
 */
function getRequiredEnvKeys(skillName) {
  const defaults = {
    youtube: ['YOUTUBE_API_KEY'],
    twitter: ['TAVILY_API_KEY'],
    instagram: ['INSTAGRAM_ACCESS_TOKEN'],
    facebook: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID'],
    linkedin: ['LINKEDIN_ACCESS_TOKEN'],
    notion: ['NOTION_API_KEY'],
    slack: ['SLACK_BOT_TOKEN'],
    openrouter: ['OPENROUTER_API_KEY'],
    threads: ['THREADS_ACCESS_TOKEN'],
    tiktok: ['TAVILY_API_KEY'],
    bluesky: ['BLUESKY_IDENTIFIER', 'BLUESKY_PASSWORD'],
    'google-sheets': ['GOOGLE_SERVICE_ACCOUNT_JSON'],
  };
  
  return defaults[skillName] || [`${skillName.toUpperCase()}_API_KEY`];
}

/**
 * Load Kai CLI configuration
 */
function loadKaiConfig() {
  if (!existsSync(CONFIG_FILE)) {
    return { skills: {} };
  }
  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { skills: {} };
  }
}

/**
 * Setup credentials for a skill
 * This is called by the skill's 'setup' tool
 */
export async function setupCredentials(skillName, credentials) {
  const kaiConfig = loadKaiConfig();
  
  if (!kaiConfig.skills) {
    kaiConfig.skills = {};
  }
  
  kaiConfig.skills[skillName] = {
    ...kaiConfig.skills[skillName],
    ...credentials,
    _updated: new Date().toISOString()
  };
  
  // Ensure Kai directory exists
  if (!existsSync(KAI_DIR)) {
    mkdirSync(KAI_DIR, { recursive: true });
  }
  
  writeFileSync(CONFIG_FILE, JSON.stringify(kaiConfig, null, 2));
  
  return { success: true, skill: skillName, keys: Object.keys(credentials) };
}

/**
 * Inject credentials into environment for a skill
 * Called by MCP wrapper before spawning skill process
 */
export function injectCredentials(skillName, env = {}) {
  const kaiConfig = loadKaiConfig();
  const skillConfig = kaiConfig.skills?.[skillName] || {};
  
  // Merge: env vars > Kai config > existing env
  return {
    ...process.env,
    ...skillConfig,
    ...env  // Passed env vars (e.g., from web UI) take highest priority
  };
}

/**
 * Get credential value for a skill
 */
export function getCredential(skillName, key) {
  const kaiConfig = loadKaiConfig();
  const skillConfig = kaiConfig.skills?.[skillName] || {};
  
  // Priority: direct key in config > env var with skill prefix > plain env var
  return skillConfig[key] || 
         process.env[`${skillName.toUpperCase()}_${key}`] ||
         process.env[key];
}

export default {
  setupCredentials,
  injectCredentials,
  hasCredentials,
  getCredential
};
