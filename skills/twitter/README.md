# Twitter/X Skill

Post tweets, analyze users, search content, and manage your Twitter/X presence.

## Setup

Get credentials from https://developer.x.com:

1. Go to your app → **"Keys and Tokens"** tab
2. Under **"Consumer Keys"** section, copy:
   - **API Key** → `X_API_KEY`
   - **API Secret** → `X_API_SECRET`
3. Under **"Authentication Tokens"** section, click **"Generate"**:
   - **Access Token** → `X_ACCESS_TOKEN`
   - **Access Token Secret** → `X_ACCESS_TOKEN_SECRET`

### Option 1: Environment Variables

```bash
export X_API_KEY="your_api_key"
export X_API_SECRET="your_api_secret"
export X_ACCESS_TOKEN="your_access_token"
export X_ACCESS_TOKEN_SECRET="your_token_secret"
```

### Option 2: Kai CLI Config

```bash
kai-skills config set twitter api_key your_key
kai-skills config set twitter api_secret your_secret
kai-skills config set twitter access_token your_token
kai-skills config set twitter access_token_secret your_secret
kai-skills sync-config
```

## Tools

- **search_tweets** - Search tweets by keyword/hashtag
- **get_user_tweets** - Get a user's recent tweets
- **analyze_user** - Get user profile and follower metrics
- **post_tweet** - Post a new tweet
- **get_rate_limits** - Check credentials and tier info

## API Limits

- **Free tier**: 500 posts/month, limited read access
- **Basic tier**: 10,000 posts/month, 10,000 read limit/month
- **Search**: Requires Basic tier ($100/month) or higher

## Test

```bash
# Set your credentials
export X_API_KEY="..."
export X_API_SECRET="..."
export X_ACCESS_TOKEN="..."
export X_ACCESS_TOKEN_SECRET="..."

# Run tests
npm test
```
