/**
 * OpenRouter Skill Handler
 * 
 * AI-powered content generation using OpenRouter API:
 * - Image generation with Nano Banana and other models
 * - Chat completions with any available model
 * - Model discovery and routing
 * 
 * Requires: OPENROUTER_API_KEY environment variable
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

async function generateImage({ prompt, width = 1280, height = 720, model = "google/gemma-3-27b-it", output_dir, reference_image }, config) {
  const apiKey = config.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
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

  // Ensure output directory
  const outDir = ensureOutputDir(output_dir);
  const filename = generateFilename(prompt);
  const outputPath = path.join(outDir, filename);

  try {
    // For image generation models that support it
    const response = await client.images.generate({
      model: model,
      prompt: prompt,
      n: 1,
      size: `${width}x${height}`,
      response_format: "url",
    });

    if (!response.data || !response.data[0]) {
      throw new Error("No image data returned from OpenRouter");
    }

    const imageUrl = response.data[0].url;
    
    // Download and save the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    
    const buffer = await imageResponse.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));

    return {
      success: true,
      output_path: outputPath,
      filename: filename,
      url: imageUrl,
      model: model,
      size: { width, height },
      prompt: prompt,
    };
  } catch (error) {
    // Fallback: return the URL if download fails but generation succeeded
    if (error.message.includes("download") && response?.data?.[0]?.url) {
      return {
        success: true,
        output_path: null,
        filename: filename,
        url: response.data[0].url,
        model: model,
        size: { width, height },
        prompt: prompt,
        note: "Image generated but could not download. URL provided.",
      };
    }
    throw error;
  }
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

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://kai.dev",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    let models = data.data || [];

    // Filter by capability if specified
    if (filter === "image") {
      models = models.filter(m => 
        m.id.includes("dall-e") || 
        m.id.includes("gemma") || 
        m.id.includes("image") ||
        m.id.includes("banana") ||
        m.id.includes("recraft") ||
        m.id.includes("ideogram")
      );
    }

    return {
      success: true,
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        pricing: m.pricing,
        context_length: m.context_length,
        architecture: m.architecture,
      })),
      total: models.length,
      filter: filter || "all",
    };
  } catch (error) {
    throw new Error(`Failed to list models: ${error.message}`);
  }
}

async function getGenerationStatus({ generation_id }, config) {
  // Note: OpenRouter doesn't have a separate status endpoint for most image models
  // This is a placeholder for models that support async generation
  return {
    success: true,
    generation_id,
    status: "complete",
    note: "Most OpenRouter image models are synchronous. Status is typically 'complete' immediately.",
  };
}

export default {
  actions: {
    generate_image: async (params, config) => {
      const result = await generateImage(params, config);
      return { content: JSON.stringify(result) };
    },
    chat_completion: async (params, config) => {
      const result = await chatCompletion(params, config);
      return { content: JSON.stringify(result) };
    },
    list_models: async (params, config) => {
      const result = await listModels(params, config);
      return { content: JSON.stringify(result) };
    },
    get_generation_status: async (params, config) => {
      const result = await getGenerationStatus(params, config);
      return { content: JSON.stringify(result) };
    },
  },

  // Install hook - validate API key on install
  install: async (config) => {
    const apiKey = config.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("[openrouter] No OPENROUTER_API_KEY configured. Skill will work but requires API key to be set in environment.");
    }
    // Ensure default output directory exists
    ensureOutputDir();
  },
};
