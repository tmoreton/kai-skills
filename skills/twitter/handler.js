/**
 * Twitter/X API Skill Handler v2 - Standalone MCP Compatible
 * 
 * Research tools use web search via Tavily API (TAVILY_API_KEY required).
 * Posting tools use X API v2 OAuth 1.0a (X_API_KEY, X_API_SECRET, etc. required).
 */

import { createRequire } from "module";
import crypto from 'crypto';
import { setupCredentials, injectCredentials } from '../lib/credentials.js';

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

async function webSearch(query, maxResults) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    const error = new Error(`
Tavily API Key Required
=======================

To search Twitter/X content, you need a Tavily API key for web search.

Get your free API key:
1. Go to: https://tavily.com/
2. Sign up for a free account
3. Get your API key from the dashboard

Set it via environment variable:
  export TAVILY_API_KEY=your_api_key_here

Or add to Claude Desktop config and restart.
`);
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults || 10,
      search_depth: 'basic',
      include_answer: false
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tavily API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return {
    results: data.results?.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      published_date: r.published_date
    })) || []
  };
}

function createOAuthClient(config) {
  const OAuth = loadOAuth();
  const consumerKey = config.api_key || process.env.X_API_KEY;
  const consumerSecret = config.api_secret || process.env.X_API_SECRET;
  return OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
  });
}

async function xApiPost(endpoint, data, config) {
  const apiKey = config.api_key || process.env.X_API_KEY;
  const apiSecret = config.api_secret || process.env.X_API_SECRET;
  const accessToken = config.access_token || process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = config.access_token_secret || process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error('X API credentials not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET.');
  }

  const oauth = createOAuthClient({ api_key: apiKey, api_secret: apiSecret });
  const url = X_API_BASE + endpoint;
  const token = { key: accessToken, secret: accessTokenSecret };
  const authHeader = oauth.toHeader(oauth.authorize({ url, method: 'POST' }, token));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader.Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`X API error (${response.status}): ${err}`);
  }
  return response.json();
}

function extractUsername(url) {
  if (!url) return null;
  const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})(?:\/|\?|$)/);
  return match ? match[1] : null;
}

function extractThemes(tweets) {
  if (!tweets?.length) return [];
  const text = tweets.map(t => t.text || '').join(' ').toLowerCase();
  const themes = ['ai', 'coding', 'startup', 'build', 'revenue', 'mrr', 'saas', 'indie', 'cursor', 'claude', 'developer', 'founder', 'product', 'marketing'];
  return themes.filter(t => text.includes(t)).slice(0, 5);
}

let _config = {};

export default {
  install: async (config) => {
    _config = config;
  },

  actions: {
    search_tweets: async (params) => {
      const query = params.query || '';
      const maxResults = params.max_results || DEFAULT_MAX_RESULTS;
      const allTweets = [];

      for (const searchQuery of [`${query} site:twitter.com`, `${query} site:x.com`]) {
        try {
          const result = await webSearch(searchQuery, Math.ceil(maxResults / 2));
          if (result?.results) {
            allTweets.push(...result.results.map((r, i) => ({
              id: `tweet_${allTweets.length + i}`,
              text: r.content || r.title,
              url: r.url,
              author: extractUsername(r.url) || 'Unknown',
              likes: Math.round((r.score || 0) * 10),
              timestamp: r.published_date || new Date().toISOString()
            })));
          }
        } catch (e) {
          // Continue with next query
        }
      }

      const unique = Array.from(new Map(allTweets.map(t => [t.url, t])).values());
      const result = { tweets: unique.slice(0, maxResults), total: unique.length, query };
      return { content: JSON.stringify(result) };
    },

    get_user_tweets: async (params) => {
      const username = (params.username || '').replace(/^@/, '');
      const maxResults = params.max_results || DEFAULT_MAX_RESULTS;
      
      const result = await webSearch(`from:${username} site:twitter.com OR site:x.com`, maxResults);
      const tweets = result.results?.map((r, i) => ({
        id: `tweet_${i}`,
        text: r.content || r.title,
        url: r.url,
        author: username,
        likes: Math.round((r.score || 0) * 10),
        timestamp: r.published_date || new Date().toISOString()
      })) || [];

      return { content: JSON.stringify({ username, tweets, total: tweets.length }) };
    },

    analyze_user: async (params) => {
      const username = (params.username || '').replace(/^@/, '');
      
      // Get tweets via web search
      const searchResult = await webSearch(`from:${username} site:twitter.com OR site:x.com`, 15);
      const tweets = searchResult.results?.map(r => ({
        text: r.content || r.title,
        likes: Math.round((r.score || 0) * 10)
      })) || [];
      
      const avgLikes = tweets.length ? tweets.reduce((s, t) => s + (t.likes || 0), 0) / tweets.length : 0;

      const result = {
        username,
        profile_url: `https://twitter.com/${username}`,
        recent_tweets_count: tweets.length,
        avg_likes_per_tweet: Math.round(avgLikes),
        activity_level: tweets.length > 5 ? 'High' : tweets.length > 0 ? 'Moderate' : 'Low',
        content_themes: extractThemes(tweets)
      };
      return { content: JSON.stringify(result) };
    },

    find_influencers: async (params) => {
      const topic = params.topic || '';
      const minFollowers = params.min_followers || 5000;
      const maxResults = params.max_results || 10;

      const searchQueries = [
        `${topic} "followers" site:twitter.com`,
        `${topic} influencer site:twitter.com`,
        `twitter.com ${topic} popular account`
      ];

      const allAccounts = [];
      for (const query of searchQueries) {
        try {
          const result = await webSearch(query, 10);
          if (result?.results) {
            for (const r of result.results) {
              const username = extractUsername(r.url);
              if (username && !allAccounts.some(a => a.username === username)) {
                allAccounts.push({
                  username,
                  profile_url: `https://twitter.com/${username}`,
                  snippet: r.content?.substring(0, 200),
                  source: r.url
                });
              }
            }
          }
        } catch (e) {
          // Continue with next query
        }
      }

      const result = {
        topic,
        min_followers: minFollowers,
        influencers: allAccounts.slice(0, maxResults),
        total_found: allAccounts.length
      };
      return { content: JSON.stringify(result) };
    },

    track_topic_sentiment: async (params) => {
      const topic = params.topic || '';
      const discussions = [];

      for (const query of [`${topic} twitter`, `${topic} opinion site:twitter.com`]) {
        try {
          const result = await webSearch(query, 15);
          if (result?.results) discussions.push(...result.results.map(r => ({ text: r.content || r.title })));
        } catch (e) {
          // Continue
        }
      }

      const unique = Array.from(new Map(discussions.map(d => [d.text, d])).values());
      const positiveWords = ['love', 'great', 'awesome', 'best', 'amazing', 'win', 'excellent', 'fantastic', 'good', 'happy'];
      const negativeWords = ['hate', 'terrible', 'worst', 'fail', 'bad', 'awful', 'disappointing', 'sad', 'angry'];
      
      const pos = positiveWords.filter(w => unique.some(d => d.text?.toLowerCase().includes(w))).length;
      const neg = negativeWords.filter(w => unique.some(d => d.text?.toLowerCase().includes(w))).length;
      const neutral = unique.length - pos - neg;

      const result = {
        topic,
        sentiment: {
          positive: { count: pos, percentage: unique.length ? Math.round((pos / unique.length) * 100) : 0 },
          negative: { count: neg, percentage: unique.length ? Math.round((neg / unique.length) * 100) : 0 },
          neutral: { count: neutral, percentage: unique.length ? Math.round((neutral / unique.length) * 100) : 0 }
        },
        total_discussions_analyzed: unique.length,
        summary: unique.length ? `${pos > neg ? 'Positive' : neg > pos ? 'Negative' : 'Mixed'} sentiment. ${unique.length} discussions analyzed.` : 'No discussions found'
      };
      return { content: JSON.stringify(result) };
    },

    post_tweet: async (params) => {
      const text = params.text || '';
      if (!text) {
        return { content: JSON.stringify({ error: 'Tweet text required', posted: false }) };
      }

      if (!process.env.X_API_KEY) {
        return { content: JSON.stringify({ error: 'X_API_KEY not configured', posted: false, note: 'Add credentials to environment or config' }) };
      }

      try {
        const result = await xApiPost('/tweets', { text }, _config);
        const response = { posted: true, id: result.data?.id, url: `https://twitter.com/i/web/status/${result.data?.id}` };
        return { content: JSON.stringify(response) };
      } catch (error) {
        return { content: JSON.stringify({ posted: false, error: error.message, text_preview: text.substring(0, 50) }) };
      }
    },

    post_thread: async (params) => {
      const tweets = params.tweets || [];
      if (!Array.isArray(tweets) || tweets.length === 0) {
        return { content: JSON.stringify({ error: 'Array of tweets required', posted: false }) };
      }

      if (!process.env.X_API_KEY) {
        return { content: JSON.stringify({ error: 'X_API_KEY not configured', posted: false }) };
      }

      const posted = [];
      let lastTweetId = null;

      for (const text of tweets) {
        try {
          const payload = { text };
          if (lastTweetId) {
            payload.reply = { in_reply_to_tweet_id: lastTweetId };
          }
          const result = await xApiPost('/tweets', payload, _config);
          lastTweetId = result.data?.id;
          posted.push({ id: lastTweetId, text: text.substring(0, 50) });
        } catch (error) {
          posted.push({ error: error.message, text: text.substring(0, 50) });
          break;
        }
      }

      const result = {
        posted: posted.every(p => p.id),
        tweets_posted: posted.length,
        tweets: posted,
        thread_url: lastTweetId ? `https://twitter.com/i/web/status/${lastTweetId}` : null
      };
      return { content: JSON.stringify(result) };
    },

    get_rate_limits: async () => {
      const result = {
        credentials_configured: !!process.env.X_API_KEY,
        tier: process.env.X_API_KEY ? 'Free (500 posts/month)' : 'Not configured',
        note: 'Check https://developer.x.com/en/portal/dashboard for actual usage'
      };
      return { content: JSON.stringify(result) };
    }
  }
};
