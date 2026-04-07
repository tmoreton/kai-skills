/**
 * OpenRouter Skill Handler
 * 
 * AI-powered content generation using OpenRouter API:
 * - Image generation with Gemini 3 Pro Image Preview
 * - Chat completions with any available model
 * 
 * Requires: OPENROUTER_API_KEY environment variable
 */

import { createRequire } from "module";
import path from "path";
import os from "os";
import fs from "fs";
import { setupCredentials, injectCredentials } from '../../lib/credentials.js';

// Dynamic import for optional dependency
function loadOpenAI() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require("openai");
  } catch (e) {
    throw new Error("openai package not installed. Run: npm install openai");
  }
}

// Ensure output directory exists
function ensureOutputDir(customDir) {
  const dir = customDir || path.join(os.homedir(), ".kai/agent-output/thumbnails");
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

async function generateImage({ prompt, width = 1280, height = 720, model = "google/gemini-3-pro-image-preview", output_dir, reference_image }, config) {
  const apiKey = process.env.OPENROUTER_API_KEY || config?.OPENROUTER_API_KEY;
  if (!apiKey) {
    const error = new Error(`
OpenRouter API Key Required
===========================

To generate images, you need an OpenRouter API key.

1. Go to: https://openrouter.ai/keys
2. Sign up and create an API key
3. Set: export OPENROUTER_API_KEY=your_key
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

  // Ensure output directory
  const outDir = ensureOutputDir(output_dir);
  const filename = generateFilename(prompt);
  const outputPath = path.join(outDir, filename);

  // Determine aspect ratio from dimensions
  let aspectRatio = "16:9";
  if (width && height) {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) aspectRatio = "1:1";
    else if (Math.abs(ratio - 4/3) < 0.1) aspectRatio = "4:3";
    else if (Math.abs(ratio - 3/4) < 0.1) aspectRatio = "3:4";
    else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = "9:16";
  }

  // Build message content with optional reference image
  const userContent = [];

  if (reference_image && fs.existsSync(reference_image)) {
    const ext = path.extname(reference_image).toLowerCase();
    const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[ext] || "image/jpeg";
    const base64 = fs.readFileSync(reference_image).toString("base64");
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${mime};base64,${base64}` },
    });
    console.log(`[openrouter] Using reference image: ${reference_image} (${Math.round(base64.length/1024)}KB)`);
  }

  userContent.push({ type: "text", text: prompt });

  // Retry up to 3 times
  let response;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 5000 * attempt));
      }

      response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
        max_tokens: 2048,
        image_config: { aspect_ratio: aspectRatio },
      });
      break;
    } catch (err) {
      lastError = err;
      if (!err.message?.includes("timeout") && !err.message?.includes("50")) {
        throw err;
      }
    }
  }

  if (!response) throw lastError || new Error("Image generation failed after 3 attempts");

  // Extract images from response
  const message = response.choices?.[0]?.message;

  // OpenRouter returns images in message.images[] array
  if (message?.images && Array.isArray(message.images)) {
    for (const img of message.images) {
      const url = img.image_url?.url || img.url;
      if (url) {
        const base64Match = url.match(/base64,(.+)/);
        if (base64Match) {
          fs.writeFileSync(outputPath, Buffer.from(base64Match[1], "base64"));
          return {
            success: true,
            output_path: outputPath,
            filename: filename,
            model: model,
            size: { width, height },
            prompt: prompt,
            reference_used: userContent.length > 1,
          };
        }
      }
    }
  }

  // Fallback: check content for base64 data URLs
  const content = message?.content;
  if (typeof content === "string") {
    const match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (match) {
      fs.writeFileSync(outputPath, Buffer.from(match[1], "base64"));
      return {
        success: true,
        output_path: outputPath,
        filename: filename,
        model: model,
        size: { width, height },
        prompt: prompt,
        reference_used: userContent.length > 1,
      };
    }
  } else if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === "image_url" && part.image_url?.url) {
        const base64Match = part.image_url.url.match(/base64,(.+)/);
        if (base64Match) {
          fs.writeFileSync(outputPath, Buffer.from(base64Match[1], "base64"));
          return {
            success: true,
            output_path: outputPath,
            filename: filename,
            model: model,
            size: { width, height },
            prompt: prompt,
            reference_used: userContent.length > 1,
          };
        }
      }
    }
  }

  throw new Error("No image data found in response");
}

async function chatCompletion({ prompt, model, temperature = 0.7, max_tokens = 2048 }, config) {
  const apiKey = config.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  const defaultModel = config.OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
  
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured. Get one at https://openrouter.ai/keys");
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

  const response = await client.chat.completions.create({
    model: model || defaultModel,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens,
  });

  const message = response.choices?.[0]?.message;
  
  return {
    success: true,
    content: message?.content || "",
    model: response.model,
    usage: response.usage,
    finish_reason: response.choices?.[0]?.finish_reason,
  };
}

async function listModels({ filter }, config) {
  const apiKey = config.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
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

  const response = await client.models.list();
  let models = response.data || [];

  if (filter) {
    const f = filter.toLowerCase();
    models = models.filter(m => 
      m.id?.toLowerCase().includes(f) || 
      m.name?.toLowerCase().includes(f)
    );
  }

  return {
    success: true,
    models: models.map(m => ({
      id: m.id,
      name: m.name || m.id,
      context_length: m.context_length,
      pricing: m.pricing,
    })),
  };
}

export default {
  install: async (config) => {
    const apiKey = process.env.OPENROUTER_API_KEY || config?.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("[openrouter] Warning: OPENROUTER_API_KEY not configured. Image generation will fail until set.");
    }
  },

  uninstall: async () => {},

  actions: {
    generate_image: generateImage,
    chat: chatCompletion,
    list_models: listModels,
  },
};
