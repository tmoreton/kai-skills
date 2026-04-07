/**
 * Image Generation Skill Handler
 * 
 * Generate thumbnails, images, and graphics using AI models.
 * Uses OpenRouter API for image generation with various models.
 */

import { createRequire } from "module";
import path from "path";
import os from "os";
import fs from "fs";

// Dynamic import for optional dependency
function loadOpenAI() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require("openai");
  } catch (e) {
    throw new Error(
      "openai package not installed. Run: npm install openai"
    );
  }
}

// Ensure output directory exists
function ensureOutputDir(customDir) {
  const dir = customDir || path.join(os.homedir(), ".kai", "agent-output", "thumbnails");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Generate unique filename
function generateFilename(prompt) {
  const timestamp = Date.now();
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 50)
    .replace(/^-|-$/g, "");
  return `${timestamp}-${slug}.png`;
}

let _config = {};

export default {
  install: async (config) => {
    _config = config;
  },

  uninstall: async () => {
    _config = {};
  },

  actions: {
    // Generate a thumbnail for YouTube/video content
    generate_thumbnail: async (params) => {
      const apiKey = _config.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        const error = new Error(`
OpenRouter API Key Required
===========================

To generate thumbnails and images, you need an OpenRouter API key.

Get your free API key:
1. Go to: https://openrouter.ai/keys
2. Sign up (or sign in with Google/GitHub)
3. Create a new API key
4. Copy your key

Set it via environment variable:
  export OPENROUTER_API_KEY=your_api_key_here

Or add to Claude Desktop config and restart.

Note: You may need to add credits ($5-10) to generate images.
`);
        error.code = 'MISSING_API_KEY';
        throw error;
      }

      const { default: OpenAI } = loadOpenAI();
      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        defaultHeaders: {
          "HTTP-Referer": "https://kai.dev",
          "X-Title": "Kai AI Assistant",
        },
      });

      const prompt = params.prompt || params.title || params.description || "professional thumbnail";
      const width = params.width || params.size?.width || 1280;
      const height = params.height || params.size?.height || 720;
      const style = params.style || "professional, eye-catching, YouTube thumbnail";
      const model = params.model || "google/gemma-3-27b-it";
      
      const fullPrompt = `Create a professional thumbnail image: ${prompt}. Style: ${style}. High quality, vibrant colors, clear composition, suitable for video content.`;

      try {
        const outDir = ensureOutputDir(params.output_dir);
        const filename = generateFilename(prompt);
        const outputPath = path.join(outDir, filename);

        const response = await client.images.generate({
          model: model,
          prompt: fullPrompt,
          size: `${width}x${height}`,
          n: 1,
        });

        const imageUrl = response.data?.[0]?.url;
        if (!imageUrl) {
          return { content: JSON.stringify({ error: "No image generated", success: false }) };
        }

        // Download and save the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        fs.writeFileSync(outputPath, imageBuffer);

        return {
          content: JSON.stringify({
            success: true,
            path: outputPath,
            url: imageUrl,
            filename,
            prompt: fullPrompt,
            size: { width, height },
            model,
          }, null, 2),
        };
      } catch (e) {
        return {
          content: JSON.stringify({ error: e.message, success: false }),
          isError: true,
        };
      }
    },

    // Generate any image with custom parameters
    generate_image: async (params) => {
      const apiKey = _config.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        const error = new Error(`
OpenRouter API Key Required
===========================

To generate images, you need an OpenRouter API key.

Get your free API key:
1. Go to: https://openrouter.ai/keys
2. Sign up (or sign in with Google/GitHub)
3. Create a new API key
4. Copy your key

Set it via environment variable:
  export OPENROUTER_API_KEY=your_api_key_here

Or add to Claude Desktop config and restart.

Note: You may need to add credits ($5-10) to generate images.
`);
        error.code = 'MISSING_API_KEY';
        throw error;
      }

      const { default: OpenAI } = loadOpenAI();
      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        defaultHeaders: {
          "HTTP-Referer": "https://kai.dev",
          "X-Title": "Kai AI Assistant",
        },
      });

      const prompt = params.prompt || "a beautiful landscape";
      const width = params.width || 1024;
      const height = params.height || 1024;
      const model = params.model || "google/gemma-3-27b-it";
      const n = params.n || params.count || 1;

      try {
        const outDir = ensureOutputDir(params.output_dir);
        const results = [];

        for (let i = 0; i < n; i++) {
          const response = await client.images.generate({
            model: model,
            prompt: prompt,
            size: `${width}x${height}`,
            n: 1,
          });

          const imageUrl = response.data?.[0]?.url;
          if (imageUrl) {
            // Download and save
            const filename = generateFilename(`${prompt}-${i + 1}`);
            const outputPath = path.join(outDir, filename);
            
            const imageResponse = await fetch(imageUrl);
            if (imageResponse.ok) {
              const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
              fs.writeFileSync(outputPath, imageBuffer);
              
              results.push({
                path: outputPath,
                url: imageUrl,
                filename,
              });
            }
          }
        }

        return {
          content: JSON.stringify({
            success: true,
            images: results,
            prompt,
            count: results.length,
            size: { width, height },
            model,
          }, null, 2),
        };
      } catch (e) {
        return {
          content: JSON.stringify({ error: e.message, success: false }),
          isError: true,
        };
      }
    },

    // List available image generation models
    list_models: async () => {
      return {
        content: JSON.stringify({
          models: [
            { id: "google/gemma-3-27b-it", name: "Gemma 3 27B", description: "Good general purpose image generation" },
            { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", description: "High quality, detailed images" },
            { id: "openai/dall-e-3", name: "DALL-E 3", description: "Best for realistic images (requires credits)" },
            { id: "stability-ai/stable-diffusion-xl", name: "Stable Diffusion XL", description: "Fast, good quality" },
          ],
          default: "google/gemma-3-27b-it",
        }, null, 2),
      };
    },

    // Get info about a generated image
    get_image_info: async (params) => {
      const imagePath = params.path || params.filename;
      if (!imagePath) {
        return { content: JSON.stringify({ error: "Image path required" }) };
      }

      try {
        const stats = fs.statSync(imagePath);
        return {
          content: JSON.stringify({
            path: imagePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          }, null, 2),
        };
      } catch (e) {
        return { content: JSON.stringify({ error: e.message }) };
      }
    },
  },
};
