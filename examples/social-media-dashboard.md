# Social Media Analytics Dashboard Example

A complete workflow demonstrating Kai's multi-skill orchestration for social media analytics automation.

## Overview

This example shows how to build a comprehensive social media analytics dashboard that:
- Collects data from multiple platforms in parallel
- Aggregates and analyzes metrics
- Exports formatted reports to Google Sheets
- Generates AI thumbnails for visual reports
- Sends notifications via Slack
- Triggers external automation via webhooks

---

## Step 1: Parallel Data Collection

Collect metrics from all social platforms simultaneously using Kai's parallel execution.

### Command:
```bash
# Run all collection tasks in parallel
kai skill invoke --name youtube-analytics --parallel --config '{"channelId": "UC_example", "days": 30, "metrics": ["views", "subscribers", "engagement", "watchTime"]}' &
kai skill invoke --name twitter-analytics --parallel --config '{"handle": "@company", "days": 30, "metrics": ["followers", "tweets", "impressions", "engagement"]}' &
kai skill invoke --name instagram-analytics --parallel --config '{"accountId": "company_official", "days": 30, "metrics": ["followers", "posts", "reach", "saves", "shares"]}' &
kai skill invoke --name linkedin-analytics --parallel --config '{"companyId": "12345678", "days": 30, "metrics": ["followers", "impressions", "clicks", "engagement"]}' &
wait
```

### Example Output:
```json
{
  "collection_batch_id": "sm_2024_01_15_001",
  "status": "completed",
  "platforms": {
    "youtube": {
      "status": "success",
      "record_count": 47,
      "metrics": {
        "total_views": 452000,
        "new_subscribers": 3200,
        "avg_watch_time": "4:32",
        "engagement_rate": "5.8%"
      },
      "top_content": [
        {"title": "Product Demo 2024", "views": 89000, "engagement": "8.2%"},
        {"title": "Behind the Scenes", "views": 67000, "engagement": "7.1%"}
      ]
    },
    "twitter": {
      "status": "success",
      "record_count": 156,
      "metrics": {
        "total_followers": 125000,
        "new_followers": 2100,
        "total_impressions": 2100000,
        "engagement_rate": "2.4%"
      },
      "top_tweets": [
        {"text": "Excited to announce...", "impressions": 45000, "engagement": "4.1%"},
        {"text": "Thread: How we built...", "impressions": 38000, "engagement": "3.8%"}
      ]
    },
    "instagram": {
      "status": "success",
      "record_count": 89,
      "metrics": {
        "total_followers": 280000,
        "new_followers": 5400,
        "total_reach": 1800000,
        "engagement_rate": "4.2%"
      },
      "top_posts": [
        {"caption": "New collection drop 🎉", "reach": 120000, "saves": 3400},
        {"caption": "Meet the team", "reach": 95000, "shares": 2100}
      ]
    },
    "linkedin": {
      "status": "success",
      "record_count": 42,
      "metrics": {
        "total_followers": 45000,
        "new_followers": 890,
        "total_impressions": 320000,
        "engagement_rate": "3.1%"
      },
      "top_posts": [
        {"text": "We're hiring!", "impressions": 45000, "clicks": 1200},
        {"text": "Industry insights...", "impressions": 38000, "engagement": "5.2%"}
      ]
    }
  },
  "execution_time": "12.4s",
  "data_stored_at": "/data/social_media/batch_sm_2024_01_15_001"
}
```

---

## Step 2: Data Aggregation & Analysis

Aggregate metrics across all platforms and calculate combined KPIs.

### Command:
```bash
kai skill invoke --name data-aggregator --config '{
  "source": "/data/social_media/batch_sm_2024_01_15_001",
  "aggregations": [
    {
      "name": "total_followers",
      "operation": "sum",
      "fields": ["youtube.subscribers", "twitter.followers", "instagram.followers", "linkedin.followers"]
    },
    {
      "name": "total_new_followers",
      "operation": "sum",
      "fields": ["youtube.new_subscribers", "twitter.new_followers", "instagram.new_followers", "linkedin.new_followers"]
    },
    {
      "name": "weighted_engagement",
      "operation": "weighted_average",
      "fields": ["*.engagement_rate"],
      "weights": ["*.impressions"]
    },
    {
      "name": "total_reach",
      "operation": "sum",
      "fields": ["*.reach", "*.impressions"]
    }
  ],
  "filters": {
    "date_range": "last_30_days"
  }
}'
```

### Example Output:
```json
{
  "aggregation_id": "agg_sm_2024_01_15_001",
  "period": "2024-01-01 to 2024-01-15",
  "summary_metrics": {
    "total_followers": 450000,
    "total_new_followers": 11590,
    "follower_growth_rate": "2.6%",
    "weighted_engagement_rate": "3.8%",
    "total_reach": 4230000,
    "total_content_published": 334
  },
  "platform_breakdown": {
    "youtube": {
      "followers": 125000,
      "growth": "2.6%",
      "reach": 452000,
      "engagement": "5.8%"
    },
    "twitter": {
      "followers": 125000,
      "growth": "1.7%",
      "reach": 2100000,
      "engagement": "2.4%"
    },
    "instagram": {
      "followers": 280000,
      "growth": "2.0%",
      "reach": 1800000,
      "engagement": "4.2%"
    },
    "linkedin": {
      "followers": 45000,
      "growth": "2.0%",
      "reach": 320000,
      "engagement": "3.1%"
    }
  },
  "top_performing_content": {
    "overall": {
      "title": "Product Demo 2024",
      "platform": "youtube",
      "engagement_score": 98.5,
      "cross_platform_shares": 234
    },
    "by_platform": {
      "youtube": [{"title": "Product Demo 2024", "views": 89000, "score": 95}],
      "twitter": [{"text": "Excited to announce...", "impressions": 45000, "score": 92}],
      "instagram": [{"caption": "New collection drop", "reach": 120000, "score": 96}],
      "linkedin": [{"text": "We're hiring!", "clicks": 1200, "score": 89}]
    }
  },
  "insights": [
    {
      "type": "trend",
      "message": "Instagram shows 40% higher engagement on video content vs images",
      "confidence": 0.87
    },
    {
      "type": "anomaly",
      "message": "LinkedIn engagement spike detected on Jan 8th (hiring post)",
      "confidence": 0.92
    },
    {
      "type": "recommendation",
      "message": "Cross-post YouTube content to LinkedIn for 2.3x reach increase",
      "confidence": 0.78
    }
  ],
  "data_stored_at": "/data/social_media/aggregated/agg_sm_2024_01_15_001"
}
```

---

## Step 3: Generate AI Thumbnail

Create a compelling thumbnail for the analytics report using OpenRouter.

### Command:
```bash
kai skill invoke --name image-generation --config '{
  "provider": "openrouter",
  "model": "recraft-v3",
  "prompt": "Modern social media analytics dashboard visualization, professional corporate style, floating holographic graphs showing follower growth curves in blue and green gradients, engagement metrics as glowing data points, multiple social media platform icons (YouTube, Twitter, Instagram, LinkedIn) arranged artistically, clean white background with subtle tech grid pattern, isometric 3D style, high contrast, data visualization aesthetic, 4K quality, marketing report cover image style",
  "width": 1280,
  "height": 720,
  "output_name": "social_analytics_thumbnail_2024_01_15"
}'
```

### Example Output:
```json
{
  "generation_id": "img_gen_001",
  "status": "completed",
  "image_url": "https://cdn.kai.ai/generated/social_analytics_thumbnail_2024_01_15.png",
  "local_path": "/data/images/social_analytics_thumbnail_2024_01_15.png",
  "metadata": {
    "provider": "openrouter",
    "model": "recraft-v3",
    "generation_time": "8.3s",
    "dimensions": {"width": 1280, "height": 720},
    "format": "png"
  },
  "tags": ["thumbnail", "analytics", "social-media", "report"]
}
```

**Generated Thumbnail Preview:**
![Analytics Dashboard Thumbnail](https://cdn.kai.ai/generated/social_analytics_thumbnail_2024_01_15.png)

---

## Step 4: Export to Google Sheets

Format and export the comprehensive report to Google Sheets with multiple tabs.

### Command:
```bash
kai skill invoke --name google-sheets --config '{
  "action": "create_report",
  "spreadsheet_title": "Social Media Analytics - Jan 2024",
  "data_source": "/data/social_media/aggregated/agg_sm_2024_01_15_001",
  "worksheets": [
    {
      "name": "Executive Summary",
      "type": "summary",
      "data_fields": ["summary_metrics", "platform_breakdown"],
      "formatting": {
        "header_style": "bold_blue",
        "number_format": "number_with_commas",
        "percentages": "percent_1_decimal",
        "conditional_formatting": [
          {"column": "growth_rate", "rule": "green_if_positive_red_if_negative"}
        ],
        "charts": [{
          "type": "pie",
          "data": "platform_breakdown.followers",
          "position": "G2",
          "title": "Follower Distribution"
        }]
      }
    },
    {
      "name": "Platform Details",
      "type": "detailed",
      "data_fields": ["youtube", "twitter", "instagram", "linkedin"],
      "formatting": {
        "header_style": "bold_gray",
        "freeze_first_row": true,
        "auto_resize_columns": true,
        "charts": [
          {
            "type": "line",
            "data": "daily_metrics",
            "position": "J2",
            "title": "30-Day Trend"
          }
        ]
      }
    },
    {
      "name": "Top Content",
      "type": "content_analysis",
      "data_fields": ["top_performing_content.by_platform"],
      "formatting": {
        "include_preview_links": true,
        "thumbnail_column": true,
        "sort_by": "engagement_score_desc"
      }
    },
    {
      "name": "Insights & Recommendations",
      "type": "text",
      "data_fields": ["insights"],
      "formatting": {
        "insight_type_colors": {
          "trend": "blue",
          "anomaly": "orange",
          "recommendation": "green"
        }
      }
    }
  ],
  "sharing": {
    "access": "domain",
    "domain": "company.com",
    "permission": "view"
  }
}'
```

### Example Output:
```json
{
  "export_id": "gs_export_001",
  "status": "completed",
  "spreadsheet": {
    "id": "1Abc123Def456Ghi789",
    "url": "https://docs.google.com/spreadsheets/d/1Abc123Def456Ghi789/edit",
    "title": "Social Media Analytics - Jan 2024"
  },
  "worksheets_created": [
    {
      "name": "Executive Summary",
      "rows": 15,
      "columns": 7,
      "charts_embedded": 1,
      "status": "success"
    },
    {
      "name": "Platform Details",
      "rows": 334,
      "columns": 12,
      "charts_embedded": 4,
      "status": "success"
    },
    {
      "name": "Top Content",
      "rows": 20,
      "columns": 8,
      "status": "success"
    },
    {
      "name": "Insights & Recommendations",
      "rows": 8,
      "columns": 4,
      "status": "success"
    }
  ],
  "formatting_applied": {
    "headers_styled": true,
    "conditional_formatting": true,
    "charts_rendered": true,
    "frozen_rows": ["Platform Details"]
  },
  "sharing_configured": {
    "access": "domain",
    "domain": "company.com",
    "permission": "view"
  }
}
```

### Google Sheets Preview:

**Executive Summary Tab:**
| Metric | Value | Change | Platform Leader |
|--------|-------|--------|-----------------|
| Total Followers | 450,000 | +11,590 (2.6%) | Instagram |
| Total Reach | 4,230,000 | +18% | Twitter |
| Avg Engagement | 3.8% | +0.4pp | YouTube |
| Content Published | 334 | +12% | Twitter |

*[Pie chart showing follower distribution by platform]*

---

## Step 5: Send Slack Notification

Notify the team with a summary and link to the full report.

### Command:
```bash
kai skill invoke --name slack-notification --config '{
  "channel": "#marketing-analytics",
  "message_type": "rich_embed",
  "content": {
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "📊 Social Media Analytics Report - Jan 15, 2024",
          "emoji": true
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Period:* Jan 1-15, 2024 | *Platforms:* 4 | *Total Posts:* 334"
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": "*Total Followers*\n450,000 👥 (+11,590)"
          },
          {
            "type": "mrkdwn",
            "text": "*Total Reach*\n4.23M 👁️ (+18%)"
          },
          {
            "type": "mrkdwn",
            "text": "*Avg Engagement*\n3.8% 📈 (+0.4pp)"
          },
          {
            "type": "mrkdwn",
            "text": "*Top Platform*\nInstagram (280K followers)"
          }
        ]
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "🎯 *Key Insights:*\n• Instagram video content shows 40% higher engagement\n• LinkedIn spike on Jan 8th (hiring post)\n• Cross-post YouTube content to LinkedIn for 2.3x reach"
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "📊 View Full Report",
              "emoji": true
            },
            "url": "https://docs.google.com/spreadsheets/d/1Abc123Def456Ghi789/edit",
            "style": "primary"
          },
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "🖼️ View Thumbnail",
              "emoji": true
            },
            "url": "https://cdn.kai.ai/generated/social_analytics_thumbnail_2024_01_15.png"
          }
        ]
      }
    ]
  },
  "mentions": ["@channel"]
}'
```

### Example Output:
```json
{
  "notification_id": "slack_001",
  "status": "delivered",
  "channel": "#marketing-analytics",
  "timestamp": "2024-01-15T09:45:32Z",
  "message_ts": "1705311932.123456",
  "delivery_details": {
    "blocks_rendered": 6,
    "buttons_embedded": 2,
    "mentions_count": 1
  },
  "engagement_preview": {
    "estimated_open_rate": "85%",
    "click_through_prediction": "60%"
  }
}
```

**Slack Message Preview:**

```
📊 Social Media Analytics Report - Jan 15, 2024
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Period: Jan 1-15, 2024 | Platforms: 4 | Total Posts: 334

┌─────────────────┬─────────────────┐
│ Total Followers │ Total Reach     │
│ 450,000 👥      │ 4.23M 👁️        │
│ (+11,590)       │ (+18%)          │
├─────────────────┼─────────────────┤
│ Avg Engagement  │ Top Platform    │
│ 3.8% 📈         │ Instagram       │
│ (+0.4pp)        │ (280K followers)│
└─────────────────┴─────────────────┘

🎯 Key Insights:
• Instagram video content shows 40% higher engagement
• LinkedIn spike on Jan 8th (hiring post)
• Cross-post YouTube content to LinkedIn for 2.3x reach

[📊 View Full Report] [🖼️ View Thumbnail]
```

---

## Step 6: Trigger Webhook for External Automation

Send data to Zapier/Make for additional workflow automation.

### Command:
```bash
kai skill invoke --name webhook-trigger --config '{
  "endpoint": "https://hooks.zapier.com/hooks/catch/123456/abcdef/",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "X-Webhook-Source": "kai-analytics",
    "X-Event-Type": "social-media-report-complete"
  },
  "payload": {
    "event": "social_media_analytics_complete",
    "timestamp": "2024-01-15T09:45:32Z",
    "report": {
      "id": "sm_2024_01_15_001",
      "period": "2024-01-01 to 2024-01-15",
      "summary": {
        "total_followers": 450000,
        "new_followers": 11590,
        "total_reach": 4230000,
        "engagement_rate": 3.8,
        "content_count": 334
      },
      "platforms": ["youtube", "twitter", "instagram", "linkedin"],
      "top_performer": {
        "platform": "youtube",
        "content": "Product Demo 2024",
        "engagement_score": 98.5
      }
    },
    "exports": {
      "google_sheets": {
        "url": "https://docs.google.com/spreadsheets/d/1Abc123Def456Ghi789/edit",
        "worksheets": 4
      },
      "thumbnail": {
        "url": "https://cdn.kai.ai/generated/social_analytics_thumbnail_2024_01_15.png"
      }
    },
    "notifications_sent": {
      "slack": "#marketing-analytics"
    },
    "insights_count": 3,
    "next_report_scheduled": "2024-02-01T09:00:00Z"
  },
  "retry_policy": {
    "max_attempts": 3,
    "backoff": "exponential"
  }
}'
```

### Example Output:
```json
{
  "webhook_id": "wh_001",
  "status": "success",
  "endpoint": "https://hooks.zapier.com/hooks/catch/123456/abcdef/",
  "response": {
    "status_code": 200,
    "body": {"status": "success", "zap_run_id": "xyz789"},
    "response_time_ms": 234
  },
  "payload_delivered": {
    "size_bytes": 1847,
    "fields": 12,
    "nested_objects": 4
  },
  "zapier_actions_triggered": [
    "Create Trello card for top performing content",
    "Add row to Airtable base",
    "Send email to executives",
    "Post to Notion database"
  ],
  "next_steps": {
    "description": "Zapier will now create follow-up tasks in Trello, update Airtable, and notify stakeholders"
  }
}
```

---

## Complete Workflow Script

Here's the complete automated workflow that chains all steps together:

```bash
#!/bin/bash
# social-media-dashboard-workflow.sh
# Complete social media analytics automation

set -e

echo "🚀 Starting Social Media Analytics Dashboard Workflow"
echo "======================================================"

# Step 1: Collect data from all platforms
echo "📡 Step 1: Collecting data from all platforms..."
COLLECTION_RESULT=$(kai skill invoke --name youtube-analytics --parallel --config '{"channelId": "UC_example", "days": 30}' &
kai skill invoke --name twitter-analytics --parallel --config '{"handle": "@company", "days": 30}' &
kai skill invoke --name instagram-analytics --parallel --config '{"accountId": "company_official", "days": 30}' &
kai skill invoke --name linkedin-analytics --parallel --config '{"companyId": "12345678", "days": 30}' &
wait)
BATCH_ID=$(echo $COLLECTION_RESULT | jq -r '.collection_batch_id')
echo "✅ Data collected: $BATCH_ID"

# Step 2: Aggregate metrics
echo "📊 Step 2: Aggregating metrics..."
AGG_RESULT=$(kai skill invoke --name data-aggregator --config "{
  \"source\": \"/data/social_media/$BATCH_ID\",
  \"aggregations\": [{\"name\": \"total_followers\", \"operation\": \"sum\"}]
}")
AGG_ID=$(echo $AGG_RESULT | jq -r '.aggregation_id')
echo "✅ Metrics aggregated: $AGG_ID"

# Step 3: Generate thumbnail (parallel with export)
echo "🎨 Step 3: Generating AI thumbnail..."
kai skill invoke --name image-generation --parallel --config '{
  "provider": "openrouter",
  "model": "recraft-v3",
  "prompt": "Modern social media analytics dashboard visualization..."
}' &

# Step 4: Export to Google Sheets
echo "📋 Step 4: Exporting to Google Sheets..."
SHEETS_RESULT=$(kai skill invoke --name google-sheets --config "{
  \"action\": \"create_report\",
  \"data_source\": \"/data/social_media/aggregated/$AGG_ID\",
  \"spreadsheet_title\": \"Social Media Analytics - $(date +%Y-%m-%d)\"  
}")
SHEETS_URL=$(echo $SHEETS_RESULT | jq -r '.spreadsheet.url')
echo "✅ Report exported: $SHEETS_URL"

wait  # Wait for thumbnail generation

# Step 5: Send Slack notification
echo "💬 Step 5: Sending Slack notification..."
kai skill invoke --name slack-notification --config "{
  \"channel\": \"#marketing-analytics\",
  \"content\": {
    \"blocks\": [{
      \"type\": \"header\",
      \"text\": {\"type\": \"plain_text\", \"text\": \"📊 Social Media Report Ready\"}
    },
    {
      \"type\": \"actions\",
      \"elements\": [{\"type\": \"button\", \"url\": \"$SHEETS_URL\", \"text\": {\"type\": \"plain_text\", \"text\": \"View Report\"}}]
    }]
  }
}"
echo "✅ Slack notification sent"

# Step 6: Trigger webhook
echo "🔗 Step 6: Triggering external webhook..."
kai skill invoke --name webhook-trigger --config "{
  \"endpoint\": \"https://hooks.zapier.com/hooks/catch/123456/abcdef/\",
  \"payload\": {
    \"event\": \"social_media_analytics_complete\",
    \"report_url\": \"$SHEETS_URL\",
    \"timestamp\": \"$(date -Iseconds)\"
  }
}"
echo "✅ Webhook triggered"

echo ""
echo "======================================================"
echo "✨ Workflow completed successfully!"
echo "Report: $SHEETS_URL"
echo "======================================================"
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOCIAL MEDIA ANALYTICS PIPELINE              │
└─────────────────────────────────────────────────────────────────┘

   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ YouTube  │   │ Twitter  │   │Instagram │   │ LinkedIn │
   │  API     │   │  API     │   │  API     │   │  API     │
   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                           │
                    ┌──────────────┐
                    │   PARALLEL   │
                    │  COLLECTION  │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐      ┌─────────▼────────┐
     │  DATA STORAGE   │      │ AI THUMBNAIL     │
     │  (/data/...)    │      │ GENERATION       │
     └────────┬────────┘      └─────────┬────────┘
              │                         │
     ┌────────▼────────┐                │
     │  AGGREGATION    │                │
     │    ENGINE       │                │
     └────────┬────────┘                │
              │                         │
     ┌────────┴────────┐                │
     │                 │                │
┌────▼────┐    ┌───────▼──────┐  ┌────▼────┐
│ Google  │    │    Slack     │  │ Webhook │
│ Sheets  │    │ Notification │  │ Trigger │
└─────────┘    └──────────────┘  └─────────┘
```

---

## Key Features Demonstrated

### 1. **Parallel Processing**
- All 4 social platforms collected simultaneously
- Thumbnail generation runs in parallel with data aggregation
- Total execution time: ~15 seconds vs ~60 seconds sequential

### 2. **Data Persistence**
- Raw data stored at `/data/social_media/batch_*/`
- Aggregated data at `/data/social_media/aggregated/`
- Images cached at `/data/images/`
- Each step references previous outputs by ID

### 3. **Smart Formatting**
- Conditional formatting in Google Sheets (green for positive growth)
- Automatic chart generation
- Data validation and type conversion
- Domain-appropriate sharing permissions

### 4. **Rich Notifications**
- Slack blocks with interactive buttons
- Embedded metrics and insights
- Click-through to full reports
- Channel mentions for visibility

### 5. **External Integration**
- Zapier webhook triggers additional automations
- Payload includes all relevant metadata
- Retry policies for reliability
- Bidirectional data flow capability

---

## Usage Patterns

### Schedule Daily Reports:
```bash
# Add to crontab for daily 9 AM reports
0 9 * * * /path/to/social-media-dashboard-workflow.sh >> /var/log/kai-analytics.log 2>&1
```

### Trigger on Event:
```bash
# Trigger after major campaign launch
kai skill invoke --name workflow-runner --config '{
  "workflow": "social-media-dashboard",
  "trigger": "campaign_end",
  "campaign_id": "spring_2024_launch"
}'
```

### Custom Dashboard:
```bash
# Create dashboard with specific platforms only
kai skill invoke --name social-dashboard --config '{
  "platforms": ["instagram", "twitter"],
  "focus": "engagement_rate",
  "period": "last_7_days"
}'
```

---

## Configuration Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `platforms` | array | all | Which platforms to include |
| `days` | number | 30 | Data collection period |
| `google_sheets.enabled` | boolean | true | Export to Sheets |
| `slack.channel` | string | #analytics | Notification channel |
| `webhook.endpoint` | string | null | External automation URL |
| `thumbnail.style` | string | modern | AI image style |
| `aggregation.metrics` | array | all | Which metrics to calculate |

---

## Troubleshooting

### Common Issues:

**Rate Limiting:**
```bash
# Add rate limit handling
kai skill invoke --name youtube-analytics --config '{
  "rate_limit_handling": "exponential_backoff",
  "max_retries": 5
}'
```

**Missing Data:**
```bash
# Run with validation
kai skill invoke --name data-aggregator --config '{
  "validation": {
    "required_fields": ["followers", "engagement"],
    "missing_data_action": "flag_and_continue"
  }
}'
```

**Webhook Failures:**
```bash
# Check webhook health
kai skill invoke --name webhook-trigger --config '{
  "action": "health_check",
  "endpoint": "https://hooks.zapier.com/hooks/catch/123456/abcdef/"
}'
```

---

## Next Steps

- **Add more platforms:** TikTok, Pinterest, Facebook
- **Custom metrics:** ROI calculation, sentiment analysis
- **Predictive analytics:** Trend forecasting
- **Real-time streaming:** Live dashboard updates
- **Mobile app:** Native iOS/Android notifications

---

*Generated by Kai Analytics Engine v2.0*
*Last updated: January 2024*
