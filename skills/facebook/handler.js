/**
 * Facebook Pages API Skill Handler
 * 
 * Uses Facebook Graph API to manage Facebook Pages.
 * Requires: FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID
 */

import { createRequire } from "module";
import { setupCredentials, getCredential } from '../../lib/credentials.js';

const FB_API_VERSION = 'v18.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

function getCredentials(config) {
  const accessToken = getCredential('facebook', 'FACEBOOK_ACCESS_TOKEN', config);
  const pageId = getCredential('facebook', 'FACEBOOK_PAGE_ID', config);
  
  if (!accessToken) {
    const error = new Error(`
Facebook Access Token Required
==============================

To use Facebook features, you need a Facebook Page access token.

Get your token:
1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your Facebook app (or create one)
3. Select "User Access Token" with these permissions:
   - pages_read_engagement
   - pages_manage_posts
   - pages_read_user_content
4. Copy the token

Set it via environment variable:
  export FACEBOOK_ACCESS_TOKEN=your_token_here
  export FACEBOOK_PAGE_ID=your_page_id_here

Or add to Claude Desktop config and restart.
`);
    error.code = 'MISSING_API_KEY';
    throw error;
  }
  if (!pageId) {
    const error = new Error(`
Facebook Page ID Required
========================

You need to specify which Facebook Page to work with.

Find your Page ID:
1. Go to your Facebook Page
2. Click "Settings" → "Page Info"
3. Copy the "Page ID" value

Set it via environment variable:
  export FACEBOOK_PAGE_ID=your_page_id_here

Or add to Claude Desktop config and restart.
`);
    error.code = 'MISSING_PAGE_ID';
    throw error;
  }
  
  return { accessToken, pageId };
}

async function fbApiRequest(endpoint, method = 'GET', data = null, config = {}) {
  const { accessToken } = getCredentials(config);
  const url = `${FB_API_BASE}${endpoint}`;
  
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  let fullUrl = url;
  if (method === 'GET') {
    const params = new URLSearchParams({ access_token: accessToken });
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        params.append(key, value);
      });
    }
    fullUrl = `${url}?${params.toString()}`;
  } else {
    options.body = JSON.stringify({ ...data, access_token: accessToken });
  }
  
  const response = await fetch(fullUrl, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Facebook API error (${response.status}): ${errorData.error?.message || response.statusText}`);
  }
  
  return response.json();
}

let _config = {};

export default {
  install: async (config) => {
    _config = config;
    // Load stored credentials using getCredential
    const accessToken = getCredential('facebook', 'FACEBOOK_ACCESS_TOKEN', config);
    const pageId = getCredential('facebook', 'FACEBOOK_PAGE_ID', config);
    
    if (accessToken) _config.FACEBOOK_ACCESS_TOKEN = accessToken;
    if (pageId) _config.FACEBOOK_PAGE_ID = pageId;
  },

  actions: {
    // Setup action to store FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID
    setup: async (params) => {
      const accessToken = params.access_token || params.token;
      const pageId = params.page_id || params.pageId;
      
      if (!accessToken) {
        return {
          content: JSON.stringify({
            success: false,
            error: 'access_token is required. Provide your Facebook Page access token.',
            help: 'Get your token at: https://developers.facebook.com/tools/explorer/'
          })
        };
      }

      if (!pageId) {
        return {
          content: JSON.stringify({
            success: false,
            error: 'page_id is required. Provide your Facebook Page ID.',
            help: 'Find your Page ID in Facebook Page Settings → Page Info'
          })
        };
      }

      const credentials = { 
        FACEBOOK_ACCESS_TOKEN: accessToken,
        FACEBOOK_PAGE_ID: pageId
      };
      
      const result = setupCredentials('facebook', credentials);
      
      // Update in-memory config
      _config.FACEBOOK_ACCESS_TOKEN = accessToken;
      _config.FACEBOOK_PAGE_ID = pageId;
      
      // Also set in environment for immediate use
      process.env.FACEBOOK_ACCESS_TOKEN = accessToken;
      process.env.FACEBOOK_PAGE_ID = pageId;

      return {
        content: JSON.stringify({
          success: true,
          message: 'Facebook credentials saved securely',
          keys: result.keys
        })
      };
    },

    get_page_info: async (params) => {
      try {
        const { pageId } = getCredentials(_config);
        const fields = params.fields || 'name,id,category,fan_count,followers_count,link,about,description,username,verification_status,picture,phone,website';
        
        const result = await fbApiRequest(`/${pageId}`, 'GET', { fields }, _config);
        
        return { content: JSON.stringify(result) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, success: false }) };
      }
    },

    get_page_posts: async (params) => {
      try {
        const { pageId } = getCredentials(_config);
        const limit = params.limit || 10;
        const fields = params.fields || 'id,message,created_time,updated_time,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true),attachments';
        
        const result = await fbApiRequest(`/${pageId}/posts`, 'GET', { limit, fields }, _config);
        
        const posts = result.data?.map(post => ({
          id: post.id,
          message: post.message,
          created_time: post.created_time,
          permalink_url: post.permalink_url,
          likes: post.likes?.summary?.total_count || 0,
          comments: post.comments?.summary?.total_count || 0,
          reactions: post.reactions?.summary?.total_count || 0,
          shares: post.shares?.count || 0,
          attachments: post.attachments?.data
        })) || [];
        
        return { content: JSON.stringify({ posts, total: posts.length, page_id: pageId }) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, success: false }) };
      }
    },

    get_page_insights: async (params) => {
      try {
        const { pageId } = getCredentials(_config);
        const metrics = params.metrics || 'page_impressions,page_impressions_unique,page_engaged_users,page_fan_adds,page_fans,page_reactions_total,page_posts_impressions';
        const period = params.period || 'week'; // day, week, days_28
        const since = params.since;
        const until = params.until;
        
        const queryParams = { metric: metrics, period };
        if (since) queryParams.since = since;
        if (until) queryParams.until = until;
        
        const result = await fbApiRequest(`/${pageId}/insights`, 'GET', queryParams, _config);
        
        const insights = result.data?.map(insight => ({
          name: insight.name,
          description: insight.description,
          period: insight.period,
          values: insight.values,
          title: insight.title
        })) || [];
        
        return { content: JSON.stringify({ insights, page_id: pageId, period }) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, success: false }) };
      }
    },

    post_to_page: async (params) => {
      try {
        const { pageId } = getCredentials(_config);
        const message = params.message || params.text || '';
        const link = params.link || params.url || null;
        const published = params.published !== false; // default true
        const scheduled_publish_time = params.scheduled_publish_time || null;
        
        if (!message && !link) {
          return { content: JSON.stringify({ error: 'Message or link required', posted: false }) };
        }
        
        const postData = {};
        if (message) postData.message = message;
        if (link) postData.link = link;
        if (!published && scheduled_publish_time) {
          postData.published = false;
          postData.scheduled_publish_time = scheduled_publish_time;
        }
        
        const result = await fbApiRequest(`/${pageId}/feed`, 'POST', postData, _config);
        
        return { content: JSON.stringify({ 
          posted: true, 
          id: result.id, 
          post_id: result.post_id || result.id,
          permalink_url: `https://facebook.com/${result.id}` 
        })};
      } catch (error) {
        return { content: JSON.stringify({ posted: false, error: error.message }) };
      }
    }
  }
};
