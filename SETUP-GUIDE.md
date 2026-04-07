# Kai Dashboard - Setup Guide

Simple step-by-step instructions for connecting each social media platform.

---

## Quick Start

```bash
# 1. Install and start dashboard
kai-skill dashboard install
kai-skill dashboard start

# 2. Open dashboard
open http://localhost:3000

# 3. Follow platform-specific instructions below
```

---

## YouTube

**What you need:** YouTube Data API v3 key

**Time:** 3 minutes

### Step 1: Create Google Cloud Project
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name it "Kai Dashboard" → Click "Create"

### Step 2: Enable YouTube API
1. In your project, go to "APIs & Services" → "Library"
2. Search "YouTube Data API v3"
3. Click it → Click "Enable"

### Step 3: Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the key (starts with `AIza...`)

### Step 4: Add to Dashboard
1. In dashboard, click "YouTube"
2. Paste your API Key
3. (Optional) Add your Channel ID from YouTube Studio
4. Click "Connect YouTube"

**Done!** Your YouTube stats will appear in the dashboard.

---

## Instagram

**What you need:** Instagram Access Token

**Time:** 5 minutes

### Step 1: Create Meta App
1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click "Create App"
3. Select "Other" → "Business"
4. Name it "Kai Dashboard" → Click "Create"

### Step 2: Add Instagram Product
1. In your app, click "Add Product"
2. Find "Instagram Basic Display" → Click "Set Up"
3. Scroll down → Click "Create New App"

### Step 3: Get Access Token
1. Scroll to "User Token Generator"
2. Click "Add or Remove Instagram Testers"
3. Add your Instagram username
4. Go back → Click "Generate Token"
5. Copy the long token string

### Step 4: Add to Dashboard
1. In dashboard, click "Instagram"
2. Paste your Access Token
3. Click "Connect Instagram"

**Done!** Your Instagram analytics will appear.

---

## Twitter / X

**What you need:** Twitter API Key + Secret

**Time:** 5 minutes

### Step 1: Apply for Twitter Developer Account
1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Click "Sign Up" (or log in)
3. Answer a few questions about use case
4. Wait for approval (usually instant)

### Step 2: Create App
1. Go to [developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)
2. Click "Create Project" → Name it "Kai Dashboard"
3. Click "Create App" → Name it "Dashboard"
4. Copy **API Key** and **API Secret Key**

### Step 3: Add to Dashboard
1. In dashboard, click "Twitter/X"
2. Paste API Key and API Secret
3. (Optional) Add your Twitter username
4. Click "Connect Twitter/X"

**Done!** Your Twitter stats will appear.

---

## Facebook

**What you need:** Facebook Page Access Token

**Time:** 4 minutes

### Step 1: Create Facebook App
1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click "Create App"
3. Select "Business" type
4. Name it "Kai Dashboard" → Click "Create"

### Step 2: Add Products
1. Click "Add Product"
2. Add "Facebook Login"
3. Add "pages_read_engagement" permission

### Step 3: Get Access Token
1. Go to [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)
2. Select your app from dropdown
3. Click "Generate Access Token"
4. Copy the token

### Step 4: Add to Dashboard
1. In dashboard, click "Facebook"
2. Paste your Page Access Token
3. Click "Connect Facebook"

**Done!** Your Facebook Page stats will appear.

---

## LinkedIn

**What you need:** LinkedIn Access Token

**Time:** 5 minutes

### Step 1: Create LinkedIn App
1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
2. Click "Create App"
3. Name: "Kai Dashboard"
4. Add your LinkedIn Page URL
5. Upload a logo (optional)
6. Click "Create"

### Step 2: Get Access Token
1. In your app, go to "Auth" tab
2. Under "OAuth 2.0 settings", note:
   - Client ID
   - Client Secret
3. Use LinkedIn's token generator or OAuth flow

### Quick Token Method:
1. Go to [linkedin.com/developers/tools/oauth](https://www.linkedin.com/developers/tools/oauth)
2. Select your app
3. Generate token with scopes: `r_liteprofile`, `r_basicprofile`
4. Copy the token

### Step 3: Add to Dashboard
1. In dashboard, click "LinkedIn"
2. Paste your Access Token
3. Click "Connect LinkedIn"

**Done!** Your LinkedIn profile stats will appear.

---

## TikTok

**What you need:** TikTok Access Token

**Time:** 5 minutes

### Step 1: Apply for TikTok Developer
1. Go to [developers.tiktok.com](https://developers.tiktok.com)
2. Click "Sign Up" → Create account
3. Apply for developer access
4. Wait for approval (can take 1-2 days)

### Step 2: Create App
1. Once approved, go to "My Apps"
2. Click "Create App"
3. Name: "Kai Dashboard"
4. Add your website (can be localhost for now)
5. Click "Create"

### Step 3: Get Access Token
1. In your app, go to "Keys & Tokens"
2. Click "Generate Access Token"
3. Select scopes for user info
4. Copy the token

### Step 4: Add to Dashboard
1. In dashboard, click "TikTok"
2. Paste your Access Token
3. Click "Connect TikTok"

**Done!** Your TikTok stats will appear.

---

## Threads

**What you need:** Threads Access Token (via Meta)

**Time:** 4 minutes

### Step 1: Create Meta App
1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click "Create App"
3. Type: "Business"
4. Name: "Kai Dashboard"

### Step 2: Add Threads Product
1. In your app, click "Add Product"
2. Find "Threads API" → Click "Set Up"
3. Add required permissions:
   - `threads_basic`
   - `threads_content_publish`

### Step 3: Get Access Token
1. Use the [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Select your app
3. Get token with `threads_basic` permission
4. Copy the token

### Step 4: Add to Dashboard
1. In dashboard, click "Threads"
2. Paste your Access Token
3. Click "Connect Threads"

**Done!** Your Threads stats will appear.

---

## Bluesky

**What you need:** Bluesky Handle + App Password

**Time:** 2 minutes

### Step 1: Get Your Handle
1. Log in to [bsky.app](https://bsky.app)
2. Your handle is shown (e.g., `yourname.bsky.social`)
3. Note this down

### Step 2: Create App Password
1. In Bluesky, go to Settings → "App Passwords"
2. Click "Add App Password"
3. Name: "Kai Dashboard"
4. Copy the generated password (looks like `xxxx-xxxx-xxxx-xxxx`)

### Step 3: Add to Dashboard
1. In dashboard, click "Bluesky"
2. Enter your handle (e.g., `yourname.bsky.social`)
3. Paste your App Password
4. Click "Connect Bluesky"

**Done!** Your Bluesky stats will appear.

---

## Troubleshooting

### "Invalid API Key"
- Double-check you copied the entire key
- Make sure there are no extra spaces
- Regenerate the key if needed

### "No data found"
- Check that your account/username is correct
- Some platforms need time to generate stats
- Try again in a few minutes

### "Rate limited"
- You've made too many requests
- Wait 15 minutes and try again

### "Access Token expired"
- Some tokens expire (especially Instagram)
- Regenerate the token and update in dashboard

---

## Security Notes

- **All credentials stored locally** on your machine only
- **Never share your API keys** with anyone
- **File location:** `~/.kai/dashboard/accounts.json` (permissions 600)
- **Backup:** You can copy this file to backup your connections

---

## Next Steps

Once connected:
1. Click "Refresh All" to fetch latest data
2. Dashboard auto-updates every time you open it
3. Export data anytime with the dashboard skill

Happy analyzing! 📊
