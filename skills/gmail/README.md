# Gmail Skill

Full Gmail API integration for Kai — send, read, search, and manage emails.

## Setup

### 1. Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
2. Enable the Gmail API
3. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost`

### 2. Get OAuth Tokens
Run the OAuth flow to get a refresh token:

```bash
# After creating credentials, get refresh token via:
# 1. Visit: https://accounts.google.com/o/oauth2/v2/auth?
#    client_id=YOUR_CLIENT_ID&
#    redirect_uri=http://localhost&
#    scope=https://www.googleapis.com/auth/gmail.send%20https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/gmail.modify&
#    response_type=code&
#    access_type=offline&
#    prompt=consent
#
# 2. Exchange code for tokens:
#    curl -d client_id=YOUR_CLIENT_ID \
#         -d client_secret=YOUR_CLIENT_SECRET \
#         -d code=AUTH_CODE \
#         -d grant_type=authorization_code \
#         -d redirect_uri=http://localhost \
#         https://oauth2.googleapis.com/token
```

### 3. Configure in Kai
```bash
kai-skills add gmail
kai-skills config set gmail GOOGLE_CLIENT_ID "your-client-id"
kai-skills config set gmail GOOGLE_CLIENT_SECRET "your-secret"
kai-skills config set gmail GOOGLE_REFRESH_TOKEN "your-refresh-token"
```

## Usage

### Send Email
```javascript
gmail.send({
  to: "recipient@example.com",
  subject: "Hello from Kai",
  html: "<h1>Hello!</h1><p>This is a test email.</p>"
})
```

### Search Emails
```javascript
gmail.search({
  query: "from:boss@example.com subject:urgent after:2024/01/01",
  max_results: 10,
  include_body: true
})
```

### List Inbox
```javascript
gmail.list({ max_results: 20 })
```

### Manage Messages
```javascript
gmail.mark_read({ message_id: "abc123" })
gmail.archive({ message_id: "abc123" })
gmail.trash({ message_id: "abc123" })
```

### Labels
```javascript
gmail.labels.list()
gmail.labels.add({ message_id: "abc123", label_id: "Label_123" })
gmail.labels.remove({ message_id: "abc123", label_id: "Label_123" })
```

## Gmail Search Syntax

The `search` action supports full Gmail query syntax:

- `from:someone@example.com` — from sender
- `to:someone@example.com` — to recipient
- `subject:hello` — subject contains
- `has:attachment` — has attachments
- `is:unread` / `is:read` — read status
- `is:starred` — starred messages
- `in:inbox` / `in:sent` / `in:trash` — location
- `after:2024/01/01` / `before:2024/12/31` — date range
- `larger:5M` — larger than 5MB
- `filename:pdf` — attachment type

## Service Account (G Suite Only)

For server-to-server access with G Suite/Workspace:
1. Create Service Account in Google Cloud Console
2. Enable domain-wide delegation
3. Add scopes in Admin Console:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
4. Use `GOOGLE_SERVICE_ACCOUNT_JSON` with full JSON key

## Dependencies

- `googleapis` ^144.0.0
