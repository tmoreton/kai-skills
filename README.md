# Kai Skills

**21 AI-powered tools for social media analytics and automation.**

Connect YouTube, Instagram, Twitter, and more to Claude and ChatGPT. No coding required.

[Get Started](https://tmoreton.github.io/kai-skills/) · [Documentation](https://docs.kai.dev) · [Discord](https://discord.gg/kai)

---

## Dashboard Skill (New!)

The easiest way to view all your social media analytics in one place. One command setup, auto-fetches data, 100% private.

```bash
# Install and start dashboard
kai-skill dashboard setup

# Add your accounts
kai-skill dashboard add_youtube '{"api_key": "xxx", "channel_id": "xxx"}'
kai-skill dashboard add_instagram '{"access_token": "xxx"}'
kai-skill dashboard add_twitter '{"api_key": "xxx", "api_secret": "xxx"}'

# View unified dashboard
kai-skill dashboard view
```

Then open http://localhost:3000 — dashboard auto-fetches from all connected platforms!

---

## Quick Start

### Option 1: Claude Desktop (Recommended)
```bash
npm install -g kai-mcp-setup
kai-mcp-setup all
```
Then restart Claude and ask: *"Get my YouTube stats"*

### Option 2: Kai CLI
```bash
npm install -g kai
npx kai
/skill install youtube
```

### Option 3: Interactive Setup Wizard
```bash
npx kai-api-setup
```

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
| **Git** | Version control |
| **Docker** | Deploy containers |
| **Data Storage** | Read/write JSON, CSV, Markdown |
| **Web Tools** | Web search, page fetching |

---

## API Key Setup

Three ways to get API keys:

### 1. Interactive Wizard (Easiest)
```bash
npx kai-api-setup
```
Step-by-step guide that opens browsers and validates keys automatically.

### 2. One-Click OAuth (Coming Soon)
No API keys needed. Just click approve on Google/Instagram login.

### 3. Manual Setup
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
