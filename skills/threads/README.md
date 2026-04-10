# Threads Skill

> **Status:** PLANNED / UPCOMING  
> **Target Release:** Q2 2025  
> **Last Updated:** January 2025

---

## Overview

The Threads skill enables Kai to create, publish, and manage content on Meta's Threads platform. This skill provides seamless integration with the Meta Threads API for post creation, engagement analytics, and reply management, with built-in cross-posting capabilities to Instagram.

---

## Planned Capabilities

### 📤 Post Creation

| Feature | Description | Priority |
|---------|-------------|----------|
| **Text Posts** | Create and publish text-based threads (up to 500 characters) | P0 |
| **Media Posts** | Upload and attach images (single & multiple) | P0 |
| **Carousels** | Create multi-image carousel posts | P1 |
| **Links** | Include URLs with automatic preview generation | P1 |
| **Scheduling** | Schedule posts for future publication | P2 |
| **Drafts** | Save and manage draft posts | P2 |
| **Polls** | Create interactive poll threads | P3 |

**Post Types:**
- Single text post
- Image + text
- Video post (up to 5 minutes)
- Carousel (up to 10 images)
- Reply/quote posts
- Reposts with commentary

---

### 📊 Engagement Analytics

| Metric | Description | Availability |
|--------|-------------|--------------|
| **Views** | Total thread impressions | Real-time |
| **Likes** | Heart reactions count | Real-time |
| **Replies** | Direct responses count | Real-time |
| **Reposts** | Repost/quote counts | Real-time |
| **Reach** | Unique account impressions | Daily |
| **Profile Clicks** | Profile visits from thread | Daily |
| **Follower Growth** | New followers from content | Daily |

**Analytics Features:**
- Real-time engagement dashboards
- Post performance comparison
- Audience demographic insights
- Best posting time recommendations
- Hashtag performance tracking
- Export to CSV/JSON

---

### 💬 Reply Management

| Feature | Description | Priority |
|---------|-------------|----------|
| **View Replies** | List all replies to a thread | P0 |
| **Reply to Thread** | Respond to specific comments | P0 |
| **Like Replies** | React to user comments | P0 |
| **Hide Replies** | Moderate negative/spam comments | P1 |
| **Delete Replies** | Remove inappropriate content | P1 |
| **Threaded Replies** | Support nested conversation threads | P1 |
| **Reply Notifications** | Real-time notification handling | P2 |
| **Auto-Moderation** | Keyword-based reply filtering | P3 |

**Reply Actions:**
- Reply with text
- Reply with media
- Quote reply (reply + original context)
- Mark as helpful/featured
- Bulk moderation tools

---

## Meta Threads API Requirements

### Authentication

```yaml
Auth Type: OAuth 2.0
Scopes Required:
  - threads_basic: Read user profile info
  - threads_content_publish: Create posts
  - threads_read_replies: Read replies
  - threads_manage_replies: Moderate replies
  - threads_read_insights: Access analytics

Token Lifecycle:
  - Access Token: 1 hour expiry
  - Refresh Token: 60 day expiry
```

### API Endpoints (Planned)

```
Base URL: https://graph.threads.net/v1.0

Content:
  POST /{user-id}/threads  
    - Create text posts
    - Publish media posts
    - Create carousels
    
  GET /{thread-id}
    - Retrieve post details
    - Get engagement metrics
    
  DELETE /{thread-id}
    - Remove published content

Replies:
  GET /{thread-id}/replies
    - List all replies
    - Pagination support
    
  POST /{thread-id}/replies
    - Reply to thread
    
  POST /{reply-id}/hide
    - Hide specific reply
    
  DELETE /{reply-id}
    - Delete reply

Analytics:
  GET /{thread-id}/insights
    - Views, likes, replies, reposts
    - Demographic breakdown
    
  GET /{user-id}/insights
    - Account-level metrics
    - Follower analytics
```

### Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Publishing | 25 | Per hour |
| Media Uploads | 100 | Per hour |
| Read Operations | 200 | Per hour |
| Analytics | 100 | Per hour |

---

## Instagram Cross-Posting

### Supported Cross-Post Types

| Threads Content | Instagram Destination | Notes |
|----------------|----------------------|-------|
| Text + Image | Feed Post | Aspect ratio adjusted |
| Carousel | Carousel Post | All images transferred |
| Video | Reels | Format optimized |
| Story Link | Story | "Add Yours" sticker |

### Cross-Posting Features

**Auto-Cross-Post:**
- Enable automatic sharing to Instagram
- Custom captions per platform
- Hashtag adaptation (Instagram allows 30 vs Threads unlimited)
- Platform-specific mentions (@username translation)

**Manual Cross-Post:**
- Select individual posts to cross-share
- Edit content before Instagram publish
- Schedule staggered posts (Threads first, Instagram +X hours)

**Sync Options:**
```yaml
Caption Handling:
  - Same caption (default)
  - Custom Instagram caption
  - Truncated for character limits

Media Handling:
  - Use same media (default)
  - Upload different media for Instagram
  - Apply Instagram filters/edits

Engagement Sync:
  - Sync likes (optional)
  - Sync replies as Instagram comments
  - Cross-platform notification aggregation
```

### Instagram API Requirements

Requires additional permissions:
- `instagram_content_publish`
- `instagram_basic`
- `instagram_manage_insights`

---

## Configuration

### Skill Configuration Schema

```yaml
threads:
  enabled: true
  
  # Authentication
  auth:
    app_id: "${THREADS_APP_ID}"
    app_secret: "${THREADS_APP_SECRET}"
    redirect_uri: "${THREADS_REDIRECT_URI}"
    
  # Default Post Settings
  defaults:
    auto_crosspost_instagram: false
    default_hashtags: ["#kai", "#automation"]
    link_preview_enabled: true
    
  # Reply Management
  replies:
    auto_hide_spam: true
    spam_keywords: ["spam", "scam", "fake"]
    notification_webhook: "${WEBHOOK_URL}"
    
  # Analytics
  analytics:
    retention_days: 90
    report_schedule: "daily"  # daily, weekly, monthly
    export_format: "json"     # json, csv
```

### Environment Variables

```bash
# Required
THREADS_APP_ID=your_app_id
THREADS_APP_SECRET=your_app_secret
THREADS_ACCESS_TOKEN=initial_access_token

# Optional
THREADS_REDIRECT_URI=https://your-domain.com/callback
THREADS_WEBHOOK_SECRET=webhook_verification_secret

# Instagram Cross-Posting (optional)
INSTAGRAM_ACCESS_TOKEN=ig_access_token
INSTAGRAM_ACCOUNT_ID=ig_business_account_id
```

---

## Usage Examples

### Create a Text Post

```typescript
await kai.threads.createPost({
  text: "Excited to share our latest update! 🚀",
  hashtags: ["#productivity", "#ai"]
});
```

### Create a Media Post

```typescript
await kai.threads.createPost({
  text: "Check out this visualization of our data pipeline:",
  media: [
    { type: "image", url: "https://example.com/chart.png" },
    { type: "image", url: "https://example.com/diagram.png" }
  ],
  carousel: true
});
```

### Cross-Post to Instagram

```typescript
await kai.threads.createPost({
  text: "Launch day is here! 🎉",
  media: [{ type: "image", path: "/assets/launch.jpg" }],
  crosspost: {
    instagram: {
      enabled: true,
      caption: "🚀 Launch day! So excited to share this with the IG community too!",
      hashtags: ["#launch", "#startup", "#tech"]
    }
  }
});
```

### Reply Management

```typescript
// Get replies to a thread
const replies = await kai.threads.getReplies({
  threadId: "1234567890",
  limit: 50
});

// Reply to a specific comment
await kai.threads.reply({
  threadId: "1234567890",
  replyToId: "reply_123",
  text: "Thanks for the feedback! 🙏"
});

// Hide spam replies
await kai.threads.hideReply({
  replyId: "reply_spam_456"
});
```

### Analytics

```typescript
// Get post insights
const insights = await kai.threads.getInsights({
  threadId: "1234567890",
  metrics: ["views", "likes", "replies", "reposts"]
});

// Get account analytics
const accountStats = await kai.threads.getAccountInsights({
  since: "2025-01-01",
  until: "2025-01-31"
});

// Generate report
await kai.threads.generateReport({
  format: "csv",
  period: "last_30_days",
  includeDemographics: true
});
```

---

## Technical Architecture

```
┌─────────────────────────────────────────┐
│           Kai Threads Skill              │
├─────────────────────────────────────────┤
│  • Post Builder     • Reply Manager      │
│  • Media Handler    • Analytics Engine   │
│  • Scheduler        • Cross-Post Sync    │
├─────────────────────────────────────────┤
│         Meta Threads API Client          │
├─────────────────────────────────────────┤
│  • OAuth Handler    • Rate Limiting      │
│  • Retry Logic      • Webhook Handler    │
├─────────────────────────────────────────┤
│         External APIs                    │
│  Meta Threads API  │  Instagram API      │
└─────────────────────────────────────────┘
```

---

## Dependencies

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "form-data": "^4.0.0",
    "sharp": "^0.33.0"
  }
}
```

---

## Development Timeline

| Phase | Features | Target |
|-------|----------|--------|
| **Alpha** | Text posts, basic media, authentication | Feb 2025 |
| **Beta** | Full media support, carousels, analytics | Mar 2025 |
| **RC** | Reply management, webhooks, moderation | Apr 2025 |
| **GA** | Cross-posting, scheduling, full docs | Q2 2025 |

---

## Known Limitations

- Video posts limited to 5 minutes (Threads platform limit)
- Image files must be under 8MB
- Maximum 10 images per carousel
- URL previews require whitelisted domains
- Analytics data delayed up to 24 hours for some metrics
- Cross-posting requires separate Instagram Business Account

---

## Resources

- [Meta Threads API Documentation](https://developers.facebook.com/docs/threads)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Meta App Dashboard](https://developers.facebook.com/apps)
- [Threads Developer Community](https://developers.facebook.com/community)

---

## Contributing

This skill is in the planning phase. To contribute or request features:

1. Open an issue in the kai-skills repository
2. Tag with `skill:threads`
3. Include use case and expected API interactions

---

## License

MIT License - See [LICENSE](../../LICENSE) for details.
