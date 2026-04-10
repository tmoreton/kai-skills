# TikTok Skill

**Status:** 🟡 PLANNED / UPCOMING

A TikTok integration skill for content management, video publishing, analytics, and audience engagement automation.

> ⚠️ **Current State:** Limited tooling available. This document outlines planned capabilities and provides reference documentation for when TikTok API access becomes available.

---

## Overview

This skill provides programmatic access to TikTok content operations, including video upload, publishing workflows, analytics retrieval, and comment management. It leverages the TikTok for Developers APIs where available, with web-based research capabilities as a fallback for content discovery.

### Supported Operations (Planned)

| Feature | Status | API Required |
|---------|--------|--------------|
| Video Upload | 🚧 Planned | Content Posting API |
| Video Publishing | 🚧 Planned | Content Posting API |
| Analytics Retrieval | 🚧 Planned | Research API / Analytics API |
| Comment Management | 🚧 Planned | Display API / Research API |
| User Profile Lookup | 🚧 Planned | Research API |
| Hashtag Research | 🚧 Planned | Research API |
| Trending Content Discovery | 🚧 Planned | Research API |

---

## Prerequisites

### API Access Requirements

TikTok offers multiple developer APIs with different capabilities:

#### 1. **TikTok Research API**
- **Use Case:** Public content analysis, hashtag research, user profile data
- **Access:** Requires application approval
- **Apply:** [TikTok for Developers - Research API](https://developers.tiktok.com/products/research-api/)
- **Rate Limits:** Tiered based on use case

#### 2. **TikTok Content Posting API**
- **Use Case:** Video upload, publishing, draft management
- **Access:** Business account required, partner program
- **Status:** Limited availability (private beta)
- **Apply:** [TikTok for Developers](https://developers.tiktok.com/)

#### 3. **TikTok Display API**
- **Use Case:** User info, video info (read-only)
- **Access:** OAuth-based, app approval required
- **Limitations:** Limited to basic video/user metadata

#### 4. **TikTok Business Account API**
- **Use Case:** Business account analytics, ad management
- **Access:** TikTok for Business account required

### Credential Setup

```yaml
# Required for web-based research
TAVILY_API_KEY: "your_tavily_api_key"

# Optional - TikTok Research API
TIKTOK_RESEARCH_API_KEY: "your_research_api_key"

# Optional - Display API (OAuth)
TIKTOK_CLIENT_KEY: "your_client_key"
TIKTOK_CLIENT_SECRET: "your_client_secret"
TIKTOK_ACCESS_TOKEN: "oauth_access_token"
```

---

## Configuration

```yaml
# skill.yaml
config_schema:
  # Web Search API (Required for basic functionality)
  - key: tavily_api_key
    type: string
    required: true
    env: TAVILY_API_KEY
    description: Tavily API Key for web search

  # TikTok Research API (Optional for enhanced data)
  - key: research_api_key
    type: string
    required: false
    env: TIKTOK_RESEARCH_API_KEY
    description: TikTok Research API Key

  # Display API credentials
  - key: client_key
    type: string
    required: false
    env: TIKTOK_CLIENT_KEY
    description: TikTok App Client Key

  - key: client_secret
    type: string
    required: false
    env: TIKTOK_CLIENT_SECRET
    description: TikTok App Client Secret
```

---

## Planned Capabilities

### 1. Video Upload & Publishing

#### Direct Upload
```javascript
// Planned API
const result = await tiktok.uploadVideo({
  video_path: "/path/to/video.mp4",
  title: "My awesome TikTok video",
  description: "Check out this content! #viral #trending",
  privacy_level: "public", // public, friends, private
  allow_comments: true,
  allow_duet: true,
  allow_stitch: true,
  hashtags: ["viral", "trending", "fyp"],
  mentions: ["@username"],
  cover_image_path: "/path/to/thumbnail.jpg"
});
```

#### Draft Management
```javascript
// Planned API
const draft = await tiktok.createDraft({
  video_path: "/path/to/video.mp4",
  title: "Draft video",
  scheduled_time: "2024-12-25T10:00:00Z"
});

await tiktok.schedulePublish({
  draft_id: draft.id,
  publish_time: "2024-12-25T10:00:00Z"
});
```

#### Content Requirements

TikTok has specific requirements for uploaded content:

| Requirement | Specification |
|-------------|---------------|
| **Video Duration** | 15 seconds to 10 minutes (up to 60 min for selected accounts) |
| **File Size** | Max 287.6 MB (iOS), 72 MB (Android) |
| **Resolution** | Min 720x1280 (9:16 aspect ratio recommended) |
| **File Format** | MP4 or MOV |
| **Frame Rate** | 30+ fps recommended |
| **Audio** | AAC codec, required for all videos |

### 2. Analytics & Insights

#### Video Analytics
```javascript
// Planned API
const analytics = await tiktok.getVideoAnalytics({
  video_id: "1234567890",
  metrics: ["views", "likes", "comments", "shares", "watch_time"],
  date_range: {
    start: "2024-01-01",
    end: "2024-01-31"
  }
});

// Returns:
{
  video_id: "1234567890",
  views: 150000,
  likes: 12500,
  comments: 450,
  shares: 890,
  watch_time_seconds: 45000,
  average_watch_time: 12.5,
  traffic_sources: {
    for_you: 85,
    following: 10,
    search: 5
  },
  audience_demographics: {
    gender: { male: 40, female: 58, unknown: 2 },
    age_ranges: { "18-24": 45, "25-34": 35, "35-44": 15, "45+": 5 },
    countries: { "US": 60, "UK": 15, "CA": 10 }
  }
}
```

#### Account Analytics
```javascript
// Planned API
const accountStats = await tiktok.getAccountAnalytics({
  date_range: "last_30_days",
  metrics: ["followers", "profile_views", "video_views"]
});
```

#### Trending Content Analysis
```javascript
// Planned API
const trends = await tiktok.getTrendingHashtags({
  region: "US",
  category: "entertainment", // or "all"
  limit: 20
});

const trendingSounds = await tiktok.getTrendingSounds({
  region: "US",
  limit: 20
});
```

### 3. Comment Management

#### Retrieve Comments
```javascript
// Planned API
const comments = await tiktok.getVideoComments({
  video_id: "1234567890",
  max_results: 100,
  sort_by: "top", // or "recent"
  include_replies: true
});
```

#### Reply to Comments
```javascript
// Planned API
await tiktok.replyToComment({
  video_id: "1234567890",
  comment_id: "comment_123",
  reply_text: "Thanks for your support! 🙏"
});
```

#### Comment Moderation
```javascript
// Planned API
await tiktok.deleteComment({
  video_id: "1234567890",
  comment_id: "comment_123"
});

await tiktok.hideComments({
  video_id: "1234567890",
  keywords: ["spam", "inappropriate"]
});
```

### 4. User & Content Discovery

#### User Profile Information
```javascript
// Planned API
const profile = await tiktok.getUserProfile({
  username: "@username"
});

// Returns:
{
  username: "username",
  display_name: "User Name",
  bio: "Bio text...",
  avatar_url: "https://...",
  follower_count: 500000,
  following_count: 250,
  like_count: 12000000,
  video_count: 450,
  verified: true,
  private: false
}
```

#### User Videos
```javascript
// Planned API
const videos = await tiktok.getUserVideos({
  username: "@username",
  max_results: 50
});
```

#### Search
```javascript
// Planned API
const results = await tiktok.searchVideos({
  query: "cooking tutorials",
  hashtag: "foodtok",
  max_results: 50,
  sort_by: "relevance" // or "recent", "popular"
});
```

---

## TikTok API References

### Official Documentation

| Resource | URL |
|----------|-----|
| TikTok for Developers | https://developers.tiktok.com/ |
| Research API Docs | https://developers.tiktok.com/products/research-api/ |
| Display API Docs | https://developers.tiktok.com/doc/display-api-overview/ |
| Content Posting API | https://developers.tiktok.com/doc/content-posting-api-overview/ |
| API Changelog | https://developers.tiktok.com/doc/changelog/ |

### TikTok Research API Endpoints (Planned)

```
GET /v1/research/user/info          - Get user profile info
GET /v1/research/user/videos        - Get user's videos
GET /v1/research/video/comments     - Get video comments
GET /v1/research/hashtag/search     - Search hashtags
GET /v1/research/video/query        - Query videos
POST /v1/research/video/query       - Advanced video search
```

### TikTok Content Posting API Endpoints (Planned)

```
POST /v2/post/publish/video/init/    - Initialize video upload
POST /v2/post/publish/video/upload/  - Upload video file
POST /v2/post/publish/video/complete/ - Complete video upload
GET  /v2/post/publish/status/        - Check publish status
```

---

## Content Strategy Guidelines

### Trending Content Formulas

Based on TikTok's algorithm and viral content patterns:

#### High-Performing Video Types

| Content Type | Engagement Rate | Best For |
|--------------|-----------------|----------|
| **Behind-the-Scenes** | High | Brand building, authenticity |
| **How-To/Tutorial** | Very High | Education, value delivery |
| **Trending Audio/Challenge** | Very High | Reach, discovery |
| **Story Time** | High | Community building |
| **POV Content** | High | Relatability, entertainment |
| **Day-in-Life** | Medium-High | Personal brand, lifestyle |
| **Quick Tips** | High | Authority building |
| **Reaction Videos** | Medium | Commentary, entertainment |

#### Optimal Posting Strategy

```yaml
Best Posting Times (US):
  - Weekdays: 7:00-9:00 AM, 12:00-1:00 PM, 7:00-9:00 PM
  - Weekends: 9:00-11:00 AM, 7:00-10:00 PM

Content Frequency:
  - Minimum: 1 video per day
  - Optimal: 3-5 videos per day
  - Maximum: 10+ videos per day (risk of audience fatigue)

Video Length Sweet Spots:
  - 0-15 seconds: Highest completion rate
  - 15-30 seconds: Good engagement balance
  - 30-60 seconds: Storytelling depth
  - 60+ seconds: Educational/tutorial content
```

### Hashtag Strategy

#### Hashtag Mix Formula
```
Recommended: 3-5 hashtags per video

Mix:
  - 1 broad hashtag (1M+ posts) - e.g., #fyp, #viral
  - 2-3 niche hashtags (10K-500K posts) - e.g., #techtok, #coding
  - 1 branded/community hashtag

Avoid:
  - Banned or restricted hashtags
  - Overly generic hashtags with 100M+ posts
  - More than 5 hashtags (looks spammy)
```

#### Trending Hashtag Discovery

1. **TikTok Creative Center**: https://www.tiktok.com/creativecenter
2. **In-app Discover Tab**: Real-time trending content
3. **Third-party tools**: TrendTok, Pentos, Exolyt

### Content Requirements & Guidelines

#### Technical Specifications

```yaml
Video Specs:
  Aspect Ratio: 9:16 (1080x1920 recommended)
  Safe Zones: Keep text within 154px from edges
  Captions: Always include (accessibility + silent viewing)
  Thumbnail: Custom cover improves CTR
  
Audio:
  - Use trending sounds from TikTok library
  - Original audio can work for unique content
  - Always include captions/subtitles
```

#### Community Guidelines Compliance

Prohibited content categories:
- Dangerous acts/challenges
- Misinformation
- Hate speech
- Harassment/bullying
- Adult content/nudity
- Violence/graphic content
- Illegal activities
- Spam/fake engagement

[Full Guidelines](https://www.tiktok.com/community-guidelines)

---

## Automation Use Cases

### 1. Content Pipeline Automation

```javascript
// Planned workflow
const workflow = {
  // 1. Generate content ideas based on trending topics
  ideas: await tiktok.getTrendingHashtags({ region: "US", limit: 10 }),
  
  // 2. Create and upload videos
  upload: await tiktok.uploadVideo({
    video_path: "/content/video.mp4",
    title: "Trending topic coverage",
    scheduled_time: "tomorrow 10:00 AM"
  }),
  
  // 3. Monitor performance
  analytics: await tiktok.getVideoAnalytics({ video_id: upload.id }),
  
  // 4. Engage with comments
  comments: await tiktok.getVideoComments({ video_id: upload.id }),
  engagement: await tiktok.replyToComments({ comments: positiveComments })
};
```

### 2. Cross-Platform Content Distribution

```javascript
// Planned workflow
const distributeContent = async (videoPath, metadata) => {
  // Publish to TikTok
  const tiktokPost = await tiktok.uploadVideo({
    video_path: videoPath,
    title: metadata.title,
    hashtags: metadata.hashtags.tiktok
  });
  
  // Adapt and publish to other platforms
  const instagramPost = await instagram.publishReel({...});
  const youtubePost = await youtube.publishShort({...});
  
  return { tiktok: tiktokPost, instagram: instagramPost, youtube: youtubePost };
};
```

### 3. Analytics Reporting

```javascript
// Planned workflow
const generateReport = async (dateRange) => {
  const videos = await tiktok.getUserVideos({ dateRange });
  const analytics = await Promise.all(
    videos.map(v => tiktok.getVideoAnalytics({ video_id: v.id, dateRange }))
  );
  
  return {
    total_views: sum(analytics.map(a => a.views)),
    total_engagement: sum(analytics.map(a => a.likes + a.comments + a.shares)),
    top_performing: sortBy(analytics, 'views').slice(0, 5),
    growth_rate: calculateGrowth(analytics)
  };
};
```

---

## Error Handling

### Common Error Codes (Planned)

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `RATE_LIMIT_EXCEEDED` | Too many API requests | Wait and retry with exponential backoff |
| `INVALID_VIDEO_FORMAT` | Video doesn't meet requirements | Check format, resolution, duration |
| `UPLOAD_FAILED` | Video upload unsuccessful | Retry upload or check network |
| `PUBLISHING_RESTRICTED` | Account publishing limits | Check account status and guidelines |
| `COMMENT_DISABLED` | Comments disabled on video | Enable comments in video settings |
| `UNAUTHORIZED` | Invalid or expired token | Refresh access token |
| `NOT_FOUND` | Video/user not found | Verify ID/username |

### Retry Logic

```javascript
// Planned implementation
const withRetry = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
};
```

---

## Security Considerations

### API Key Management
- Store credentials in environment variables or secure vault
- Never commit API keys to version control
- Rotate keys periodically
- Use least-privilege access for API credentials

### Content Moderation
- Implement keyword filtering for comments
- Review automated replies before sending
- Monitor for guideline violations in user content

### Rate Limiting
- Respect TikTok API rate limits
- Implement request queuing for bulk operations
- Cache results where appropriate

---

## Roadmap

### Phase 1: Research & Discovery (Current)
- [x] Basic web search integration
- [x] Content research capabilities
- [ ] Research API integration

### Phase 2: Content Publishing (Upcoming)
- [ ] Video upload functionality
- [ ] Draft and scheduling system
- [ ] Publishing status monitoring

### Phase 3: Analytics & Insights (Upcoming)
- [ ] Video performance metrics
- [ ] Account analytics dashboard
- [ ] Trending content analysis

### Phase 4: Engagement Automation (Upcoming)
- [ ] Comment retrieval and management
- [ ] Automated response workflows
- [ ] Community engagement tools

---

## References & Resources

### Official TikTok Resources
- [TikTok for Developers](https://developers.tiktok.com/)
- [TikTok Creative Center](https://www.tiktok.com/creativecenter)
- [TikTok Business Help Center](https://ads.tiktok.com/help/)
- [TikTok Community Guidelines](https://www.tiktok.com/community-guidelines)

### Third-Party Tools
- **TrendTok**: Trending hashtag and sound discovery
- **Pentos**: TikTok analytics and monitoring
- **Exolyt**: Comprehensive TikTok analytics platform
- **TikTok Studio**: Native creator analytics

### Learning Resources
- [TikTok Creator Portal](https://www.tiktok.com/creators)
- [TikTok for Business Education](https://www.tiktok.com/business/en-US/solutions/tiktok-for-business)

---

## Support

For TikTok API access issues:
- Contact TikTok Developer Support: developers@tiktok.com
- Check [TikTok Developer Forums](https://developers.tiktok.com/forums)

For skill-related questions:
- File an issue in the kai-skills repository
- Review existing documentation and examples

---

*Last Updated: 2024*
*Status: Planned / Upcoming - Awaiting full API access for complete implementation*
