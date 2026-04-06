/**
 * Slack API Skill Handler - Bot Token based
 * 
 * Actions: send_message, send_to_channel, upload_file, create_thread
 * Uses @slack/web-api for Slack Bot operations
 */

import { createRequire } from "module";

// Load @slack/web-api dynamically (optional dependency)
function loadSlackWebApi() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require("@slack/web-api");
  } catch (e) {
    throw new Error(
      "@slack/web-api not installed. Run: npm install @slack/web-api"
    );
  }
}

let _config = {};
let _client = null;

// Initialize Slack client
function getClient() {
  if (_client) return _client;

  const { WebClient } = loadSlackWebApi();
  const token = _config.bot_token || process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "Slack bot token not configured. Set SLACK_BOT_TOKEN."
    );
  }

  _client = new WebClient(token);
  return _client;
}

// Resolve user by email or user ID
async function resolveUserId(client, email, userId) {
  if (userId) return userId;
  
  if (email) {
    try {
      const response = await client.users.lookupByEmail({ email });
      return response.user?.id;
    } catch (error) {
      throw new Error(`Could not find user by email: ${email}. ${error.message}`);
    }
  }
  
  throw new Error("Either email or user_id is required");
}

// Normalize channel name
function normalizeChannel(channel) {
  if (!channel) return null;
  if (channel.startsWith("#")) return channel.slice(1);
  if (channel.startsWith("<#") && channel.includes(">")) {
    // Handle Slack formatting like <#C12345678|channel-name>
    const match = channel.match(/<#([A-Z0-9]+)(?:\|[^>]+)?>/);
    return match ? match[1] : channel;
  }
  return channel;
}

export default {
  install: async (config) => {
    _config = config;
    _client = null;
  },

  actions: {
    /**
     * Send a direct message to a user
     * @param {Object} params
     * @param {string} params.email - User email address (optional if user_id provided)
     * @param {string} params.user_id - Slack user ID (optional if email provided)
     * @param {string} params.text - Message text
     * @param {string} params.blocks - JSON array of Slack Block Kit blocks (optional)
     * @param {boolean} params.unfurl_links - Whether to unfurl links (default true)
     */
    send_message: async (params) => {
      try {
        const client = getClient();
        const email = params.email;
        const userId = params.user_id;
        const text = params.text || "";
        const blocks = params.blocks;
        const unfurlLinks = params.unfurl_links !== false;

        if (!text && !blocks) {
          return {
            content: JSON.stringify({
              error: "Message text or blocks required",
              sent: false,
            }),
          };
        }

        // Resolve user ID
        const targetUserId = await resolveUserId(client, email, userId);

        // Open DM conversation
        const imResponse = await client.conversations.open({
          users: targetUserId,
        });
        const channelId = imResponse.channel?.id;

        if (!channelId) {
          return {
            content: JSON.stringify({
              error: "Could not open DM conversation",
              sent: false,
            }),
          };
        }

        // Send the message
        const messagePayload = {
          channel: channelId,
          unfurl_links: unfurlLinks,
          ...(text && { text }),
          ...(blocks && { blocks: typeof blocks === "string" ? JSON.parse(blocks) : blocks }),
        };

        const response = await client.chat.postMessage(messagePayload);

        const result = {
          sent: true,
          message_ts: response.ts,
          channel: response.channel,
          user_id: targetUserId,
          text_preview: text.substring(0, 100),
          permalink: `https://slack.com/app_redirect?channel=${response.channel}&message_ts=${response.ts}`,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            sent: false,
          }),
        };
      }
    },

    /**
     * Send a message to a channel
     * @param {Object} params
     * @param {string} params.channel - Channel name (e.g., #general) or channel ID
     * @param {string} params.text - Message text
     * @param {string} params.blocks - JSON array of Slack Block Kit blocks (optional)
     * @param {string} params.thread_ts - Thread timestamp to reply in (optional)
     * @param {boolean} params.unfurl_links - Whether to unfurl links (default true)
     */
    send_to_channel: async (params) => {
      try {
        const client = getClient();
        const channel = normalizeChannel(params.channel);
        const text = params.text || "";
        const blocks = params.blocks;
        const threadTs = params.thread_ts;
        const unfurlLinks = params.unfurl_links !== false;

        if (!channel) {
          return {
            content: JSON.stringify({
              error: "Channel name or ID required",
              sent: false,
            }),
          };
        }

        if (!text && !blocks) {
          return {
            content: JSON.stringify({
              error: "Message text or blocks required",
              sent: false,
            }),
          };
        }

        const messagePayload = {
          channel: channel,
          unfurl_links: unfurlLinks,
          ...(text && { text }),
          ...(blocks && { blocks: typeof blocks === "string" ? JSON.parse(blocks) : blocks }),
          ...(threadTs && { thread_ts: threadTs }),
        };

        const response = await client.chat.postMessage(messagePayload);

        const result = {
          sent: true,
          message_ts: response.ts,
          channel: response.channel,
          text_preview: text.substring(0, 100),
          permalink: `https://slack.com/app_redirect?channel=${response.channel}&message_ts=${response.ts}`,
          ...(threadTs && { is_thread_reply: true, thread_ts: threadTs }),
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            sent: false,
          }),
        };
      }
    },

    /**
     * Upload a file to a channel or DM
     * @param {Object} params
     * @param {string} params.file_path - Local file path or URL
     * @param {string} params.content - File content as string (for text files)
     * @param {string} params.channel - Channel name or ID (required unless user_id/email provided)
     * @param {string} params.user_id - User ID to send file as DM (optional)
     * @param {string} params.email - User email to send file as DM (optional)
     * @param {string} params.filename - Name of the file
     * @param {string} params.title - Title for the file
     * @param {string} params.initial_comment - Initial comment with the file
     * @param {string} params.thread_ts - Thread timestamp to upload in (optional)
     * @param {string} params.filetype - Slack file type identifier (optional)
     */
    upload_file: async (params) => {
      try {
        const client = getClient();
        const filePath = params.file_path;
        const content = params.content;
        const channel = params.channel ? normalizeChannel(params.channel) : null;
        const userId = params.user_id;
        const email = params.email;
        const filename = params.filename || "file";
        const title = params.title || filename;
        const initialComment = params.initial_comment;
        const threadTs = params.thread_ts;
        const filetype = params.filetype;

        if (!filePath && !content) {
          return {
            content: JSON.stringify({
              error: "Either file_path or content required",
              uploaded: false,
            }),
          };
        }

        // Determine target channel
        let targetChannel = channel;
        if (!targetChannel && (userId || email)) {
          const resolvedUserId = await resolveUserId(client, email, userId);
          const imResponse = await client.conversations.open({
            users: resolvedUserId,
          });
          targetChannel = imResponse.channel?.id;
        }

        if (!targetChannel) {
          return {
            content: JSON.stringify({
              error: "Channel, user_id, or email required to upload file",
              uploaded: false,
            }),
          };
        }

        // Build upload options
        const uploadOptions = {
          channels: targetChannel,
          filename: filename,
          title: title,
          ...(initialComment && { initial_comment: initialComment }),
          ...(threadTs && { thread_ts: threadTs }),
          ...(filetype && { filetype: filetype }),
        };

        // Handle file upload
        let response;
        if (content) {
          // Upload content directly
          uploadOptions.content = content;
          response = await client.files.uploadV2(uploadOptions);
        } else if (filePath) {
          // Check if it's a URL or local file
          if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            // Fetch the file content
            const fileResponse = await fetch(filePath);
            if (!fileResponse.ok) {
              throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
            }
            const buffer = await fileResponse.arrayBuffer();
            uploadOptions.content = Buffer.from(buffer);
            response = await client.files.uploadV2(uploadOptions);
          } else {
            // Local file path - requires fs module
            const { createReadStream } = await import("fs");
            uploadOptions.file = createReadStream(filePath);
            response = await client.files.uploadV2(uploadOptions);
          }
        }

        const result = {
          uploaded: true,
          file_id: response.file?.id || response.files?.[0]?.id,
          file_url: response.file?.permalink || response.files?.[0]?.permalink,
          channel: targetChannel,
          filename: filename,
          ...(threadTs && { is_thread_reply: true, thread_ts: threadTs }),
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            uploaded: false,
          }),
        };
      }
    },

    /**
     * Create a thread reply to an existing message
     * @param {Object} params
     * @param {string} params.channel - Channel name or ID
     * @param {string} params.thread_ts - Parent message timestamp (thread_ts)
     * @param {string} params.text - Reply text
     * @param {string} params.blocks - JSON array of Slack Block Kit blocks (optional)
     * @param {boolean} params.broadcast - Broadcast reply to channel (default false)
     * @param {boolean} params.unfurl_links - Whether to unfurl links (default true)
     */
    create_thread: async (params) => {
      try {
        const client = getClient();
        const channel = normalizeChannel(params.channel);
        const threadTs = params.thread_ts;
        const text = params.text || "";
        const blocks = params.blocks;
        const broadcast = params.broadcast === true;
        const unfurlLinks = params.unfurl_links !== false;

        if (!channel) {
          return {
            content: JSON.stringify({
              error: "Channel name or ID required",
              replied: false,
            }),
          };
        }

        if (!threadTs) {
          return {
            content: JSON.stringify({
              error: "thread_ts (parent message timestamp) required",
              replied: false,
            }),
          };
        }

        if (!text && !blocks) {
          return {
            content: JSON.stringify({
              error: "Message text or blocks required",
              replied: false,
            }),
          };
        }

        const messagePayload = {
          channel: channel,
          thread_ts: threadTs,
          unfurl_links: unfurlLinks,
          reply_broadcast: broadcast,
          ...(text && { text }),
          ...(blocks && { blocks: typeof blocks === "string" ? JSON.parse(blocks) : blocks }),
        };

        const response = await client.chat.postMessage(messagePayload);

        const result = {
          replied: true,
          message_ts: response.ts,
          thread_ts: threadTs,
          channel: response.channel,
          text_preview: text.substring(0, 100),
          broadcast: broadcast,
          permalink: `https://slack.com/app_redirect?channel=${response.channel}&message_ts=${response.ts}`,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            replied: false,
          }),
        };
      }
    },

    /**
     * Get bot info and connection status
     */
    get_info: async () => {
      try {
        const client = getClient();
        
        const authResponse = await client.auth.test();
        
        const result = {
          connected: true,
          bot_id: authResponse.bot_id,
          user_id: authResponse.user_id,
          team_id: authResponse.team_id,
          team: authResponse.team,
          user: authResponse.user,
          url: authResponse.url,
        };

        return { content: JSON.stringify(result) };
      } catch (error) {
        return {
          content: JSON.stringify({
            error: error.message,
            connected: false,
          }),
        };
      }
    },

    /**
     * List available channels the bot can access
     * @param {Object} params
     * @param {number} params.limit - Max channels to return (default 100)
     * @param {string} params.cursor - Pagination cursor
     * @param {boolean} params.exclude_archived - Exclude archived channels (default true)
     */
    list_channels: async (params) => {
      try {
        const client = getClient();
        const limit = Math.min(params.limit || 100, 200);
        const cursor = params.cursor;
        const excludeArchived = params.exclude_archived !== false;

        const response = await client.conversations.list({
          limit: limit,
          exclude_archived: excludeArchived,
          types: "public_channel,private_channel",
          ...(cursor && { cursor }),
        });

        const channels = response.channels?.map((ch) => ({
          id: ch.id,
          name: ch.name,
          is_private: ch.is_private,
          is_archived: ch.is_archived,
          num_members: ch.num_members,
          topic: ch.topic?.value,
          purpose: ch.purpose?.value,
          created: ch.created,
        })) || [];

        const result = {
          channels: channels,
          total: channels.length,
          cursor: response.response_metadata?.next_cursor,
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
  },
};
