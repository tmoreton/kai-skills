# OAuth Setup Guide for Kai

This guide walks you through setting up one-click authentication for Kai skills.

## Overview

Kai OAuth uses the industry-standard OAuth 2.0 protocol to connect your social media accounts without requiring API keys. Instead of copying and pasting long tokens, you simply:

1. Click "Connect" in your browser
2. Approve access on Google/Instagram/LinkedIn
3. Done! Token is automatically saved

## Prerequisites

- Node.js 16+ installed
- A registered account with each platform you want to connect
- Ability to create "apps" in developer portals (free)

---

## YouTube Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account
3. Click the project selector dropdown (top left)
4. Click "New Project"
5. Name it "Kai OAuth" or similar
6. Click "Create"

### Step 2: Enable YouTube API

1. In your new project, go to "APIs & Services" → "Library"
2. Search for "YouTube Data API v3"
3. Click on it and press "Enable"

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (for personal use) or "Internal" (if you have Google Workspace)
3. Click "Create"
4. Fill in the app information:
   - **App name**: "Kai Skills" or your preferred name
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Search for and add these scopes:
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
8. Click "Update" then "Save and Continue"
9. On "Test users", add your own email address
10. Click "Save and Continue" then "Back to Dashboard"

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Name it "Kai Desktop"
5. Under "Authorized redirect URIs", add:
   ```
   http://localhost:3456/callback
   ```
6. Click "Create"
7. **Copy the Client ID and Client Secret** (you'll need them in Step 6)

### Step 5: Publish App (Optional but Recommended)

If you don't publish, the app will show a "Google hasn't verified this app" warning. For personal use, you can click "Continue" to bypass this.

To publish:
1. Go back to "OAuth consent screen"
2. Click "Publish App"
3. Complete the verification process (can take days, optional for personal use)

### Step 6: Configure Kai

Set the environment variables:

```bash
# Add to your ~/.bashrc, ~/.zshrc, or run in terminal
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
```

Then reload your shell:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### Step 7: Test

```bash
npx kai-oauth youtube
```

A browser should open. Click through the approval flow. You should see a success page.

---

## Instagram Setup

**Note**: Instagram OAuth requires a Facebook/Instagram Business account. Personal accounts need the API token method instead.

### Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Sign in with your Facebook account
3. Click "Create App"
4. Select "Other" as the app type
5. Name it "Kai Skills"
6. Click "Create App"

### Step 2: Add Instagram Product

1. In your app's dashboard, scroll to "Add Products"
2. Find "Instagram" and click "Set Up"
3. Select "Instagram Basic Display"
4. Click "Continue"

### Step 3: Configure Instagram Basic Display

1. Scroll down to "Valid OAuth Redirect URIs"
2. Add:
   ```
   http://localhost:3456/callback
   ```
3. Add your website URL to "Deauthorize Callback URL" (can be any valid URL):
   ```
   https://example.com/deauth
   ```
4. Add to "Data Deletion Request Callback URL":
   ```
   https://example.com/delete
   ```
5. Click "Save Changes"

### Step 4: Get App Credentials

1. In the left sidebar, go to "Settings" → "Basic"
2. Scroll down to find your "App ID" and "App Secret"
3. **Copy these values**

### Step 5: Add Instagram Tester

1. Go to "Roles" → "Roles" in the left sidebar
2. Scroll to "Instagram Testers"
3. Click "Add Instagram Testers"
4. Enter your Instagram username
5. Click "Submit"

### Step 6: Accept Invitation

1. Go to [Instagram](https://www.instagram.com) in a browser
2. Go to Settings → Apps and Websites → Tester Invites
3. Accept the invitation for your app

### Step 7: Configure Kai

```bash
export INSTAGRAM_CLIENT_ID="your-app-id"
export INSTAGRAM_CLIENT_SECRET="your-app-secret"
```

### Step 8: Test

```bash
npx kai-oauth instagram
```

---

## LinkedIn Setup

### Step 1: Create LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Sign in with your LinkedIn account
3. Click "Create app"
4. Fill in the details:
   - **App name**: "Kai Skills"
   - **LinkedIn Page**: Select your company page (or create one)
   - **Privacy policy URL**: Any valid URL (e.g., https://example.com/privacy)
   - **App logo**: Upload any image
5. Click "Create app"

### Step 2: Configure OAuth

1. In your app's dashboard, go to "Auth" tab
2. Find "OAuth 2.0 settings"
3. Under "Authorized redirect URLs for your app", add:
   ```
   http://localhost:3456/callback
   ```
4. Click "Update"

### Step 3: Get Credentials

1. Still on the "Auth" tab
2. Copy the "Client ID" and "Client Secret"

### Step 4: Request Access

LinkedIn requires approval for most permissions:

1. Go to "Products" tab
2. Enable these products:
   - "Share on LinkedIn"
   - "Sign In with LinkedIn using OpenID Connect"
3. Wait for approval (usually instant for these basic products)

### Step 5: Configure Kai

```bash
export LINKEDIN_CLIENT_ID="your-client-id"
export LINKEDIN_CLIENT_SECRET="your-client-secret"
```

### Step 6: Test

```bash
npx kai-oauth linkedin
```

---

## Verification

After setup, verify everything works:

```bash
# Check connection status
npx kai-oauth list

# Should show:
# ✓ YouTube
#   Connected: 2024-01-15
# ✓ Instagram
#   Connected: 2024-01-15
# ✗ LinkedIn
```

---

## Troubleshooting

### "Google hasn't verified this app"

- Click "Advanced" → "Go to [app name] (unsafe)"
- This is normal for personal OAuth apps
- To remove this warning, complete Google's app verification (takes days)

### "Invalid redirect URI"

- Double-check you added `http://localhost:3456/callback` exactly
- Must match character-for-character
- Must include `http://` not `https://`

### "Access denied" or permission errors

- Ensure you added yourself as a "Test user" in the OAuth consent screen
- For Instagram, ensure you accepted the tester invitation

### Port already in use

If port 3456 is taken:
- The CLI will fail with an error
- Edit `packages/kai-oauth/bin/cli.js` and change `const PORT = 3456` to another port
- Update the redirect URI in all platforms to match

---

## Security Notes

- OAuth tokens are stored in `~/.kai/oauth-tokens.json`
- Keep your Client Secrets secure - never commit them to git
- For team use, consider a hosted OAuth service instead of localhost
- Tokens expire and refresh automatically (where supported)

---

## Alternative: API Key Method

If OAuth setup is too complex, use the interactive wizard instead:

```bash
npx kai-api-setup
```

This guides you through manual API key creation - simpler but requires copy/pasting keys.

---

## Next Steps

Once OAuth is configured:

1. Use Kai with the connected platforms:
   ```bash
   kai use youtube get_channel_report
   kai use instagram get_account_insights
   ```

2. Or use in Claude:
   ```
   "Get my YouTube stats for this week"
   "Analyze my Instagram engagement"
   ```

3. Tokens refresh automatically - no maintenance needed!
