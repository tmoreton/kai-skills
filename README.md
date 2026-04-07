# Kai Skills

**21 AI-powered tools for social media analytics and automation.**

Connect YouTube, Instagram, Twitter, and more to Claude and ChatGPT. No coding required.

[Get Started](https://tmoreton.github.io/kai-skills/) · [Documentation](https://docs.kai.dev) · [Discord](https://discord.gg/kai)

---

## Works With Claude

Kai skills integrate directly with **Claude Desktop** and **Claude Code** via MCP (Model Context Protocol).

### Using kai-mcp (Recommended)

No Kai CLI required! Just install the helper and go:

```bash
# Install kai-mcp helper
npm install -g kai-mcp

# Install skills from GitHub
kai-mcp install

# Add all skills to Claude
kai-mcp add all

# Or add individually
kai-mcp add youtube
kai-mcp add instagram
kai-mcp add twitter
```

Then restart Claude Desktop and use natural language:
- *"Get my YouTube stats for this week"*
- *"Show my Instagram follower growth"*
- *"Create a social media report comparing all platforms"*
- *"Start my dashboard and add my YouTube account"*

### Manual MCP Setup

If you prefer to add skills manually:

```bash
# Add individual skills
claude mcp add kai-youtube -- node ~/.kai/skills/youtube/handler.js
claude mcp add kai-instagram -- node ~/.kai/skills/instagram/handler.js
claude mcp add kai-twitter -- node ~/.kai/skills/twitter/handler.js
```

### Claude Code (CLI)

Same skills work in your terminal:

```bash
claude
# Then type: "Fetch my Twitter analytics"
# Or: "Add my Instagram account to the dashboard"
```

---

---

## 21 Skills Included

### Social Media Analytics
| Skill | Actions | Setup |
|-------|---------|-------|
| **Dashboard** | Unified analytics dashboard for all platforms | 2 min |
| **YouTube** | Channel stats, video metrics, trending | 2 min |
| **Instagram** | Followers, posts, hashtags, insights | 2 min |
| **Twitter/X** | Tweet search, user analysis, posting | 2 min |
| **Facebook** | Page analytics, publishing, insights | 2 min |
| **LinkedIn** | Professional network analytics | 2 min |
| **TikTok** | Video stats, hashtag research | 2 min |
| **Threads** | Posting, replies, engagement | 2 min |
| **Bluesky** | AT Protocol social analytics | 2 min |

### Automation
| Skill | Actions |
|-------|---------|
| **OpenRouter** | AI image generation, chat completions |
| **Google Sheets** | Export reports to spreadsheets |
| **Slack** | Send team notifications |
| **Webhook** | Trigger Zapier, Make, custom endpoints |
| **Notion** | Query databases, create pages |
| **Email** | Send reports via SMTP |

### Utilities
| Skill | Actions |
|-------|---------|
| **Browser** | Web scraping, screenshots |
| **Database** | Store analytics data |
| **Data Storage** | Read/write JSON, CSV, Markdown |
| **Docker** | Deploy containers |
| **Git** | Version control |
| **Web Tools** | Web search, page fetching |

---

## API Key Setup

Two ways to get API keys:

### 1. Interactive Wizard (Easiest)
```bash
npx kai-api-setup
```
Step-by-step guide that opens browsers and validates keys automatically.

### 2. Manual Setup
Visit our [setup guide](https://tmoreton.github.io/kai-skills/api-setup.html) for platform-specific instructions.

**Quick links for API keys:**
- [YouTube](https://console.cloud.google.com/apis/credentials) - Google Cloud Console
- [Instagram](https://developers.facebook.com/apps/) - Meta for Developers
- [Twitter/X](https://developer.twitter.com) - Twitter Developer Portal
- [OpenRouter](https://openrouter.ai/keys) - For AI image generation

---

## Example Use Cases

**Marketing Manager:**
> "Create a weekly report with YouTube views, Instagram engagement, and Twitter impressions. Export to Google Sheets and Slack it to #marketing."

**Content Creator:**
> "Analyze my top 10 YouTube videos. What's working? Generate a thumbnail for my next video."

**Social Media Agency:**
> "Monitor 5 client Instagram accounts. Alert me in Slack if any account loses followers this week."

---

## Full Documentation

Visit [tmoreton.github.io/kai-skills](https://tmoreton.github.io/kai-skills/) for:
- Visual setup guides with screenshots
- Platform-specific instructions
- API key walkthroughs
- Troubleshooting help

---

## Support

- **Discord:** [Join our community](https://discord.gg/kai)
- **Issues:** [GitHub Issues](https://github.com/tmoreton/kai-skills/issues)
- **Docs:** [Full Documentation](https://docs.kai.dev)

---

## License

MIT - Use freely for personal and commercial projects.

Built for marketers who want AI superpowers.
