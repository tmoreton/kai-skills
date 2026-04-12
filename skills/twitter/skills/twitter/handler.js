/**
 * Twitter/X API Skill Handler - X API v2 with OAuth 1.0a
 * 
 * Uses OAuth 1.0a (User Context) for all endpoints.
 * This is the recommended approach for Twitter API v2 when you need to:
 * - Post tweets
 * - Search tweets (with elevated access)
 * - Access user data
 * 
 * Required credentials from X Developer Portal (https://developer.x.com):
 * 1. Go to your app → "Keys and Tokens" tab
 * 2. Under "Consumer Keys", copy:
 *    - API Key (this is your Consumer Key)
 *    - API Secret Key (this is your Consumer Secret)
 * 3. Scroll to "Access Token and Secret" section, click "Generate" for your account
 * 4. Copy:
 *    - Access Token
 *    - Access Token Secret
 * 
 * Environment variables:
 *   X_API_KEY=your_consumer_key
 *   X_API_SECRET=your_consumer_secret
 *   X_ACCESS_TOKEN=your_access_token
 *   X_ACCESS_TOKEN_SECRET=your_access_token_secret
 */

import { createRequire } from "module";
import crypto from 'crypto';
import { getCredential } from '../../lib/credentials.js';

const DEFAULT_MAX_RESULTS = 20;
const X_API_BASE = 'https://api.twitter.com/2';

let _config = {};

// Load OAuth 1.0a library
function loadOAuth() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require('oauth-1.0a');
  } catch (e) {
    throw new Error('oauth-1.0a package not found. Run: npm install oauth-1.0a');
  }
}

// Get OAuth 1.0a credentials
function getOAuthCredentials(config) {
  const consumerKey = getCredential('twitter', 'X_API_KEY', config);
  const consumerSecret = getCredential('twitter', 'X_API_SECRET', config);
  const accessToken = getCredential('twitter', 'X_ACCESS_TOKEN', config);
  const accessTokenSecret = getCredential('twitter', 'X_ACCESS_TOKEN_SECRET', config);
  
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

// Helper for missing credentials error
function getCredentialsError() {
  const error = new Error(`
Twitter/X API OAuth 1.0a Credentials Required
==============================================

Get your credentials from https://developer.x.com:

1. Go to your app → "Keys and Tokens" tab
2. Under "Consumer Keys", copy:
   - API Key (Consumer Key)
   - API Secret Key (Consumer Secret)
3. Under "Access Token and Secret", click "Generate":
   - Access Token
   - Access Token Secret

Set via kai-skills:
  kai-skills config set twitter api_key your_api_key
  kai-skills config set twitter api_secret your_api_secret
  kai-skills config set twitter access_token your_access_token
  kai-skills config set twitter access_token_secret your_access_token_secret
  kai-skills sync-config

Environment variables:
  X_API_KEY=your_api_key
  X_API_SECRET=your_api_secret
  X_ACCESS_TOKEN=your_access_token
  X_ACCESS_TOKEN_SECRET=your_access_token_secret

Note: Free tier = 500 posts/month. Search requires Basic tier ($100/month).
`);
  error.code = 'MISSING_API_KEY';
  return error;
}

// Create OAuth 1.0a signature
function createOAuthSignature(method, url, params, credentials) {
  const OAuth = loadOAuth();
  
  const oauth = OAuth({
    consumer: {
      key: credentials.consumerKey,
      secret: credentials.consumerSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });
  
  const token = {
    key: credentials.accessToken,
    secret: credentials.accessTokenSecret,
  };
  
  return oauth.authorize({ url, method, data: params }, token);
}

// Make OAuth 1.0a API request
async function xApiRequest(method, endpoint, params = {}) {
  const credentials = getOAuthCredentials(_config);
  
  if (!credentials.consumerKey || !credentials.consumerSecret || 
      !credentials.accessToken || !credentials.accessTokenSecret) {
    throw getCredentialsError();
  }
  
  // Build URL
  let url;
  if (method === 'GET' && Object.keys(params).length > 0) {
    url = new URL(X_API_BASE + endpoint);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    url = url.toString();
  } else {
    url = X_API_BASE + endpoint;
  }
  
  // Create OAuth signature
  const oauthHeaders = createOAuthSignature(method, url, method === 'GET' ? {} : params, credentials);
  
  const options = {
    method,
    headers: {
      'Authorization': oauthHeaderString(oauthHeaders),
      'Content-Type': 'application/json'
    }
  };
  
  if (method === 'POST' && Object.keys(params).length > 0) {
    options.body = JSON.stringify(params);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const err = await response.text();
    if (response.status === 401) {
      throw new Error(`Twitter API unauthorized. Check your OAuth 1.0a credentials. Error: ${err}`);
    }
    if (response.status === 403) {
      throw new Error(`Twitter API access denied. Your API tier may not have this feature. Error: ${err}`);
    }
    throw new Error(`Twitter API error (${response.status}): ${err}`);
  }
  
  return response.json();
}

// Convert OAuth object to Authorization header string
function oauthHeaderString(oauth) {
  const parts = Object.entries(oauth).map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`);
  return `OAuth ${parts.join(', ')}`;
}

export default {
  install: async (config) => {
    _config = config;
    
    const credentials = getOAuthCredentials(config);
    
    if (credentials.consumerKey) process.env.X_API_KEY = credentials.consumerKey;
    if (credentials.consumerSecret) process.env.X_API_SECRET = credentials.consumerSecret;
    if (credentials.accessToken) process.env.X_ACCESS_TOKEN = credentials.accessToken;
    if (credentials.accessTokenSecret) process.env.X_ACCESS_TOKEN_SECRET = credentials.accessTokenSecret;
    
    if (!credentials.consumerKey || !credentials.consumerSecret || !credentials.accessToken || !credentials.accessTokenSecret) {
      console.warn("[twitter] Warning: OAuth 1.0a credentials not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET.");
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
          return { content: JSON.stringify({ error: `User @${username} not found` }) };
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

        return { content: JSON.stringify({ tweets, user: username, total: tweets.length }) };
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
        const result = await xApiRequest('GET', `/users/by/username/${username}`, {
          'user.fields': 'public_metrics,description,created_at,verified,location'
        });

        const user = result.data;
        if (!user) {
          return { content: JSON.stringify({ error: `User @${username} not found` }) };
        }

        return { content: JSON.stringify({
          username: user.username,
          name: user.name,
          description: user.description,
          location: user.location,
          verified: user.verified,
          created_at: user.created_at,
          followers: user.public_metrics?.followers_count || 0,
          following: user.public_metrics?.following_count || 0,
          tweets: user.public_metrics?.tweet_count || 0
        })};
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, username }), isError: true };
      }
    },

    post_tweet: async (params) => {
      const text = params.text || '';

      if (!text) {
        return { content: JSON.stringify({ error: 'Tweet text required' }) };
      }

      if (text.length > 280) {
        return { content: JSON.stringify({ error: 'Tweet exceeds 280 characters' }) };
      }

      try {
        const result = await xApiRequest('POST', '/tweets', { text });

        if (result.data) {
          return { content: JSON.stringify({
            success: true,
            id: result.data.id,
            text: result.data.text,
            url: `https://twitter.com/i/web/status/${result.data.id}`
          })};
        }

        return { content: JSON.stringify({ error: 'Failed to post tweet', result }), isError: true };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message }), isError: true };
      }
    },

    get_rate_limits: async () => {
      const credentials = getOAuthCredentials(_config);
      
      if (!credentials.consumerKey || !credentials.consumerSecret || !credentials.accessToken || !credentials.accessTokenSecret) {
        return { content: JSON.stringify({ 
          error: 'Credentials not configured',
          missing: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET']
        }), isError: true };
      }
      
      try {
        // Try a simple request to verify credentials
        const result = await xApiRequest('GET', '/users/me', {});
        
        return { content: JSON.stringify({
          credentials: 'valid',
          user: result.data,
          note: 'OAuth 1.0a credentials are working. Free tier = 500 posts/month. Search requires Basic tier.'
        })};
      } catch (error) {
        return { content: JSON.stringify({ 
          error: error.message,
          credentials: 'invalid',
          note: 'Check your OAuth 1.0a credentials in X Developer Portal'
        }), isError: true };
      }
    }
  }
};
