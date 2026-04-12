# Reddit Skill for Kai

Research and analyze Reddit discussions. Perfect for market research, sentiment analysis, and understanding community conversations.

## Features

- `search_posts` - Search posts by keywords across Reddit or specific subreddits
- `get_subreddit_posts` - Browse trending content from any subreddit
- `get_post_comments` - Analyze discussions and comment threads
- `analyze_subreddit` - Get subreddit stats, activity metrics, and top posts
- `get_user_profile` - Review a user's recent activity and posts
- `get_rate_limits` - Check API credentials and limits

## Getting Reddit API Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Click **"create another app..."**
3. Select **"script"** type
4. Name it **"Kai Research"** (or any name)
5. Redirect URI: `http://localhost:8080` (not used for read-only)
6. Click **"create app"**
7. Copy:
   - **Client ID** (the string under your app name)
   - **Client Secret** (labeled "secret")

## Environment Variables

**Required:**
```bash
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
```

**Optional:**
```bash
REDDIT_USER_AGENT="KaiResearch/1.0 by u/your_username"
```
Defaults to `KaiResearch/1.0` if not set. Custom user agents are recommended by Reddit's API rules.

Set via kai-skills:
```bash
kai-skills config set reddit client_id your_client_id
kai-skills config set reddit client_secret your_client_secret
kai-skills sync-config
```

## Usage Examples

### Search for product discussions
```
Search Reddit for posts about "Notion alternatives" in the productivity subreddit
```

### Analyze a subreddit
```
Analyze the r/startups subreddit - how active is it and what are people posting?
```

### Get trending posts
```
Show me the top posts from r/technology from this week
```

### Read a discussion
```
Get the comments from this Reddit post: [paste permalink]
```

### Research a topic
```
Search Reddit for "AI coding tools" discussions from the past month
```

## API Limits

- 30 requests per minute
- 1000 requests per hour
- Read-only access (no posting)

## License

MIT
