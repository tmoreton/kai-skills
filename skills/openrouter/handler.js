/**
 * OpenRouter Skill Handler
 * 
 * AI-powered content generation using OpenRouter API
 */

import { createRequire } from "module";
import path from "path";
import os from "os";
import fs from "fs";

function loadOpenAI() {
  try {
    const require = createRequire(process.cwd() + "/package.json");
    return require("openai");
  } catch (e) {
    throw new Error("openai package not installed");
  }
}

function ensureOutputDir(customDir) {
  const dir = customDir || path.join(os.homedir(), ".kai/agent-output/thumbnails");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generateFilename(prompt) {
  const timestamp = Date.now();
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 50).replace(/^-|-$/g, "");
  return `${timestamp}-${slug}.png`;
}

async function generateImage({ prompt, width = 1280, height = 720, model = "google/gemini-3-pro-image-preview", output_dir, reference_image }, config) {
  const apiKey = process.env.OPENROUTER_API_KEY || config?.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const { default: OpenAI } = loadOpenAI();
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: { "HTTP-Referer": "https://kai.dev", "X-Title": "Kai" },
  });

  const outDir = ensureOutputDir(output_dir);
  const filename = generateFilename(prompt);
  const outputPath = path.join(outDir, filename);

  // Determine aspect ratio
  let aspectRatio = "16:9";
  if (width && height) {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) aspectRatio = "1:1";
    else if (Math.abs(ratio - 4/3) < 0.1) aspectRatio = "4:3";
    else if (Math.abs(ratio - 3/4) < 0.1) aspectRatio = "3:4";
    else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = "9:16";
  }

  // Build message content
  const userContent = [];
  if (reference_image && fs.existsSync(reference_image)) {
    const ext = path.extname(reference_image).toLowerCase();
    const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[ext] || "image/jpeg";
    const base64 = fs.readFileSync(reference_image).toString("base64");
    userContent.push({ type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } });
  }
  userContent.push({ type: "text", text: prompt });

  // Generate image
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: userContent }],
    modalities: ["image", "text"],
    max_tokens: 2048,
    image_config: { aspect_ratio: aspectRatio },
  });

  const message = response.choices?.[0]?.message;

  // Extract and save image
  if (message?.images) {
    for (const img of message.images) {
      const url = img.image_url?.url || img.url;
      if (url) {
        const base64Match = url.match(/base64,(.+)/);
        if (base64Match) {
          fs.writeFileSync(outputPath, Buffer.from(base64Match[1], "base64"));
          return outputPath;
        }
      }
    }
  }

  // Fallback to content parsing
  const content = message?.content;
  if (typeof content === "string") {
    const match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (match) {
      fs.writeFileSync(outputPath, Buffer.from(match[1], "base64"));
      return outputPath;
    }
  }

  throw new Error("No image data in response");
}

async function chatCompletion({ prompt, model, temperature = 0.7, max_tokens = 2048 }, config) {
  const apiKey = config.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const { default: OpenAI } = loadOpenAI();
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: { "HTTP-Referer": "https://kai.dev", "X-Title": "Kai" },
  });

  const response = await client.chat.completions.create({
    model: model || config.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens,
  });

  return response.choices?.[0]?.message?.content || "";
}

export default {
  install: async () => {},
  uninstall: async () => {},
  actions: {
    generate_image: generateImage,
    chat: chatCompletion,
  },
};
