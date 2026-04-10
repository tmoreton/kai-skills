# LinkedIn Skill

Connect to LinkedIn to create posts, manage profiles, access company pages, and view analytics.

---

## Overview

The LinkedIn skill provides seamless integration with the LinkedIn API, enabling you to:

- **Create Posts** - Share text updates, articles, and media
- **Access Profile Data** - Retrieve personal or company profile information
- **View Analytics** - Track post performance and engagement metrics
- **Manage Company Pages** - Interact with company page content and insights

---

## Prerequisites

- LinkedIn account (personal or organization)
- LinkedIn API application credentials
- OAuth 2.0 consent for required permissions

---

## Tool Reference

### `skill__linkedin__setup`

Configure OAuth authentication for LinkedIn API access.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | string | Yes | LinkedIn API application client ID |
| `client_secret` | string | Yes | LinkedIn API application client secret |
| `redirect_uri` | string | Yes | OAuth callback URL (must match app settings) |
| `scopes` | array | No | Permission scopes (defaults to standard posting scopes) |

**Required OAuth Scopes:**

| Scope | Purpose |
|-------|---------|
| `openid` | Basic profile access |
| `profile` | Extended profile information |
| `w_member_social` | Create posts on behalf of user |
| `r_basicprofile` | Read basic profile data |
| `r_organization_social` | Read company page data |
| `w_organization_social` | Post to company pages |
| `r_analytics` | Access engagement analytics |

**Example:**

```json
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "redirect_uri": "https://yourapp.com/callback",
  "scopes": ["openid", "profile", "w_member_social", "r_basicprofile"]
}
```

**Returns:**
- Authorization URL for user consent
- Access token upon successful authentication
- Refresh token for long-term access

---

### `skill__linkedin__create_post`

Create a post on LinkedIn as a user or to a company page.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `post_type` | string | Yes | Type of post: `text`, `article`, `media`, `poll` |
| `content` | object | Yes | Post content details (varies by type) |
| `visibility` | string | No | Audience: `PUBLIC`, `CONNECTIONS`, `LOGGED_IN`, `CONTAINER` |
| `target_company` | string | No | Company URN to post as organization |
| `scheduled_time` | integer | No | Unix timestamp for scheduled posts |

**Post Types & Content Structure:**

#### Text Post

```json
{
  "post_type": "text",
  "content": {
    "text": "Excited to announce our new product launch! 🚀 #innovation #tech",
    "mentions": ["urn:li:person:abc123"]
  },
  "visibility": "PUBLIC"
}
```

#### Article Post

```json
{
  "post_type": "article",
  "content": {
    "title": "The Future of AI in Healthcare",
    "description": "Exploring how artificial intelligence is transforming patient care...",
    "url": "https://example.com/article",
    "thumbnail_url": "https://example.com/image.jpg"
  }
}
```

#### Media Post (Images/Video)

```json
{
  "post_type": "media",
  "content": {
    "text": "Behind the scenes at our annual conference!",
    "media": [
      {
        "type": "image",
        "url": "https://example.com/photo1.jpg",
        "alt_text": "Team collaboration session"
      }
    ]
  }
}
```

#### Poll Post

```json
{
  "post_type": "poll",
  "content": {
    "text": "What's your preferred work model?",
    "poll_options": ["Fully Remote", "Hybrid", "In-Office"],
    "duration_days": 7
  }
}
```

**Visibility Options:**

| Option | Description |
|--------|-------------|
| `PUBLIC` | Visible to anyone on LinkedIn |
| `CONNECTIONS` | 1st-degree connections only |
| `LOGGED_IN` | Any logged-in LinkedIn member |
| `CONTAINER` | Organization followers only (for company posts) |

**Returns:**
- Post URN (unique identifier)
- Share URL
- Created timestamp

---

### `skill__linkedin__get_profile`

Retrieve LinkedIn profile information for the authenticated user or a specific member.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `person_id` | string | No | Specific member URN (omit for current user) |
| `fields` | array | No | Specific fields to retrieve |

**Available Profile Fields:**

| Field | Description |
|-------|-------------|
| `id` | LinkedIn person URN |
| `firstName` | First name |
| `lastName` | Last name |
| `headline` | Professional headline |
| `profilePicture` | Profile photo URLs |
| `vanityName` | Custom profile URL handle |
| `summary` | About section text |
| `positions` | Work experience |
| `educations` | Educational background |
| `skills` | Listed skills |
| `industry` | Industry category |
| `location` | Geographic location |

**Example:**

```json
{
  "fields": ["firstName", "lastName", "headline", "profilePicture"]
}
```

**Returns:**
- Complete profile object with requested fields
- Public profile URL

---

### `skill__linkedin__get_company_page`

Retrieve company page information and associated content.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_id` | string | Yes | Company URN or vanity name |
| `include_posts` | boolean | No | Include recent company posts |
| `post_limit` | integer | No | Number of posts to retrieve (default: 10) |

**Example:**

```json
{
  "company_id": "urn:li:organization:12345",
  "include_posts": true,
  "post_limit": 5
}
```

**Returns:**
- Company name, description, and industry
- Follower count
- Recent posts (if requested)
- Company logo and cover image URLs

---

### `skill__linkedin__analytics`

Retrieve engagement analytics for posts and company pages.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity_type` | string | Yes | `post`, `organization`, `campaign` |
| `entity_id` | string | Yes | URN of the entity |
| `metric_types` | array | No | Specific metrics to retrieve |
| `time_range` | object | No | Date range for analytics |

**Available Metrics:**

| Metric | Description |
|--------|-------------|
| `impressions` | Times content was displayed |
| `clicks` | Link clicks on post |
| `likes` | Like reactions |
| `comments` | Comment count |
| `shares` | Repost/share count |
| `engagement_rate` | Overall engagement percentage |
| `follower_count` | Total followers |
| `new_followers` | Followers gained in period |
| `unique_impressions` | Unique viewers |
| `video_views` | Video play count |
| `video_view_time` | Total video watch time |

**Time Range Format:**

```json
{
  "start": "2024-01-01",
  "end": "2024-01-31",
  "granularity": "DAY"
}
```

**Example:**

```json
{
  "entity_type": "post",
  "entity_id": "urn:li:share:67890",
  "metric_types": ["impressions", "clicks", "likes", "engagement_rate"],
  "time_range": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

**Returns:**
- Metrics with timestamps
- Comparison data (period-over-period)
- Demographic breakdowns (when available)

---

## Content Types

### Text Updates

Best for:
- Quick thoughts and insights
- Questions to your network
- Industry commentary
- Sharing milestones

**Best Practices:**
- Keep under 1,300 characters for optimal display
- Use line breaks for readability
- Include 2-5 relevant hashtags
- Tag relevant people with `@mentions`
- Add a question to encourage comments

### Articles

Best for:
- Thought leadership content
- In-depth analysis
- How-to guides
- Industry trends

**Best Practices:**
- Write compelling headlines (under 100 characters)
- Use high-quality featured images (1200x627px)
- Include clear introduction and conclusion
- Add internal links to your other content
- Repurpose blog content for LinkedIn

### Media Posts (Images/Video)

Best for:
- Visual storytelling
- Behind-the-scenes content
- Product demonstrations
- Event coverage

**Image Specifications:**

| Type | Dimensions | Format | Max Size |
|------|------------|--------|----------|
| Single Image | 1200x1200px | JPG, PNG | 8MB |
| Multi-Image | 1080x1080px | JPG, PNG | 8MB each |
| Article Thumbnail | 1200x627px | JPG, PNG | 5MB |

**Video Specifications:**

| Attribute | Specification |
|-----------|---------------|
| Max Duration | 30 minutes |
| Resolution | 1920x1080 (1080p) recommended |
| Format | MP4 |
| Max File Size | 5GB |
| Aspect Ratios | 16:9, 1:1, 9:16, 2.4:1 |

### Polls

Best for:
- Audience research
- Engagement boosters
- Industry insights
- Community building

**Best Practices:**
- Keep questions clear and concise
- Limit to 2-4 options
- Run for 1-2 weeks for maximum response
- Share results with analysis after closing

---

## Audience Targeting

### Visibility Strategies

| Goal | Visibility | Best For |
|------|------------|----------|
| Maximum Reach | `PUBLIC` | Building personal brand |
| Quality Engagement | `CONNECTIONS` | Sensitive/professional content |
| Organization Content | `CONTAINER` | Company announcements |
| Curated Audience | Targeted | Specific industry/role targeting |

### Optimal Posting Times

| Day | Best Times (Local) |
|-----|-------------------|
| Tuesday | 8:00-10:00 AM, 12:00-2:00 PM |
| Wednesday | 8:00-10:00 AM, 12:00-2:00 PM |
| Thursday | 8:00-10:00 AM |
| Friday | 8:00-10:00 AM |

Avoid: Weekends, late evenings, and Monday mornings

### Hashtag Strategy

**Recommended Approach:**
- 3-5 hashtags per post
- Mix of popular and niche tags
- Include your personal/company branded hashtag
- Research trending industry tags

**Popular Professional Hashtags:**
- #Leadership
- #Innovation
- #CareerAdvice
- #ProfessionalDevelopment
- #IndustryInsights

---

## Best Practices for Professional Content

### Writing Guidelines

1. **Lead with Value**
   - First 2 lines appear in feed preview
   - Hook readers immediately
   - Use numbers or questions

2. **Formatting Matters**
   - Use short paragraphs (2-3 sentences)
   - Add line breaks between sections
   - Use bullet points for lists
   - Avoid wall-of-text posts

3. **Authentic Voice**
   - Write conversationally
   - Share personal experiences
   - Include lessons learned
   - Be vulnerable about challenges

4. **Engagement Focus**
   - End with a clear call-to-action
   - Ask specific questions
   - Respond to all comments within 24 hours
   - Tag relevant connections meaningfully

### Content Calendar Themes

| Day | Theme | Example Topics |
|-----|-------|----------------|
| Monday | Motivation | Goals, planning, fresh starts |
| Tuesday | Tips | How-to guides, advice |
| Wednesday | Storytelling | Personal experiences, case studies |
| Thursday | Thought Leadership | Industry trends, predictions |
| Friday | Culture | Team wins, behind-the-scenes |

### Engagement Tactics

1. **Comment Before Posting**
   - Engage with others' content first
   - Build reciprocity
   - Increase visibility of your own posts

2. **Respond Promptly**
   - Reply within first hour (critical)
   - Thank people for engagement
   - Ask follow-up questions
   - Pin valuable comments

3. **Consistency Over Frequency**
   - Post 2-5 times per week
   - Maintain quality standards
   - Build predictable presence

### Content to Avoid

- Overly promotional content (>20% of posts)
- Controversial political/religious topics
- Unprofessional language or imagery
- Clickbait headlines
- Excessive automation/robotic posts
- Copy-pasted content without attribution

### Analytics-Driven Improvement

**Monthly Review Checklist:**
- [ ] Identify top 3 performing posts by engagement
- [ ] Analyze which content types drive most leads
- [ ] Track follower growth rate
- [ ] Review optimal posting times for your audience
- [ ] Adjust hashtag strategy based on reach data
- [ ] Document lessons learned for future content

---

## API Rate Limits

| Endpoint | Limit |
|----------|-------|
| Create Post | 500/day |
| Get Profile | 500/day |
| Get Company Page | 500/day |
| Analytics | 1000/day |

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Daily quota
- `X-RateLimit-Remaining`: Remaining calls
- `X-RateLimit-Reset`: Unix timestamp for reset

---

## Error Handling

| Error Code | Meaning | Resolution |
|------------|---------|------------|
| 400 | Bad Request | Check parameter format |
| 401 | Unauthorized | Refresh access token |
| 403 | Forbidden | Check OAuth scopes |
| 404 | Not Found | Verify entity ID exists |
| 429 | Rate Limited | Wait before retrying |
| 500 | Server Error | Retry with exponential backoff |

---

## Resources

- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [LinkedIn Content Best Practices](https://business.linkedin.com/marketing-solutions/linkedin-pages/best-practices)
- [LinkedIn Brand Guidelines](https://brand.linkedin.com/)

---

## Support

For technical issues or questions about this skill, please contact support or file an issue in the project repository.
