/**
 * Gmail API Skill Handler
 *
 * Full Gmail integration using Google's official API.
 * Supports OAuth 2.0 authentication and service account.
 *
 * Actions:
 * - setup: Configure Gmail credentials
 * - send: Send emails with attachments, HTML
 * - list: List emails with search filters
 * - search: Advanced Gmail search query
 * - get: Get full email content by ID
 * - mark_read/unread: Toggle read status
 * - archive: Archive messages
 * - trash: Move to trash
 * - labels: Manage labels (list, add, remove)
 */

import { createRequire } from "module";
import { getCredential, setupCredentials } from '../../lib/credentials.js';

let googleapis = null;
let gmailClient = null;
let _config = {};

function loadGoogleApis() {
  if (googleapis) return googleapis;
  try {
    const require = createRequire(process.cwd() + "/package.json");
    googleapis = require("googleapis");
    return googleapis;
  } catch (e) {
    throw new Error('googleapis not installed. Run: npm install googleapis');
  }
}

function getAuthClient(config = _config) {
  const { google } = loadGoogleApis();

  // Service Account authentication (works with Gmail API if domain-wide delegation enabled)
  const serviceAccountJson = getCredential('gmail', 'GOOGLE_SERVICE_ACCOUNT_JSON', config);
  if (serviceAccountJson) {
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch (e) {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON: must be valid JSON');
    }
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'],
    });
  }

  // OAuth 2.0 authentication (standard for Gmail)
  const clientId = getCredential('gmail', 'GOOGLE_CLIENT_ID', config);
  const clientSecret = getCredential('gmail', 'GOOGLE_CLIENT_SECRET', config);
  const refreshToken = getCredential('gmail', 'GOOGLE_REFRESH_TOKEN', config);

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      getCredential('gmail', 'GOOGLE_REDIRECT_URI', config) || 'http://localhost'
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
  }

  throw new Error(
    `Gmail authentication not configured.

Set up Gmail API access:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 credentials or Service Account
3. Enable Gmail API at https://console.cloud.google.com/apis/library/gmail.googleapis.com
4. For OAuth: Get refresh token via OAuth flow
5. For Service Account: Enable domain-wide delegation (G Suite only)

Required environment variables:
- OAuth: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
- Service Account: GOOGLE_SERVICE_ACCOUNT_JSON`
  );
}

function getGmailClient(config = _config) {
  if (gmailClient) return gmailClient;
  const { google } = loadGoogleApis();
  const auth = getAuthClient(config);
  gmailClient = google.gmail({ version: 'v1', auth });
  return gmailClient;
}

// Decode Base64Url encoded Gmail message parts
function decodeBase64Url(data) {
  if (!data) return '';
  // Replace URL-safe chars and add padding
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  try {
    return Buffer.from(normalized + padding, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

// Extract email body from message parts
function extractBody(parts) {
  if (!parts) return { text: '', html: '' };

  let text = '';
  let html = '';

  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    } else if (part.parts) {
      const nested = extractBody(part.parts);
      if (nested.text) text = nested.text;
      if (nested.html) html = nested.html;
    }
  }

  return { text, html };
}

// Extract headers from message
function extractHeaders(payload) {
  const headers = {};
  if (payload?.headers) {
    for (const h of payload.headers) {
      headers[h.name.toLowerCase()] = h.value;
    }
  }
  return headers;
}

// Format message for display
function formatMessage(msg, includeBody = false) {
  const headers = extractHeaders(msg.payload);
  const body = includeBody ? extractBody(msg.payload.parts || [msg.payload]) : null;

  return {
    id: msg.id,
    threadId: msg.threadId,
    labelIds: msg.labelIds || [],
    snippet: msg.snippet ? decodeBase64Url(msg.snippet) : null,
    subject: headers.subject || '(no subject)',
    from: headers.from || '',
    to: headers.to || '',
    date: headers.date || '',
    ...(body && { body }),
  };
}

// Create raw email message for sending
function createRawMessage({ to, subject, body, html, cc, bcc, from }) {
  const lines = [];

  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  if (bcc) lines.push(`Bcc: ${bcc}`);
  lines.push(`From: ${from || 'me'}`);
  lines.push(`Subject: ${subject}`);
  lines.push('Content-Type: text/html; charset=utf-8');
  lines.push('MIME-Version: 1.0');
  lines.push('');
  lines.push(html || body || '');

  const raw = lines.join('\r\n');
  return Buffer.from(raw).toString('base64url');
}

export default {
  install: async (config) => {
    _config = config || {};
    try {
      getGmailClient(_config);
      console.log('[gmail] Gmail client initialized');
    } catch (e) {
      console.warn('[gmail] ' + e.message);
    }
  },

  actions: {
    setup: async (params) => {
      const { client_id, client_secret, refresh_token, service_account_json, redirect_uri } = params;

      const credentials = {};
      if (client_id) credentials.GOOGLE_CLIENT_ID = client_id;
      if (client_secret) credentials.GOOGLE_CLIENT_SECRET = client_secret;
      if (refresh_token) credentials.GOOGLE_REFRESH_TOKEN = refresh_token;
      if (service_account_json) credentials.GOOGLE_SERVICE_ACCOUNT_JSON = service_account_json;
      if (redirect_uri) credentials.GOOGLE_REDIRECT_URI = redirect_uri;

      if (Object.keys(credentials).length === 0) {
        return {
          content: JSON.stringify({
            error: 'No credentials provided',
            help: 'Provide client_id, client_secret, and refresh_token for OAuth, or service_account_json for service account'
          })
        };
      }

      const result = await setupCredentials('gmail', credentials);

      // Test the connection
      try {
        _config = { ..._config, ...credentials };
        gmailClient = null; // Reset to use new creds
        const gmail = getGmailClient(_config);
        const profile = await gmail.users.getProfile({ userId: 'me' });
        return {
          content: JSON.stringify({
            success: true,
            email: profile.data.emailAddress,
            messagesTotal: profile.data.messagesTotal,
            threadsTotal: profile.data.threadsTotal,
            message: 'Gmail credentials saved and verified'
          })
        };
      } catch (e) {
        return {
          content: JSON.stringify({
            success: true,
            warning: 'Credentials saved but verification failed: ' + e.message,
            keys: result.keys
          })
        };
      }
    },

    send: async (params) => {
      const { to, subject, body, html, cc, bcc, from } = params;

      if (!to || !subject || (!body && !html)) {
        return {
          content: JSON.stringify({
            error: 'Missing required parameters: to, subject, and (body or html) are required'
          })
        };
      }

      try {
        const gmail = getGmailClient();
        const raw = createRawMessage({ to, subject, body, html, cc, bcc, from });

        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw }
        });

        return {
          content: JSON.stringify({
            success: true,
            messageId: response.data.id,
            threadId: response.data.threadId,
            to,
            subject
          })
        };
      } catch (e) {
        return {
          content: JSON.stringify({
            error: e.message,
            code: e.code || 'SEND_FAILED'
          })
        };
      }
    },

    list: async (params = {}) => {
      const { max_results = 10, label_ids, query, page_token } = params;

      try {
        const gmail = getGmailClient();
        const response = await gmail.users.messages.list({
          userId: 'me',
          maxResults: Math.min(max_results, 100),
          labelIds: label_ids,
          q: query,
          pageToken: page_token
        });

        const messages = response.data.messages || [];
        const result = {
          messages: messages.map(m => ({ id: m.id, threadId: m.threadId })),
          nextPageToken: response.data.nextPageToken,
          resultSizeEstimate: response.data.resultSizeEstimate
        };

        // Optionally fetch full message details
        if (params.include_headers && messages.length > 0) {
          const details = await Promise.all(
            messages.slice(0, 10).map(async (m) => {
              try {
                const msg = await gmail.users.messages.get({
                  userId: 'me',
                  id: m.id,
                  format: 'metadata',
                  metadataHeaders: ['Subject', 'From', 'To', 'Date', 'Snippet']
                });
                return formatMessage(msg.data);
              } catch {
                return { id: m.id, error: 'Failed to fetch details' };
              }
            })
          );
          result.messages = details;
        }

        return { content: JSON.stringify(result) };
      } catch (e) {
        return { content: JSON.stringify({ error: e.message }) };
      }
    },

    search: async (params) => {
      // Gmail search query syntax: https://support.google.com/mail/answer/7190
      const { query, max_results = 20, include_body = false } = params;

      if (!query) {
        return {
          content: JSON.stringify({
            error: 'Search query is required',
            help: 'Use Gmail search syntax: from:sender@example.com, subject:hello, after:2024/01/01, has:attachment, is:unread'
          })
        };
      }

      try {
        const gmail = getGmailClient();

        // First search for message IDs
        const listResponse = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: Math.min(max_results, 50)
        });

        const messages = listResponse.data.messages || [];

        if (messages.length === 0) {
          return { content: JSON.stringify({ messages: [], query, found: 0 }) };
        }

        // Fetch full details for each message
        const details = await Promise.all(
          messages.map(async (m) => {
            try {
              const msg = await gmail.users.messages.get({
                userId: 'me',
                id: m.id,
                format: include_body ? 'full' : 'metadata',
                metadataHeaders: ['Subject', 'From', 'To', 'Date']
              });
              return formatMessage(msg.data, include_body);
            } catch {
              return { id: m.id, error: 'Failed to fetch message' };
            }
          })
        );

        return {
          content: JSON.stringify({
            query,
            found: details.length,
            messages: details
          })
        };
      } catch (e) {
        return { content: JSON.stringify({ error: e.message }) };
      }
    },

    get: async (params) => {
      const { message_id, format = 'full' } = params;

      if (!message_id) {
        return { content: JSON.stringify({ error: 'message_id is required' }) };
      }

      try {
        const gmail = getGmailClient();
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: message_id,
          format: format // 'minimal', 'metadata', 'full', 'raw'
        });

        const includeBody = format === 'full' || format === 'raw';
        const message = formatMessage(response.data, includeBody);

        if (format === 'raw' && response.data.raw) {
          message.raw = response.data.raw;
        }

        return { content: JSON.stringify(message) };
      } catch (e) {
        return { content: JSON.stringify({ error: e.message }) };
      }
    },

    mark_read: async (params) => {
      const { message_id } = params;
      if (!message_id) return { content: JSON.stringify({ error: 'message_id required' }) };

      try {
        const gmail = getGmailClient();
        await gmail.users.messages.modify({
          userId: 'me',
          id: message_id,
          requestBody: { removeLabelIds: ['UNREAD'] }
        });
        return { content: JSON.stringify({ success: true, message_id, action: 'marked_read' }) };
      } catch (e) {
        return { content: JSON.stringify({ error: e.message }) };
      }
    },

    mark_unread: async (params) => {
      const { message_id } = params;
      if (!message_id) return { content: JSON.stringify({ error: 'message_id required' }) };

      try {
        const gmail = getGmailClient();
        await gmail.users.messages.modify({
          userId: 'me',
          id: message_id,
          requestBody: { addLabelIds: ['UNREAD'] }
        });
        return { content: JSON.stringify({ success: true, message_id, action: 'marked_unread' }) };
      } catch (e) {
        return { content: JSON.stringify({ error: e.message }) };
      }
    },

    archive: async (params) => {
      const { message_id } = params;
      if (!message_id) return { content: JSON.stringify({ error: 'message_id required' }) };

      try {
        const gmail = getGmailClient();
        await gmail.users.messages.modify({
          userId: 'me',
          id: message_id,
          requestBody: { removeLabelIds: ['INBOX'] }
        });
        return { content: JSON.stringify({ success: true, message_id, action: 'archived' }) };
      } catch (e) {
        return { content: JSON.stringify({ error: e.message }) };
      }
    },

    trash: async (params) => {
      const { message_id } = params;
      if (!message_id) return { content: JSON.stringify({ error: 'message_id required' }) };

      try {
        const gmail = getGmailClient();
        await gmail.users.messages.trash({ userId: 'me', id: message_id });
        return { content: JSON.stringify({ success: true, message_id, action: 'trashed' }) };
      } catch (e) {
        return { content: JSON.stringify({ error: e.message }) };
      }
    },

    untrash: async (params) => {
      const { message_id } = params;
      if (!message_id) return { content: JSON.stringify({ error: 'message_id required' }) };

      try {
        const gmail = getGmailClient();
        await gmail.users.messages.untrash({ userId: 'me', id: message_id });
        return { content: JSON.stringify({ success: true, message_id, action: 'untrashed' }) };
      } catch (e) {
        return { content: JSON.stringify({ error: e.message }) };
      }
    },

    labels: {
      list: async () => {
        try {
          const gmail = getGmailClient();
          const response = await gmail.users.labels.list({ userId: 'me' });
          return {
            content: JSON.stringify({
              labels: response.data.labels?.map(l => ({
                id: l.id,
                name: l.name,
                type: l.type,
                messageListVisibility: l.messageListVisibility
              })) || []
            })
          };
        } catch (e) {
          return { content: JSON.stringify({ error: e.message }) };
        }
      },

      add: async (params) => {
        const { message_id, label_id } = params;
        if (!message_id || !label_id) {
          return { content: JSON.stringify({ error: 'message_id and label_id required' }) };
        }

        try {
          const gmail = getGmailClient();
          await gmail.users.messages.modify({
            userId: 'me',
            id: message_id,
            requestBody: { addLabelIds: [label_id] }
          });
          return { content: JSON.stringify({ success: true, message_id, label_id, action: 'label_added' }) };
        } catch (e) {
          return { content: JSON.stringify({ error: e.message }) };
        }
      },

      remove: async (params) => {
        const { message_id, label_id } = params;
        if (!message_id || !label_id) {
          return { content: JSON.stringify({ error: 'message_id and label_id required' }) };
        }

        try {
          const gmail = getGmailClient();
          await gmail.users.messages.modify({
            userId: 'me',
            id: message_id,
            requestBody: { removeLabelIds: [label_id] }
          });
          return { content: JSON.stringify({ success: true, message_id, label_id, action: 'label_removed' }) };
        } catch (e) {
          return { content: JSON.stringify({ error: e.message }) };
        }
      }
    }
  }
};
