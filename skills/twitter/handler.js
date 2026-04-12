/**
 * Twitter/X API Skill Handler - X API v2
 * 
 * Supports OAuth 2.0 (preferred) and OAuth 1.0a (legacy) for all endpoints:
 * - Search tweets (OAuth 2.0 Bearer or OAuth 1.0a)
 * - Get user tweets (OAuth 2.0 Bearer or OAuth 1.0a)
 * - Post tweets (OAuth 2.0 User context or OAuth 1.0a)
 * 
 * OAuth 2.0 credentials from X Developer Portal:
 * - Client ID, Client Secret (from "OAuth 2.0 Keys")
 * - Access Token (click "Generate" button)
 * 
 * Legacy OAuth 1.0a also supported:
 * - Consumer Key, Consumer Secret (from "OAuth 1.0 Keys")
 * - Access Token, Access Token Secret
 */

import { createRequire } from "module";
import crypto from 'crypto';
import { getCredential } from '../../lib/credentials.js';

const DEFAULT_MAX_RESULTS = 20;
const X_API_BASE = 'https://api.twitter.com/2';

let _config = {};
let _appBearerToken = null;

function loadOAuth() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require('oauth-1.0a');
  } catch (e) {
    return null;
  }
}

// Get credentials with OAuth 2.0 priority, OAuth 1.0a fallback
function getCredentials(config) {
  // Try OAuth 2.0 first
  const oauth2 = {
    clientId: getCredential('twitter', 'X_CLIENT_ID', config),
    clientSecret: getCredential('twitter', 'X_CLIENT_SECRET', config),
    accessToken: getCredential('twitter', 'X_ACCESS_TOKEN', config),
  };
  
  // Try OAuth 1.0a as fallback
  const oauth1 = {
    consumerKey: getCredential('twitter', 'X_CONSUMER_KEY', config) || getCredential('twitter', 'X_API_KEY', config),
    consumerSecret: getCredential('twitter', 'X_CONSUMER_SECRET', config) || getCredential('twitter', 'X_API_SECRET', config),
    accessToken: getCredential('twitter', 'X_ACCESS_TOKEN', config),
    accessTokenSecret: getCredential('twitter', 'X_ACCESS_TOKEN_SECRET', config),
  };
  
  // Detect which version based on what credentials are available
  const hasOAuth2 = oauth2.clientId && oauth2.clientSecret;
  const hasOAuth1 = oauth1.consumerKey && oauth1.consumerSecret && oauth1.accessToken && oauth1.accessTokenSecret;
  
  if (hasOAuth2) {
    return { type: 'oauth2', ...oauth2 };
  }
  if (hasOAuth1) {
    return { type: 'oauth1', ...oauth1 };
  }
  
  // Return partial to trigger error
  return { type: hasOAuth2 ? 'oauth2' : hasOAuth1 ? 'oauth1' : null };
}

// Helper for missing credentials error
function getCredentialsError() {
  const error = new Error(`
Twitter/X API Credentials Required
===================================

Option 1: OAuth 2.0 (Recommended)
--------------------------------
From X Developer Portal → your app → "Keys and Tokens":

1. Copy from "OAuth 2.0 Keys":
   X_CLIENT_ID=your_client_id
   X_CLIENT_SECRET=your_client_secret

2. Click "Generate" to create access token:
   X_ACCESS_TOKEN=your_access_token

Option 2: OAuth 1.0a (Legacy)
------------------------------
X_CONSUMER_KEY=your_consumer_key
X_CONSUMER_SECRET=your_consumer_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret

Set via kai-skills:
  kai-skills config set twitter client_id your_value
  kai-skills sync-config

Note: Free tier = 500 posts/month. Search requires Basic tier ($100/month).
`);
  error.code = 'MISSING_API_KEY';
  return error;
}

// Get OAuth 2.0 Bearer Token for app-only endpoints
async function getAppBearerToken() {
  if (_appBearerToken) return _appBearerToken;
  
  const creds = getCredentials(_config);
  
  if (creds.type === 'oauth2') {
    // Exchange client credentials for Bearer token
    const credentials = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
    
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
  } else {
    throw getCredentialsError();
  }
}

// Generic API request handler (auto-detects auth type)
async function xApiRequest(method, endpoint, data, requireUserContext = false) {
  const creds = getCredentials(_config);
  
  if (!creds.type) {
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
  
  let options;
  
  if (creds.type === 'oauth2') {
    // OAuth 2.0 authentication
    const token = requireUserContext ? creds.accessToken : await getAppBearerToken();
    options = {
      method,
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  } else {
    // OAuth 1.0a authentication
    const OAuth = loadOAuth();
    if (!OAuth) {
      throw new Error('oauth-1.0a not installed. Run: npm install oauth-1.0a');
    }
    
    const oauth = OAuth({
      consumer: { key: creds.consumerKey, secret: creds.consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
    });
    
    const token = { key: creds.accessToken, secret: creds.accessTokenSecret };
    const authHeader = oauth.toHeader(oauth.authorize({ url: url.toString(), method }, token));
    
    options = {
      method,
      headers: { 'Authorization': authHeader.Authorization }
    };
  }
  
  if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url.toString(), options);
  
  if (!response.ok) {
    const err = await response.text();
    if (response.status === 401) {
      throw new Error(`Twitter API unauthorized. Check your credentials. Error: ${err}`);
    }
    if (response.status === 403) {
      throw new Error(`Twitter API access denied. Your API tier may not have this feature. Error: ${err}`);
    }
    throw new Error(`Twitter API error (${response.status}): ${err}`);
  }
  return response.json();
}

export default {
  install: async (config) => {
    _config = config;
    _appBearerToken = null;
    
    const creds = getCredentials(config);
    
    if (creds.type === 'oauth2') {
      if (creds.clientId) process.env.X_CLIENT_ID = creds.clientId;
      if (creds.clientSecret) process.env.X_CLIENT_SECRET = creds.clientSecret;
      if (creds.accessToken) process.env.X_ACCESS_TOKEN = creds.accessToken;
    } else if (creds.type === 'oauth1') {
      if (creds.consumerKey) process.env.X_CONSUMER_KEY = creds.consumerKey;
      if (creds.consumerSecret) process.env.X_CONSUMER_SECRET = creds.consumerSecret;
      if (creds.accessToken) process.env.X_ACCESS_TOKEN = creds.accessToken;
      if (creds.accessTokenSecret) process.env.X_ACCESS_TOKEN_SECRET = creds.accessTokenSecret;
    } else {
      console.warn("[twitter] Warning: Twitter credentials not configured. Twitter tools will fail until credentials are set.");
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
      const creds = getCredentials(_config);
      
      return { content: JSON.stringify({
        credentials_configured: !!creds.type,
        auth_type: creds.type || 'none',
        tier: 'Configured (tier depends on your Twitter plan)',
        free_limits: '500 posts/month, limited read access',
        basic_limits: '10,000 posts/month, 10,000 read limit/month',
        search_note: 'Full search requires Basic tier ($100/month) or higher',
        docs: 'https://developer.x.com/en/docs/twitter-api'
      }) };
    }
  }
};
