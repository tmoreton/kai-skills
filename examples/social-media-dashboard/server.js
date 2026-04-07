/**
 * Kai Social Media Dashboard
 * A local analytics dashboard that uses Kai skills via MCP to fetch data
 * 
 * Usage:
 * 1. npm install
 * 2. npm run setup  # Configure your API keys
 * 3. npm start      # Open http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store for fetched data (in-memory, resets on restart)
const dataStore = {
  youtube: null,
  instagram: null,
  twitter: null,
  lastUpdated: null
};

// Helper to call Kai skill via MCP
async function callSkill(skillName, action, params = {}) {
  // This would work if user has kai CLI with MCP configured
  // For now, we provide instructions on how to manually run skills
  return {
    skill: skillName,
    action: action,
    params: params,
    instructions: `To fetch this data, run: kai skill ${skillName} ${action} '${JSON.stringify(params)}'`
  };
}

// Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    skills: [
      { name: 'youtube', configured: !!process.env.YOUTUBE_API_KEY },
      { name: 'instagram', configured: !!process.env.INSTAGRAM_ACCESS_TOKEN },
      { name: 'twitter', configured: !!process.env.TWITTER_API_KEY }
    ],
    data: dataStore
  });
});

app.post('/api/fetch/:platform', async (req, res) => {
  const { platform } = req.params;
  const { action, params } = req.body;
  
  try {
    // In a real implementation, this would call the Kai skill via MCP
    // For now, return instructions
    const result = await callSkill(platform, action, params);
    
    res.json({
      success: true,
      platform,
      action,
      result,
      note: 'Copy the command below and run it in your terminal to fetch real data'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', (req, res) => {
  // Accept data pasted from Kai skill output
  const { platform, data } = req.body;
  
  if (!platform || !data) {
    return res.status(400).json({ error: 'Missing platform or data' });
  }
  
  dataStore[platform] = data;
  dataStore.lastUpdated = new Date().toISOString();
  
  res.json({
    success: true,
    message: `${platform} data updated`,
    lastUpdated: dataStore.lastUpdated
  });
});

app.get('/api/data/:platform', (req, res) => {
  const { platform } = req.params;
  res.json(dataStore[platform] || null);
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     Kai Social Media Dashboard                            ║
║                                                           ║
║     Open: http://localhost:${PORT}                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

To get started:
1. Configure your API keys: npm run setup
2. Visit http://localhost:${PORT}
3. Follow the instructions to connect your accounts

Need help? Visit: https://tmoreton.github.io/kai-skills/
  `);
});
