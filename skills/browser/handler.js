/**
 * Browser Skill Handler — Playwright-based web browsing
 *
 * Provides tools to navigate pages, interact with elements,
 * take screenshots, and extract content using a real browser.
 * Standalone version - works with Kai, MCP, or direct API usage.
 */

import playwright from "playwright";
import fs from "fs";
import path from "path";
import { homedir } from "os";

let browser = null;
let page = null;
let config = {};

/**
 * Load configuration from environment or defaults
 */
function loadConfig() {
  config = {
    headless: process.env.BROWSER_HEADLESS !== "false",
    timeoutMs: parseInt(process.env.BROWSER_TIMEOUT_MS || "30000", 10),
    contentLimit: parseInt(process.env.BROWSER_CONTENT_LIMIT || "80000", 10),
    outputDir: process.env.BROWSER_OUTPUT_DIR || path.join(homedir(), ".kai", "agent-output", "browser"),
  };
}

async function ensureBrowser() {
  if (browser && page) return page;

  loadConfig();

  browser = await playwright.chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  page = await context.newPage();
  page.setDefaultTimeout(config.timeoutMs);
  return page;
}

function extractReadableText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default {
  install: async (inputConfig) => {
    if (inputConfig) {
      config = { ...config, ...inputConfig };
    }
    loadConfig();

    // Ensure Playwright browsers are installed
    try {
      const execPath = playwright.chromium.executablePath();
      if (!fs.existsSync(execPath)) {
        console.log("  Installing Playwright Chromium...");
        const { execSync } = await import("child_process");
        execSync("npx playwright install chromium", { stdio: "inherit" });
      }
    } catch {
      // Will fail at action time with clear message
    }
  },

  uninstall: async () => {
    if (browser) {
      await browser.close().catch(() => {});
      browser = null;
      page = null;
    }
  },

  actions: {
    open: async (params) => {
      const p = await ensureBrowser();
      await p.goto(params.url, {
        waitUntil: "domcontentloaded",
        timeout: config.timeoutMs,
      });

      if (params.wait_for) {
        await p.waitForSelector(params.wait_for, { timeout: 10000 }).catch(() => {});
      }

      // Give JS a moment to render
      await p.waitForTimeout(1000);

      const title = await p.title();
      const url = p.url();
      const html = await p.content();
      const text = extractReadableText(html);

      return {
        title,
        url,
        content: text.substring(0, config.contentLimit),
        content_length: text.length,
      };
    },

    click: async (params) => {
      const p = await ensureBrowser();
      const CLICK_TIMEOUT = 5000;

      try {
        if (params.selector) {
          await p.click(params.selector, { timeout: CLICK_TIMEOUT });
        } else if (params.text) {
          await p.getByText(params.text, { exact: false }).first().click({ timeout: CLICK_TIMEOUT });
        } else {
          throw new Error("Provide either 'selector' or 'text' to identify the element to click");
        }
      } catch (err) {
        // On timeout, return visible clickable elements to help the model pick the right one
        const clickables = await p.evaluate(() => {
          const els = document.querySelectorAll("a, button, input, select, textarea, [role='button'], [onclick]");
          return [...els].slice(0, 30).map((el) => ({
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute("type"),
            text: (el.textContent || "").trim().substring(0, 80),
            placeholder: el.getAttribute("placeholder"),
            name: el.getAttribute("name"),
            id: el.id || undefined,
            class: el.className ? el.className.substring(0, 60) : undefined,
          }));
        });
        throw new Error(
          `Could not find element to click (${params.selector || params.text}). ` +
          `Available clickable elements:\n${JSON.stringify(clickables, null, 2)}`
        );
      }

      await p.waitForTimeout(1000);

      const title = await p.title();
      const url = p.url();
      return { clicked: true, title, url };
    },

    fill: async (params) => {
      const p = await ensureBrowser();
      await p.fill(params.selector, params.value);
      return { filled: true, selector: params.selector };
    },

    screenshot: async (params) => {
      const p = await ensureBrowser();

      let buffer;
      if (params.selector) {
        const element = p.locator(params.selector);
        buffer = await element.screenshot({ type: "png" });
      } else {
        buffer = await p.screenshot({
          type: "png",
          fullPage: params.full_page || false,
        });
      }

      const title = await p.title();
      const url = p.url();

      // Return as base64 for MCP compatibility
      if (params.return_type === "base64") {
        return {
          type: "image",
          data: buffer.toString("base64"),
          mimeType: "image/png",
          title,
          url,
        };
      }

      // Save to file (default)
      const outDir = config.outputDir;
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `browser-${Date.now()}.png`);
      fs.writeFileSync(outPath, buffer);

      return {
        type: "image_result",
        title,
        url,
        path: outPath,
        size_kb: Math.round(buffer.length / 1024),
      };
    },

    evaluate: async (params) => {
      const p = await ensureBrowser();
      let result;
      try {
        result = await p.evaluate(`(async () => { ${params.script} })()`);
      } catch {
        result = await p.evaluate(params.script);
      }
      return { result };
    },

    get_content: async () => {
      const p = await ensureBrowser();
      const title = await p.title();
      const url = p.url();
      const html = await p.content();
      const text = extractReadableText(html);

      return {
        title,
        url,
        content: text.substring(0, config.contentLimit),
        content_length: text.length,
      };
    },

    close: async () => {
      if (browser) {
        await browser.close().catch(() => {});
        browser = null;
        page = null;
        return { closed: true };
      }
      return { closed: false, message: "No browser session active" };
    },
  },
};
