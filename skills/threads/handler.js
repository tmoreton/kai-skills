/**
 * Threads API Skill Handler v2 - Standalone MCP Compatible
 * 
 * Uses Meta Threads API for posting and retrieving content.
 * Requires THREADS_ACCESS_TOKEN and THREADS_USER_ID environment variables.
 */

import { createRequire } from "module";
import { setupCredentials, getCredential } from "../../lib/credentials.js";

function loadCrypto() {
  try {
    return require('crypto');
  } catch (e) {
    return crypto; // Native crypto module in modern Node
  }
}

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

// Helper to check for access token with helpful error message
function getAccessToken(config) {
  const token = getCredential('threads', 'THREADS_ACCESS_TOKEN', config);
  if (!token) {
    const error = new Error(`
Threads Access Token Required
=============================

To use Threads features, you need a Threads access token.

Get your token:
1. Go to: https://developers.facebook.com/apps
2. Create an app → Add "Threads API" product
3. Set up a Threads test user
4. Generate an access token with scopes:
   - threads_basic (read profile)
   - threads_content_publish (post threads)
   - threads_manage_insights (view insights)
5. Copy your access token

Set it via environment variable:
  export THREADS_ACCESS_TOKEN=your_token_here
  export THREADS_USER_ID=your_user_id_here

Or add to Claude Desktop config and restart.
`);
    error.code = 'MISSING_API_KEY';
    throw error;
  }
  return token;
}

async function threadsApiGet(endpoint, params, config) {
  const accessToken = getAccessToken(config);

  const queryParams = new URLSearchParams({ access_token: accessToken, ...params });
  const url = `${THREADS_API_BASE}${endpoint}?${queryParams}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Threads API error (${response.status}): ${err}`);
  }
  return response.json();
}

async function threadsApiPost(endpoint, data, config) {
  const accessToken = getAccessToken(config);

  const url = `${THREADS_API_BASE}${endpoint}`;
  const formData = new URLSearchParams({ access_token: accessToken, ...data });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Threads API error (${response.status}): ${err}`);
  }
  return response.json();
}

let _config = {};

export default {
  install: async (config) => {
    _config = config;
    // Get credential using priority order: env > config > stored
    const accessToken = getCredential('threads', 'THREADS_ACCESS_TOKEN', config);
    if (accessToken) {
      _config.access_token = accessToken;
    }
  },

  actions: {
    setup: async (params) => {
      try {
        const credentials = {};
        if (params.access_token) credentials.access_token = params.access_token;
        if (params.user_id) credentials.user_id = params.user_id;
        
        if (!credentials.access_token) {
          return { content: JSON.stringify({ error: 'access_token is required', success: false }) };
        }
        
        const result = setupCredentials('threads', credentials);
        
        // Also update current config
        if (credentials.access_token) _config.access_token = credentials.access_token;
        if (credentials.user_id) _config.user_id = credentials.user_id;
        
        return { content: JSON.stringify({ success: true, keys: result.keys }) };
      } catch (error) {
        return { content: JSON.stringify({ success: false, error: error.message }) };
      }
    },

    get_user_profile: async (params) => {
      const userId = params.user_id || getCredential('threads', 'THREADS_USER_ID', _config) || process.env.THREADS_USER_ID;
      const targetUsername = params.username;
      
      if (!userId) {
        return { content: JSON.stringify({ error: 'THREADS_USER_ID not configured or no user_id provided', fetched: false }) };
      }

      try {
        // Get user's own profile info
        const fields = 'id,username,name,threads_profile_picture_url,threads_biography';
        const result = await threadsApiGet(`/${userId}`, { fields }, _config);
        
        const profile = {
          user_id: result.id,
          username: result.username,
          name: result.name,
          profile_picture_url: result.threads_profile_picture_url,
          biography: result.threads_biography,
          url: result.username ? `https://threads.net/@${result.username}` : null
        };
        
        return { content: JSON.stringify({ profile, fetched: true }) };
      } catch (error) {
        return { content: JSON.stringify({ fetched: false, error: error.message }) };
      }
    },

    get_threads: async (params) => {
      const userId = params.user_id || getCredential('threads', 'THREADS_USER_ID', _config) || process.env.THREADS_USER_ID;
      const since = params.since;
      const until = params.until;
      const limit = params.limit || 25;
      
      if (!userId) {
        return { content: JSON.stringify({ error: 'THREADS_USER_ID not configured or no user_id provided', fetched: false }) };
      }

      try {
        const fields = 'id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,copyright_check_information,like_count,dislike_count,reply_audience,alt_text';
        const queryParams = { fields, limit };
        
        if (since) queryParams.since = since;
        if (until) queryParams.until = until;

        const result = await threadsApiGet(`/${userId}/threads`, queryParams, _config);
        
        const threads = result.data?.map(t => ({
          id: t.id,
          media_type: t.media_type,
          media_url: t.media_url,
          permalink: t.permalink,
          text: t.text,
          timestamp: t.timestamp,
          like_count: t.like_count || 0,
          dislike_count: t.dislike_count || 0,
          owner: t.username || t.owner
        })) || [];

        return { content: JSON.stringify({ 
          threads, 
          total: threads.length,
          paging: result.paging || null,
          fetched: true 
        })};
      } catch (error) {
        return { content: JSON.stringify({ fetched: false, error: error.message }) };
      }
    },

    post_thread: async (params) => {
      const userId = params.user_id || getCredential('threads', 'THREADS_USER_ID', _config) || process.env.THREADS_USER_ID;
      const text = params.text || '';
      const mediaType = params.media_type || 'TEXT'; // TEXT, IMAGE, VIDEO, CAROUSEL
      const imageUrl = params.image_url;
      const videoUrl = params.video_url;
      const replyToId = params.reply_to_id;
      const quotePostId = params.quote_post_id;
      
      if (!userId) {
        return { content: JSON.stringify({ error: 'THREADS_USER_ID not configured or no user_id provided', posted: false }) };
      }

      if (!text && mediaType === 'TEXT') {
        return { content: JSON.stringify({ error: 'Thread text required for text posts', posted: false }) };
      }

      const accessToken = getCredential('threads', 'THREADS_ACCESS_TOKEN', _config);
      if (!accessToken) {
        return { content: JSON.stringify({ error: 'THREADS_ACCESS_TOKEN not configured', posted: false, note: 'Add credentials to environment or config' }) };
      }

      try {
        // Step 1: Create the container
        const containerParams = {
          media_type: mediaType
        };
        
        if (text) containerParams.text = text;
        if (imageUrl) containerParams.image_url = imageUrl;
        if (videoUrl) containerParams.video_url = videoUrl;
        if (replyToId) containerParams.reply_to_id = replyToId;
        if (quotePostId) containerParams.quote_post_id = quotePostId;

        // Handle CAROUSEL media type
        if (mediaType === 'CAROUSEL' && params.children) {
          containerParams.children = params.children.join(',');
          containerParams.is_carousel_item = 'true';
        }

        const containerResult = await threadsApiPost(`/${userId}/threads`, containerParams, _config);
        const creationId = containerResult.id;

        if (!creationId) {
          throw new Error('Failed to create thread container');
        }

        // Step 2: Publish the thread
        const publishParams = { creation_id: creationId };
        const publishResult = await threadsApiPost(`/${userId}/threads_publish`, publishParams, _config);

        const response = { 
          posted: true, 
          id: publishResult.id,
          creation_id: creationId,
          url: `https://threads.net/t/${publishResult.id}`
        };
        
        return { content: JSON.stringify(response) };
      } catch (error) {
        return { content: JSON.stringify({ posted: false, error: error.message, text_preview: text ? text.substring(0, 50) : null }) };
      }
    },

    post_thread_carousel_item: async (params) => {
      const userId = params.user_id || getCredential('threads', 'THREADS_USER_ID', _config) || process.env.THREADS_USER_ID;
      const mediaType = params.media_type || 'IMAGE'; // IMAGE or VIDEO
      const imageUrl = params.image_url;
      const videoUrl = params.video_url;
      
      if (!userId) {
        return { content: JSON.stringify({ error: 'THREADS_USER_ID not configured', created: false }) };
      }

      if (!imageUrl && !videoUrl) {
        return { content: JSON.stringify({ error: 'image_url or video_url required', created: false }) };
      }

      try {
        const itemParams = {
          media_type: mediaType,
          is_carousel_item: 'true'
        };
        
        if (imageUrl) itemParams.image_url = imageUrl;
        if (videoUrl) itemParams.video_url = videoUrl;

        const result = await threadsApiPost(`/${userId}/threads`, itemParams, _config);
        
        return { content: JSON.stringify({ 
          created: true, 
          id: result.id,
          note: 'Use this ID in the children array when posting a carousel'
        })};
      } catch (error) {
        return { content: JSON.stringify({ created: false, error: error.message }) };
      }
    },

    get_thread_replies: async (params) => {
      const threadId = params.thread_id;
      const reverse = params.reverse || false;
      const limit = params.limit || 25;
      
      if (!threadId) {
        return { content: JSON.stringify({ error: 'thread_id is required', fetched: false }) };
      }

      try {
        const fields = 'id,from,username,text,timestamp,like_count,dislike_count';
        const queryParams = { fields, reverse: reverse.toString(), limit };

        const result = await threadsApiGet(`/${threadId}/replies`, queryParams, _config);
        
        const replies = result.data?.map(r => ({
          id: r.id,
          from: r.username || r.from,
          text: r.text,
          timestamp: r.timestamp,
          like_count: r.like_count || 0,
          dislike_count: r.dislike_count || 0
        })) || [];

        return { content: JSON.stringify({ 
          thread_id: threadId,
          replies, 
          total: replies.length,
          paging: result.paging || null,
          fetched: true 
        })};
      } catch (error) {
        return { content: JSON.stringify({ fetched: false, error: error.message }) };
      }
    },

    get_conversation: async (params) => {
      const threadId = params.thread_id;
      const fields = params.fields || 'id,from,username,text,timestamp,like_count,dislike_count,replies';
      
      if (!threadId) {
        return { content: JSON.stringify({ error: 'thread_id is required', fetched: false }) };
      }

      try {
        const queryParams = { fields };
        const result = await threadsApiGet(`/${threadId}/conversation`, queryParams, _config);
        
        return { content: JSON.stringify({ 
          thread_id: threadId,
          conversation: result,
          fetched: true 
        })};
      } catch (error) {
        return { content: JSON.stringify({ fetched: false, error: error.message }) };
      }
    },

    hide_reply: async (params) => {
      const replyId = params.reply_id;
      const hide = params.hide !== false; // default to true/hide
      
      if (!replyId) {
        return { content: JSON.stringify({ error: 'reply_id is required', hidden: false }) };
      }

      const accessToken = getCredential('threads', 'THREADS_ACCESS_TOKEN', _config);
      if (!accessToken) {
        return { content: JSON.stringify({ error: 'THREADS_ACCESS_TOKEN not configured', hidden: false }) };
      }

      try {
        const action = hide ? 'hide' : 'unhide';
        const result = await threadsApiPost(`/${replyId}/${action}`, {}, _config);
        
        return { content: JSON.stringify({ 
          hidden: hide,
          unhidden: !hide,
          reply_id: replyId,
          success: !!result.success
        })};
      } catch (error) {
        return { content: JSON.stringify({ hidden: false, error: error.message }) };
      }
    },

    get_insights: async (params) => {
      const threadId = params.thread_id;
      const metric = params.metric || 'views'; // views, likes, replies, reposts, quotes
      
      if (!threadId) {
        return { content: JSON.stringify({ error: 'thread_id is required', fetched: false }) };
      }

      try {
        const queryParams = { metric };
        const result = await threadsApiGet(`/${threadId}/insights`, queryParams, _config);
        
        return { content: JSON.stringify({ 
          thread_id: threadId,
          metric,
          insights: result,
          fetched: true 
        })};
      } catch (error) {
        return { content: JSON.stringify({ fetched: false, error: error.message }) };
      }
    },

    get_rate_limits: async () => {
      const accessToken = getCredential('threads', 'THREADS_ACCESS_TOKEN', _config);
      const userId = getCredential('threads', 'THREADS_USER_ID', _config);
      const result = {
        credentials_configured: !!accessToken,
        user_id_configured: !!userId,
        tier: accessToken ? 'Standard' : 'Not configured',
        note: 'Rate limits vary by endpoint. Refer to https://developers.facebook.com/docs/threads/references/rate-limiting',
        endpoints: {
          'GET /me': '200 calls/user/hour',
          'POST /threads': '250 posts/24h per user',
          'GET /threads': '1000 calls/user/hour',
          'GET /replies': '1000 calls/user/hour'
        }
      };
      return { content: JSON.stringify(result) };
    }
  }
};
