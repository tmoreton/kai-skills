# Social Media Automation System

An intelligent automation system using Kai skills for complete social media management.

## System Components

### 1. Content Calendar Agent
Schedules posts across all platforms at optimal times.

### 2. Cross-Posting Pipeline
Creates content once, posts everywhere.

### 3. Analytics Collector
Gathers stats daily from all platforms.

### 4. Growth Reporter
Weekly reports with insights and recommendations.

### 5. Engagement Monitor
Tracks comments/messages and alerts for important interactions.

## Quick Start

```bash
# 1. Setup all platforms
kai-skill dashboard setup

# 2. Add all your accounts
kai-skill dashboard add_youtube '{"api_key": "xxx", "channel_id": "xxx"}'
kai-skill dashboard add_instagram '{"access_token": "xxx"}'
kai-skill dashboard add_twitter '{"api_key": "xxx", "api_secret": "xxx"}'
kai-skill dashboard add_facebook '{"access_token": "xxx"}'
kai-skill dashboard add_linkedin '{"access_token": "xxx"}'

# 3. Start automation agent
kai agent create content-calendar --workflow workflow.yaml --schedule "0 9 * * 1"
```

## Workflow Example

```yaml
# content-pipeline.yaml
name: Weekly Content Pipeline

steps:
  - name: Generate Content Ideas
    skill: openrouter
    action: chat_completion
    prompt: "Generate 5 social media post ideas about [topic] for [audience]"
    
  - name: Create Visual
    skill: openrouter
    action: generate_image
    prompt: "Social media graphic for: [post idea]"
    
  - name: Schedule Posts
    parallel:
      - skill: instagram
        action: create_post
        content: "[post content + image]"
        scheduled_time: "09:00"
        
      - skill: twitter
        action: create_tweet
        content: "[shortened post]"
        scheduled_time: "09:00"
        
      - skill: linkedin
        action: create_post
        content: "[professional version]"
        scheduled_time: "10:00"

  - name: Export to Sheets
    skill: google-sheets
    action: append
    data: "[post performance data]"
    
  - name: Notify Team
    skill: slack
    action: send
    message: "📅 This week's content scheduled!"
```

## Daily Automation

```bash
# Collect analytics (runs daily)
kai-skill dashboard fetch_all

# Check growth
curl http://localhost:3000/api/data

# Export weekly report
kai-skill dashboard export_data '{"format": "csv"}'
```

## Dashboard Command Reference

| Task | Command |
|------|---------|
| View all stats | `kai-skill dashboard view` |
| Add YouTube | `kai-skill dashboard add_youtube '{"api_key": "xxx"}'` |
| Add Instagram | `kai-skill dashboard add_instagram '{"access_token": "xxx"}'` |
| Fetch all data | `kai-skill dashboard fetch_all` |
| Export report | `kai-skill dashboard export_data '{"format": "csv"}'` |

## Integration with Claude Desktop

```bash
# Add all skills to Claude
claude mcp add kai-dashboard -- node ~/.kai/skills/dashboard/handler.js
claude mcp add kai-youtube -- node ~/.kai/skills/youtube/handler.js
claude mcp add kai-instagram -- node ~/.kai/skills/instagram/handler.js
```

Then ask Claude:
- "Schedule next week's content across all platforms"
- "Create a report comparing my YouTube and Instagram growth"
- "What's my best performing content this month?"

## Automation Schedule

| Task | Frequency | Tool |
|------|-----------|------|
| Collect analytics | Daily | dashboard fetch_all |
| Generate content ideas | Weekly | openrouter |
| Cross-post content | 3x/week | multi-platform |
| Growth report | Weekly | google-sheets + slack |
| Engagement check | Daily | browser + notion |

## File Structure

```
social-automation/
├── workflows/
│   ├── content-pipeline.yaml
│   ├── daily-analytics.yaml
│   └── weekly-report.yaml
├── templates/
│   ├── instagram-post.md
│   ├── twitter-thread.md
│   └── linkedin-article.md
└── data/
    ├── content-calendar.json
    └── performance-history.csv
```

## Next Steps

1. **Connect all platforms** using the dashboard skill
2. **Set up automation** with kai agent
3. **Create templates** for consistent content
4. **Schedule reports** to track growth

All data stays on your machine. No subscriptions. Full privacy.
