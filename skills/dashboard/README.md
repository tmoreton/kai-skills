# Kai Social Media Dashboard

A **local-only** analytics dashboard that uses Kai skills to fetch social media data. All data stays on your computer - no cloud, no subscriptions, no privacy concerns.

## Quick Start

```bash
# 1. Clone the kai-skills repo
git clone https://github.com/tmoreton/kai-skills.git
cd kai-skills/examples/social-media-dashboard

# 2. Install dependencies
npm install

# 3. Configure API keys (opens setup wizard)
npm run setup

# 4. Start the dashboard
npm start

# 5. Open http://localhost:3000 in your browser
```

## How It Works

1. **Dashboard** runs locally on your machine (localhost:3000)
2. **Kai skills** fetch data from YouTube, Instagram, Twitter, etc.
3. **You paste** the skill output into the dashboard
4. **Charts** display your analytics using Chart.js

## Data Flow

```
Kai Skill → Your Terminal → Copy/Paste → Local Dashboard
```

**No data ever leaves your computer.** Everything is stored in memory only - refresh the page and you fetch fresh data.

## Supported Platforms

| Platform | Data Available | Setup Guide |
|----------|----------------|-------------|
| **YouTube** | Subscribers, views, videos, engagement | [Setup](https://tmoreton.github.io/kai-skills/platforms/youtube.html) |
| **Instagram** | Followers, posts, reach, engagement | [Setup](https://tmoreton.github.io/kai-skills/platforms/instagram.html) |
| **Twitter/X** | Followers, tweets, impressions | [Setup](https://tmoreton.github.io/kai-skills/platforms/twitter.html) |
| **TikTok** | Followers, videos, views | [Setup](https://tmoreton.github.io/kai-skills/platforms/tiktok.html) |
| **LinkedIn** | Connections, posts, engagement | [Setup](https://tmoreton.github.io/kai-skills/platforms/linkedin.html) |
| **Facebook** | Page likes, reach, posts | [Setup](https://tmoreton.github.io/kai-skills/platforms/facebook.html) |
| **Threads** | Followers, posts, engagement | [Setup](https://tmoreton.github.io/kai-skills/platforms/threads.html) |
| **Bluesky** | Followers, posts, engagement | [Setup](https://tmoreton.github.io/kai-skills/platforms/bluesky.html) |

## Usage Example

### 1. Fetch YouTube Data

Run this in your terminal with Kai:

```bash
kai skill youtube get_channel '{"channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}'
```

### 2. Copy the Output

```json
{
  "subscribers": 15234,
  "views": 892345,
  "videos": 156,
  "engagement": 4.2
}
```

### 3. Paste Into Dashboard

Click "Connect YouTube" → Paste the JSON → Done!

## Alternative: Use Claude Desktop

If you use Claude Code instead of Kai:

```bash
# Add Kai skills to Claude
claude mcp add kai-youtube -- node ~/.kai/skills/youtube/handler.js

# Then in Claude chat:
"Fetch my YouTube channel stats using kai-youtube skill"

# Copy Claude's output and paste into the dashboard
```

## Customizing

### Add More Charts

Edit `public/index.html` and add new Chart.js configurations:

```javascript
new Chart(ctx, {
    type: 'bar',
    data: { ... },
    options: { ... }
});
```

### Export Data

The dashboard can export to CSV/JSON. Add this button:

```html
<button onclick="exportData()">Export CSV</button>
```

### Save Data

To persist data between sessions, modify `server.js`:

```javascript
const fs = require('fs');

// Save to file
fs.writeFileSync('data.json', JSON.stringify(dataStore));

// Load on startup
if (fs.existsSync('data.json')) {
    Object.assign(dataStore, JSON.parse(fs.readFileSync('data.json')));
}
```

## Troubleshooting

### "Cannot connect to Kai skill"

Make sure Kai is installed and configured:
```bash
kai doctor
```

### "Invalid JSON" when pasting

Copy the **entire** output from the skill, including curly braces. Don't add extra text.

### Charts not loading

Check browser console (F12) for errors. Make sure you have internet connection for Chart.js CDN.

### Port 3000 already in use

Change the port:
```bash
PORT=8080 npm start
```

## Architecture

```
social-media-dashboard/
├── server.js          # Express server (serves static files)
├── public/
│   └── index.html     # Dashboard UI with Chart.js
├── package.json       # Dependencies
└── README.md          # This file
```

**Zero backend logic** - the "server" is just serving the HTML file. All data processing happens in the browser.

## Why This Design?

| Approach | Pros | Cons |
|----------|------|------|
| **Kai Skills (Current)** | Private, free, works with Claude | Manual copy/paste |
| **Hosted SaaS** | Auto-sync, always available | Expensive, privacy concerns |
| **Local API calls** | Automated | Complex auth, rate limits |

We chose the simplest approach that gives users **full control** over their data.

## Next Steps

1. **Automate fetching** - Set up a cron job to run Kai skills daily
2. **Add more platforms** - Use any Kai skill that returns JSON data
3. **Customize charts** - Edit `index.html` to match your brand
4. **Share reports** - Export screenshots or PDFs

## Support

- **Kai skills docs**: https://tmoreton.github.io/kai-skills/
- **Report issues**: https://github.com/tmoreton/kai-skills/issues
- **Discord community**: [Join here](https://discord.gg/kai)

## License

MIT - Feel free to modify and share!
