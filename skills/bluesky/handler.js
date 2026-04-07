/**
 * Bluesky API Skill Handler - AT Protocol
 * 
 * Actions: get_profile, get_feed, post_post, search_posts
 * Uses @atproto/api for Bluesky/AT Protocol operations
 */

import { createRequire } from "module";
import { setupCredentials, getCredential } from '../../lib/credentials.js';

// Load @atproto/api dynamically (optional dependency)
function loadAtproto() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require("@atproto/api");
  } catch (e) {
    throw new Error(
      "@atproto/api not installed. Run: npm install @atproto/api"
    );
  }
}

// Load axios for search (optional dependency)
function loadAxios() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require("axios");
  } catch (e) {
    throw new Error("axios not installed. Run: npm install axios");
  }
}

const DEFAULT_SERVICE = "https://bsky.social";
const PUBLIC_URL = "https://public.api.bsky.app";

let _config = {};
let _agent = null;

// Initialize Bluesky agent
async function getAgent() {
  if (_agent) return _agent;

  const { Agent, CredentialSession } = loadAtproto();

  const identifier = getCredential('bluesky', 'BLUESKY_IDENTIFIER', _config);
  const password = getCredential('bluesky', 'BLUESKY_PASSWORD', _config);
  const service = getCredential('bluesky', 'BLUESKY_SERVICE', _config) || DEFAULT_SERVICE;

  if (!identifier || !password) {
    throw new Error(
      "Bluesky credentials not configured. Set BLUESKY_IDENTIFIER and BLUESKY_PASSWORD."
    );
  }

  const session = new CredentialSession(new URL(service));
  await session.login({ identifier, password });
  _agent = new Agent(session);
  return _agent;
}

// Resolve handle to DID
async function resolveHandle(handle) {
  try {
    const axios = loadAxios();
    const cleanHandle = handle.replace(/^@/, "");
    const response = await axios.get(
      `${PUBLIC_URL}/xrpc/com.atproto.identity.resolveHandle?handle=${cleanHandle}`
    );
    return response.data.did;
  } catch (error) {
    throw new Error(`Failed to resolve handle: ${error.message}`);
  }
}

export default {
  install: async (config) => {
    _config = config;
    _agent = null;
    // Check for stored credentials using getCredential
    const identifier = getCredential('bluesky', 'BLUESKY_IDENTIFIER', config);
    const password = getCredential('bluesky', 'BLUESKY_PASSWORD', config);
    const service = getCredential('bluesky', 'BLUESKY_SERVICE', config);
    
    if (identifier) process.env.BLUESKY_IDENTIFIER = identifier;
    if (password) process.env.BLUESKY_PASSWORD = password;
    if (service) process.env.BLUESKY_SERVICE = service;
  },

  actions: {
    setup: async (params) => {
      const result = await setupCredentials('bluesky', {
        BLUESKY_IDENTIFIER: params.identifier,
        BLUESKY_PASSWORD: params.password,
        BLUESKY_SERVICE: params.service || 'https://bsky.social'
      });
      _agent = null; // Force re-auth
      return {
        content: JSON.stringify({
          success: result.success,
          message: "Bluesky credentials saved",
          handle: params.identifier,
          next_steps: "Try: 'Post to Bluesky: Hello from Kai!'"
        }, null, 2)
      };
    },

    /**
     * Get a Bluesky user's profile
     * @param {Object} params
     * @param {string} params.handle - User handle (with or without @)
     * @param {string} params.did - User DID (alternative to handle)
     */
    get_profile: async (params) => {
      try {
        const agent = await getAgent();
        const handle = params.handle?.replace(/^@/, "");
        const did = params.did;

        if (!handle && !did) {
          return {
            content: JSON.stringify({
              error: "Handle or DID required",
              found: false,
            }),
          };
        }

        const actor = did || handle;
        const response = await agent.getProfile({ actor });

        const profile = response.data;
        const result = {
          found: true,
          did: profile.did,
          handle: profile.handle,
          display_name: profile.displayName || profile.handle,
          description: profile.description || "",
          avatar_url: profile.avatar,
          banner_url: profile.banner,
          followers_count: profile.followersCount || 0,
          follows_count: profile.followsCount || 0,
          posts_count: profile.postsCount || 0,
          created_at: profile.createdAt,
          profile_url: `https://bsky.app/profile/${profile.handle}`,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            found: false,
          }),
        };
      }
    },

    /**
     * Get a user's feed (posts)
     * @param {Object} params
     * @param {string} params.handle - User handle
     * @param {string} params.did - User DID
     * @param {number} params.limit - Max posts to fetch (default 20, max 100)
     * @param {string} params.cursor - Pagination cursor
     */
    get_feed: async (params) => {
      try {
        const agent = await getAgent();
        const handle = params.handle?.replace(/^@/, "");
        const did = params.did;
        const limit = Math.min(params.limit || 20, 100);
        const cursor = params.cursor;

        if (!handle && !did) {
          return {
            content: JSON.stringify({
              error: "Handle or DID required",
              found: false,
            }),
          };
        }

        const actor = did || handle;
        const feedResponse = await agent.getAuthorFeed({
          actor,
          limit,
          cursor,
        });

        const posts =
          feedResponse.data.feed?.map((item, index) => {
            const post = item.post;
            return {
              id: post.uri,
              uri: post.uri,
              cid: post.cid,
              text: post.record?.text || "",
              author: {
                did: post.author?.did,
                handle: post.author?.handle,
                display_name: post.author?.displayName,
                avatar_url: post.author?.avatar,
              },
              created_at: post.record?.createdAt,
              reply_count: post.replyCount || 0,
              repost_count: post.repostCount || 0,
              like_count: post.likeCount || 0,
              url: `https://bsky.app/profile/${post.author?.handle}/post/${
                post.uri.split("/").pop()
              }`,
            };
          }) || [];

        const result = {
          found: true,
          handle: actor,
          posts: posts,
          total: posts.length,
          cursor: feedResponse.data.cursor,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            found: false,
          }),
        };
      }
    },

    /**
     * Post a new post to Bluesky
     * @param {Object} params
     * @param {string} params.text - Post text content
     * @param {string} params.reply_to_uri - URI of post to reply to (optional)
     * @param {string} params.reply_to_cid - CID of post to reply to (optional)
     * @param {string} params.language - Language code (default: en)
     */
    post_post: async (params) => {
      try {
        const agent = await getAgent();
        const { RichText } = loadAtproto();

        const text = params.text || "";
        if (!text.trim()) {
          return {
            content: JSON.stringify({
              error: "Post text required",
              posted: false,
            }),
          };
        }

        const richText = new RichText({ text });
        await richText.detectFacets(agent);

        const postRecord = {
          text: richText.text,
          facets: richText.facets,
          createdAt: new Date().toISOString(),
          $type: "app.bsky.feed.post",
        };

        // Handle replies
        if (params.reply_to_uri && params.reply_to_cid) {
          // Need to fetch root of the thread
          const parentUri = params.reply_to_uri;
          const parentCid = params.reply_to_cid;

          postRecord.reply = {
            root: { uri: parentUri, cid: parentCid },
            parent: { uri: parentUri, cid: parentCid },
          };
        }

        if (params.language) {
          postRecord.langs = [params.language];
        }

        const response = await agent.post(postRecord);

        const result = {
          posted: true,
          uri: response.uri,
          cid: response.cid,
          url: `https://bsky.app/profile/${
            response.uri.split("/")[2]
          }/post/${response.uri.split("/").pop()}`,
          text_preview: text.substring(0, 100),
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            posted: false,
          }),
        };
      }
    },

    /**
     * Search posts on Bluesky
     * @param {Object} params
     * @param {string} params.query - Search query
     * @param {number} params.limit - Max results (default 20, max 100)
     * @param {string} params.cursor - Pagination cursor
     * @param {string} params.author - Filter by author handle (optional)
     * @param {string} params.since - ISO date to filter since (optional)
     * @param {string} params.until - ISO date to filter until (optional)
     */
    search_posts: async (params) => {
      try {
        const agent = await getAgent();
        const query = params.query || "";
        const limit = Math.min(params.limit || 20, 100);
        const cursor = params.cursor;
        const author = params.author;
        const since = params.since;
        const until = params.until;

        if (!query.trim()) {
          return {
            content: JSON.stringify({
              error: "Search query required",
              found: false,
            }),
          };
        }

        const searchParams = {
          q: query,
          limit,
          ...(cursor && { cursor }),
          ...(author && { author }),
          ...(since && { since }),
          ...(until && { until }),
        };

        const response = await agent.app.bsky.feed.searchPosts(searchParams);

        const posts =
          response.data.posts?.map((post) => ({
            id: post.uri,
            uri: post.uri,
            cid: post.cid,
            text: post.record?.text || "",
            author: {
              did: post.author?.did,
              handle: post.author?.handle,
              display_name: post.author?.displayName,
              avatar_url: post.author?.avatar,
            },
            created_at: post.record?.createdAt,
            indexed_at: post.indexedAt,
            reply_count: post.replyCount || 0,
            repost_count: post.repostCount || 0,
            like_count: post.likeCount || 0,
            url: `https://bsky.app/profile/${post.author?.handle}/post/${
              post.uri.split("/").pop()
            }`,
          })) || [];

        const result = {
          found: posts.length > 0,
          query: query,
          posts: posts,
          total: posts.length,
          cursor: response.data.cursor,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            found: false,
            query: params.query,
          }),
        };
      }
    },

    /**
     * Get current session info
     */
    get_session: async () => {
      try {
        const agent = await getAgent();
        const session = agent.session;

        if (!session) {
          return {
            content: JSON.stringify({
              error: "Not authenticated",
              authenticated: false,
            }),
          };
        }

        const result = {
          authenticated: true,
          did: session.did,
          handle: session.handle,
          service: session.pdsUrl || DEFAULT_SERVICE,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            authenticated: false,
          }),
        };
      }
    },

    /**
     * Get notifications
     * @param {Object} params
     * @param {number} params.limit - Max notifications (default 20)
     * @param {string} params.cursor - Pagination cursor
     * @param {boolean} params.seen - Mark notifications as seen
     */
    get_notifications: async (params) => {
      try {
        const agent = await getAgent();
        const limit = Math.min(params.limit || 20, 100);
        const cursor = params.cursor;

        const response = await agent.listNotifications({
          limit,
          ...(cursor && { cursor }),
        });

        if (params.seen) {
          await agent.updateSeenNotifications();
        }

        const notifications =
          response.data.notifications?.map((n) => ({
            id: n.uri,
            uri: n.uri,
            cid: n.cid,
            type: n.reason,
            author: {
              did: n.author?.did,
              handle: n.author?.handle,
              display_name: n.author?.displayName,
              avatar_url: n.author?.avatar,
            },
            text: n.record?.text || "",
            is_read: n.isRead,
            indexed_at: n.indexedAt,
            created_at: n.record?.createdAt,
          })) || [];

        const result = {
          notifications: notifications,
          total: notifications.length,
          unread_count: response.data.notifications?.filter((n) => !n.isRead)
            .length,
          cursor: response.data.cursor,
          seen_updated: params.seen,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
          }),
        };
      }
    },

    /**
     * Follow a user
     * @param {Object} params
     * @param {string} params.handle - User handle to follow
     * @param {string} params.did - User DID to follow
     */
    follow_user: async (params) => {
      try {
        const agent = await getAgent();
        const handle = params.handle?.replace(/^@/, "");
        const did = params.did;

        if (!handle && !did) {
          return {
            content: JSON.stringify({
              error: "Handle or DID required",
              followed: false,
            }),
          };
        }

        const targetDid = did || (await resolveHandle(handle));

        const response = await agent.follow(targetDid);

        const result = {
          followed: true,
          uri: response.uri,
          cid: response.cid,
          did: targetDid,
          handle: handle || targetDid,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            followed: false,
          }),
        };
      }
    },

    /**
     * Like a post
     * @param {Object} params
     * @param {string} params.uri - Post URI
     * @param {string} params.cid - Post CID
     */
    like_post: async (params) => {
      try {
        const agent = await getAgent();
        const uri = params.uri;
        const cid = params.cid;

        if (!uri || !cid) {
          return {
            content: JSON.stringify({
              error: "URI and CID required",
              liked: false,
            }),
          };
        }

        const response = await agent.like(uri, cid);

        const result = {
          liked: true,
          uri: response.uri,
          cid: response.cid,
          post_uri: uri,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            liked: false,
          }),
        };
      }
    },

    /**
     * Repost a post
     * @param {Object} params
     * @param {string} params.uri - Post URI
     * @param {string} params.cid - Post CID
     */
    repost_post: async (params) => {
      try {
        const agent = await getAgent();
        const uri = params.uri;
        const cid = params.cid;

        if (!uri || !cid) {
          return {
            content: JSON.stringify({
              error: "URI and CID required",
              reposted: false,
            }),
          };
        }

        const response = await agent.repost(uri, cid);

        const result = {
          reposted: true,
          uri: response.uri,
          cid: response.cid,
          post_uri: uri,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            reposted: false,
          }),
        };
      }
    },
  },
};
