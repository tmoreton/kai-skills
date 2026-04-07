#!/bin/bash
# Kai MCP Quick Setup - Run this to add all Kai skills to Claude

echo "🚀 Kai MCP Quick Setup"
echo "======================"
echo ""

SKILLS_DIR="$HOME/.kai/skills"

# Check if skills exist
if [ ! -d "$SKILLS_DIR" ]; then
    echo "❌ Skills not found at $SKILLS_DIR"
    echo ""
    echo "Install skills first:"
    echo "  git clone https://github.com/tmoreton/kai-skills ~/.kai/skills"
    exit 1
fi

# Count skills
SKILL_COUNT=$(find "$SKILLS_DIR" -name "handler.js" | wc -l)

if [ "$SKILL_COUNT" -eq 0 ]; then
    echo "❌ No skills with handlers found"
    exit 1
fi

echo "Found $SKILL_COUNT Kai skills"
echo ""
echo "Adding to Claude Desktop/Code..."
echo ""

# Add each skill
for handler in "$SKILLS_DIR"/*/handler.js; do
    if [ -f "$handler" ]; then
        skill_name=$(basename $(dirname "$handler"))
        echo "📦 Adding $skill_name..."
        claude mcp add "kai-$skill_name" -- node "$handler" 2>/dev/null || echo "   (already added or claude not found)"
    fi
done

echo ""
echo "✅ Done! Restart Claude Desktop or run 'claude' to use the skills."
echo ""
echo "Test with: 'Get my YouTube stats for channel UCBa659QWEk1AI4Tg--mrJ2A'"
