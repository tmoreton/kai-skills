/**
 * Reddit API Skill Handler
 * 
 * Uses Reddit's OAuth 2.0 API for read-only access to posts and comments.
 * Supports searching posts, browsing subreddits, and analyzing discussions.
 * 
 * Required credentials from https://www.reddit.com/prefs/apps:
 * 1. Click "create another app..."
 * 2. Select "script" type
 * 3. Name it "Kai Research" (or any name)
 * 4. Copy the Client ID (under the app name)
 * 5. Copy the Client Secret (labeled "secret")
 * 
 * Environment variables:
 *   REDDIT_CLIENT_ID=your_client_id
 *   REDDIT_CLIENT_SECRET=your_client_secret
 *   REDDIT_USER_AGENT="KaiResearch/1.0 by u/your_username"
 */

import { getCredential } from '../../lib/credentials.js';

const REDDIT_API_BASE = 'https://oauth.reddit.com';
const REDDIT_AUTH_BASE = 'https://www.reddit.com/api/v1/access_token';

let _config = {};
let _accessToken = null;
let _tokenExpiry = 0;

// Get Reddit credentials
function getRedditCredentials(config) {
  return {
    clientId: getCredential('reddit', 'REDDIT_CLIENT_ID', config),
    clientSecret: getCredential('reddit', 'REDDIT_CLIENT_SECRET', config),
    userAgent: getCredential('reddit', 'REDDIT_USER_AGENT', config) || 'KaiResearch/1.0',
  };
}

// Helper for missing credentials error
function getCredentialsError() {
  const error = new Error(`
Reddit API Credentials Required
================================

Get your credentials from https://www.reddit.com/prefs/apps:

1. Go to https://www.reddit.com/prefs/apps
2. Click "create another app..."
3. Select "script" type
4. Name: "Kai Research" (or any name)
5. Redirect URI: http://localhost:8080 (not used for read-only)
6. Click "create app"
7. Copy:
   - Client ID (the string under your app name)
   - Client Secret (labeled "secret")

Set via kai-skills:
  kai-skills config set reddit client_id your_client_id
  kai-skills config set reddit client_secret your_client_secret
  kai-skills config set reddit user_agent "KaiResearch/1.0 by u/your_username"
  kai-skills sync-config

Environment variables:
  REDDIT_CLIENT_ID=your_client_id
  REDDIT_CLIENT_SECRET=your_client_secret
  REDDIT_USER_AGENT="KaiResearch/1.0 by u/your_username"

Note: Read-only access doesn't require user login. Just the app credentials.
`);
  error.code = 'MISSING_API_KEY';
  return error;
}

// Get OAuth 2.0 access token (Client Credentials flow for read-only)
async function getAccessToken() {
  // Check if token is still valid (with 60s buffer)
  if (_accessToken && Date.now() < _tokenExpiry - 60000) {
    return _accessToken;
  }
  
  const { clientId, clientSecret, userAgent } = getRedditCredentials(_config);
  
  if (!clientId || !clientSecret) {
    throw getCredentialsError();
  }
  
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(REDDIT_AUTH_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to get Reddit access token: ${err}`);
  }
  
  const data = await response.json();
  _accessToken = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in * 1000);
  return _accessToken;
}

// Make authenticated API request to Reddit
async function redditRequest(endpoint, params = {}) {
  const token = await getAccessToken();
  const { userAgent } = getRedditCredentials(_config);
  
  // Build URL with query params
  const url = new URL(REDDIT_API_BASE + endpoint);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': userAgent,
      'Accept': 'application/json',
    }
  });
  
  if (!response.ok) {
    const err = await response.text();
    if (response.status === 401) {
      throw new Error(`Reddit API unauthorized. Check your client ID and secret. Error: ${err}`);
    }
    if (response.status === 403) {
      throw new Error(`Reddit API forbidden. Your app may need different permissions. Error: ${err}`);
    }
    if (response.status === 404) {
      throw new Error(`Not found. Check the subreddit or post exists. Error: ${err}`);
    }
    throw new Error(`Reddit API error (${response.status}): ${err}`);
  }
  
  return response.json();
}

// Format Reddit post data
function formatPost(post) {
  const data = post.data || post;
  return {
    id: data.id,
    title: data.title,
    text: data.selftext || '',
    author: data.author,
    subreddit: data.subreddit,
    score: data.score || 0,
    upvotes: data.ups || 0,
    downvotes: data.downs || 0,
    comments: data.num_comments || 0,
    created_at: new Date(data.created_utc * 1000).toISOString(),
    url: `https://reddit.com${data.permalink}`,
    external_url: data.url,
    is_video: data.is_video,
    is_self: data.is_self,
    thumbnail: data.thumbnail?.startsWith('http') ? data.thumbnail : null,
    awards: data.total_awards_received || 0,
  };
}

// Format Reddit comment
function formatComment(comment, depth = 0) {
  if (!comment.data || comment.kind === 'more') return null;
  
  const data = comment.data;
  return {
    id: data.id,
    author: data.author,
    text: data.body || '[deleted]',
    score: data.score || 0,
    created_at: new Date(data.created_utc * 1000).toISOString(),
    depth: depth,
    replies: data.replies?.data?.children
      ?.map(reply => formatComment(reply, depth + 1))
      ?.filter(Boolean) || [],
  };
}

export default {
  install: async (config) => {
    _config = config;
    _accessToken = null;
    _tokenExpiry = 0;
    
    const { clientId, clientSecret, userAgent } = getRedditCredentials(config);
    
    if (clientId) process.env.REDDIT_CLIENT_ID = clientId;
    if (clientSecret) process.env.REDDIT_CLIENT_SECRET = clientSecret;
    if (userAgent) process.env.REDDIT_USER_AGENT = userAgent;
    
    if (!clientId || !clientSecret) {
      console.warn("[reddit] Warning: Reddit credentials not configured. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.");
    }
  },

  actions: {
    search_posts: async (params) => {
      const query = params.query || '';
      const subreddit = params.subreddit;
      const sort = params.sort || 'relevance';
      const time = params.time || 'all';
      const limit = Math.min(params.limit || 25, 100);

      if (!query) {
        return { content: JSON.stringify({ error: 'Search query required' }) };
      }

      try {
        const searchParams = {
          q: query,
          sort: sort,
          t: time,
          limit: limit,
        };
        
        if (subreddit) {
          searchParams.restrict_sr = 'true';
        }
        
        const endpoint = subreddit ? `/r/${subreddit}/search` : '/search';
        const result = await redditRequest(endpoint, searchParams);
        
        const posts = result.data?.children
          ?.map(formatPost)
          ?.filter(p => p && p.title) || [];

        return { content: JSON.stringify({ 
          posts, 
          total: posts.length, 
          query, 
          subreddit: subreddit || 'all',
          sort,
          time,
        }) };
      } catch (error) {
        return { 
          content: JSON.stringify({ 
            error: error.message,
            query,
            subreddit,
          }),
          isError: true
        };
      }
    },

    get_subreddit_posts: async (params) => {
      const subreddit = (params.subreddit || '').replace(/^r\//, '');
      const sort = params.sort || 'hot'; // hot, new, top, rising
      const time = params.time || 'day'; // hour, day, week, month, year, all (for top)
      const limit = Math.min(params.limit || 25, 100);

      if (!subreddit) {
        return { content: JSON.stringify({ error: 'Subreddit name required' }) };
      }

      try {
        const endpoint = `/r/${subreddit}/${sort}`;
        const resultParams = { limit };
        
        if (sort === 'top') {
          resultParams.t = time;
        }
        
        const result = await redditRequest(endpoint, resultParams);
        
        const posts = result.data?.children
          ?.map(formatPost)
          ?.filter(p => p && p.title) || [];

        return { content: JSON.stringify({ 
          posts, 
          total: posts.length, 
          subreddit,
          sort,
          time: sort === 'top' ? time : undefined,
        }) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, subreddit }), isError: true };
      }
    },

    get_post_comments: async (params) => {
      const postId = params.post_id || params.id;
      const permalink = params.permalink;
      const subreddit = params.subreddit;
      const limit = Math.min(params.limit || 50, 100);
      const depth = Math.min(params.depth || 3, 10);

      if (!postId && !permalink) {
        return { content: JSON.stringify({ 
          error: 'Post ID or permalink required',
          example: 'Use post_id "abc123", permalink "/r/subreddit/comments/abc123/title", or provide subreddit + post_id'
        }) };
      }

      try {
        let endpoint;
        if (permalink) {
          // Clean up permalink - remove trailing slash and add /comments
          const cleanPath = permalink.replace(/\/$/, '').replace(/^https:\/\/reddit\.com/, '');
          endpoint = cleanPath + '.json';
        } else if (subreddit) {
          endpoint = `/r/${subreddit}/comments/${postId}.json`;
        } else {
          // Try to extract subreddit from post_id context or search
          return { content: JSON.stringify({ 
            error: 'Subreddit required when using post_id without full permalink',
            help: 'Provide subreddit parameter or full permalink'
          }) };
        }
        
        const result = await redditRequest(endpoint, { limit, depth });
        
        // Reddit returns an array: [post_data, comments_data]
        const postData = result[0]?.data?.children?.[0];
        const commentsData = result[1]?.data?.children || [];
        
        const post = postData ? formatPost(postData) : null;
        const comments = commentsData
          ?.map(c => formatComment(c, 0))
          ?.filter(Boolean) || [];

        return { content: JSON.stringify({ 
          post,
          comments,
          total_comments: comments.length,
        }) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, post_id: postId }), isError: true };
      }
    },

    analyze_subreddit: async (params) => {
      const subreddit = (params.subreddit || '').replace(/^r\//, '');

      if (!subreddit) {
        return { content: JSON.stringify({ error: 'Subreddit name required' }) };
      }

      try {
        // Get subreddit info
        const aboutResult = await redditRequest(`/r/${subreddit}/about`, {});
        const data = aboutResult.data || {};
        
        // Get recent hot posts for activity analysis
        const postsResult = await redditRequest(`/r/${subreddit}/hot`, { limit: 25 });
        const posts = postsResult.data?.children?.map(formatPost) || [];
        
        // Calculate activity metrics
        const totalScore = posts.reduce((sum, p) => sum + p.score, 0);
        const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
        const avgScore = posts.length > 0 ? Math.round(totalScore / posts.length) : 0;
        
        // Post frequency estimate (posts per day from recent 25)
        const oldestPost = posts[posts.length - 1];
        const newestPost = posts[0];
        let postsPerDay = 0;
        if (oldestPost && newestPost) {
          const hoursDiff = (new Date(newestPost.created_at) - new Date(oldestPost.created_at)) / (1000 * 60 * 60);
          postsPerDay = hoursDiff > 0 ? (posts.length / (hoursDiff / 24)).toFixed(1) : 0;
        }

        return { content: JSON.stringify({
          name: data.display_name,
          title: data.title,
          description: data.public_description,
          subscribers: data.subscribers || 0,
          active_users: data.accounts_active || 0,
          created_at: new Date(data.created_utc * 1000).toISOString(),
          over18: data.over18,
          type: data.subreddit_type,
          url: `https://reddit.com/r/${subreddit}`,
          icon: data.icon_img,
          banner: data.banner_img,
          
          activity: {
            posts_per_day: parseFloat(postsPerDay),
            avg_score: avgScore,
            avg_comments: posts.length > 0 ? Math.round(totalComments / posts.length) : 0,
            recent_posts_analyzed: posts.length,
          },
          
          top_recent_posts: posts.slice(0, 5).map(p => ({
            title: p.title.substring(0, 100) + (p.title.length > 100 ? '...' : ''),
            score: p.score,
            comments: p.comments,
            url: p.url,
          })),
        }) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, subreddit }), isError: true };
      }
    },

    get_user_profile: async (params) => {
      const username = (params.username || '').replace(/^u\//, '');

      if (!username) {
        return { content: JSON.stringify({ error: 'Username required' }) };
      }

      try {
        // Get user overview (posts + comments)
        const result = await redditRequest(`/user/${username}/overview`, { limit: 25 });
        
        const items = result.data?.children || [];
        const posts = items
          .filter(i => i.kind === 't3')
          .map(formatPost);
        const comments = items
          .filter(i => i.kind === 't1')
          .map(c => formatComment(c, 0))
          .filter(Boolean);
        
        // Calculate karma
        const totalKarma = items.reduce((sum, i) => sum + (i.data?.score || 0), 0);

        return { content: JSON.stringify({
          username,
          url: `https://reddit.com/u/${username}`,
          recent_activity: {
            posts: posts.length,
            comments: comments.length,
            total_karma_from_recent: totalKarma,
          },
          posts: posts.slice(0, 10),
          comments: comments.slice(0, 10),
        }) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, username }), isError: true };
      }
    },

    get_rate_limits: async () => {
      const { clientId } = getRedditCredentials(_config);
      
      return { content: JSON.stringify({
        credentials_configured: !!clientId,
        auth_type: 'OAuth 2.0 (Read-Only)',
        limits: {
          requests_per_minute: 30,
          requests_per_hour: 1000,
          note: 'Reddit OAuth 2.0 read-only limits. Higher limits available with user context auth.'
        },
        docs: 'https://www.reddit.com/dev/api/'
      }) };
    }
  }
};
