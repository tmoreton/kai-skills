# Instagram Skill

> **Status:** PLANNED / UPCOMING  
> This skill is in the planning phase. The tools listed below do not yet exist but represent the intended capabilities once implemented.

---

## Overview

The Instagram skill enables programmatic management of Instagram Business and Creator accounts through the Meta Business API (formerly Instagram Graph API). This skill provides comprehensive tools for content publishing, engagement management, and analytics retrieval.

---

## Planned Capabilities

### Media Publishing
- **Photo Posts** - Publish single or carousel images with captions
- **Video Posts** - Upload and publish video content
- **Stories** - Create and schedule ephemeral stories with interactive elements
- **Reels** - Publish short-form video content to the Reels feed

### Engagement Management
- **Comments** - Retrieve, reply to, hide, and delete comments on posts
- **Mentions** - Track and respond to mentions across posts and stories
- **Direct Messages** - Read and send DMs (limited API access)

### Insights & Analytics
- **Account Insights** - Follower demographics, reach, impressions
- **Content Performance** - Engagement rates, saves, shares per post
- **Stories Analytics** - Views, replies, taps forward/back, exits
- **Reels Insights** - Plays, likes, comments, shares, reach
- **Audience Metrics** - Growth trends, active hours, top locations

### Account Management
- **Profile Updates** - Bio, profile picture, contact information
- **Hashtag Research** - Search and analyze hashtag performance
- **Content Scheduling** - Queue posts for optimal publishing times
- **Cross-posting** - Share content between Facebook and Instagram

---

## Planned Tool Reference

The following tools are planned for implementation (prefix: `skill__instagram__`):

| Tool | Description |
|------|-------------|
| `skill__instagram__post_media` | Publish photos, videos, carousels |
| `skill__instagram__post_story` | Publish ephemeral stories |
| `skill__instagram__post_reel` | Publish Reels content |
| `skill__instagram__get_comments` | Retrieve comments on a post |
| `skill__instagram__reply_comment` | Reply to a specific comment |
| `skill__instagram__hide_comment` | Hide/delete inappropriate comments |
| `skill__instagram__get_insights` | Retrieve account and content analytics |
| `skill__instagram__get_account_info` | Fetch profile and account details |
| `skill__instagram__search_hashtags` | Research hashtag performance |
| `skill__instagram__schedule_content` | Queue posts for future publishing |

---

## Meta Business API Requirements

### Prerequisites

1. **Business Account Required**
   - Personal Instagram accounts are **not supported**
   - Must convert to a **Business Account** or **Creator Account**

2. **Facebook Connection**
   - Instagram Business account must be linked to a Facebook Page
   - Admin access to the connected Facebook Page is required

3. **Meta App Registration**
   - Create an app at [developers.facebook.com](https://developers.facebook.com)
   - Add the "Instagram Graph API" product to your app

### Required Permissions

The following OAuth permissions will be required for full functionality:

| Permission | Purpose |
|------------|---------|
| `instagram_basic` | Read profile info, media, and comments |
| `instagram_content_publish` | Publish posts, stories, and reels |
| `instagram_manage_comments` | Manage comments (reply, hide, delete) |
| `instagram_manage_insights` | Access analytics and metrics |
| `pages_read_engagement` | Read page engagement data |
| `pages_manage_metadata` | Manage connected page settings |
| `business_management` | Access business account features |

### App Review Process

Before using the Instagram skill in production, your Meta App must complete:

1. **Business Verification**
   - Verify your business identity with Meta
   - Provide business documents (certificate, utility bill, etc.)

2. **App Review**
   - Submit for review at [developers.facebook.com/app-review](https://developers.facebook.com/app-review)
   - Justify each permission request with use-case videos
   - Review process typically takes 5-7 business days

3. **Data Use Checkup**
   - Complete annual data use certification
   - Comply with Meta Platform Terms and Developer Policies

### Rate Limits

- **Publishing:** 25 posts per hour per account
- **Stories:** 100 stories per day per account
- **API Calls:** Varies by endpoint (200-100 calls/hour typical)
- **Insights:** 100 requests per hour per user

---

## Setup Notes

### 1. Convert to Business Account

```
Instagram App → Settings → Account → Switch to Professional Account
→ Select Business or Creator
```

### 2. Connect to Facebook Page

```
Instagram App → Settings → Account → Linked Accounts → Facebook
→ Select or create a Facebook Page
```

### 3. Create Meta App

1. Visit [developers.facebook.com](https://developers.facebook.com)
2. Create new app → Select "Business" type
3. Add "Instagram Graph API" product
4. Configure OAuth settings
5. Add required permissions to "App Review" submission

### 4. Authentication Flow

The skill will implement OAuth 2.0 authorization:

```
User → Authorize App → Receive Access Token → Store Securely
→ Use Token for API Calls → Refresh as Needed
```

**Token Types:**
- **User Access Token:** Short-lived (1-2 hours), used for most operations
- **Page Access Token:** Long-lived (60 days), used for publishing

---

## API Limitations & Considerations

| Feature | Limitation |
|---------|------------|
| Direct Messages | Limited access; requires special approval |
| Shopping Tags | Requires Commerce Account setup |
| Live Videos | Not supported via Graph API |
| Story Polls/Quizzes | Limited interactive features available |
| Reel Covers | Must be provided during upload |
| Scheduled Posts | Requires Content Publishing API access |

---

## Security & Compliance

- **Data Storage:** Access tokens must be encrypted at rest
- **Token Refresh:** Implement automatic token refresh before expiry
- **User Consent:** Ensure explicit consent for all requested permissions
- **Data Retention:** Comply with Meta's data retention policies
- **GDPR/CCPA:** Handle deletion requests and data export requirements

---

## Development Status

- [ ] Core API client implementation
- [ ] Media publishing endpoints
- [ ] Stories and Reels support
- [ ] Comment management tools
- [ ] Insights and analytics retrieval
- [ ] OAuth authentication flow
- [ ] Rate limiting and error handling
- [ ] Documentation and examples

---

## Resources

- [Meta Business API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review)
- [Instagram API Changelog](https://developers.facebook.com/docs/instagram-api/changelog)

---

## Questions?

For updates on this skill's development or to request priority features, please refer to the project roadmap or open an issue.

---

*Last Updated: Planned for future implementation*
