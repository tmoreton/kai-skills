# Git Skill

Advanced Git operations for AI assistants. Works with Kai, Claude Desktop, or any MCP-compatible client.

## Installation

### Via Kai CLI
```bash
kai skills install git
```

### Via Standalone CLI
```bash
npx kai-skills install git --target=kai
```

### For Claude Desktop (MCP)
```bash
npx kai-skills install git --target=mcp
```

## Tools

- `git_smart_commit` - AI-powered commit with auto-generated messages
- `git_pr_create` - Full PR workflow (branch, commit, push, open PR)
- `git_log_summary` - Summarize commit history with statistics
- `git_branch_suggest` - Suggest branch names based on context
- `git_status_detailed` - Detailed status with file analysis

## Configuration

Set these environment variables to customize behavior:

```bash
GIT_DEFAULT_BRANCH=main  # Default base branch for PRs
```

## Requirements

- Git CLI
- GitHub CLI (`gh`) - only for PR creation

## Example Usage

```javascript
// Smart commit with push
const result = await gitSkill.actions.git_smart_commit({
  scope: "api",
  push: true
});

// Create PR
const pr = await gitSkill.actions.git_pr_create({
  title: "Add user authentication",
  body: "Implements JWT-based auth with refresh tokens"
});
```
