/**
 * Kai Credentials Helper - Secure local credential storage for skills
 * 
 * Usage in your skill:
 *   import { setupCredentials, getCredentials, hasCredentials } from '../lib/credentials.js';
 * 
 *   // In your handler:
 *   case 'setup':
 *     return setupCredentials('youtube', params);
 *   
 *   case 'get_stats':
 *     const creds = getCredentials('youtube');
 *     if (!creds) throw new Error('Run setup first');
 *     // Use creds.api_key...
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { homedir } from 'os';

const KAI_DIR = path.join(homedir(), '.kai');
const KAI_CONFIG_FILE = path.join(KAI_DIR, 'config.json');

// Get or create encryption key (derived from machine + user path)
function getEncryptionKey() {
  const seed = `${homedir()}-${process.platform}-${process.getuid?.() || 0}`;
  return crypto.createHash('sha256').update(seed).digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

function getCredsFile(skillId) {
  const skillDir = path.join(KAI_DIR, 'skills', skillId);
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }
  return path.join(skillDir, '.credentials');
}

// Load central Kai config (from kai-skills CLI)
function loadKaiConfig() {
  if (!fs.existsSync(KAI_CONFIG_FILE)) {
    return { skills: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(KAI_CONFIG_FILE, 'utf-8'));
  } catch {
    return { skills: {} };
  }
}

export function setupCredentials(skillId, credentials) {
  if (!credentials || Object.keys(credentials).length === 0) {
    throw new Error('No credentials provided');
  }
  
  const credsFile = getCredsFile(skillId);
  const encrypted = encrypt(JSON.stringify(credentials));
  fs.writeFileSync(credsFile, encrypted, { mode: 0o600 });
  
  return { 
    success: true, 
    message: `Credentials for ${skillId} saved securely`,
    keys: Object.keys(credentials)
  };
}

export function getCredentials(skillId) {
  // Priority 1: Per-skill encrypted storage (conversation setup)
  const credsFile = getCredsFile(skillId);
  if (fs.existsSync(credsFile)) {
    try {
      const encrypted = fs.readFileSync(credsFile, 'utf8');
      const decrypted = decrypt(encrypted);
      if (decrypted) return JSON.parse(decrypted);
    } catch {
      // Fall through to next source
    }
  }
  
  // Priority 2: Central Kai config (CLI: kai-skills config set)
  const kaiConfig = loadKaiConfig();
  if (kaiConfig.skills?.[skillId]) {
    return kaiConfig.skills[skillId];
  }
  
  return null;
}

export function hasCredentials(skillId) {
  return getCredentials(skillId) !== null;
}

export function clearCredentials(skillId) {
  const credsFile = getCredsFile(skillId);
  if (fs.existsSync(credsFile)) {
    fs.unlinkSync(credsFile);
  }
  return { success: true, message: `Credentials for ${skillId} cleared` };
}

// Inject credentials into process.env for this skill
// Also checks environment variables as final fallback
export function injectCredentials(skillId) {
  // Get stored credentials (encrypted store or kai config)
  const storedCreds = getCredentials(skillId);
  
  // Build effective config: stored creds + env vars (env vars win if conflict)
  const effectiveCreds = { ...storedCreds };
  
  // Check environment variables (from web UI or system)
  for (const [key, value] of Object.entries(process.env)) {
    if (key.includes(skillId.toUpperCase()) || key.includes('API_KEY') || key.includes('TOKEN')) {
      effectiveCreds[key] = value;
    }
  }
  
  // Inject into process.env
  for (const [key, value] of Object.entries(effectiveCreds)) {
    if (value) process.env[key] = value;
  }
  
  return effectiveCreds;
}
