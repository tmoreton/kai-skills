/**
 * Git Skill Handler - Advanced Git Operations
 * 
 * Provides smart commits, PR workflows, and branch management.
 * Standalone version - works with Kai, MCP, or direct API usage.
 */

import { execFileSync, execSync } from "child_process";

/**
 * Execute a git command securely (no shell injection)
 */
function execGit(args: string[], options: { timeout?: number } = {}): { success: boolean; output: string; error?: string } {
  try {
    const output = execFileSync("git", args, {
      encoding: "utf-8",
      timeout: options.timeout || 30000,
    });
    return { success: true, output };
  } catch (e: any) {
    return {
      success: false,
      output: e.stdout || "",
      error: e.stderr || e.message || "Unknown error",
    };
  }
}

/**
 * Check if a command exists in PATH
 */
function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a conventional commit message from git diff
 */
function generateCommitMessage(scope?: string): string {
  const result = execGit(["diff", "--staged", "--stat"]);
  if (!result.success) return "update";

  const files = result.output;
  const type = detectCommitType(files);
  const scopePart = scope ? `${scope}:` : "";
  const message = generateSimpleMessage(files);

  return scopePart ? `${type}(${scope}): ${message}` : `${type}: ${message}`;
}

function detectCommitType(files: string): string {
  if (files.includes("test") || files.includes("spec")) return "test";
  if (files.includes("doc") || files.includes("README")) return "docs";
  if (files.includes("fix") || files.includes("bug")) return "fix";
  if (files.includes("refactor")) return "refactor";
  return "feat";
}

function generateSimpleMessage(files: string): string {
  const lines = files.split("\n").filter(l => l.includes("|") && !l.includes("files changed"));

  if (lines.length === 0) return "update";
  if (lines.length === 1) {
    const file = lines[0].split("|")[0].trim();
    return `update ${file}`;
  }

  const categories = categorizeFiles(lines);
  if (categories.length === 1) {
    return `update ${categories[0]}`;
  }

  return `update ${categories.join(", ")}`;
}

function categorizeFiles(lines: string[]): string[] {
  const categories = new Set<string>();

  for (const line of lines) {
    const file = line.split("|")[0].trim();
    if (file.startsWith("src/")) categories.add("source code");
    else if (file.startsWith("test/") || file.includes(".test.")) categories.add("tests");
    else if (file.startsWith("docs/") || file.endsWith(".md")) categories.add("docs");
    else if (file.startsWith("config/") || file.endsWith(".json")) categories.add("config");
    else categories.add("files");
  }

  return [...categories];
}

function suggestBranchName(description: string, prefix = "feature/"): string {
  let slug = (description || "changes")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 40)
    .replace(/-+$/, "");

  const timestamp = Date.now().toString(36).slice(-4);
  return `${prefix}${slug}-${timestamp}`;
}

// Skill handler export
export default {
  actions: {
    git_smart_commit: (params: { message?: string; scope?: string; push?: boolean; dry_run?: boolean }) => {
      if (!commandExists("git")) {
        return { error: "Git is not installed or not in PATH", success: false };
      }

      // Check for staged changes
      const statusResult = execGit(["diff", "--cached", "--quiet"]);
      const hasStaged = !statusResult.success; // diff returns error code 1 if there are changes

      if (!hasStaged) {
        const unstagedResult = execGit(["diff", "--quiet"]);
        const hasUnstaged = !unstagedResult.success;
        if (hasUnstaged) {
          return {
            content: "No staged changes. Run 'git add' first, or stage all changes.",
            staged: false,
            unstaged: true,
          };
        }
        return { content: "No changes to commit.", staged: false, unstaged: false };
      }

      const commitMessage = params.message || generateCommitMessage(params.scope);

      if (params.dry_run) {
        const statResult = execGit(["diff", "--staged", "--stat"]);
        return {
          content: `Dry run - would commit:\n\nMessage: ${commitMessage}\n\nFiles:\n${statResult.output}`,
          dry_run: true,
        };
      }

      // Commit using secure execution
      const commitResult = execGit(["commit", "-m", commitMessage]);

      let output = commitResult.success
        ? `Committed: ${commitMessage}`
        : `Commit failed: ${commitResult.error}`;

      if (params.push && commitResult.success) {
        const pushResult = execGit(["push"]);
        output += "\n" + (pushResult.success ? "Push successful" : `Push failed: ${pushResult.error}`);
      }

      return { content: output, message: commitMessage, pushed: params.push };
    },

    git_pr_create: (params: { title: string; body?: string; base?: string; branch_name?: string; draft?: boolean }) => {
      if (!commandExists("git")) {
        return { error: "Git is not installed", success: false };
      }
      if (!commandExists("gh")) {
        return { error: "GitHub CLI (gh) is required for PR creation", success: false };
      }

      // Check for uncommitted changes
      const statusResult = execGit(["status", "--porcelain"]);
      if (statusResult.output.trim()) {
        return {
          content: "Uncommitted changes detected. Commit them first with git_smart_commit.",
          hasChanges: true,
        };
      }

      const base = params.base || process.env.GIT_DEFAULT_BRANCH || "main";
      const branch = params.branch_name || suggestBranchName(params.title);

      const currentBranchResult = execGit(["branch", "--show-current"]);
      const currentBranch = currentBranchResult.output.trim();

      // Create branch
      const checkoutResult = execGit(["checkout", "-b", branch, currentBranch]);
      if (!checkoutResult.success) {
        return { error: `Failed to create branch: ${checkoutResult.error}`, success: false };
      }

      // Push branch
      const pushResult = execGit(["push", "-u", "origin", branch]);
      if (!pushResult.success) {
        return { error: `Failed to push branch: ${pushResult.error}`, success: false };
      }

      // Create PR using gh CLI
      const draftFlag = params.draft ? ["--draft"] : [];
      const bodyFlag = params.body ? ["--body", params.body] : [];
      
      const prResult = execGit([
        "--no-pager",
        "pr", "create",
        "--title", params.title,
        "--base", base,
        ...bodyFlag,
        ...draftFlag,
      ]);

      return {
        content: prResult.success
          ? `Created PR: ${prResult.output}`
          : `PR creation failed: ${prResult.error}`,
        branch,
        success: prResult.success,
      };
    },

    git_log_summary: (params: { since?: string; max_entries?: number; format?: "changelog" | "summary" | "list" }) => {
      if (!commandExists("git")) {
        return { error: "Git is not installed", success: false };
      }

      const since = params.since || "1 week ago";
      const maxEntries = params.max_entries || 50;

      const logResult = execGit(["log", `--since=${since}`, "--oneline", "-n", String(maxEntries)]);

      if (!logResult.success || !logResult.output.trim()) {
        return { content: `No commits found since ${since}`, count: 0 };
      }

      const commits = logResult.output.trim().split("\n");

      if (params.format === "list") {
        return { content: logResult.output, count: commits.length };
      }

      if (params.format === "changelog") {
        const entries = commits.map(c => {
          const match = c.match(/^([a-f0-9]+)\s+(.+)$/);
          if (match) {
            return `- ${match[2]} (${match[1].slice(0, 7)})`;
          }
          return `- ${c}`;
        });
        return { content: entries.join("\n"), count: commits.length };
      }

      // Summary format
      const types: Record<string, number> = {};
      const scopes: Record<string, number> = {};

      for (const commit of commits) {
        const msg = commit.replace(/^[a-f0-9]+\s+/, "");
        const typeMatch = msg.match(/^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:/);
        if (typeMatch) {
          types[typeMatch[1]] = (types[typeMatch[1]] || 0) + 1;
          if (typeMatch[2]) {
            const scope = typeMatch[2].slice(1, -1);
            scopes[scope] = (scopes[scope] || 0) + 1;
          }
        }
      }

      let summary = `**${commits.length} commits** since ${since}\n\n`;

      if (Object.keys(types).length > 0) {
        summary += "**By type:**\n";
        for (const [type, count] of Object.entries(types)) {
          summary += `- ${type}: ${count}\n`;
        }
        summary += "\n";
      }

      if (Object.keys(scopes).length > 0) {
        summary += "**By scope:**\n";
        for (const [scope, count] of Object.entries(scopes)) {
          summary += `- ${scope}: ${count}\n`;
        }
      }

      summary += "\n**Recent commits:**\n" + commits.slice(0, 5).join("\n");

      return { content: summary, count: commits.length, types, scopes };
    },

    git_branch_suggest: (params: { context?: string; prefix?: string; max_length?: number }) => {
      if (!commandExists("git")) {
        return { content: "git-not-installed", success: false };
      }

      let baseDescription = params.context;

      if (!baseDescription) {
        const filesResult = execGit(["diff", "--name-only"]);
        const files = filesResult.output.trim().split("\n").filter(Boolean);
        
        if (files.length > 0) {
          const dirs = files.map(f => f.split("/")[0]).filter(Boolean);
          const dirCounts: Record<string, number> = {};
          for (const d of dirs) dirCounts[d] = (dirCounts[d] || 0) + 1;
          const topDir = Object.entries(dirCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
          baseDescription = `update-${topDir || "files"}`;
        } else {
          baseDescription = "changes";
        }
      }

      const prefix = params.prefix || "feature/";
      const maxLength = params.max_length || 50;
      const branchName = suggestBranchName(baseDescription, prefix).substring(0, maxLength);

      return { content: branchName, branchName };
    },

    git_status_detailed: (params: { analyze?: boolean }) => {
      if (!commandExists("git")) {
        return { error: "Git is not installed", success: false };
      }

      const statusResult = execGit(["status", "-sb"]);
      const porcelainResult = execGit(["status", "--porcelain"]);

      let output = statusResult.output || "No changes";

      if (params.analyze !== false && porcelainResult.output) {
        const lines = porcelainResult.output.trim().split("\n");
        const staged = lines.filter(l => l.match(/^[AMDRC]/));
        const unstaged = lines.filter(l => l.match(/^[AMDRC]?\s+[MD?]/));

        output += "\n\n**Analysis:**\n";
        output += `- ${staged.length} staged file(s)\n`;
        output += `- ${unstaged.length} unstaged file(s)\n`;

        if (staged.length > 0) {
          output += "\n**Staged files:**\n";
          for (const f of staged.slice(0, 10)) {
            output += `- ${f.substring(3)}\n`;
          }
        }

        if (unstaged.length > 0) {
          output += "\n**Unstaged files:**\n";
          for (const f of unstaged.slice(0, 10)) {
            output += `- ${f.substring(3)}\n`;
          }
        }
      }

      return { content: output };
    },
  },
};
