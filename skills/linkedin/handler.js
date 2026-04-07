/**
 * LinkedIn API Skill Handler - Standalone MCP Compatible
 * 
 * Uses LinkedIn API v2 with OAuth 2.0 authentication.
 * Required: LINKEDIN_ACCESS_TOKEN with appropriate scopes
 *   - r_basicprofile: read profile info
 *   - w_member_social: create posts
 *   - r_organization_social: read org posts (for stats)
 */

import { createRequire } from "module";
import { setupCredentials, getCredential } from '../../lib/credentials.js';

// Dynamic require for optional dependencies
function loadDependency(name) {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require(name);
  } catch (e) {
    throw new Error(`${name} not installed. Run: npm install ${name}`);
  }
}

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

// Get access token from config or environment using getCredential
function getAccessToken(config) {
  const token = getCredential('linkedin', 'LINKEDIN_ACCESS_TOKEN', config);
  if (!token) {
    const error = new Error(`
LinkedIn Access Token Required
==============================

To use LinkedIn features, you need a LinkedIn access token with appropriate scopes.

Required scopes:
  - r_basicprofile (read profile info)
  - w_member_social (create posts)
  - r_organization_social (read org posts for stats)

Get your token:
1. Go to: https://www.linkedin.com/developers/apps
2. Create an app or select existing
3. Request access to "Share on LinkedIn" and "Advertising API"
4. Generate an access token with the scopes above

Set it via environment variable:
  export LINKEDIN_ACCESS_TOKEN=your_token_here

Or add to Claude Desktop config and restart.
`);
    error.code = 'MISSING_API_KEY';
    throw error;
  }
  return token;
}

// LinkedIn API request helper
async function linkedInApi(endpoint, method = 'GET', data = null, config = {}) {
  const token = getAccessToken(config);

  const url = `${LINKEDIN_API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json'
    }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LinkedIn API error (${response.status}): ${err}`);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {};
  }

  return response.json();
}

// Get current user's LinkedIn URN (required for posting)
async function getPersonUrn(config) {
  const profile = await linkedInApi('/me?projection=(id)', 'GET', null, config);
  return `urn:li:person:${profile.id}`;
}

// Web search helper for people search when API not available
async function webSearchPeople(query, maxResults = 10) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not set. Web search requires Tavily API key.');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: `${query} site:linkedin.com/in/`,
      max_results: maxResults,
      search_depth: 'basic',
      include_answer: false
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tavily API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.results || [];
}

let _config = {};

export default {
  install: async (config) => {
    _config = config;
    // Check for stored credentials using getCredential
    const token = getCredential('linkedin', 'LINKEDIN_ACCESS_TOKEN', config);
    if (token) {
      process.env.LINKEDIN_ACCESS_TOKEN = token;
    }
  },

  actions: {
    // Setup action to store LinkedIn credentials
    setup: async (params) => {
      const accessToken = params.access_token || params.token || params.LINKEDIN_ACCESS_TOKEN;
      if (!accessToken) {
        return {
          content: JSON.stringify({
            success: false,
            error: 'LINKEDIN_ACCESS_TOKEN is required. Provide your LinkedIn access token.',
            help: 'Get your token at: https://www.linkedin.com/developers/apps'
          })
        };
      }

      const result = await setupCredentials('linkedin', {
        LINKEDIN_ACCESS_TOKEN: accessToken
      });
      
      // Set in environment for immediate use
      process.env.LINKEDIN_ACCESS_TOKEN = accessToken;

      return {
        content: JSON.stringify({
          success: result.success,
          message: 'LinkedIn credentials saved securely',
          keys: result.keys
        })
      };
    },
    // Get profile info for the authenticated user or a specific user
    get_profile_info: async (params) => {
      const token = getAccessToken(_config);
      
      if (!token) {
        return { 
          content: JSON.stringify({ 
            error: 'LINKEDIN_ACCESS_TOKEN not configured',
            note: 'Set LINKEDIN_ACCESS_TOKEN to access LinkedIn API'
          }) 
        };
      }

      try {
        let endpoint;
        
        if (params.person_id) {
          // Get specific user's profile
          endpoint = `/people/(id:${params.person_id})?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline,summary,location,positions,publicProfileUrl)`;
        } else if (params.linkedin_url) {
          // Extract person ID from URL and fetch
          const match = params.linkedin_url.match(/\/in\/([^\/\?]+)/);
          if (match) {
            endpoint = `/people/${match[1]}?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline,summary,location,positions,publicProfileUrl)`;
          } else {
            throw new Error('Invalid LinkedIn profile URL');
          }
        } else {
          // Get current authenticated user's profile
          endpoint = '/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline,summary,location,positions,publicProfileUrl)';
        }

        const profile = await linkedInApi(endpoint, 'GET', null, _config);
        
        // Format profile data
        const result = {
          id: profile.id,
          first_name: profile.firstName?.localized?.en_US || profile.firstName?.localized?.['en-US'] || '',
          last_name: profile.lastName?.localized?.en_US || profile.lastName?.localized?.['en-US'] || '',
          headline: profile.headline?.localized?.en_US || profile.headline?.localized?.['en-US'] || '',
          summary: profile.summary?.localized?.en_US || profile.summary?.localized?.['en-US'] || '',
          location: profile.location?.name?.localized?.en_US || profile.location?.name?.localized?.['en-US'] || '',
          profile_url: profile.publicProfileUrl || `https://www.linkedin.com/in/${profile.id}`,
          positions: profile.positions?.elements?.map(pos => ({
            title: pos.title?.localized?.en_US || pos.title?.localized?.['en-US'] || '',
            company: pos.companyName?.localized?.en_US || pos.companyName?.localized?.['en-US'] || '',
            start_date: pos.startDate ? `${pos.startDate.year}-${pos.startDate.month || 1}` : null,
            end_date: pos.endDate ? `${pos.endDate.year}-${pos.endDate.month || 1}` : 'Present'
          })) || []
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return { 
          content: JSON.stringify({ 
            error: error.message,
            note: 'Ensure your access token has r_basicprofile scope'
          }) 
        };
      }
    },

    // Create a post on LinkedIn
    create_post: async (params) => {
      const token = getAccessToken(_config);
      
      if (!token) {
        return { 
          content: JSON.stringify({ 
            error: 'LINKEDIN_ACCESS_TOKEN not configured',
            posted: false,
            note: 'Set LINKEDIN_ACCESS_TOKEN with w_member_social scope to post'
          }) 
        };
      }

      const text = params.text || params.content || '';
      if (!text) {
        return { 
          content: JSON.stringify({ 
            error: 'Post text is required',
            posted: false 
          }) 
        };
      }

      try {
        // Get the user's person URN
        const author = params.author_urn || await getPersonUrn(_config);
        
        // Build the post payload
        const postBody = {
          author,
          lifecycleState: 'PUBLISHED',
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': params.visibility || 'PUBLIC'
          },
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text
              },
              shareMediaCategory: 'NONE'
            }
          }
        };

        // Handle link sharing
        if (params.link_url) {
          postBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
          postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [{
            status: 'READY',
            originalUrl: params.link_url,
            title: {
              text: params.link_title || ''
            },
            description: {
              text: params.link_description || ''
            }
          }];
        }

        const result = await linkedInApi('/ugcPosts', 'POST', postBody, _config);
        
        return { 
          content: JSON.stringify({ 
            posted: true,
            post_id: result.id,
            post_urn: result.id,
            url: `https://www.linkedin.com/feed/update/${result.id}`,
            text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
          }) 
        };
      } catch (error) {
        return { 
          content: JSON.stringify({ 
            posted: false,
            error: error.message,
            text_preview: text.substring(0, 50),
            note: 'Ensure your token has w_member_social scope'
          }) 
        };
      }
    },

    // Get statistics for a specific post
    get_post_stats: async (params) => {
      const token = getAccessToken(_config);
      
      if (!token) {
        return { 
          content: JSON.stringify({ 
            error: 'LINKEDIN_ACCESS_TOKEN not configured',
            note: 'Set LINKEDIN_ACCESS_TOKEN to access post analytics'
          }) 
        };
      }

      const postId = params.post_id || params.post_urn;
      if (!postId) {
        return { 
          content: JSON.stringify({ 
            error: 'post_id or post_urn is required'
          }) 
        };
      }

      try {
        // Format URN if needed
        const urn = postId.startsWith('urn:') ? postId : `urn:li:share:${postId}`;
        
        // Get post details
        const post = await linkedInApi(`/socialMetadata?q=ids&ids=${encodeURIComponent(urn)}`, 'GET', null, _config);
        
        // Get engagement stats if available
        let stats = null;
        try {
          stats = await linkedInApi(`/socialActions/${encodeURIComponent(urn)}`, 'GET', null, _config);
        } catch (e) {
          // Stats may not be available for all posts
        }

        const result = {
          post_id: postId,
          urn,
          created_at: post.results?.[urn]?.created?.time ? new Date(parseInt(post.results[urn].created.time)).toISOString() : null,
          engagement: {
            likes: stats?.likesSummary?.totalLikes || stats?.likesSummary?.likedByCurrentUser ? 1 : 0 || 0,
            comments: stats?.commentsSummary?.totalComments || 0,
            shares: stats?.shares || 0
          },
          visibility: post.results?.[urn]?.visibility?.['com.linkedin.ugc.MemberNetworkVisibility'] || 'UNKNOWN'
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return { 
          content: JSON.stringify({ 
            error: error.message,
            note: 'Post stats require appropriate permissions. Organization posts need r_organization_social scope.'
          }) 
        };
      }
    },

    // Search for people on LinkedIn
    search_people: async (params) => {
      const token = getAccessToken(_config);
      const keywords = params.keywords || params.query || '';
      const maxResults = params.max_results || 10;

      try {
        // Try API-based search first if token available
        if (token) {
          // LinkedIn's people search requires specific permissions
          // Attempt API search (limited availability based on partnership tier)
          const searchParams = new URLSearchParams();
          searchParams.append('q', 'people');
          if (keywords) {
            searchParams.append('keywords', keywords);
          }
          if (params.first_name) {
            searchParams.append('firstName', params.first_name);
          }
          if (params.last_name) {
            searchParams.append('lastName', params.last_name);
          }
          
          const result = await linkedInApi(`/people?${searchParams.toString()}&count=${Math.min(maxResults, 50)}`, 'GET', null, _config);
          
          if (result.elements && result.elements.length > 0) {
            const people = result.elements.map(person => ({
              id: person.id,
              first_name: person.firstName?.localized?.en_US || person.firstName?.localized?.['en-US'] || '',
              last_name: person.lastName?.localized?.en_US || person.lastName?.localized?.['en-US'] || '',
              headline: person.headline?.localized?.en_US || person.headline?.localized?.['en-US'] || '',
              profile_url: person.publicProfileUrl || `https://www.linkedin.com/in/${person.id}`
            }));

            return { 
              content: JSON.stringify({ 
                total: result.paging?.total || people.length,
                count: people.length,
                source: 'linkedin_api',
                people
              }) 
            };
          }
        }

        // Fallback to web search
        if (process.env.TAVILY_API_KEY) {
          const results = await webSearchPeople(keywords || 'professional', maxResults);
          
          const people = results.map(r => {
            const match = r.url?.match(/\/in\/([^\/\?]+)/);
            return {
              name: r.title?.replace(' | LinkedIn', '').replace(' - LinkedIn', '') || '',
              headline: r.content?.substring(0, 150) || '',
              profile_url: r.url,
              username: match ? match[1] : null
            };
          }).filter(p => p.username);

          return { 
            content: JSON.stringify({ 
              total: people.length,
              count: people.length,
              source: 'web_search',
              query: keywords,
              people
            }) 
          };
        }

        return { 
          content: JSON.stringify({ 
            error: 'No search method available',
            note: 'Configure LINKEDIN_ACCESS_TOKEN for API search or TAVILY_API_KEY for web search'
          }) 
        };
      } catch (error) {
        return { 
          content: JSON.stringify({ 
            error: error.message,
            note: 'People search may require LinkedIn partnership program access'
          }) 
        };
      }
    }
  }
};
