/**
 * Twitter/X API Skill Handler - X API v2 with OAuth 1.0a
 * 
 * Required credentials from X Developer Portal (https://developer.x.com):
 * 1. Go to your app → "Keys and Tokens" tab
 * 2. Under "Consumer Keys" section:
 *    - API Key (aka Consumer Key)
 *    - API Secret (aka Consumer Secret)
 * 3. Under "Authentication Tokens" section, click "Generate":
 *    - Access Token
 *    - Access Token Secret
 * 
 * Environment variables:
 *   X_API_KEY=your_api_key
 *   X_API_SECRET=your_api_secret
 *   X_ACCESS_TOKEN=your_access_token
 *   X_ACCESS_TOKEN_SECRET=your_access_token_secret
 * 
 * Note: Free tier = 500 posts/month. Search requires Basic tier ($100/month).
 */

import { getCredential } from '../../lib/credentials.js';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

const DEFAULT_MAX_RESULTS = 20;
const X_API_BASE = 'https://api.twitter.com/2';

// Get OAuth 1.0a credentials
function getCredentials(config) {
  return {
    apiKey: getCredential('twitter', 'X_API_KEY', config),
    apiSecret: getCredential('twitter', 'X_API_SECRET', config),
    accessToken: getCredential('twitter', 'X_ACCESS_TOKEN', config),
    accessTokenSecret: getCredential('twitter', 'X_ACCESS_TOKEN_SECRET', config),
  };
}

function hasCredentials(config) {
  const creds = getCredentials(config);
  return creds.apiKey && creds.apiSecret && creds.accessToken && creds.accessTokenSecret;
}

function getCredentialsError() {
  return Object.assign(new Error(`
Twitter/X API OAuth 1.0a Credentials Required
================================================

Get your credentials from https://developer.x.com:

1. Go to your app → "Keys and Tokens" tab
2. Under "Consumer Keys" section:
   - X_API_KEY (aka API Key)
   - X_API_SECRET (aka API Secret)
3. Under "Authentication Tokens" section, click "Generate":
   - X_ACCESS_TOKEN
   - X_ACCESS_TOKEN_SECRET

Set via environment variables:
  X_API_KEY=your_api_key
  X_API_SECRET=your_api_secret
  X_ACCESS_TOKEN=your_access_token
  X_ACCESS_TOKEN_SECRET=your_token_secret

Or set via kai-skills:
  kai-skills config set twitter api_key your_key
  kai-skills config set twitter api_secret your_secret
  kai-skills config set twitter access_token your_token
  kai-skills config set twitter access_token_secret your_secret
  kai-skills sync-config

Note: Free tier = 500 posts/month. Search requires Basic tier ($100/month).
`), { code: 'MISSING_API_KEY' });
}

// Get app-only Bearer Token for read-only endpoints
async function getAppBearerToken(config) {
  const { apiKey, apiSecret } = getCredentials(config);
  
  if (!apiKey || !apiSecret) {
    throw getCredentialsError();
  }
  
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  
  const response = await fetch('https://api.twitter.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    throw new Error(`Bearer token failed: ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

// Make API request
async function xApiRequest(config, method, endpoint, data = {}, requireUserContext = false) {
  if (!hasCredentials(config)) {
    throw getCredentialsError();
  }
  
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = getCredentials(config);
  const url = new URL(X_API_BASE + endpoint);
  
  // Add query params for GET
  if (method === 'GET') {
    for (const [key, value] of Object.entries(data)) {
      if (value != null) {
        url.searchParams.append(key, Array.isArray(value) ? value.join(',') : String(value));
      }
    }
  }
  
  let headers = {};
  let body = null;
  
  if (requireUserContext) {
    // OAuth 1.0a with user context for posting/mutating
    const oauth = new OAuth({
      consumer: { key: apiKey, secret: apiSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString, key) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64');
      }
    });
    
    const oauthData = {
      url: url.toString(),
      method: method,
    };
    
    if (method === 'POST') {
      oauthData.data = data;
    }
    
    const token = { key: accessToken, secret: accessTokenSecret };
    headers = oauth.toHeader(oauth.authorize(oauthData, token));
    
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }
  } else {
    // App-only Bearer token for read operations
    const bearerToken = await getAppBearerToken(config);
    headers['Authorization'] = `Bearer ${bearerToken}`;
    
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }
  }
  
  const response = await fetch(url.toString(), { method, headers, body });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }
  
  if (response.status === 204) return null;
  return await response.json();
}

// Export actions object for skill system
export const actions = {
  search_tweets: async (params, config) => {
    const query = params.query || params.q;
    if (!query) return { content: JSON.stringify({ error: 'Query required' }) };
    
    try {
      const result = await xApiRequest(config, 'GET', '/tweets/search/recent', {
        query,
        max_results: Math.max(10, Math.min(params.max_results || 20, 100)),
        'tweet.fields': 'created_at,public_metrics,author_id'
      });
      
      return { content: JSON.stringify({
        tweets: result.data?.map(t => ({
          id: t.id,
          text: t.text,
          created_at: t.created_at,
          url: `https://twitter.com/i/web/status/${t.id}`
        })) || [],
        meta: result.meta
      }) };
    } catch (e) {
      return { content: JSON.stringify({ error: e.message }), isError: true };
    }
  },
  
  get_user_tweets: async (params, config) => {
    const username = (params.username || '').replace(/^@/, '');
    if (!username) return { content: JSON.stringify({ error: 'Username required' }) };
    
    try {
      const user = await xApiRequest(config, 'GET', `/users/by/username/${username}`);
      if (!user.data) return { content: JSON.stringify({ error: 'User not found' }) };
      
      const tweets = await xApiRequest(config, 'GET', `/users/${user.data.id}/tweets`, {
        max_results: Math.max(5, Math.min(params.max_results || 20, 100)),
        'tweet.fields': 'created_at,public_metrics'
      });
      
      return { content: JSON.stringify({
        username,
        tweets: tweets.data?.map(t => ({
          id: t.id,
          text: t.text,
          created_at: t.created_at,
          url: `https://twitter.com/i/web/status/${t.id}`
        })) || [],
        meta: tweets.meta
      }) };
    } catch (e) {
      return { content: JSON.stringify({ error: e.message }), isError: true };
    }
  },
  
  analyze_user: async (params, config) => {
    const username = (params.username || '').replace(/^@/, '');
    if (!username) return { content: JSON.stringify({ error: 'Username required' }) };
    
    try {
      const result = await xApiRequest(config, 'GET', `/users/by/username/${username}`, {
        'user.fields': 'public_metrics,description,verified,created_at,location,url,profile_image_url'
      });
      
      if (!result.data) return { content: JSON.stringify({ error: 'User not found' }) };
      const u = result.data, m = u.public_metrics || {};
      
      return { content: JSON.stringify({
        username: u.username,
        display_name: u.name,
        description: u.description,
        verified: u.verified,
        created_at: u.created_at,
        location: u.location,
        website: u.url,
        profile_image: u.profile_image_url,
        followers: m.followers_count || 0,
        following: m.following_count || 0,
        tweets: m.tweet_count || 0,
        url: `https://twitter.com/${u.username}`
      }) };
    } catch (e) {
      return { content: JSON.stringify({ error: e.message }), isError: true };
    }
  },
  
  post_tweet: async (params, config) => {
    const text = params.text || params.tweet || '';
    if (!text) return { content: JSON.stringify({ error: 'Text required' }) };
    if (text.length > 280) return { content: JSON.stringify({ error: 'Too long', length: text.length }) };
    
    try {
      const result = await xApiRequest(config, 'POST', '/tweets', { text }, true);
      return { content: JSON.stringify({
        posted: true,
        id: result.data?.id,
        url: `https://twitter.com/i/web/status/${result.data?.id}`,
        text: result.data?.text
      }) };
    } catch (e) {
      return { content: JSON.stringify({ error: e.message }), isError: true };
    }
  },
  
  get_rate_limits: async (params, config) => {
    const configured = hasCredentials(config);
    return { content: JSON.stringify({
      credentials_configured: !!configured,
      auth_type: configured ? 'OAuth 1.0a' : 'None',
      required_env: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'],
      tier: 'Configured (Free: 500 posts/month, Basic: 10K posts/month)',
      search_note: 'Search requires Basic tier ($100/month)'
    }) };
  }
};

// Default export for backward compatibility
export default async function handler(request) {
  const { name, parameters, config } = request;
  const action = actions[name];
  
  if (!action) {
    return { content: JSON.stringify({ error: `Unknown action: ${name}` }), isError: true };
  }
  
  return await action(parameters || {}, config || {});
}
