/**
 * Facebook Pages API Skill Handler
 * 
 * Uses Facebook Graph API to manage Facebook Pages.
 * Requires: FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID
 */

import { createRequire } from "module";

const FB_API_VERSION = 'v18.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

function getCredentials(config) {
  const accessToken = config.access_token || process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = config.page_id || process.env.FACEBOOK_PAGE_ID;
  
  if (!accessToken) {
    throw new Error('FACEBOOK_ACCESS_TOKEN not configured. Get one from developers.facebook.com/tools/explorer/');
  }
  if (!pageId) {
    throw new Error('FACEBOOK_PAGE_ID not configured. Find it in your page settings.');
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
  },

  actions: {
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
