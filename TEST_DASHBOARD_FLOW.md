# End-to-End Dashboard Setup Test

## Scenario: New User Setting Up Personal Dashboard

---

## Test 1: Install kai-skills Helper

```bash
# As a new user, first install the helper
npm install -g kai-skills

# Verify it works
kai-skills
```

**Expected:** Shows list of commands and "No Kai skills found" message

---

## Test 2: Install Skills

```bash
# Download all skills from GitHub
kai-skills install
```

**Expected:** 
- Clones https://github.com/tmoreton/kai-skills to ~/.kai/skills
- Shows progress
- Lists all 21 installed skills

---

## Test 3: Add Skills to Claude

```bash
# Add just the dashboard skill first
kai-skills add dashboard

# Or add all skills at once
kai-skills add all
```

**Expected:**
- Runs `claude mcp add kai-dashboard -- node ~/.kai/skills/dashboard/handler.js`
- Shows "✅ Added kai-dashboard" or similar

---

## Test 4: Start Dashboard

```bash
# The user wants to start their dashboard
# They can ask Claude:
```

**In Claude Desktop:**
> "Start my social media dashboard"

**Expected:**
- Claude recognizes the dashboard skill
- Runs the dashboard start action
- Shows: "Dashboard started at http://localhost:3000"

---

## Test 5: Open Dashboard in Browser

```bash
# User opens dashboard
open http://localhost:3000
```

**Expected:**
- Clean UI loads
- Shows "Connect Your Accounts" section
- Has quick action buttons for YouTube, Instagram, Twitter

---

## Test 6: Connect YouTube Account

**In Dashboard UI:**
1. Click "YouTube" button
2. See instructions with code block:
   ```
   # Setup (one-time):
   echo "YOUTUBE_API_KEY=your_key" > ~/.kai/.env
   
   # Then run:
   kai-skill youtube get_channel '{"channel_id": "YOUR_CHANNEL_ID"}'
   ```
3. User follows instructions, gets API key from Google Cloud
4. Pastes JSON output into dashboard
5. Click "Paste Data"

**Expected:**
- Dashboard shows YouTube stats
- Progress bar appears for "Road to 100K"

---

## Test 7: Add More Platforms

Repeat Test 6 for:
- Instagram (get token from Meta Developers)
- Twitter/X (get keys from Twitter Developer Portal)

---

## Test 8: View Unified Analytics

**In Dashboard:**
- Overview tab shows totals across all platforms
- Individual tabs show platform-specific data
- PDF export button works
- Auto-refresh fetches latest data

---

## Test 9: Use Claude with Connected Data

**In Claude Desktop:**
> "Create a weekly report with my YouTube and Instagram stats"

**Expected:**
- Claude fetches real data from dashboard
- Generates formatted report
- Suggests exporting to Google Sheets

---

## Test Checklist

- [ ] kai-skills installs cleanly
- [ ] Skills download without errors
- [ ] Claude MCP add works
- [ ] Dashboard starts on localhost:3000
- [ ] UI is clean and intuitive
- [ ] YouTube connection works
- [ ] Instagram connection works
- [ ] Twitter connection works
- [ ] Analytics display correctly
- [ ] PDF export works
- [ ] Claude can query the dashboard

---

## Common Issues

### Issue 1: "claude command not found"
**Fix:** Install Claude Desktop from https://claude.ai/download

### Issue 2: "skills not found"
**Fix:** Run `kai-skills install` first

### Issue 3: API key errors
**Fix:** Follow api-setup.html guide for each platform

### Issue 4: Port 3000 in use
**Fix:** Dashboard auto-increments to 3001, 3002, etc.

---

## Success Criteria

User can:
1. Install everything in under 5 minutes
2. Connect at least one social platform
3. See real analytics in the dashboard
4. Ask Claude questions about their data
5. Export/share reports
