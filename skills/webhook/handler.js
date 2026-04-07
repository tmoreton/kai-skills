/**
 * Webhook Skill Handler
 * 
 * Generic webhook triggers for Zapier, Make, custom endpoints.
 * Uses native fetch - no npm dependencies.
 */

import { setupCredentials, injectCredentials } from '../lib/credentials.js';

export default {
  install: async (config) => {
    // Inject stored webhook secret if available
    const storedCreds = injectCredentials('webhook');
    if (storedCreds?.webhook_secret) {
      config.webhook_secret = storedCreds.webhook_secret;
    }
  },

  actions: {
    setup: async (params) => {
      const result = setupCredentials('webhook', {
        webhook_secret: params.webhook_secret
      });
      return {
        content: JSON.stringify({
          success: true,
          message: "Webhook secret saved",
          next_steps: "Try: 'Send a webhook to my endpoint'"
        }, null, 2)
      };
    },

    send_webhook: async (params) => {
      const url = params.url;
      const payload = params.payload || {};
      const headers = params.headers || {};

      if (!url) {
        return { content: JSON.stringify({ error: 'URL required', sent: false }) };
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...headers 
          },
          body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        const result = {
          sent: response.ok,
          status: response.status,
          statusText: response.statusText,
          response: responseData
        };
        
        return { content: JSON.stringify(result) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, sent: false, url }) };
      }
    },

    send_with_auth: async (params) => {
      const url = params.url;
      const payload = params.payload || {};
      const authType = params.auth_type || 'bearer'; // 'bearer' or 'api_key'
      const authToken = params.auth_token || params.api_key;
      const headers = params.headers || {};

      if (!url) {
        return { content: JSON.stringify({ error: 'URL required', sent: false }) };
      }

      if (!authToken) {
        return { content: JSON.stringify({ error: 'Auth token required (auth_token or api_key)', sent: false }) };
      }

      const authHeader = authType === 'api_key' 
        ? { 'X-API-Key': authToken }
        : { 'Authorization': `Bearer ${authToken}` };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...authHeader,
            ...headers 
          },
          body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        const result = {
          sent: response.ok,
          status: response.status,
          statusText: response.statusText,
          auth_type: authType,
          response: responseData
        };
        
        return { content: JSON.stringify(result) };
      } catch (error) {
        return { content: JSON.stringify({ error: error.message, sent: false, url, auth_type: authType }) };
      }
    },

    test_endpoint: async (params) => {
      const url = params.url;
      const method = params.method || 'GET';
      const headers = params.headers || {};
      const timeout = params.timeout || 10000;

      if (!url) {
        return { content: JSON.stringify({ error: 'URL required', reachable: false }) };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText.substring(0, 500); // Limit non-JSON response size
        }

        const result = {
          reachable: response.ok,
          status: response.status,
          statusText: response.statusText,
          method,
          url,
          response_time_ms: timeout, // Approximate since we don't track exact timing
          content_type: response.headers.get('content-type'),
          response_preview: responseData
        };
        
        return { content: JSON.stringify(result) };
      } catch (error) {
        clearTimeout(timeoutId);
        
        const isTimeout = error.name === 'AbortError';
        return { 
          content: JSON.stringify({ 
            error: isTimeout ? 'Request timed out' : error.message, 
            reachable: false, 
            url,
            timed_out: isTimeout 
          }) 
        };
      }
    }
  }
};
