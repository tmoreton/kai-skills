/**
 * TikTok API Skill Handler v1 - Standalone MCP Compatible
 * 
 * Research tools use web search via Tavily API (TAVILY_API_KEY required).
 * Direct API access uses TikTok Research API or Display API when available.
 */

import { createRequire } from "module";
import { injectCredentials, setupCredentials } from '../lib/credentials.js';

const DEFAULT_MAX_RESULTS = 20;
const TIKTOK_API_BASE = 'https://open-api.tiktok.com';
const TIKTOK_RESEARCH_BASE = 'https://research.tiktok.com/v1';

async function webSearch(query, maxResults) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    const error = new Error(`
Tavily API Key Required
=======================

To search TikTok content, you need a Tavily API key for web search.

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

function extractUsername(url) {
  if (!url) return null;
  const match = url.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)(?:\?|$|\/)/);
  if (match) return match[1];
  // Also try to extract from /video/ URLs
  const match2 = url.match(/tiktok\.com\/.*\/video\/\d+/);
  if (match2) {
    // Try to extract from the URL path
    const pathMatch = url.match(/tiktok\.com\/([^\/]+)\//);
    return pathMatch ? pathMatch[1].replace('@', '') : null;
  }
  return null;
}

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/tiktok\.com\/.*\/video\/(\d+)/);
  return match ? match[1] : null;
}

function parseVideoFromSearchResult(result) {
  const videoId = extractVideoId(result.url);
  const username = extractUsername(result.url);
  
  return {
    id: videoId,
    url: result.url,
    title: result.title,
    description: result.content?.substring(0, 200),
    author: username || 'Unknown',
    thumbnail_url: null, // Would need page scraping or API
    published_at: result.published_date,
    views: null, // Not available from search
    likes: null,
    comments: null,
    shares: null
  };
}

let _config = {};

export default {
  install: async (config) => {
    _config = config;
    
    // Inject stored TikTok credentials (including access_token) into process.env
    injectCredentials('tiktok');
  },

  actions: {
    setup: async (params) => {
      const credentials = {};
      
      // Store access_token if provided
      if (params.access_token) {
        credentials.access_token = params.access_token;
      }
      
      // Store other optional credentials
      if (params.research_api_key) {
        credentials.research_api_key = params.research_api_key;
      }
      
      if (Object.keys(credentials).length === 0) {
        return { content: JSON.stringify({ error: 'No credentials provided. Required: access_token' }) };
      }
      
      const result = setupCredentials('tiktok', credentials);
      
      // Also inject immediately for this session
      injectCredentials('tiktok');
      
      return { content: JSON.stringify(result) };
    },

    get_user_info: async (params) => {
      const username = (params.username || '').replace(/^@/, '');
      if (!username) {
        return { content: JSON.stringify({ error: 'Username is required' }) };
      }

      // Try TikTok Research API if configured
      const researchApiKey = _config.research_api_key || process.env.TIKTOK_RESEARCH_API_KEY;
      
      if (researchApiKey) {
        try {
          const response = await fetch(`${TIKTOK_RESEARCH_BASE}/users/info/`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${researchApiKey}`
            },
            body: JSON.stringify({ username })
          });
          
          if (response.ok) {
            const data = await response.json();
            return { content: JSON.stringify({
              username: data.data?.username || username,
              display_name: data.data?.display_name,
              bio: data.data?.bio,
              followers_count: data.data?.follower_count,
              following_count: data.data?.following_count,
              likes_count: data.data?.total_like_count,
              video_count: data.data?.video_count,
              profile_url: `https://www.tiktok.com/@${username}`,
              avatar_url: data.data?.avatar_url,
              verified: data.data?.is_verified,
              source: 'tiktok_research_api'
            })};
          }
        } catch (e) {
          // Fall back to web search
        }
      }

      // Fallback: Web search
      try {
        const result = await webSearch(`@${username} tiktok profile`, 5);
        const profile = result.results?.find(r => r.url?.includes('tiktok.com/@')) || result.results?.[0];
        
        const userInfo = {
          username,
          profile_url: `https://www.tiktok.com/@${username}`,
          display_name: profile?.title?.split('|')[0]?.trim() || username,
          bio: profile?.content?.substring(0, 300),
          followers_count: null,
          following_count: null,
          likes_count: null,
          video_count: null,
          verified: null,
          source: 'web_search',
          note: 'For accurate stats, configure TIKTOK_RESEARCH_API_KEY'
        };
        
        return { content: JSON.stringify(userInfo) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, username }) };
      }
    },

    get_user_videos: async (params) => {
      const username = (params.username || '').replace(/^@/, '');
      const maxResults = params.max_results || DEFAULT_MAX_RESULTS;
      
      if (!username) {
        return { content: JSON.stringify({ error: 'Username is required' }) };
      }

      // Try TikTok Research API if configured
      const researchApiKey = _config.research_api_key || process.env.TIKTOK_RESEARCH_API_KEY;
      
      if (researchApiKey) {
        try {
          const response = await fetch(`${TIKTOK_RESEARCH_BASE}/videos/user/`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${researchApiKey}`
            },
            body: JSON.stringify({ 
              username,
              max_count: maxResults
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            const videos = data.data?.videos?.map(v => ({
              id: v.id,
              url: v.share_url || `https://www.tiktok.com/@${username}/video/${v.id}`,
              caption: v.title,
              created_at: v.create_time,
              views: v.view_count,
              likes: v.like_count,
              comments: v.comment_count,
              shares: v.share_count,
              duration: v.duration,
              thumbnail_url: v.cover_image_url
            })) || [];
            
            return { content: JSON.stringify({
              username,
              videos,
              total: videos.length,
              source: 'tiktok_research_api'
            })};
          }
        } catch (e) {
          // Fall back to web search
        }
      }

      // Fallback: Web search
      try {
        const result = await webSearch(`@${username} tiktok video`, maxResults);
        const videos = result.results
          ?.filter(r => r.url?.includes('tiktok.com') && extractVideoId(r.url))
          ?.map(parseVideoFromSearchResult)
          ?.slice(0, maxResults) || [];
        
        return { content: JSON.stringify({
          username,
          videos,
          total: videos.length,
          source: 'web_search',
          note: 'For accurate stats and more videos, configure TIKTOK_RESEARCH_API_KEY'
        })};
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, username }) };
      }
    },

    get_video_stats: async (params) => {
      const videoUrl = params.video_url;
      const videoId = params.video_id || extractVideoId(videoUrl);
      
      if (!videoId && !videoUrl) {
        return { content: JSON.stringify({ error: 'video_url or video_id is required' }) };
      }

      // Try TikTok Research API if configured
      const researchApiKey = _config.research_api_key || process.env.TIKTOK_RESEARCH_API_KEY;
      
      if (researchApiKey) {
        try {
          const response = await fetch(`${TIKTOK_RESEARCH_BASE}/videos/info/`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${researchApiKey}`
            },
            body: JSON.stringify({ video_id: videoId })
          });
          
          if (response.ok) {
            const data = await response.json();
            const video = data.data;
            
            return { content: JSON.stringify({
              id: videoId,
              url: video?.share_url || videoUrl || `https://www.tiktok.com/video/${videoId}`,
              caption: video?.title,
              created_at: video?.create_time,
              author: video?.username,
              views: video?.view_count,
              likes: video?.like_count,
              comments: video?.comment_count,
              shares: video?.share_count,
              duration: video?.duration,
              thumbnail_url: video?.cover_image_url,
              hashtags: video?.hashtags,
              source: 'tiktok_research_api'
            })};
          }
        } catch (e) {
          // Fall back to web search
        }
      }

      // Fallback: Web search
      try {
        const url = videoUrl || `https://www.tiktok.com/video/${videoId}`;
        const result = await webSearch(url, 5);
        const videoInfo = result.results?.[0];
        
        const stats = {
          id: videoId,
          url: url,
          caption: videoInfo?.title,
          description: videoInfo?.content?.substring(0, 300),
          views: null,
          likes: null,
          comments: null,
          shares: null,
          source: 'web_search',
          note: 'For accurate stats, configure TIKTOK_RESEARCH_API_KEY'
        };
        
        return { content: JSON.stringify(stats) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, video_id: videoId }) };
      }
    },

    search_videos: async (params) => {
      const query = params.query || '';
      const maxResults = params.max_results || DEFAULT_MAX_RESULTS;
      const hashtag = params.hashtag;
      
      if (!query && !hashtag) {
        return { content: JSON.stringify({ error: 'query or hashtag is required' }) };
      }

      // Try TikTok Research API if configured
      const researchApiKey = _config.research_api_key || process.env.TIKTOK_RESEARCH_API_KEY;
      
      if (researchApiKey) {
        try {
          const searchQuery = hashtag ? `#${hashtag}` : query;
          const response = await fetch(`${TIKTOK_RESEARCH_BASE}/videos/search/`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${researchApiKey}`
            },
            body: JSON.stringify({ 
              query: searchQuery,
              max_count: maxResults,
              search_id: `search_${Date.now()}`
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            const videos = data.data?.videos?.map(v => ({
              id: v.id,
              url: v.share_url || `https://www.tiktok.com/@${v.username}/video/${v.id}`,
              caption: v.title,
              author: v.username,
              created_at: v.create_time,
              views: v.view_count,
              likes: v.like_count,
              comments: v.comment_count,
              shares: v.share_count,
              duration: v.duration,
              thumbnail_url: v.cover_image_url,
              hashtags: v.hashtags
            })) || [];
            
            return { content: JSON.stringify({
              query,
              hashtag,
              videos,
              total: videos.length,
              source: 'tiktok_research_api'
            })};
          }
        } catch (e) {
          // Fall back to web search
        }
      }

      // Fallback: Web search
      try {
        const searchTerms = [
          hashtag ? `#${hashtag} tiktok` : `${query} tiktok video`,
          hashtag ? `${hashtag} tiktok` : `${query} tiktok`
        ];
        
        const allVideos = [];
        for (const searchQuery of searchTerms) {
          try {
            const result = await webSearch(searchQuery, Math.ceil(maxResults / 2));
            if (result?.results) {
              for (const r of result.results) {
                const videoId = extractVideoId(r.url);
                if (videoId && !allVideos.some(v => v.id === videoId)) {
                  allVideos.push(parseVideoFromSearchResult(r));
                }
              }
            }
          } catch (e) {
            // Continue with next query
          }
        }

        const unique = allVideos.slice(0, maxResults);
        
        return { content: JSON.stringify({
          query,
          hashtag,
          videos: unique,
          total: unique.length,
          source: 'web_search',
          note: 'For accurate stats and more results, configure TIKTOK_RESEARCH_API_KEY'
        })};
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, query }) };
      }
    }
  }
};
