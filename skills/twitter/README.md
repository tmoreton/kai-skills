# Twitter/X Skill for Kai

Full Twitter/X integration with research tools (via web search) and posting tools (via X API v2).

## Features

### Research Tools (No API key required - uses web search)
- `search_tweets` - Search for recent tweets by keyword, topic, or hashtag
- `get_user_tweets` - Get recent tweets from a specific user handle
- `analyze_user` - Analyze a Twitter user's profile, stats, and engagement
- `find_influencers` - Find popular accounts in a specific niche/topic
- `track_topic_sentiment` - Track sentiment around a topic

### Posting Tools (X API v2 OAuth 1.0a required)
- `post_tweet` - Post a tweet to Twitter/X
- `post_thread` - Post a thread of connected tweets
- `get_rate_limits` - Check API quota status

## Claude Desktop Installation

### 1. Clone or copy this skill

```bash
cd ~/Code/kai-skills/skills/twitter
npm install
```

### 2. Get API credentials

**For research tools only:**
- Get a [Tavily API key](https://tavily.com) for web search

**For posting tools:**
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
        "TAVILY_API_KEY": "your_tavily_key_here",
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

| Variable | Required For | Description |
|----------|--------------|-------------|
| `TAVILY_API_KEY` | Research tools | Tavily web search API key |
| `X_API_KEY` | Posting tools | X API Consumer Key |
| `X_API_SECRET` | Posting tools | X API Consumer Secret |
| `X_ACCESS_TOKEN` | Posting tools | X API Access Token |
| `X_ACCESS_TOKEN_SECRET` | Posting tools | X API Access Token Secret |
| `X_BEARER_TOKEN` | Optional | X API Bearer Token (for read operations) |

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
