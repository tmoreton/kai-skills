# Kai Skills

**20 AI-powered tools for social media, automation, and productivity.**

No coding required. Works with ChatGPT, Claude, and the Kai app.

---

## 🚀 Quick Start

### Option 1: Kai App (Easiest)
```bash
npx kai
# Then type: /skill install youtube
```

### Option 2: Claude Desktop
```bash
# 1. Install this skill pack
npx kai-mcp-setup all

# 2. Restart Claude
# 3. Ask: "Get my YouTube stats"
```

---

## 📦 20 Skills Included

### Social Media Analytics (8)
| Skill | What It Does | Setup Time |
|-------|--------------|------------|
| **YouTube** | Channel stats, video metrics, trending | 2 min |
| **Instagram** | Followers, posts, hashtags, insights | 2 min |
| **Twitter/X** | Tweet search, user analysis, posting | 2 min |
| **Facebook** | Page analytics, publishing, insights | 2 min |
| **LinkedIn** | Professional network analytics | 2 min |
| **TikTok** | Video stats, hashtag research | 2 min |
| **Threads** | Posting, replies, engagement | 2 min |
| **Bluesky** | AT Protocol social analytics | 2 min |

### Automation (4)
| Skill | What It Does |
|-------|--------------|
| **OpenRouter** | AI image generation, chat completions |
| **Google Sheets** | Export reports to spreadsheets |
| **Slack** | Send team notifications |
| **Webhook** | Trigger Zapier, Make, custom URLs |

### Utilities (8)
| Skill | What It Does |
|-------|--------------|
| **Browser** | Web scraping, screenshots |
| **Notion** | Query databases, create pages |
| **Email** | Send reports via Gmail/Outlook |
| **Database** | Store analytics data |
| **Git** | Version control for dashboards |
| **Docker** | Deploy dashboard containers |
| **Data Storage** | Read/write JSON, CSV, Markdown |
| **Web Tools** | Web search, page fetching |

---

## 🔌 Integration Guide

### For ChatGPT (Pro Users)

**Note:** ChatGPT Pro supports MCP through the Actions API.

1. Go to [chat.openai.com](https://chat.openai.com) → Settings → Beta
2. Enable "Plugins" or "Actions"
3. Use our hosted endpoints (coming soon)

---

### For Claude Desktop App

**Step 1:** Install the helper
```bash
npm install -g kai-mcp-setup
```

**Step 2:** Add all skills
```bash
kai-mcp-setup all
```

**Step 3:** Restart Claude Desktop

**Step 4:** Start using
```
You: Get my YouTube channel stats
Claude: [Fetches real data from YouTube API]
```

---

### For Claude Code CLI

**Step 1:** In your terminal with Claude Code running
```bash
claude
```

**Step 2:** Type the command
```
/skill export-to-claude youtube
/skill export-to-claude all
```

**Step 3:** Ask anything
```
Create a weekly social media report with YouTube, Instagram, and Twitter data
```

---

### For Kai CLI

**Step 1:** Install Kai
```bash
npm install -g kai
```

**Step 2:** Install skills
```bash
kai skill install youtube
kai skill install instagram
kai skill install notion
```

**Step 3:** Use them
```bash
kai use youtube get_channel_report channel_id=UCxxx
```

---

## 🔑 API Key Setup

### YouTube
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable YouTube Data API v3
3. Create API Key → Copy key
4. Set: `export YOUTUBE_API_KEY=your_key_here`

### Instagram
1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create app → Add Instagram Basic Display
3. Get Access Token
4. Set: `export INSTAGRAM_ACCESS_TOKEN=your_token`

### Twitter/X
1. Go to [Twitter Developer Portal](https://developer.twitter.com)
2. Create app → Get API Key & Secret
3. Set: `export X_API_KEY=your_key`

### OpenRouter (AI Images)
1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Create API Key
3. Set: `export OPENROUTER_API_KEY=your_key`

### All Others
See individual skill folders in `/skills/` for specific setup instructions.

---

## 💡 Example Use Cases

### Marketing Manager
```
"Create a weekly report with YouTube views, Instagram engagement, 
and Twitter impressions. Export to Google Sheets and Slack it to #marketing."
```

### Content Creator
```
"Analyze my top 10 YouTube videos. What's working? Generate a thumbnail 
for my next video about [topic]."
```

### Social Media Agency
```
"Monitor 5 client Instagram accounts. Alert me in Slack if any account 
loses followers or engagement drops."
```

---

## 📊 Dashboard Example

See the full example at [`examples/social-media-dashboard.md`](examples/social-media-dashboard.md)

Quick preview:
```bash
# Collect data
kai use youtube get_channel_report channel_id=UCxxx
kai use instagram get_account_insights username=yourbrand

# Export
kai use google-sheets create_spreadsheet title="Q1 Analytics"

# Notify
kai use slack send_to_channel channel="#team" message="Report ready!"
```

---

## ❓ Common Issues

**"Claude can't find my skills"**
→ Restart Claude Desktop after adding skills

**"API key not working"**
→ Make sure you exported the env variable: `export KEY=value`

**"Permission denied"**
→ Check API key has correct permissions (YouTube Data API, etc.)

---

## 🆘 Support

- **Discord:** [Join our community](https://discord.gg/kai)
- **Issues:** [GitHub Issues](https://github.com/tmoreton/kai-skills/issues)
- **Docs:** [Full Documentation](https://docs.kai.dev)

---

## 📝 License

MIT - Use freely for personal and commercial projects.

---

**Made with ❤️ for marketers who want AI superpowers.**
