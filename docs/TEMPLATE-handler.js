/**
 * STANDARD SKILL HANDLER TEMPLATE
 * 
 * Copy this pattern for consistent env var handling across all skills.
 * 
 * Priority: process.env > config > stored credentials
 */

import { setupCredentials, getCredential } from '../lib/credentials.js';

// Required env vars for this skill
const REQUIRED_KEYS = ['SKILL_NAME_API_KEY'];

// Optional: map friendly names to env keys
const ENV_MAPPING = {
  apiKey: 'SKILL_NAME_API_KEY',
  apiSecret: 'SKILL_NAME_API_SECRET',
};

// Check credentials helper
function checkCredentials(config) {
  const missing = REQUIRED_KEYS.filter(key => !getCredential('skill-name', key, config));
  if (missing.length > 0) {
    throw new Error(`
${missing.join(', ')} required.

Set via:
1. Kai web UI environment variables (recommended)
2. CLI: kai-skills config set skill-name ${missing[0]} xxx
3. Conversation: "Set up skill-name"
`);
  }
}

export default {
  install: async (config) => {
    // Validate credentials exist (checks env vars first)
    try {
      checkCredentials(config);
      console.log('[skill-name] Credentials configured ✓');
    } catch (e) {
      console.warn('[skill-name] ' + e.message);
    }
  },

  actions: {
    // Standard setup action for conversation-based credential entry
    setup: async (params, config) => {
      const credentials = {};
      
      // Map params to env keys
      for (const [paramKey, envKey] of Object.entries(ENV_MAPPING)) {
        if (params[paramKey]) {
          credentials[paramKey] = params[paramKey];
        }
      }
      
      if (Object.keys(credentials).length === 0) {
        return { 
          content: JSON.stringify({ 
            error: 'No credentials provided',
            required: ENV_MAPPING,
            help: 'Provide credentials via: Kai web UI, cli config, or conversation'
          })
        };
      }
      
      const result = await setupCredentials('skill-name', credentials);
      
      return {
        content: JSON.stringify({
          success: true,
          message: 'Credentials saved',
          keys: result.keys,
          next_steps: 'Try using the skill now!'
        })
      };
    },

    // Example action - gets credential using standard priority
    example_action: async (params, config) => {
      const apiKey = getCredential('skill-name', 'SKILL_NAME_API_KEY', config);
      
      if (!apiKey) {
        return {
          content: JSON.stringify({
            error: 'SKILL_NAME_API_KEY not configured',
            setup: 'Say "Set up skill-name" to configure'
          })
        };
      }
      
      // Use apiKey for API call...
      return { content: 'Success!' };
    }
  }
};
