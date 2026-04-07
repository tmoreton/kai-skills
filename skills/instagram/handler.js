/**
 * Instagram API Skill Handler v1 - Standalone MCP Compatible
 * 
 * Uses Instagram Basic Display API and Instagram Graph API for retrieving
 * user info, media posts, hashtag searches, and media insights.
 */

import { createRequire } from "module";
import { getCredential, setupCredentials, hasCredentials } from '../lib/credentials.js';

// Dynamic requires for optional dependencies
function loadInstagramAPI() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require('instagram-private-api') || null;
  } catch (e) {
    return null;
  }
}

const INSTAGRAM_GRAPH_API_BASE = 'https://graph.instagram.com';
const INSTAGRAM_BASIC_API_BASE = 'https://graph.instagram.com';

// Helper to get access token using getCredential pattern
function getAccessToken(config) {
  const token = getCredential('instagram', 'INSTAGRAM_ACCESS_TOKEN', config);
  if (!token) {
    const error = new Error(`
Instagram Access Token Required
===============================

To use Instagram features, you need an Instagram access token.

Option 1: Instagram Basic Display API (for public content)
1. Go to: https://developers.facebook.com/apps
2. Create an app → Select "Other" → "Consumer"
3. Add "Instagram Basic Display" product
4. Add a test user and generate a token

Option 2: Instagram Graph API (for business accounts)
1. Your Instagram must be a Business/Creator account
2. Connect to a Facebook Page
3. Use Facebook Graph API Explorer to generate token

Set your token:
  export INSTAGRAM_ACCESS_TOKEN=your_token_here

Or add to Claude Desktop config and restart.
`);
    error.code = 'MISSING_API_KEY';
    throw error;
  }
  return token;
}

// Helper to get Graph API app credentials
function getAppCredentials(config) {
  return {
    appId: config.app_id || process.env.INSTAGRAM_APP_ID,
    appSecret: config.app_secret || process.env.INSTAGRAM_APP_SECRET
  };
}

async function makeGraphRequest(endpoint, token, params = {}) {
  const url = new URL(`${INSTAGRAM_GRAPH_API_BASE}${endpoint}`);
  url.searchParams.append('access_token', token);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Instagram API error (${response.status}): ${err}`);
  }
  
  return response.json();
}

// Extract shortcode from Instagram URL
function extractShortcode(url) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Extract username from Instagram URL
function extractUsername(url) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)(?:\/|\?|$)/);
  return match ? match[1] : null;
}

let _config = {};

export default {
  install: async (config) => {
    _config = config;
    // Load credentials using getCredential pattern
    const accessToken = getCredential('instagram', 'INSTAGRAM_ACCESS_TOKEN', config);
    if (accessToken) {
      _config.access_token = accessToken;
    }
  },

  actions: {
    // Setup action to store access_token
    setup: async (params) => {
      let accessToken = params.access_token || params.token;
      
      // Check for existing credential if not provided
      if (!accessToken) {
        accessToken = getCredential('instagram', 'INSTAGRAM_ACCESS_TOKEN', _config);
      }
      
      if (!accessToken) {
        return {
          content: JSON.stringify({
            success: false,
            error: 'access_token is required. Provide your Instagram access token.',
            help: 'Get your token at: https://developers.facebook.com/apps (Instagram Basic Display product)'
          })
        };
      }

      const result = setupCredentials('instagram', { access_token: accessToken });
      
      // Update in-memory config
      _config.access_token = accessToken;
      
      // Also set in environment for immediate use
      process.env.INSTAGRAM_ACCESS_TOKEN = accessToken;

      return {
        content: JSON.stringify({
          success: true,
          message: 'Instagram credentials saved securely',
          keys: result.keys
        })
      };
    },

    get_user_info: async (params) => {
      const username = params.username || extractUsername(params.url);
      
      if (!username) {
        return { content: JSON.stringify({ error: 'Username or URL required' }) };
      }

      const accessToken = getAccessToken(_config);
      
      try {
        // If we have a user_id, use Graph API
        if (params.user_id && accessToken) {
          const data = await makeGraphRequest(`/${params.user_id}`, accessToken, {
            fields: 'id,username,account_type,media_count,biography,followers_count,follows_count,profile_picture_url,name,website'
          });
          
          return { content: JSON.stringify({
            username: data.username,
            user_id: data.id,
            account_type: data.account_type,
            media_count: data.media_count,
            followers_count: data.followers_count,
            follows_count: data.follows_count,
            name: data.name,
            biography: data.biography,
            profile_picture_url: data.profile_picture_url,
            website: data.website,
            source: 'graph_api'
          })};
        }
        
        // Fallback: return stub with available info
        return { content: JSON.stringify({
          username: username.replace(/^@/, ''),
          profile_url: `https://instagram.com/${username.replace(/^@/, '')}`,
          note: 'Full profile data requires Graph API access token with instagram_graph_user_profile permission',
          source: 'url_extraction'
        })};
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, username }) };
      }
    },

    get_user_posts: async (params) => {
      const username = params.username || extractUsername(params.url);
      const userId = params.user_id;
      const maxResults = params.limit || params.max_results || 20;
      const accessToken = getAccessToken(_config);
      
      try {
        // Use Graph API if we have user_id and token
        if (userId && accessToken) {
          const data = await makeGraphRequest(`/${userId}/media`, accessToken, {
            fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
            limit: maxResults
          });
          
          const posts = data.data?.map(post => ({
            id: post.id,
            shortcode: extractShortcode(post.permalink) || post.id,
            caption: post.caption,
            media_type: post.media_type, // IMAGE, VIDEO, CAROUSEL_ALBUM
            media_url: post.media_url,
            permalink: post.permalink,
            timestamp: post.timestamp,
            like_count: post.like_count,
            comments_count: post.comments_count
          })) || [];
          
          return { content: JSON.stringify({
            username: username,
            user_id: userId,
            posts: posts,
            total_returned: posts.length,
            has_more: !!data.paging?.next,
            source: 'graph_api'
          })};
        }
        
        // Fallback: return structure without data
        return { content: JSON.stringify({
          username: username ? username.replace(/^@/, '') : null,
          posts: [],
          note: 'Post data requires Graph API access token. Provide user_id from a connected Instagram account.',
          source: 'stub'
        })};
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, username }) };
      }
    },

    search_hashtags: async (params) => {
      const hashtag = params.hashtag || params.query;
      const maxResults = params.limit || params.max_results || 25;
      const accessToken = getAccessToken(_config);
      const { appId } = getAppCredentials(_config);
      
      if (!hashtag) {
        return { content: JSON.stringify({ error: 'Hashtag or query required' }) };
      }
      
      const cleanTag = hashtag.replace(/^#/, '').toLowerCase();
      
      try {
        // Instagram Graph API for hashtags (requires Business/Creator account)
        if (accessToken && appId) {
          // First, get hashtag ID
          const hashtagSearch = await makeGraphRequest('/ig_hashtag_search', accessToken, {
            q: cleanTag,
            user_id: params.user_id // Business account user ID required
          });
          
          if (!hashtagSearch.data?.[0]?.id) {
            return { content: JSON.stringify({ hashtag: cleanTag, media: [], note: 'Hashtag not found' }) };
          }
          
          const hashtagId = hashtagSearch.data[0].id;
          
          // Get recent media for hashtag
          const media = await makeGraphRequest(`/${hashtagId}/recent_media`, accessToken, {
            user_id: params.user_id,
            fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,children{media_url}',
            limit: maxResults
          });
          
          const posts = media.data?.map(post => ({
            id: post.id,
            shortcode: extractShortcode(post.permalink),
            caption: post.caption,
            media_type: post.media_type,
            media_url: post.media_url,
            permalink: post.permalink,
            timestamp: post.timestamp,
            like_count: post.like_count,
            comments_count: post.comments_count
          })) || [];
          
          return { content: JSON.stringify({
            hashtag: cleanTag,
            hashtag_id: hashtagId,
            media_count: posts.length,
            media: posts,
            has_more: !!media.paging?.next,
            source: 'graph_api'
          })};
        }
        
        // Fallback: return hashtag info without media
        return { content: JSON.stringify({
          hashtag: cleanTag,
          search_url: `https://www.instagram.com/explore/tags/${cleanTag}/`,
          note: 'Hashtag search requires Instagram Business/Creator account with Graph API access',
          media: [],
          source: 'stub'
        })};
      } catch (error) {
        return { content: JSON.stringify({ 
          error: error.message, 
          hashtag: cleanTag,
          note: 'Hashtag API requires Business/Creator account. Error: ' + error.message 
        })};
      }
    },

    get_media_stats: async (params) => {
      const mediaId = params.media_id;
      const shortcode = params.shortcode || extractShortcode(params.url);
      const accessToken = getAccessToken(_config);
      
      if (!mediaId && !shortcode) {
        return { content: JSON.stringify({ error: 'media_id, shortcode, or Instagram URL required' }) };
      }
      
      try {
        // Use Graph API if we have media_id and token
        if (mediaId && accessToken) {
          const data = await makeGraphRequest(`/${mediaId}`, accessToken, {
            fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions,reach,engagement)'
          });
          
          const result = {
            media_id: data.id,
            shortcode: extractShortcode(data.permalink),
            caption: data.caption,
            media_type: data.media_type,
            media_url: data.media_url,
            permalink: data.permalink,
            timestamp: data.timestamp,
            engagement: {
              likes: data.like_count,
              comments: data.comments_count
            },
            insights: data.insights?.data?.reduce((acc, insight) => {
              acc[insight.name] = insight.values[0]?.value;
              return acc;
            }, {}) || {},
            source: 'graph_api'
          };
          
          return { content: JSON.stringify(result) };
        }
        
        // Fallback for shortcode/URL only
        if (shortcode) {
          return { content: JSON.stringify({
            shortcode: shortcode,
            post_url: `https://instagram.com/p/${shortcode}`,
            note: 'Full media stats require Graph API access token with instagram_graph_user_media permission',
            source: 'url_extraction'
          })};
        }
        
        return { content: JSON.stringify({ 
          media_id: mediaId,
          note: 'Media stats require valid Graph API access token',
          source: 'stub'
        })};
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, media_id: mediaId, shortcode }) };
      }
    },

    // Additional utility action for getting account insights
    get_account_insights: async (params) => {
      const userId = params.user_id;
      const accessToken = getAccessToken(_config);
      const metrics = params.metrics || 'impressions,reach,profile_views,follower_count';
      
      if (!userId || !accessToken) {
        return { content: JSON.stringify({ 
          error: 'user_id and access_token required',
          note: 'Account insights require Instagram Business/Creator account with Graph API'
        })};
      }
      
      try {
        const period = params.period || 'day'; // day, week, month
        const since = params.since;
        const until = params.until;
        
        const queryParams = {
          metric: metrics,
          period: period,
          access_token: accessToken
        };
        
        if (since) queryParams.since = since;
        if (until) queryParams.until = until;
        
        const data = await makeGraphRequest(`/${userId}/insights`, accessToken, queryParams);
        
        const insights = data.data?.map(insight => ({
          name: insight.name,
          period: insight.period,
          values: insight.values,
          title: insight.title,
          description: insight.description
        })) || [];
        
        return { content: JSON.stringify({
          user_id: userId,
          period: period,
          date_range: { since, until },
          insights: insights,
          source: 'graph_api'
        })};
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, user_id: userId }) };
      }
    }
  }
};
