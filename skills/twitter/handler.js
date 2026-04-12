/**
 * Twitter/X API Skill Handler - Real Twitter API v2
 * 
 * Uses official Twitter API v2 with OAuth 1.0a
 * Requires: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */

import { createRequire } from "module";
import crypto from 'crypto';
import { getCredential } from '../../lib/credentials.js';

function loadOAuth() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require('oauth-1.0a');
  } catch (e) {
    throw new Error('oauth-1.0a not installed. Run: npm install oauth-1.0a');
  }
}

const DEFAULT_MAX_RESULTS = 20;
const X_API_BASE = 'https://api.twitter.com/2';

let _config = {};

// Helper for missing credentials error
function getCredentialsError() {
  const error = new Error(`
Twitter/X API Credentials Required
===================================

To use Twitter API features, you need Twitter API v2 credentials.

Get your credentials:
1. Go to: https://developer.x.com/en/portal/dashboard
2. Create a project and app
3. Generate "User Authentication Tokens" with Read and Write permissions
4. Copy these four values:

Set them via kai-skills:
  kai-skills config set twitter api_key your_consumer_key
  kai-skills config set twitter api_secret your_consumer_secret
  kai-skills config set twitter access_token your_access_token
  kai-skills config set twitter access_token_secret your_access_token_secret
  kai-skills sync-config

Then restart Claude Desktop.

Note: Twitter Free tier has limits (500 posts/month, limited search).
For full search access, you need Basic tier ($100/month).
`);
  error.code = 'MISSING_API_KEY';
  return error;
}

let _bearerToken = null;

async function getBearerToken() {
  if (_bearerToken) return _bearerToken;
  
  const apiKey = getCredential('twitter', 'X_API_KEY', _config);
  const apiSecret = getCredential('twitter', 'X_API_SECRET', _config);
  
  if (!apiKey || !apiSecret) {
    throw getCredentialsError();
  }
  
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  
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
  _bearerToken = data.access_token;
  return _bearerToken;
}

async function xApiRequest(method, endpoint, data) {
  const apiKey = getCredential('twitter', 'X_API_KEY', _config);
  const apiSecret = getCredential('twitter', 'X_API_SECRET', _config);
  const accessToken = getCredential('twitter', 'X_ACCESS_TOKEN', _config);
  const accessTokenSecret = getCredential('twitter', 'X_ACCESS_TOKEN_SECRET', _config);

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw getCredentialsError();
  }

  const OAuth = loadOAuth();
  const oauth = OAuth({
    consumer: { key: apiKey, secret: apiSecret },
    signature_method: 'HMAC-SHA1',
    hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
  });

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

  const token = { key: accessToken, secret: accessTokenSecret };
  const authHeader = oauth.toHeader(oauth.authorize({ url: url.toString(), method }, token));

  const options = {
    method,
    headers: { 'Authorization': authHeader.Authorization }
  };

  if (method === 'POST' && data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url.toString(), options);

  if (!response.ok) {
    const err = await response.text();
    if (response.status === 403) {
      throw new Error(`Twitter API access denied. Your API tier may not have search access. Free tier has limited endpoints. Upgrade at developer.x.com. Error: ${err}`);
    }
    throw new Error(`Twitter API error (${response.status}): ${err}`);
  }
  return response.json();
}

// OAuth 2.0 Bearer token request (for search endpoints)
async function xApiRequestBearer(method, endpoint, data) {
  const bearerToken = await getBearerToken();
  
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

  const options = {
    method,
    headers: { 
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url.toString(), options);

  if (!response.ok) {
    const err = await response.text();
    if (response.status === 403) {
      throw new Error(`Twitter API access denied. Your API tier may not have search access. Error: ${err}`);
    }
    throw new Error(`Twitter API error (${response.status}): ${err}`);
  }
  return response.json();
}

export default {
  install: async (config) => {
    _config = config;
    // Set credentials in process.env for immediate use
    const apiKey = getCredential('twitter', 'X_API_KEY', config);
    const apiSecret = getCredential('twitter', 'X_API_SECRET', config);
    const accessToken = getCredential('twitter', 'X_ACCESS_TOKEN', config);
    const accessTokenSecret = getCredential('twitter', 'X_ACCESS_TOKEN_SECRET', config);
    
    if (apiKey) process.env.X_API_KEY = apiKey;
    if (apiSecret) process.env.X_API_SECRET = apiSecret;
    if (accessToken) process.env.X_ACCESS_TOKEN = accessToken;
    if (accessTokenSecret) process.env.X_ACCESS_TOKEN_SECRET = accessTokenSecret;
    
    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      console.warn("[twitter] Warning: Twitter credentials not fully configured. Twitter tools will fail until credentials are set.");
    }
  },

  actions: {
    search_tweets: async (params) => {
      const query = params.query || '';
      const maxResults = params.max_results || DEFAULT_MAX_RESULTS;

      try {
        // Use OAuth 2.0 Bearer token for search (paid tiers get full access)
        const result = await xApiRequestBearer('GET', '/tweets/search/recent', {
          query: query,
          max_results: Math.min(maxResults, 100),
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
        // First get user ID from username
        const userResult = await xApiRequest('GET', `/users/by/username/${username}`, {});
        const userId = userResult.data?.id;

        if (!userId) {
          return { content: JSON.stringify({ error: 'User not found', username }) };
        }

        // Get tweets from user
        const result = await xApiRequest('GET', `/users/${userId}/tweets`, {
          max_results: Math.min(maxResults, 100),
          'tweet.fields': 'created_at,public_metrics'
        });

        const tweets = result.data?.map(t => ({
          id: t.id,
          text: t.text,
          created_at: t.created_at,
          likes: t.public_metrics?.like_count || 0,
          retweets: t.public_metrics?.retweet_count || 0,
          url: `https://twitter.com/${username}/status/${t.id}`
        })) || [];

        return { content: JSON.stringify({ username, tweets, total: tweets.length }) };
      } catch (error) {
        return { 
          content: JSON.stringify({ error: error.message, username }),
          isError: true 
        };
      }
    },

    analyze_user: async (params) => {
      const username = (params.username || '').replace(/^@/, '');

      try {
        const userResult = await xApiRequest('GET', `/users/by/username/${username}`, {
          'user.fields': 'public_metrics,description,created_at,verified'
        });

        const user = userResult.data;
        if (!user) {
          return { content: JSON.stringify({ error: 'User not found', username }) };
        }

        const result = {
          username,
          name: user.name,
          description: user.description,
          followers: user.public_metrics?.followers_count || 0,
          following: user.public_metrics?.following_count || 0,
          tweets_count: user.public_metrics?.tweet_count || 0,
          verified: user.verified || false,
          profile_url: `https://twitter.com/${username}`,
          created_at: user.created_at
        };
        return { content: JSON.stringify(result) };
      } catch (error) {
        return { 
          content: JSON.stringify({ error: error.message, username }),
          isError: true 
        };
      }
    },

    post_tweet: async (params) => {
      const text = params.text || '';
      if (!text) {
        return { content: JSON.stringify({ error: 'Tweet text required', posted: false }) };
      }

      try {
        const result = await xApiRequest('POST', '/tweets', { text });
        return { content: JSON.stringify({ 
          posted: true, 
          id: result.data?.id, 
          url: `https://twitter.com/i/web/status/${result.data?.id}`,
          text: text.substring(0, 50)
        })};
      } catch (error) {
        return { content: JSON.stringify({ posted: false, error: error.message }) };
      }
    },

    get_rate_limits: async () => {
      const apiKey = getCredential('twitter', 'X_API_KEY', _config);
      const apiSecret = getCredential('twitter', 'X_API_SECRET', _config);
      const accessToken = getCredential('twitter', 'X_ACCESS_TOKEN', _config);
      const accessTokenSecret = getCredential('twitter', 'X_ACCESS_TOKEN_SECRET', _config);
      
      const hasCreds = !!(apiKey && apiSecret && accessToken && accessTokenSecret);
      return { content: JSON.stringify({
        credentials_configured: hasCreds,
        tier: hasCreds ? 'Configured (tier depends on your Twitter plan)' : 'Not configured',
        free_limits: '500 posts/month, limited read access',
        search_note: 'Full search requires Basic tier ($100/month) or higher',
        upgrade: 'https://developer.x.com/en/portal/products'
      })};
    }
  }
};
