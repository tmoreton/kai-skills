#!/usr/bin/env node
/**
 * Kai Dashboard - Generate local analytics dashboard
 * 
 * Usage: npx kai-dashboard create
 * This generates a local HTML dashboard that uses Kai skills to fetch data
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const http = require('http');

const DASHBOARD_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Social Media Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #faf9f7;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --accent: #0d9488;
      --border: #e2e8f0;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 40px 24px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid var(--border);
    }
    
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
    }
    
    .last-updated {
      color: var(--muted);
      font-size: 0.9rem;
    }
    
    .refresh-btn {
      padding: 10px 20px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .refresh-btn:hover {
      opacity: 0.9;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }
    
    .metric-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
    }
    
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .metric-title {
      font-size: 0.9rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .metric-value {
      font-size: 2.5rem;
      font-weight: 700;
    }
    
    .metric-change {
      font-size: 0.9rem;
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .metric-change.positive {
      background: #dcfce7;
      color: #166534;
    }
    
    .metric-change.negative {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .chart-container {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .chart-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 20px;
    }
    
    .platform-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }
    
    .platform-tab {
      padding: 8px 16px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    
    .platform-tab.active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .data-table th,
    .data-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    .data-table th {
      font-weight: 600;
      color: var(--muted);
      font-size: 0.8rem;
      text-transform: uppercase;
    }
    
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .status.connected {
      background: #dcfce7;
      color: #166534;
    }
    
    .status.disconnected {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    
    .setup-instructions {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    
    .setup-instructions h3 {
      font-size: 1rem;
      margin-bottom: 8px;
      color: #92400e;
    }
    
    .setup-instructions code {
      background: #fff;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>📊 Social Media Dashboard</h1>
        <p class="last-updated">Last updated: <span id="lastUpdated">Never</span></p>
      </div>
      <button class="refresh-btn" onclick="refreshData()">🔄 Refresh Data</button>
    </header>

    <!-- Connection Status -->
    <div class="grid" style="margin-bottom: 20px;">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">YouTube</span>
          <span class="status disconnected" id="yt-status">
            <span class="status-dot"></span>
            Not Connected
          </span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Instagram</span>
          <span class="status disconnected" id="ig-status">
            <span class="status-dot"></span>
            Not Connected
          </span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Twitter/X</span>
          <span class="status disconnected" id="tw-status">
            <span class="status-dot"></span>
            Not Connected
          </span>
        </div>
      </div>
    </div>

    <!-- Setup Instructions (shown if not connected) -->
    <div class="setup-instructions" id="setupHelp" style="display: block;">
      <h3>🔧 Setup Required</h3>
      <p>To see data here, run these commands in your terminal:</p>
      <ol style="margin-top: 8px; margin-left: 20px; line-height: 1.8;">
        <li><code>npx kai-api-setup youtube</code> - Get YouTube API key</li>
        <li><code>npx kai skill install youtube</code> - Install YouTube skill</li>
        <li><code>kai use youtube get_channel_report > dashboard-data/youtube.json</code></li>
        <li>Click "Refresh Data" above</li>
      </ol>
    </div>

    <!-- Key Metrics -->
    <div class="grid" id="metricsGrid" style="display: none;">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Total Followers</span>
          <span class="metric-change positive" id="followersChange">+12%</span>
        </div>
        <div class="metric-value" id="totalFollowers">-</div>
      </div>
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Engagement Rate</span>
          <span class="metric-change positive" id="engagementChange">+5%</span>
        </div>
        <div class="metric-value" id="avgEngagement">-</div>
      </div>
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Total Views (30d)</span>
          <span class="metric-change positive" id="viewsChange">+28%</span>
        </div>
        <div class="metric-value" id="totalViews">-</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="chart-container" id="chartsContainer" style="display: none;">
      <div class="platform-tabs">
        <button class="platform-tab active" onclick="showChart('all')">All Platforms</button>
        <button class="platform-tab" onclick="showChart('youtube')">YouTube</button>
        <button class="platform-tab" onclick="showChart('instagram')">Instagram</button>
      </div>
      
      <div class="chart-title">Follower Growth (Last 30 Days)</div>
      <canvas id="growthChart" height="100"></canvas>
    </div>

    <!-- Top Content -->
    <div class="chart-container" id="contentContainer" style="display: none;">
      <div class="chart-title">Top Performing Content</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Content</th>
            <th>Views</th>
            <th>Engagement</th>
            <th>Posted</th>
          </tr>
        </thead>
        <tbody id="contentTable">
          <tr>
            <td colspan="5" style="text-align: center; color: var(--muted);">No data yet. Run refresh to load content.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    // Check for data files
    async function checkConnections() {
      const platforms = ['youtube', 'instagram', 'twitter'];
      let connected = 0;
      
      for (const platform of platforms) {
        try {
          const response = await fetch(\`data/\${platform}.json\`);
          if (response.ok) {
            const data = await response.json();
            document.getElementById(\`\${platform.slice(0,2)}-status\`).className = 'status connected';
            document.getElementById(\`\${platform.slice(0,2)}-status\`).innerHTML = 
              '<span class="status-dot"></span> Connected';
            connected++;
          }
        } catch (e) {
          // Not connected
        }
      }
      
      if (connected > 0) {
        document.getElementById('setupHelp').style.display = 'none';
        document.getElementById('metricsGrid').style.display = 'grid';
        document.getElementById('chartsContainer').style.display = 'block';
        document.getElementById('contentContainer').style.display = 'block';
        loadData();
      }
    }

    function loadData() {
      // Load and display data from JSON files
      // This is where you'd fetch the actual data
      document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    }

    function refreshData() {
      alert('To refresh data, run these commands in your terminal:\\n\\n' +
            'kai use youtube get_channel_report > dashboard-data/youtube.json\\n' +
            'kai use instagram get_account_insights > dashboard-data/instagram.json\\n\\n' +
            'Then refresh this page.');
    }

    function showChart(platform) {
      // Switch between platform views
      document.querySelectorAll('.platform-tab').forEach(tab => tab.classList.remove('active'));
      event.target.classList.add('active');
      
      // Update chart data based on platform
      // (Implementation would go here)
    }

    // Initialize chart
    const ctx = document.getElementById('growthChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({length: 30}, (_, i) => \`Day \${i+1}\`),
        datasets: [{
          label: 'Followers',
          data: Array.from({length: 30}, () => Math.floor(Math.random() * 1000)),
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.1)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // Check connections on load
    checkConnections();
  </script>
</body>
</html>
`;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createDashboard() {
  const dashboardDir = path.join(os.homedir(), '.kai/dashboard');
  const dataDir = path.join(dashboardDir, 'data');
  
  console.log('📊 Creating Kai Dashboard...\n');
  
  // Create directories
  ensureDir(dashboardDir);
  ensureDir(dataDir);
  
  // Write HTML file
  const htmlPath = path.join(dashboardDir, 'index.html');
  fs.writeFileSync(htmlPath, DASHBOARD_TEMPLATE);
  console.log(`✓ Dashboard created: ${htmlPath}`);
  
  // Create sample data directory
  console.log(`✓ Data directory: ${dataDir}`);
  
  // Create README
  const readmePath = path.join(dashboardDir, 'README.txt');
  fs.writeFileSync(readmePath, `KAI DASHBOARD
=============

Your personal social media analytics dashboard.

HOW TO USE:
1. Open dashboard:
   npx kai-dashboard open

2. Export data from skills:
   kai use youtube get_channel_report > ~/.kai/dashboard/data/youtube.json
   kai use instagram get_account_insights > ~/.kai/dashboard/data/instagram.json
   kai use twitter analyze_user username=yourhandle > ~/.kai/dashboard/data/twitter.json

3. Refresh the dashboard page to see your data

4. Data is stored locally on your machine - nothing is sent to any server

TIPS:
- Create a cron job to auto-refresh data daily
- The dashboard works offline once data is loaded
- Export charts as images using browser screenshot tools
`);

  console.log(`✓ README created: ${readmePath}\n`);
  
  return dashboardDir;
}

function openDashboard(dashboardDir) {
  const htmlPath = path.join(dashboardDir, 'index.html');
  
  // Start simple HTTP server
  const server = http.createServer((req, res) => {
    const filePath = req.url === '/' ? '/index.html' : req.url;
    const fullPath = path.join(dashboardDir, filePath);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath);
      const contentType = ext === '.json' ? 'application/json' : 'text/html';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  const PORT = 8765;
  
  server.listen(PORT, () => {
    console.log(`🌐 Dashboard running at: http://localhost:${PORT}`);
    console.log(`\nPress Ctrl+C to stop the server\n`);
    
    // Open browser
    const platform = process.platform;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} http://localhost:${PORT}`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'create') {
    const dashboardDir = createDashboard();
    
    console.log('\n🎉 Dashboard ready!\n');
    console.log('Next steps:');
    console.log('  1. Run: npx kai-dashboard open');
    console.log('  2. Export your social media data:');
    console.log('     kai use youtube get_channel_report > ~/.kai/dashboard/data/youtube.json');
    console.log('  3. Refresh the dashboard to see your data\n');
    
  } else if (command === 'open') {
    const dashboardDir = path.join(os.homedir(), '.kai/dashboard');
    
    if (!fs.existsSync(dashboardDir)) {
      console.log('Dashboard not found. Creating it first...\n');
      createDashboard();
    }
    
    openDashboard(dashboardDir);
    
  } else if (command === 'export') {
    const platform = args[1];
    if (!platform) {
      console.error('Please specify a platform: youtube, instagram, twitter');
      process.exit(1);
    }
    
    const dataDir = path.join(os.homedir(), '.kai/dashboard/data');
    ensureDir(dataDir);
    
    const outputFile = path.join(dataDir, `${platform}.json`);
    console.log(`Exporting ${platform} data to ${outputFile}...`);
    console.log(`Run: kai use ${platform} get_channel_report > "${outputFile}"`);
    
  } else {
    console.log(`
Kai Dashboard - Local Analytics Dashboard

Usage:
  npx kai-dashboard create    Create dashboard files
  npx kai-dashboard open      Start dashboard server
  npx kai-dashboard export <platform>  Export data command

Examples:
  npx kai-dashboard create
  npx kai-dashboard open
  npx kai-dashboard export youtube
`);
  }
}

main().catch(console.error);
