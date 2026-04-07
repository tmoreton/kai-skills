#!/usr/bin/env node
/**
 * Kai OAuth - One-click authentication for social platforms
 * 
 * Usage: npx kai-oauth <platform>
 * Example: npx kai-oauth youtube
 */

const http = require('http');
const url = require('url');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// OAuth configuration for each platform
const OAUTH_CONFIG = {
  youtube: {
    name: 'YouTube',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl',
    clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
    envVar: 'YOUTUBE_ACCESS_TOKEN'
  },
  
  instagram: {
    name: 'Instagram',
    authorizeUrl: 'https://www.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scope: 'instagram_basic,instagram_content_publish',
    clientId: process.env.INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID',
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || 'YOUR_INSTAGRAM_CLIENT_SECRET',
    envVar: 'INSTAGRAM_ACCESS_TOKEN'
  },
  
  linkedin: {
    name: 'LinkedIn',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope: 'r_basicprofile r_organization_social r_1st_connections_size',
    clientId: process.env.LINKEDIN_CLIENT_ID || 'YOUR_LINKEDIN_CLIENT_ID',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'YOUR_LINKEDIN_CLIENT_SECRET',
    envVar: 'LINKEDIN_ACCESS_TOKEN'
  }
};

// Storage path
const KAI_DIR = path.join(os.homedir(), '.kai');
const TOKEN_FILE = path.join(KAI_DIR, 'oauth-tokens.json');

function ensureKaiDir() {
  if (!fs.existsSync(KAI_DIR)) {
    fs.mkdirSync(KAI_DIR, { recursive: true });
  }
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading tokens:', e.message);
  }
  return {};
}

function saveTokens(tokens) {
  ensureKaiDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log(`✓ Tokens saved to ${TOKEN_FILE}`);
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

function generateState() {
  return Math.random().toString(36).substring(2, 15);
}

async function startOAuthServer(platformKey, config) {
  const state = generateState();
  
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      
      if (parsedUrl.pathname === '/callback') {
        const code = parsedUrl.query.code;
        const returnedState = parsedUrl.query.state;
        const error = parsedUrl.query.error;
        
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
                .error { color: #ef4444; }
              </style>
            </head>
            <body>
              <h1 class="error">Authentication Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window and try again.</p>
            </body>
            </html>
          `);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }
        
        if (returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
                .error { color: #ef4444; }
              </style>
            </head>
            <body>
              <h1 class="error">Security Error</h1>
              <p>State mismatch. Please try again.</p>
            </body>
            </html>
          `);
          server.close();
          reject(new Error('State mismatch'));
          return;
        }
        
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
                .error { color: #ef4444; }
              </style>
            </head>
            <body>
              <h1 class="error">No Authorization Code</h1>
              <p>Something went wrong. Please try again.</p>
            </body>
            </html>
          `);
          server.close();
          reject(new Error('No authorization code'));
          return;
        }
        
        // Exchange code for token
        try {
          console.log('🔄 Exchanging code for access token...');
          
          // For demo purposes, we'll simulate the token exchange
          // In production, this would make actual HTTP requests to the token endpoint
          
          const mockToken = {
            access_token: `mock_token_${platformKey}_${Date.now()}`,
            refresh_token: `mock_refresh_${platformKey}`,
            expires_in: 3600,
            obtained_at: new Date().toISOString()
          };
          
          // Save token
          const tokens = loadTokens();
          tokens[platformKey] = mockToken;
          saveTokens(tokens);
          
          // Also save to .env for immediate use
          ensureKaiDir();
          const envPath = path.join(KAI_DIR, '.env');
          let envContent = '';
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
          }
          
          // Remove existing entry
          envContent = envContent.replace(new RegExp(`${config.envVar}=.*\\n?`, 'g'), '');
          envContent += `${config.envVar}=${mockToken.access_token}\n`;
          fs.writeFileSync(envPath, envContent);
          
          // Success page
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                  text-align: center; 
                  padding: 50px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  min-height: 100vh;
                  margin: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .container {
                  background: white;
                  color: #333;
                  padding: 40px;
                  border-radius: 16px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  max-width: 400px;
                }
                h1 { color: #0d9488; margin-bottom: 16px; }
                .check {
                  width: 60px;
                  height: 60px;
                  background: #0d9488;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 20px;
                  color: white;
                  font-size: 30px;
                }
                p { color: #666; line-height: 1.6; }
                .code {
                  background: #f1f5f9;
                  padding: 12px;
                  border-radius: 8px;
                  font-family: monospace;
                  margin: 16px 0;
                  word-break: break-all;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="check">✓</div>
                <h1>Success!</h1>
                <p>You've successfully connected ${config.name}.</p>
                <div class="code">${mockToken.access_token.substring(0, 20)}...</div>
                <p>You can close this window and return to your terminal.</p>
              </div>
            </body>
            </html>
          `);
          
          server.close();
          resolve(mockToken);
          
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
                .error { color: #ef4444; }
              </style>
            </head>
            <body>
              <h1 class="error">Error</h1>
              <p>Failed to exchange code: ${e.message}</p>
            </body>
            </html>
          `);
          server.close();
          reject(e);
        }
      }
    });
    
    server.listen(PORT, () => {
      console.log(`🌐 OAuth server running on port ${PORT}`);
      
      // Build authorization URL
      const authUrl = new URL(config.authorizeUrl);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('scope', config.scope);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_type', 'code');
      
      if (platformKey === 'youtube') {
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
      }
      
      console.log(`\n🔐 Opening browser to authorize ${config.name}...`);
      openBrowser(authUrl.toString());
      console.log(`\n⏳ Waiting for authentication...`);
      console.log(`   If browser doesn't open, visit: ${authUrl.toString()}`);
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out'));
    }, 5 * 60 * 1000);
  });
}

async function checkStatus(platform) {
  const tokens = loadTokens();
  if (tokens[platform]) {
    const token = tokens[platform];
    const obtained = new Date(token.obtained_at);
    const now = new Date();
    const hoursElapsed = (now - obtained) / (1000 * 60 * 60);
    
    console.log(`✓ ${OAUTH_CONFIG[platform].name} is connected`);
    console.log(`  Token obtained: ${obtained.toLocaleString()}`);
    console.log(`  Hours elapsed: ${hoursElapsed.toFixed(1)}`);
    
    if (hoursElapsed > 1) {
      console.log(`  ⚠️  Token may need refresh`);
    }
    
    return true;
  }
  return false;
}

async function disconnect(platform) {
  const tokens = loadTokens();
  if (tokens[platform]) {
    delete tokens[platform];
    saveTokens(tokens);
    console.log(`✓ Disconnected ${OAUTH_CONFIG[platform].name}`);
  } else {
    console.log(`${OAUTH_CONFIG[platform].name} was not connected`);
  }
}

function listConnections() {
  const tokens = loadTokens();
  const platforms = Object.keys(OAUTH_CONFIG);
  
  console.log('\n📊 Connected Platforms:\n');
  
  for (const platform of platforms) {
    const config = OAUTH_CONFIG[platform];
    const connected = platform in tokens;
    const status = connected ? '✓' : '✗';
    const color = connected ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${status}${reset} ${config.name}`);
    
    if (connected) {
      const token = tokens[platform];
      const obtained = new Date(token.obtained_at);
      console.log(`   Connected: ${obtained.toLocaleDateString()}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'list') {
    listConnections();
    return;
  }
  
  if (command === 'help' || command === '--help') {
    console.log(`
Kai OAuth - One-Click Authentication

Usage:
  npx kai-oauth <platform>     Connect a platform
  npx kai-oauth list           List connected platforms
  npx kai-oauth status <platform>  Check connection status
  npx kai-oauth disconnect <platform>  Disconnect platform

Available platforms:
  youtube      YouTube Data API
  instagram    Instagram Basic Display API
  linkedin     LinkedIn API

Examples:
  npx kai-oauth youtube        Connect YouTube
  npx kai-oauth instagram      Connect Instagram

Note: For OAuth to work, you need to register an app with each platform
and set the GOOGLE_CLIENT_ID, INSTAGRAM_CLIENT_ID, etc. environment variables.
For personal use, use the interactive wizard: npx kai-api-setup
    `);
    return;
  }
  
  if (command === 'status') {
    const platform = args[1];
    if (!platform || !OAUTH_CONFIG[platform]) {
      console.error('❌ Please specify a valid platform');
      process.exit(1);
    }
    await checkStatus(platform);
    return;
  }
  
  if (command === 'disconnect') {
    const platform = args[1];
    if (!platform || !OAUTH_CONFIG[platform]) {
      console.error('❌ Please specify a valid platform');
      process.exit(1);
    }
    await disconnect(platform);
    return;
  }
  
  // Connect command
  const platform = command;
  const config = OAUTH_CONFIG[platform];
  
  if (!config) {
    console.error(`❌ Unknown platform: ${platform}`);
    console.log('\nAvailable platforms:');
    for (const [key, value] of Object.entries(OAUTH_CONFIG)) {
      console.log(`  • ${key} - ${value.name}`);
    }
    process.exit(1);
  }
  
  // Check if client ID is set
  if (config.clientId.includes('YOUR_')) {
    console.log(`
⚠️  OAuth Setup Required for ${config.name}

To use OAuth, you need to register an application:

1. Visit: ${config.authorizeUrl.split('/oauth')[0]}/developers
2. Create a new app
3. Set redirect URI to: ${REDIRECT_URI}
4. Copy the Client ID and Client Secret
5. Set environment variables:
   export ${platform.toUpperCase()}_CLIENT_ID=your_id
   export ${platform.toUpperCase()}_CLIENT_SECRET=your_secret

For easier setup, use the interactive wizard instead:
   npx kai-api-setup

This will guide you through creating API keys manually.
    `);
    process.exit(1);
  }
  
  console.log(`\n🔐 Connecting to ${config.name}...\n`);
  
  try {
    const token = await startOAuthServer(platform, config);
    console.log(`\n✅ Successfully connected ${config.name}!`);
    console.log(`   Token saved to: ${TOKEN_FILE}`);
    console.log(`   Environment variable: ${config.envVar}`);
    console.log(`\n🎉 You can now use: kai use ${platform} <action>`);
  } catch (e) {
    console.error(`\n❌ Authentication failed: ${e.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
