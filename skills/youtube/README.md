# YouTube Analytics Skill

YouTube Data API integration for analytics dashboards. Get channel stats, video metrics, comments, trending, and generate comprehensive reports.

**Works with Claude Desktop (MCP) and Kai.**

---

## Claude Desktop Installation

**Step 1:** Get your YouTube Data API key:
- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Create a project or select existing
- Enable "YouTube Data API v3"
- Create API key (or OAuth 2.0 credentials for user data)
- Copy the API key

**Step 2:** Edit Claude Desktop config:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Step 3:** Add the YouTube skill:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "kai-skill-mcp", "/path/to/kai-skills/skills/youtube"],
      "env": {
        "YOUTUBE_API_KEY": "your-youtube-api-key-here"
      }
    }
  }
}
```

**Step 4:** Restart Claude Desktop. The skill is ready to use.

---

## Tools

| Tool | Description |
|------|-------------|
| `search_videos` | Search YouTube for videos |
| `get_channel` | Get channel stats (subscribers, views, video count) |
| `get_recent_uploads` | Get latest videos with metrics |
| `get_video_stats` | Detailed stats for specific videos |
| `get_trending` | Trending videos by region |
| `get_comments` | Get comments for engagement analysis |
| `compare_videos` | Compare performance across videos |
| `generate_channel_report` | Comprehensive analytics report |

---

## Example Usage (in Claude Desktop)

### Channel Overview
> "Get my YouTube channel stats"

### Video Analysis
> "Compare the performance of these videos: VIDEO_ID_1, VIDEO_ID_2, VIDEO_ID_3"

### Engagement Report
> "Generate a 30-day analytics report for my channel"

### Trending Research
> "What's trending on YouTube in the US right now?"

### Comments Analysis
> "Get the top comments from my latest video"

---

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | **Yes** |

---

## API Limits

YouTube Data API quota: 10,000 units/day
- Search: 100 units
- Videos list: 1 unit
- Channels list: 1 unit
- Comments: 1 unit

The skill optimizes calls to stay within quota.

---

## Programmatic Usage

```javascript
// Get channel stats
const channel = await youtubeSkill.actions.get_channel({
  channel_id: "UC..."
});

// Generate report
const report = await youtubeSkill.actions.generate_channel_report({
  channel_id: "UC...",
  days: 30
});

// Compare videos
const comparison = await youtubeSkill.actions.compare_videos({
  video_ids: "VIDEO_ID_1,VIDEO_ID_2,VIDEO_ID_3"
});
```

---

## Social Dashboard Integration

Combine with other social media skills for cross-platform analytics:

```json
{
  "mcpServers": {
    "youtube": { ... },
    "twitter": { ... },
    "instagram": { ... }
  }
}
```

Then ask Claude: "Create a dashboard comparing my YouTube and Twitter performance this month"
