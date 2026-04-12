# Twitter/X Skill for Kai

Full Twitter/X integration with X API v2 using OAuth 1.0a. Search, analyze users, and post tweets.

## Features

- `search_tweets` - Search for recent tweets by keyword, topic, or hashtag (requires Basic tier or higher)
- `get_user_tweets` - Get recent tweets from a specific user handle
- `analyze_user` - Analyze a Twitter user's profile, stats, and engagement
- `post_tweet` - Post a tweet to Twitter/X
- `get_rate_limits` - Check API quota status

**Note:** Twitter/X Free tier has limited access. Full search requires Basic tier ($100/month).

## Setup

### 1. Get API credentials from X Developer Portal

1. Go to https://developer.x.com
2. Create a project and app
3. Go to your app → "Keys and Tokens" tab
4. Copy these **four** values:
   - **API Key** (Consumer Key)
   - **API Secret Key** (Consumer Secret)
   - **Access Token**
   - **Access Token Secret**

### 2. Configure credentials

#### Option A: Via kai-skills CLI (recommended)
```bash
kai-skills config set twitter api_key your_api_key
kai-skills config set twitter api_secret your_api_secret
kai-skills config set twitter access_token your_access_token
kai-skills config set twitter access_token_secret your_access_token_secret
kai-skills sync-config
```

#### Option B: Via environment variables
```bash
export X_API_KEY=your_api_key
export X_API_SECRET=your_api_secret
export X_ACCESS_TOKEN=your_access_token
export X_ACCESS_TOKEN_SECRET=your_access_token_secret
```

#### Option C: Via Claude Desktop config
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "twitter": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/Code/kai-skills/skills/twitter/handler.js"],
      "env": {
        "X_API_KEY": "your_api_key_here",
        "X_API_SECRET": "your_api_secret_here",
        "X_ACCESS_TOKEN": "your_access_token_here",
        "X_ACCESS_TOKEN_SECRET": "your_access_token_secret_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Quit and reopen Claude Desktop to load the updated skill.

## Usage Examples

### Search tweets
```
Search for tweets about "AI coding tools"
```

### Analyze a user
```
Analyze the Twitter user @naval
```

### Get user tweets
```
Get recent tweets from @github
```

### Post a tweet
```
Post a tweet: "Just shipped a new feature! 🚀"
```

## Handler Format

This skill returns MCP-compatible responses:

```javascript
{ content: JSON.stringify(result) }
```

## Troubleshooting

**"Missing API Key" error:**
- Verify all four credentials are set
- Check that your tokens haven't expired in the X Developer Portal
- Try regenerating your Access Token and Access Token Secret

**"Unauthorized" error:**
- Make sure your app has the correct permissions (Read + Write)
- Verify you're using OAuth 1.0a credentials, not OAuth 2.0

## License

MIT
