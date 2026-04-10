# Facebook Skill

Connect to Facebook Pages via the Graph API to publish posts, retrieve analytics, and manage your Facebook presence programmatically.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Facebook Graph API Basics](#facebook-graph-api-basics)
- [Page vs Profile Posting](#page-vs-profile-posting)
- [Setup](#setup)
- [Available Tools](#available-tools)
  - [skill__facebook__setup](#skill__facebook__setup)
  - [skill__facebook__create_post](#skill__facebook__create_post)
  - [skill__facebook__get_page_insights](#skill__facebook__get_page_insights)
  - [skill__facebook__manage_comments](#skill__facebook__manage_comments)
- [Webhook Setup for Real-Time Updates](#webhook-setup-for-real-time-updates)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Best Practices](#best-practices)

---

## Overview

The Facebook skill provides integration with Facebook Pages through the Graph API. It enables:

- **Publishing posts** to your Facebook Pages
- **Retrieving page analytics** and insights
- **Fetching page information** and recent posts
- **Managing comments** on your posts

> **Important:** This skill works with **Facebook Pages**, not personal profiles. Facebook's API restricts automated posting to personal timelines.

---

## Prerequisites

### Required

1. **Facebook Developer Account** - [Register here](https://developers.facebook.com/)
2. **Facebook App** - Created in the [Developer Console](https://developers.facebook.com/apps)
3. **Facebook Page** - You must be an admin or have appropriate page roles
4. **Page Access Token** - Generated with required permissions

### Required Permissions

| Permission | Purpose |
|------------|---------|
| `pages_read_engagement` | Read page content, likes, and engagement |
| `pages_manage_posts` | Create, update, and delete posts |
| `pages_read_user_content` | Access posts and comments |
| `pages_manage_metadata` | Manage webhooks and settings |
| `pages_show_list` | List pages you manage |

---

## Facebook Graph API Basics

### API Version

This skill uses **Graph API v18.0**. Facebook releases new versions quarterly, and each version is supported for at least 2 years.

### Base URL

```
https://graph.facebook.com/v18.0/
```

### Authentication

All requests require an access token passed as a query parameter or in the request body:

```
GET https://graph.facebook.com/v18.0/{page-id}?access_token={your-token}
```

### Node Structure

Facebook Graph API uses a node-based structure:

- **Page Node** (`/{page-id}`) - Represents a Facebook Page
- **Post Node** (`/{post-id}`) - Represents a post on a page
- **Comment Node** (`/{comment-id}`) - Represents a comment on a post
- **Insights Edge** (`/{page-id}/insights`) - Analytics data

### Common Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier |
| `name` | Page or post name/title |
| `message` | Post text content |
| `created_time` | ISO 8601 timestamp |
| `permalink_url` | Direct link to the post |
| `likes.summary.total_count` | Number of likes |
| `comments.summary.total_count` | Number of comments |
| `shares.count` | Number of shares |

---

## Page vs Profile Posting

### Key Differences

| Feature | Facebook Page | Personal Profile |
|---------|---------------|------------------|
| API Access | ✅ Full access | ❌ Restricted |
| Automated Posting | ✅ Supported | ❌ Not allowed |
| Insights/Analytics | ✅ Detailed metrics | ❌ Limited |
| Multiple Admins | ✅ Yes | N/A |
| Scheduling | ✅ Yes | ❌ No |

### Why Personal Profiles Are Restricted

Facebook's Platform Policy prohibits using the API to auto-post to personal timelines. This prevents spam and maintains authentic social interactions. The API only allows:

- Reading your own profile info
- Posting to **Pages you manage**
- Sharing via the Share Dialog (requires user action)

### Working with Pages

To post via the API, you must:

1. Be an **Admin**, **Editor**, or **Moderator** of the Page
2. Generate a **Page Access Token** (not User Access Token)
3. Use the Page ID in API calls

---

## Setup

### Step 1: Get Your Page Access Token

#### Method A: Graph API Explorer (Quick Testing)

1. Visit [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your Facebook App from the dropdown
3. Click **"Generate Access Token"**
4. Select these permissions:
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_read_user_content`
5. Copy the token

#### Method B: Long-Lived Token (Production)

Short-lived tokens expire in ~1 hour. For production, convert to long-lived:

```bash
# Exchange short-lived token for long-lived token
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?\
  grant_type=fb_exchange_token&\
  client_id={app-id}&\
  client_secret={app-secret}&\
  fb_exchange_token={short-lived-token}"
```

Then get the Page Access Token:

```bash
# Get page access token from long-lived user token
curl -X GET "https://graph.facebook.com/v18.0/{user-id}/accounts?\
  access_token={long-lived-token}"
```

### Step 2: Find Your Page ID

1. Go to your Facebook Page
2. Click **Settings** → **Page Info**
3. Copy the **Page ID** value

Or via API:

```bash
curl -X GET "https://graph.facebook.com/v18.0/me/accounts?\
  access_token={access-token}"
```

### Step 3: Configure the Skill

```javascript
// Using skill__facebook__setup tool
{
  "access_token": "EAA...",
  "page_id": "123456789012345"
}
```

Or set environment variables:

```bash
export FACEBOOK_ACCESS_TOKEN="EAA..."
export FACEBOOK_PAGE_ID="123456789012345"
```

---

## Available Tools

### `skill__facebook__setup`

Configure Facebook API credentials.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_token` | string | ✅ Yes | Facebook Page Access Token |
| `page_id` | string | No | Default Page ID to use |

#### Example

```javascript
{
  "tool": "skill__facebook__setup",
  "params": {
    "access_token": "EAA...",
    "page_id": "123456789012345"
  }
}
```

#### Response

```json
{
  "success": true,
  "page_name": "My Business Page",
  "page_id": "123456789012345",
  "token_type": "Page",
  "expires_in": 5184000
}
```

---

### `skill__facebook__create_post`

Publish content to your Facebook Page. Creates posts with text, links, or scheduled publishing.

> **Note:** In the skill configuration, this tool is named `post_to_page`.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` / `text` | string | No | Post text content |
| `link` / `url` | string | No | URL to share |
| `published` | boolean | No | Publish immediately (default: true) |
| `scheduled_publish_time` | string | No | Unix timestamp for scheduling |

#### Post Types

**Text Post:**
```javascript
{
  "tool": "skill__facebook__create_post",
  "params": {
    "message": "Hello from the Facebook API! 🎉"
  }
}
```

**Link Post:**
```javascript
{
  "tool": "skill__facebook__create_post",
  "params": {
    "message": "Check out this article!",
    "link": "https://example.com/article"
  }
}
```

**Scheduled Post:**
```javascript
{
  "tool": "skill__facebook__create_post",
  "params": {
    "message": "Scheduled for tomorrow morning",
    "published": false,
    "scheduled_publish_time": "1704067200"
  }
}
```

#### Response

```json
{
  "id": "123456789012345_987654321098765",
  "success": true,
  "post_url": "https://facebook.com/123456789012345/posts/987654321098765"
}
```

#### Limitations

- Maximum post length: 63,206 characters
- Link posts will auto-generate preview cards
- Images require a separate upload flow (use `/{page-id}/photos` endpoint)
- Videos require `/{page-id}/videos` endpoint

---

### `skill__facebook__get_page_insights`

Retrieve analytics and performance metrics for your Facebook Page.

> **Note:** In the skill configuration, this tool is named `get_page_insights`.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `metrics` | string | No | Comma-separated metrics (see list below) |
| `period` | string | No | `day`, `week`, or `days_28` |
| `since` | string | No | Start date `YYYY-MM-DD` |
| `until` | string | No | End date `YYYY-MM-DD` |

#### Available Metrics

| Metric | Description | Period |
|--------|-------------|--------|
| `page_impressions` | Total impressions | day, week, days_28 |
| `page_impressions_unique` | Reach (unique users) | day, week, days_28 |
| `page_engaged_users` | Users who engaged | day, week, days_28 |
| `page_fans` | Total page likes | day |
| `page_fan_adds` | New likes | day |
| `page_fan_removes` | Unlikes | day |
| `page_post_engagements` | Post interactions | day |
| `page_video_views` | Video views | day, week, days_28 |
| `page_clicks` | Clicks on page | day |

#### Example

```javascript
{
  "tool": "skill__facebook__get_page_insights",
  "params": {
    "metrics": "page_impressions,page_engaged_users,page_fans",
    "period": "day",
    "since": "2024-01-01",
    "until": "2024-01-31"
  }
}
```

#### Response

```json
{
  "data": [
    {
      "name": "page_impressions",
      "period": "day",
      "values": [
        {
          "value": 1542,
          "end_time": "2024-01-15T08:00:00+0000"
        },
        {
          "value": 2103,
          "end_time": "2024-01-16T08:00:00+0000"
        }
      ]
    }
  ]
}
```

---

### `skill__facebook__manage_comments`

Retrieve, reply to, hide, or delete comments on your page posts.

> **Note:** This functionality may require additional permissions (`pages_manage_engagement`). Check your skill implementation for available comment operations.

#### Common Operations

**Get Post Comments:**
```http
GET /{post-id}/comments?access_token={token}
```

**Reply to Comment:**
```http
POST /{comment-id}/comments
{
  "message": "Thank you for your feedback!",
  "access_token": "{token}"
}
```

**Hide Comment:**
```http
POST /{comment-id}
{
  "is_hidden": true,
  "access_token": "{token}"
}
```

**Delete Comment:**
```http
DELETE /{comment-id}?access_token={token}
```

#### Comment Webhooks

Subscribe to `feed` webhook to receive real-time comment notifications:

```javascript
// Webhook payload for new comment
{
  "entry": [{
    "id": "{page-id}",
    "time": 1234567890,
    "changes": [{
      "field": "feed",
      "value": {
        "item": "comment",
        "verb": "add",
        "comment_id": "{comment-id}",
        "post_id": "{post-id}",
        "sender_name": "John Doe",
        "message": "Great post!"
      }
    }]
  }]
}
```

---

## Webhook Setup for Real-Time Updates

Webhooks allow your application to receive real-time notifications when page activity occurs.

### Supported Webhook Fields

| Field | Triggers |
|-------|----------|
| `feed` | New posts, comments, likes, shares |
| `mentions` | Page mentions |
| `conversations` | Private messages (requires messaging permissions) |
| `ratings` | Page reviews/ratings |

### Setup Steps

#### 1. Configure Webhook in App Dashboard

1. Go to [Facebook App Dashboard](https://developers.facebook.com/apps)
2. Select your app → **Webhooks** → **Pages**
3. Click **Subscribe to this object**
4. Enter your **Callback URL** (must be HTTPS)
5. Enter **Verify Token** (custom string for validation)

#### 2. Implement Webhook Verification

Facebook sends a GET request to verify your endpoint:

```javascript
// Express.js example
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
```

#### 3. Handle Webhook Events

```javascript
app.post('/webhook', (req, res) => {
  const data = req.body;

  data.entry.forEach(entry => {
    entry.changes.forEach(change => {
      if (change.field === 'feed') {
        handleFeedChange(change.value);
      }
    });
  });

  res.sendStatus(200);
});

function handleFeedChange(value) {
  switch (value.item) {
    case 'post':
      if (value.verb === 'add') {
        console.log('New post:', value.post_id);
      }
      break;
    case 'comment':
      if (value.verb === 'add') {
        console.log('New comment:', value.comment_id);
        // Auto-reply logic here
      }
      break;
  }
}
```

#### 4. Subscribe Page to Webhooks

```bash
# Subscribe your page to webhooks
curl -X POST "https://graph.facebook.com/v18.0/{page-id}/subscribed_apps" \
  -d "access_token={page-access-token}" \
  -d "subscribed_fields=feed,mentions"
```

#### 5. Verify Subscription

```bash
# Check subscribed fields
curl -X GET "https://graph.facebook.com/v18.0/{page-id}/subscribed_apps?\
  access_token={page-access-token}"
```

### Security Best Practices

1. **Always verify webhook signatures** (when available)
2. **Use HTTPS only** for callback URLs
3. **Respond quickly** with 200 OK to avoid retries
4. **Queue processing** for heavy workloads
5. **Validate payload** structure before processing

### Payload Structure

```json
{
  "object": "page",
  "entry": [
    {
      "id": "123456789012345",
      "time": 1704067200,
      "changes": [
        {
          "field": "feed",
          "value": {
            "item": "post",
            "verb": "add",
            "post_id": "123456789012345_987654321098765",
            "created_time": 1704067200,
            "message": "New post content"
          }
        }
      ]
    }
  ]
}
```

---

## Error Handling

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `190` | Invalid token | Regenerate access token |
| `200` | Permissions error | Check granted permissions |
| `100` | Invalid parameter | Verify request parameters |
| `4` | Rate limit hit | Wait and retry |
| `102` | Session expired | Refresh access token |
| `803` | Object not found | Check page/post ID |
| `2008028` | Post frequency limit | Reduce posting rate |

### Error Response Format

```json
{
  "error": {
    "message": "Invalid OAuth access token.",
    "type": "OAuthException",
    "code": 190,
    "fbtrace_id": "ABC123XYZ"
  }
}
```

### Troubleshooting

**Token Expired:**
```bash
# Debug token
curl -X GET "https://graph.facebook.com/debug_token?\
  input_token={token-to-check}&\
  access_token={app-token-or-admin-token}"
```

**Permission Issues:**
Check current permissions with:
```bash
curl -X GET "https://graph.facebook.com/v18.0/me/permissions?\
  access_token={access-token}"
```

---

## Rate Limits

### API Call Limits

| Level | Limit |
|-------|-------|
| User-level | 200 calls/hour/user |
| App-level | Varies by app tier |
| Page-level | 4800 calls/page/hour |

### Posting Limits

| Action | Limit |
|--------|-------|
| Posts per page | 25/day (organic) |
| Comments per post | No hard limit |
| Scheduled posts | 250/page |

### Handling Rate Limits

The API returns `X-App-Usage` and `X-Page-Usage` headers:

```javascript
X-App-Usage: {"call_count": 50, "total_time": 120, "total_cputime": 80}
X-Page-Usage: {"call_count": 25, "total_time": 60, "total_cputime": 40}
```

When rate limited, you'll receive error code `4` with a retry time:

```json
{
  "error": {
    "message": "Application request limit reached",
    "type": "RateLimitException",
    "code": 4,
    "error_subcode": 0,
    "is_transient": true,
    "error_user_title": "Rate Limit Exceeded",
    "error_user_msg": "Please retry your request later"
  }
}
```

---

## Best Practices

### Security

1. **Never commit tokens** to version control
2. **Use environment variables** for credentials
3. **Rotate tokens** regularly
4. **Use long-lived tokens** for production
5. **Scope tokens** to minimum required permissions

### Performance

1. **Batch requests** using `?ids=id1,id2,id3`
2. **Use field filtering** (`?fields=id,name,message`) to reduce payload
3. **Cache responses** when appropriate
4. **Handle pagination** with `before`/`after` cursors

### Content

1. **Follow Facebook Platform Policies** - [Read here](https://developers.facebook.com/policy/)
2. **Don't spam** - Respect posting limits
3. **Use scheduling** for optimal engagement times
4. **Monitor insights** to understand what works
5. **Respond to comments** to boost engagement

### Testing

1. Use [Graph API Explorer](https://developers.facebook.com/tools/explorer/) for testing
2. Create a **test page** for development
3. Use **webhook testing** with ngrok for local development
4. Enable **app review** only when ready for production

---

## Resources

- [Graph API Documentation](https://developers.facebook.com/docs/graph-api/)
- [Page API Reference](https://developers.facebook.com/docs/pages/)
- [Webhooks Guide](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Platform Policies](https://developers.facebook.com/policy/)
- [Access Token Guide](https://developers.facebook.com/docs/facebook-login/access-tokens/)

---

## Support

For issues with the Facebook skill:
1. Check your access token permissions
2. Verify your Page ID is correct
3. Review Facebook's [Status Page](https://developers.facebook.com/status/) for outages
4. Check [API Changelog](https://developers.facebook.com/docs/graph-api/changelog/) for breaking changes
