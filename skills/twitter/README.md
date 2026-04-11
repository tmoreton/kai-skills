# Twitter/X Skill for Kai

Full Twitter/X integration with X API v2. Search, analyze users, and post tweets.

## Features

- `search_tweets` - Search for recent tweets by keyword, topic, or hashtag (requires Basic tier or higher)
- `get_user_tweets` - Get recent tweets from a specific user handle
- `analyze_user` - Analyze a Twitter user's profile, stats, and engagement
- `post_tweet` - Post a tweet to Twitter/X
- `get_rate_limits` - Check API quota status

**Note:** Twitter/X Free tier has limited access. Full search requires Basic tier ($100/month).

## Claude Desktop Installation

### 1. Clone or copy this skill

```bash
cd ~/Code/kai-skills/skills/twitter
npm install
```

### 2. Get API credentials

**Required for all tools:**
- Apply for [X Developer access](https://developer.x.com)
- Create a project and app
- Generate OAuth 1.0a credentials (Consumer Keys + Access Tokens)
- Free tier: 500 posts/month

### 3. Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "twitter": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/Code/kai-skills/skills/twitter/handler.js"],
      "env": {
        "X_API_KEY": "your_x_api_key_here",
        "X_API_SECRET": "your_x_api_secret_here",
        "X_ACCESS_TOKEN": "your_x_access_token_here",
        "X_ACCESS_TOKEN_SECRET": "your_x_access_token_secret_here"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

Quit and reopen Claude Desktop to load the new skill.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `X_API_KEY` | Yes | X API Consumer Key |
| `X_API_SECRET` | Yes | X API Consumer Secret |
| `X_ACCESS_TOKEN` | Yes | X API Access Token |
| `X_ACCESS_TOKEN_SECRET` | Yes | X API Access Token Secret |
| `X_BEARER_TOKEN` | Optional | X API Bearer Token (alternative auth) |

## Usage Examples

### Search tweets
```
Search for tweets about "AI coding tools"
```

### Analyze a user
```
Analyze the Twitter user @naval
```

### Find influencers
```
Find influencers in the "indie hacker" space with at least 10k followers
```

### Post a tweet
```
Post a tweet: "Just shipped a new feature! 🚀"
```

### Post a thread
```
Post a thread with these tweets:
1. "Here's how I grew my SaaS to $10k MRR:"
2. "Step 1: Focus on one channel..."
3. "Step 2: Build in public..."
```

## Handler Format

This skill returns MCP-compatible responses:

```javascript
{ content: JSON.stringify(result) }
```

## License

MIT
