/**
 * Standard credential getter for all Kai skills
 * Checks in priority order: env vars > config > stored credentials
 * 
 * Usage in skill handler:
 *   import { getCredentials } from '../lib/credentials.js';
 *   
 *   const apiKey = getCredentials('youtube', 'YOUTUBE_API_KEY', config);
 *   if (!apiKey) throw new Error('API key required');
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const KAI_DIR = join(homedir(), '.kai');
const CONFIG_FILE = join(KAI_DIR, 'config.json');

/**
 * Get credential value using standard priority:
 * 1. process.env (from Kai web UI or system) - HIGHEST
 * 2. config object passed from MCP/Kai
 * 3. Stored credentials from kai config.json
 * 4. Stored credentials from conversation setup
 */
export function getCredential(skillName, envKey, config = {}) {
  // Priority 1: Environment variable (Kai web UI, system, or injected)
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  
  // Priority 2: Config object from MCP/Kai
  if (config[envKey]) {
    return config[envKey];
  }
  
  // Priority 3: Stored credentials (kai config.json)
  const kaiConfig = loadKaiConfig();
  const skillConfig = kaiConfig.skills?.[skillName];
  if (skillConfig) {
    // Check for exact env key match
    if (skillConfig[envKey]) return skillConfig[envKey];
    // Check for camelCase or lowercase version
    const lowerKey = envKey.toLowerCase();
    if (skillConfig[lowerKey]) return skillConfig[lowerKey];
  }
  
  return null;
}

/**
 * Get multiple credentials for a skill
 */
export function getCredentials(skillName, envKeys, config = {}) {
  const result = {};
  for (const key of envKeys) {
    result[key] = getCredential(skillName, key, config);
  }
  return result;
}

/**
 * Setup credentials for a skill (conversation-based)
 */
export async function setupCredentials(skillName, credentials) {
  const kaiConfig = loadKaiConfig();
  
  if (!kaiConfig.skills) {
    kaiConfig.skills = {};
  }
  
  // Map credentials to env-friendly format
  const mappedCreds = {};
  for (const [key, value] of Object.entries(credentials)) {
    // Store both original key and uppercase env-style key
    mappedCreds[key] = value;
    const envKey = `${skillName.toUpperCase().replace(/-/g, '_')}_${key.toUpperCase()}`;
    mappedCreds[envKey] = value;
  }
  
  kaiConfig.skills[skillName] = {
    ...kaiConfig.skills[skillName],
    ...mappedCreds,
    _updated: new Date().toISOString()
  };
  
  if (!existsSync(KAI_DIR)) {
    mkdirSync(KAI_DIR, { recursive: true });
  }
  
  writeFileSync(CONFIG_FILE, JSON.stringify(kaiConfig, null, 2));
  
  // Also set in process.env for immediate use
  for (const [key, value] of Object.entries(mappedCreds)) {
    if (key.includes('_')) process.env[key] = value;
  }
  
  return { success: true, skill: skillName, keys: Object.keys(credentials) };
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
 * Check if credentials exist for a skill
 */
export function hasCredentials(skillName, requiredKeys = [], config = {}) {
  return requiredKeys.every(key => getCredential(skillName, key, config));
}

export default {
  getCredential,
  getCredentials,
  setupCredentials,
  hasCredentials
};
