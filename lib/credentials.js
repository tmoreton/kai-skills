/**
 * Shared credential management for Kai skills
 * 
 * Provides secure storage and retrieval of API keys.
 * Skills use this to get credentials from Kai CLI config.
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
 */
export function getCredential(skillName, envKey, config = {}) {
  // Priority 1: Environment variable (Kai web UI, system, or injected)
  if (envKey && process.env[envKey]) {
    return process.env[envKey];
  }
  
  // Priority 2: Config object from MCP/Kai
  if (envKey && config[envKey]) {
    return config[envKey];
  }
  
  // Priority 3: Stored credentials (kai config.json)
  const kaiConfig = loadKaiConfig();
  const skillConfig = kaiConfig.skills?.[skillName];
  if (skillConfig) {
    if (envKey && skillConfig[envKey]) return skillConfig[envKey];
    const lowerKey = envKey?.toLowerCase();
    if (lowerKey && skillConfig[lowerKey]) return skillConfig[lowerKey];
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
  
  kaiConfig.skills[skillName] = {
    ...kaiConfig.skills[skillName],
    ...credentials,
    _updated: new Date().toISOString()
  };
  
  if (!existsSync(KAI_DIR)) {
    mkdirSync(KAI_DIR, { recursive: true });
  }
  
  writeFileSync(CONFIG_FILE, JSON.stringify(kaiConfig, null, 2));
  
  // Also set in process.env for immediate use
  for (const [key, value] of Object.entries(credentials)) {
    process.env[key] = value;
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

/**
 * Legacy compatibility - inject credentials into process.env
 * Returns merged env object
 */
export function injectCredentials(skillName, env = {}) {
  const kaiConfig = loadKaiConfig();
  const skillConfig = kaiConfig.skills?.[skillName] || {};
  
  // Merge: env vars > Kai config > existing env
  const merged = {
    ...process.env,
    ...skillConfig,
    ...env
  };
  
  // Also set back to process.env for immediate use
  for (const [key, value] of Object.entries(skillConfig)) {
    if (value && !key.startsWith('_')) {
      process.env[key] = value;
    }
  }
  
  return merged;
}

export default {
  getCredential,
  getCredentials,
  setupCredentials,
  hasCredentials,
  injectCredentials
};
