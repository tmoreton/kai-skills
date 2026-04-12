/**
 * Twitter/X API Skill Handler - X API v2 with OAuth 2.0
 * 
 * Uses OAuth 2.0 for all endpoints:
 * - OAuth 2.0 Bearer Token (Client Credentials) for app-only endpoints like search
 * - OAuth 2.0 Access Token (Authorization Code with user context) for posting tweets
 * 
 * Required credentials from X Developer Portal (https://developer.x.com):
 * 1. Go to your app → "Keys and Tokens" tab
 * 2. Under "OAuth 2.0 Keys", copy:
 *    - Client ID
 *    - Client Secret (click to reveal)
 * 3. Scroll to "Access Token and Secret" section, click "Generate" for your account
 * 4. Copy the Access Token (it will start with your numeric user ID)
 * 
 * Environment variables:
 *   X_CLIENT_ID=your_oauth2_client_id
 *   X_CLIENT_SECRET=your_oauth2_client_secret  
 *   X_ACCESS_TOKEN=your_user_access_token
 */

import { getCredential } from '../../lib/credentials.js';

const DEFAULT_MAX_RESULTS = 20;
const X_API_BASE = 'https://api.twitter.com/2';

let _config = {};
let _appBearerToken = null;

// Get OAuth 2.0 credentials
function getOAuth2Credentials(config) {
  return {
    clientId: getCredential('twitter', 'X_CLIENT_ID', config),
    clientSecret: getCredential('twitter', 'X_CLIENT_SECRET', config),
    accessToken: getCredential('twitter', 'X_ACCESS_TOKEN', config),
  };
}

// Helper for missing credentials error
function getCredentialsError() {
  const error = new Error(`
Twitter/X API OAuth 2.0 Credentials Required
=============================================

Get your credentials from https://developer.x.com:

1. Go to your app → "Keys and Tokens" tab
2. Under "OAuth 2.0 Keys", copy:
   - Client ID
   - Client Secret (click to reveal)
3. Click "Generate" to create an access token for your account:
   - Copy the Access Token (starts with your numeric user ID)

Set via kai-skills:
  kai-skills config set twitter client_id your_client_id
  kai-skills config set twitter client_secret your_client_secret
  kai-skills config set twitter access_token your_access_token
  kai-skills sync-config

Environment variables:
  X_CLIENT_ID=your_client_id
  X_CLIENT_SECRET=your_client_secret
  X_ACCESS_TOKEN=your_access_token

Note: Free tier = 500 posts/month. Search requires Basic tier ($100/month).
`);
  error.code = 'MISSING_API_KEY';
  return error;
}

// Get OAuth 2.0 Bearer Token for app-only endpoints (search, public data)
async function getAppBearerToken() {
  if (_appBearerToken) return _appBearerToken;
  
  const { clientId, clientSecret } = getOAuth2Credentials(_config);
  
  if (!clientId || !clientSecret) {
    throw getCredentialsError();
  }
  
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch('https://api.twitter.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to get Bearer token: ${err}`);
  }
  
  const data = await response.json();
  _appBearerToken = data.access_token;
  return _appBearerToken;
}

// Make API request with OAuth 2.0
async function xApiRequest(method, endpoint, data, requireUserContext = false) {
  const { clientId, clientSecret, accessToken } = getOAuth2Credentials(_config);
  
  if (!clientId || !clientSecret) {
    throw getCredentialsError();
  }
  
  // Build URL
  let url;
  if (method === 'GET') {
    url = new URL(X_API_BASE + endpoint);
    for (const [key, value] of Object.entries(data || {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  } else {
    url = X_API_BASE + endpoint;
  }
  
  // Get appropriate token
  let token;
  if (requireUserContext) {
    if (!accessToken) {
      throw new Error('User access token required. Generate one in X Developer Portal by clicking "Generate" under "Access Token and Secret".');
    }
    token = accessToken;
  } else {
    token = await getAppBearerToken();
  }
  
  const options = {
    method,
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url.toString(), options);
  
  if (!response.ok) {
    const err = await response.text();
    if (response.status === 401) {
      throw new Error(`Twitter API unauthorized. Check your credentials and that your access token has the required scopes. Error: ${err}`);
    }
    if (response.status === 403) {
      throw new Error(`Twitter API access denied. Your API tier may not have this feature, or your token lacks required permissions. Error: ${err}`);
    }
    throw new Error(`Twitter API error (${response.status}): ${err}`);
  }
  
  return response.json();
}

export default {
  install: async (config) => {
    _config = config;
    _appBearerToken = null;
    
    const { clientId, clientSecret, accessToken } = getOAuth2Credentials(config);
    
    if (clientId) process.env.X_CLIENT_ID = clientId;
    if (clientSecret) process.env.X_CLIENT_SECRET = clientSecret;
    if (accessToken) process.env.X_ACCESS_TOKEN = accessToken;
    
    if (!clientId || !clientSecret || !accessToken) {
      console.warn("[twitter] Warning: OAuth 2.0 credentials not configured. Set X_CLIENT_ID, X_CLIENT_SECRET, and X_ACCESS_TOKEN.");
    }
  },

  actions: {
    search_tweets: async (params) => {
      const query = params.query || '';
      const maxResults = params.max_results || DEFAULT_MAX_RESULTS;

      try {
        const result = await xApiRequest('GET', '/tweets/search/recent', {
          query: query,
          max_results: Math.max(10, Math.min(maxResults, 100)),
          'tweet.fields': 'created_at,author_id,public_metrics'
        });

        const tweets = result.data?.map(t => ({
          id: t.id,
          text: t.text,
          author_id: t.author_id,
          created_at: t.created_at,
          likes: t.public_metrics?.like_count || 0,
          retweets: t.public_metrics?.retweet_count || 0,
          url: `https://twitter.com/i/web/status/${t.id}`
        })) || [];

        return { content: JSON.stringify({ tweets, total: tweets.length, query, source: 'twitter_api' }) };
      } catch (error) {
        return { 
          content: JSON.stringify({ 
            error: error.message,
            query,
            note: 'Twitter search requires elevated API access. Check your API tier at developer.x.com.',
            docs: 'https://developer.x.com/en/docs/twitter-api'
          }),
          isError: true
        };
      }
    },

    get_user_tweets: async (params) => {
      const username = (params.username || '').replace(/^@/, '');
      const maxResults = params.max_results || DEFAULT_MAX_RESULTS;

      if (!username) {
        return { content: JSON.stringify({ error: 'Username required' }) };
      }

      try {
        const userResult = await xApiRequest('GET', `/users/by/username/${username}`, {});
        const userId = userResult.data?.id;

        if (!userId) {
          return { content: JSON.stringify({ error: 'User not found', username }) };
        }

        const result = await xApiRequest('GET', `/users/${userId}/tweets`, {
          max_results: Math.max(5, Math.min(maxResults, 100)),
          'tweet.fields': 'created_at,public_metrics'
        });

        const tweets = result.data?.map(t => ({
          id: t.id,
          text: t.text,
          created_at: t.created_at,
          likes: t.public_metrics?.like_count || 0,
          retweets: t.public_metrics?.retweet_count || 0,
          url: `https://twitter.com/i/web/status/${t.id}`
        })) || [];

        return { content: JSON.stringify({ tweets, total: tweets.length, username }) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, username }), isError: true };
      }
    },

    analyze_user: async (params) => {
      const username = (params.username || '').replace(/^@/, '');

      if (!username) {
        return { content: JSON.stringify({ error: 'Username required' }) };
      }

      try {
        const userResult = await xApiRequest('GET', `/users/by/username/${username}`, {
          'user.fields': 'public_metrics,description,verified,created_at,location,url,profile_image_url'
        });

        const user = userResult.data;
        if (!user) {
          return { content: JSON.stringify({ error: 'User not found', username }) };
        }

        const metrics = user.public_metrics || {};

        return { content: JSON.stringify({
          username: user.username,
          display_name: user.name,
          description: user.description,
          verified: user.verified,
          created_at: user.created_at,
          location: user.location,
          website: user.url,
          profile_image: user.profile_image_url,
          followers: metrics.followers_count || 0,
          following: metrics.following_count || 0,
          tweets: metrics.tweet_count || 0,
          listed: metrics.listed_count || 0,
          url: `https://twitter.com/${user.username}`
        }) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, username }), isError: true };
      }
    },

    post_tweet: async (params) => {
      const text = params.text || params.tweet || '';

      if (!text) {
        return { content: JSON.stringify({ error: 'Tweet text required' }) };
      }

      if (text.length > 280) {
        return { content: JSON.stringify({ error: 'Tweet exceeds 280 character limit', length: text.length }) };
      }

      try {
        const result = await xApiRequest('POST', '/tweets', { text }, true);

        return { content: JSON.stringify({
          posted: true,
          id: result.data?.id,
          url: `https://twitter.com/i/web/status/${result.data?.id}`,
          text: result.data?.text
        }) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message }), isError: true };
      }
    },

    get_rate_limits: async () => {
      const { accessToken } = getOAuth2Credentials(_config);
      
      return { content: JSON.stringify({
        credentials_configured: !!accessToken,
        auth_type: 'OAuth 2.0',
        tier: 'Configured (tier depends on your Twitter plan)',
        free_limits: '500 posts/month, limited read access',
        basic_limits: '10,000 posts/month, 10,000 read limit/month',
        search_note: 'Full search requires Basic tier ($100/month) or higher',
        docs: 'https://developer.x.com/en/docs/twitter-api'
      }) };
    }
  }
};
