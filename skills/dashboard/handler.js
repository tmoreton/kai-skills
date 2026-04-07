/**
 * Dashboard Skill Handler
 *
 * Manages local social media analytics dashboard:
 * - Auto-installs dependencies
 * - Securely stores API credentials (encrypted)
 * - Fetches data from connected accounts
 * - Displays visual charts
 * - 100% local - no cloud
 */

import fs from "fs";
import path from "path";
import os from "os";
import { spawn, exec } from "child_process";
import { createInterface } from "readline";
import crypto from "crypto";

const DASHBOARD_DIR = path.join(os.homedir(), ".kai/dashboard");
const DATA_FILE = path.join(DASHBOARD_DIR, "data.json");
const CREDS_FILE = path.join(DASHBOARD_DIR, ".credentials");
const SERVER_PID_FILE = path.join(DASHBOARD_DIR, ".server.pid");

// Simple encryption for local credentials (not military-grade but protects from casual snooping)
function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(text, key) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getEncryptionKey() {
  // Use machine-specific data as encryption key
  const machineId = require('node-machine-id').machineIdSync();
  return crypto.createHash('sha256').update(machineId).digest();
}

// Ensure dashboard directory exists
function ensureDashboard() {
  if (!fs.existsSync(DASHBOARD_DIR)) {
    fs.mkdirSync(DASHBOARD_DIR, { recursive: true });
  }
}

// Install dashboard dependencies
async function setupDashboard() {
  ensureDashboard();
  
  // Copy dashboard files
  const skillDir = path.dirname(new URL(import.meta.url).pathname);
  const templateDir = path.join(skillDir, 'template');
  
  if (!fs.existsSync(templateDir)) {
    throw new Error("Dashboard template not found. Skill may be corrupted.");
  }
  
  // Copy template files
  const files = ['package.json', 'server.js', 'public/index.html'];
  for (const file of files) {
    const src = path.join(templateDir, file);
    const dest = path.join(DASHBOARD_DIR, file);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
  
  // Install npm dependencies
  console.log("Installing dashboard dependencies...");
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], {
      cwd: DASHBOARD_DIR,
      stdio: 'inherit'
    });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('npm install failed')));
  });
  
  return { success: true, path: DASHBOARD_DIR, url: 'http://localhost:3000' };
}

// Start dashboard server
async function startDashboard(port = 3000) {
  ensureDashboard();
  
  // Check if already running
  if (fs.existsSync(SERVER_PID_FILE)) {
    const pid = fs.readFileSync(SERVER_PID_FILE, 'utf8');
    try {
      process.kill(parseInt(pid), 0); // Check if process exists
      return { 
        success: true, 
        url: `http://localhost:${port}`, 
        status: 'already-running',
        pid: parseInt(pid)
      };
    } catch {
      // Process dead, remove stale pid file
      fs.unlinkSync(SERVER_PID_FILE);
    }
  }
  
  // Start server
  const child = spawn('node', ['server.js'], {
    cwd: DASHBOARD_DIR,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, DASHBOARD_PORT: port.toString() }
  });
  
  child.unref();
  fs.writeFileSync(SERVER_PID_FILE, child.pid.toString());
  
  // Wait a moment for server to start
  await new Promise(r => setTimeout(r, 1000));
  
  return { 
    success: true, 
    url: `http://localhost:${port}`,
    status: 'started',
    pid: child.pid
  };
}

// Store encrypted credentials
async function addAccount(platform, credentials) {
  ensureDashboard();
  
  let creds = {};
  if (fs.existsSync(CREDS_FILE)) {
    try {
      const encrypted = fs.readFileSync(CREDS_FILE, 'utf8');
      creds = JSON.parse(decrypt(encrypted, getEncryptionKey()));
    } catch {
      creds = {};
    }
  }
  
  creds[platform] = credentials;
  
  const encrypted = encrypt(JSON.stringify(creds), getEncryptionKey());
  fs.writeFileSync(CREDS_FILE, encrypted, { mode: 0o600 });
  
  return { success: true, platform, message: `Credentials for ${platform} saved securely` };
}

// Get credentials
function getCredentials(platform) {
  if (!fs.existsSync(CREDS_FILE)) return null;
  
  try {
    const encrypted = fs.readFileSync(CREDS_FILE, 'utf8');
    const creds = JSON.parse(decrypt(encrypted, getEncryptionKey()));
    return platform ? creds[platform] : creds;
  } catch {
    return null;
  }
}

// Fetch data from a platform using stored credentials
async function fetchPlatformData(platform, days = 28) {
  const creds = getCredentials(platform);
  if (!creds) {
    throw new Error(`No credentials for ${platform}. Run 'add_account' first.`);
  }
  
  // Load platform skill
  const skillPath = path.join(os.homedir(), '.kai/skills', platform, 'handler.js');
  if (!fs.existsSync(skillPath)) {
    throw new Error(`${platform} skill not installed`);
  }
  
  const { default: handler } = await import(skillPath);
  
  // Set environment for skill
  const env = { ...process.env };
  for (const [key, value] of Object.entries(creds)) {
    env[key] = value;
  }
  
  // Determine which action to call
  const actionMap = {
    youtube: 'get_channel',
    instagram: 'get_account',
    twitter: 'get_user',
    facebook: 'get_page',
    linkedin: 'get_profile',
    tiktok: 'get_user',
    threads: 'get_user',
    bluesky: 'get_profile'
  };
  
  const action = actionMap[platform] || 'get_data';
  const result = await handler.actions[action](creds);
  
  return result;
}

// Fetch all platforms
async function fetchAllData(days = 28) {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('No accounts configured. Run add_account first.');
  }
  
  const results = {};
  for (const platform of Object.keys(creds)) {
    try {
      results[platform] = await fetchPlatformData(platform, days);
    } catch (err) {
      results[platform] = { error: err.message };
    }
  }
  
  // Save to data file
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    fetched_at: new Date().toISOString(),
    data: results
  }, null, 2));
  
  return results;
}

// Get dashboard status
function getStatus() {
  ensureDashboard();
  
  const creds = getCredentials() || {};
  const platforms = Object.keys(creds);
  
  let serverRunning = false;
  let serverUrl = null;
  
  if (fs.existsSync(SERVER_PID_FILE)) {
    const pid = fs.readFileSync(SERVER_PID_FILE, 'utf8');
    try {
      process.kill(parseInt(pid), 0);
      serverRunning = true;
      serverUrl = 'http://localhost:3000';
    } catch {
      fs.unlinkSync(SERVER_PID_FILE);
    }
  }
  
  return {
    installed: fs.existsSync(path.join(DASHBOARD_DIR, 'package.json')),
    server_running: serverRunning,
    url: serverUrl,
    connected_accounts: platforms.length,
    platforms: platforms,
    data_path: DATA_FILE
  };
}

// Export data
async function exportData(format = 'json', outputPath) {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error('No data to export. Run fetch_all first.');
  }
  
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  
  if (format === 'csv') {
    // Convert to CSV
    const rows = [];
    for (const [platform, result] of Object.entries(data.data)) {
      if (result.error) continue;
      const content = JSON.parse(result.content || '[]');
      const item = Array.isArray(content) ? content[0] : content;
      rows.push({
        platform,
        fetched_at: data.fetched_at,
        ...item
      });
    }
    
    // Simple CSV generation
    if (rows.length === 0) throw new Error('No data to export');
    
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] || '')).join(','))
    ].join('\n');
    
    const outPath = outputPath || path.join(DASHBOARD_DIR, 'export.csv');
    fs.writeFileSync(outPath, csv);
    return { format: 'csv', path: outPath };
  }
  
  // JSON export
  const outPath = outputPath || path.join(DASHBOARD_DIR, 'export.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  return { format: 'json', path: outPath };
}

// Main handler
export default {
  actions: {
    setup: async () => {
      const result = await setupDashboard();
      return { content: JSON.stringify(result, null, 2) };
    },
    
    start: async (params) => {
      const port = params?.port || 3000;
      const result = await startDashboard(port);
      return { content: JSON.stringify(result, null, 2) };
    },
    
    add_account: async (params) => {
      if (!params?.platform || !params?.credentials) {
        throw new Error('platform and credentials required');
      }
      const result = await addAccount(params.platform, params.credentials);
      return { content: JSON.stringify(result, null, 2) };
    },
    
    fetch_all: async (params) => {
      const days = params?.days || 28;
      const results = await fetchAllData(days);
      return { content: JSON.stringify(results, null, 2) };
    },
    
    fetch_platform: async (params) => {
      if (!params?.platform) {
        throw new Error('platform required');
      }
      const result = await fetchPlatformData(params.platform, params?.days);
      return { content: JSON.stringify(result, null, 2) };
    },
    
    view: async (params) => {
      const port = params?.port || 3000;
      const url = `http://localhost:${port}`;
      
      // Try to open browser
      const openCmd = process.platform === 'darwin' ? 'open' : 
                      process.platform === 'win32' ? 'start' : 'xdg-open';
      
      try {
        spawn(openCmd, [url], { detached: true });
      } catch {
        // Ignore errors
      }
      
      return { content: JSON.stringify({ url, message: 'Opening dashboard...' }, null, 2) };
    },
    
    status: async () => {
      const status = getStatus();
      return { content: JSON.stringify(status, null, 2) };
    },
    
    export_data: async (params) => {
      const format = params?.format || 'json';
      const result = await exportData(format, params?.path);
      return { content: JSON.stringify(result, null, 2) };
    }
  }
};
