# Slack Skill

Send messages, manage channels, upload files, and schedule notifications through Slack's API and webhooks.

---

## Table of Contents

1. [skill__slack__setup](#skill__slack__setup) - Bot token & authentication
2. [skill__slack__send_message](#skill__slack__send_message) - Channels & DMs
3. [skill__slack__create_channel](#skill__slack__create_channel) - Channel management
4. [skill__slack__upload_file](#skill__slack__upload_file) - File sharing
5. [skill__slack__schedule_message](#skill__slack__schedule_message) - Timed notifications
6. [Block Kit Formatting](#block-kit-formatting)
7. [Webhook vs API Posting](#webhook-vs-api-posting)
8. [Notification Automation Patterns](#notification-automation-patterns)

---

## skill__slack__setup

Configure Slack bot authentication and permissions.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bot_token` | string | Yes | Bot User OAuth Token (starts with `xoxb-`) |
| `signing_secret` | string | No | Used for verifying incoming webhook requests |
| `app_token` | string | No | App-level token for Socket Mode (starts with `xapp-`) |
| `default_channel` | string | No | Fallback channel ID or name for messages |

### Slack App Setup

1. **Create a Slack App**
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App" → "From scratch"
   - Name your app and select workspace

2. **Enable Bot Token**
   - Navigate to **OAuth & Permissions**
   - Add these **Bot Token Scopes**:
     - `chat:write` - Send messages
     - `chat:write.public` - Send to public channels
     - `files:write` - Upload files
     - `channels:read` - List channels
     - `channels:manage` - Create/manage channels
     - `groups:write` - Create private channels
     - `im:write` - Send DMs
     - `users:read` - Lookup user info
     - `users:read.email` - Find users by email

3. **Install to Workspace**
   - Click "Install to Workspace"
   - Copy the **Bot User OAuth Token** (`xoxb-...`)

### Example Configuration

```yaml
slack:
  bot_token: "xoxb-YOUR-BOT-TOKEN-HERE"
  default_channel: "#general"
```

### Token Security

- Store tokens in environment variables or secret managers
- Never commit tokens to version control
- Use different tokens for dev/staging/prod
- Rotate tokens periodically (Slack recommends every 90 days)

---

## skill__slack__send_message

Send messages to channels, groups, or direct messages.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | string | Yes | Channel ID, name (`#general`), or user ID for DMs |
| `text` | string | Yes* | Plain text message (required if no `blocks`) |
| `blocks` | array | Yes* | Block Kit JSON array (required if no `text`) |
| `attachments` | array | No | Legacy attachments (deprecated, prefer blocks) |
| `thread_ts` | string | No | Timestamp to reply in thread |
| `unfurl_links` | boolean | No | Auto-expand URLs (default: true) |
| `unfurl_media` | boolean | No | Auto-expand images/videos |
| `username` | string | No | Custom bot name (legacy, prefer app display name) |
| `icon_emoji` | string | No | Custom emoji (e.g., `:robot_face:`) |
| `icon_url` | string | No | Custom avatar URL |

### Channel Formats

```yaml
# Public channel
channel: "#general"
channel: "C1234567890"  # Channel ID

# Private channel
channel: "#private-channel"
channel: "G1234567890"  # Group ID

# Direct message to user
channel: "@john.doe"
channel: "U1234567890"  # User ID

# Multi-party DM
channel: "C1234567890"  # MPIM channel ID
```

### Basic Text Message

```yaml
skill__slack__send_message:
  channel: "#deployments"
  text: "✅ Production deployment completed successfully"
```

### Rich Message with Blocks

```yaml
skill__slack__send_message:
  channel: "#alerts"
  blocks:
    - type: "header"
      text:
        type: "plain_text"
        text: "🚨 High Priority Alert"
        emoji: true
    - type: "section"
      fields:
        - type: "mrkdwn"
          text: "*Service:*\nAPI Gateway"
        - type: "mrkdwn"
          text: "*Status:*\nDegraded"
        - type: "mrkdwn"
          text: "*Error Rate:*\n15%"
        - type: "mrkdwn"
          text: "*Duration:*\n12 minutes"
    - type: "actions"
      elements:
        - type: "button"
          text:
            type: "plain_text"
            text: "View Dashboard"
          url: "https://grafana.example.com/d/api"
          style: "primary"
```

### Threaded Reply

```yaml
skill__slack__send_message:
  channel: "#general"
  thread_ts: "1234567890.123456"  # Timestamp of parent message
  text: "This is a reply in the thread"
```

### DM to User by Email

```yaml
# First look up user by email
skill__slack__users_lookup_by_email:
  email: "john.doe@company.com"

# Then send DM
skill__slack__send_message:
  channel: "U1234567890"  # User ID from lookup
  text: "Your request has been approved"
```

### Conditional Message

```yaml
skill__slack__send_message:
  channel: "{{ 'ops-critical' if severity == 'critical' else '#alerts' }}"
  text: "{{ message }}"
  unfurl_links: false
  icon_emoji: "{{ ':fire:' if severity == 'critical' else ':warning:' }}"
```

---

## skill__slack__create_channel

Create public or private channels programmatically.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Channel name (lowercase, no spaces/special chars) |
| `is_private` | boolean | No | Create private channel (default: false) |
| `description` | string | No | Channel purpose/topic |
| `team_id` | string | No | Required for Enterprise Grid |

### Validation Rules

- Max 80 characters
- Lowercase letters, numbers, hyphens, underscores only
- No spaces or periods
- Must be unique in workspace

### Create Public Channel

```yaml
skill__slack__create_channel:
  name: "incident-2024-001"
  description: "Coordination for database outage response"
```

### Create Private Channel

```yaml
skill__slack__create_channel:
  name: "exec-reviews"
  is_private: true
  description: "Sensitive executive project reviews"
```

### Response

```json
{
  "ok": true,
  "channel": {
    "id": "C1234567890",
    "name": "incident-2024-001",
    "is_channel": true,
    "is_private": false,
    "created": 1704067200
  }
}
```

---

## skill__slack__upload_file

Upload files to channels or direct messages.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | array/string | No | Channel IDs to share (can upload without sharing) |
| `file` | string | Yes* | Path to local file OR binary data |
| `content` | string | Yes* | Raw file content (for text files) |
| `filename` | string | No | Display name (default: extracted from path) |
| `filetype` | string | No | MIME type hint (auto-detected if not provided) |
| `title` | string | No | Title shown above file in Slack |
| `initial_comment` | string | No | Message to accompany file |
| `thread_ts` | string | No | Upload as thread reply |

### Upload Local File

```yaml
skill__slack__upload_file:
  channels: ["#reports", "C1234567890"]
  file: "/tmp/monthly-report.pdf"
  title: "Monthly Performance Report"
  initial_comment: "Here's the report for January 2024"
```

### Upload Generated Content

```yaml
# Generate CSV content
skill__slack__upload_file:
  channel: "#data-exports"
  filename: "users_export.csv"
  content: |
    id,name,email,role
    1,John Doe,john@example.com,admin
    2,Jane Smith,jane@example.com,user
  filetype: "csv"
  title: "User Export"
```

### Upload with Context

```yaml
skill__slack__upload_file:
  channel: "#incidents"
  thread_ts: "{{ parent_message_ts }}"
  file: "/var/log/app/error.log"
  filename: "error-{{ now | date('YYYYMMDD') }}.log"
  title: "Application Error Log"
  initial_comment: "Log file from the incident timeframe"
```

### File Size Limits

| Plan | Max File Size |
|------|---------------|
| Free | 1 GB |
| Pro | 1 GB |
| Business+ | 1 GB |
| Enterprise Grid | 1 GB |

### Supported File Types

- Images: `jpg`, `png`, `gif`, `bmp`, `svg`
- Documents: `pdf`, `doc`, `docx`, `txt`, `rtf`
- Spreadsheets: `xls`, `xlsx`, `csv`
- Code: `py`, `js`, `json`, `yaml`, `xml`, etc.
- Archives: `zip`, `tar.gz`
- Media: `mp4`, `mov`, `mp3`, `wav`

---

## skill__slack__schedule_message

Schedule messages to be sent at a future time.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | string | Yes | Target channel ID |
| `text` | string | Yes | Message text |
| `post_at` | integer | Yes | Unix timestamp (seconds) for delivery |
| `blocks` | array | No | Block Kit formatting |
| `unfurl_links` | boolean | No | Link unfurling setting |

### Scheduling Constraints

- Must be between 1 minute and 120 days in the future
- Seconds are ignored (rounded to nearest minute)
- Maximum 100 scheduled messages per channel

### Schedule Single Message

```yaml
skill__slack__schedule_message:
  channel: "#reminders"
  text: "Team standup starts in 15 minutes!"
  post_at: 1704067200  # Unix timestamp
```

### Schedule with Dynamic Time

```yaml
# Schedule for tomorrow 9 AM
skill__slack__schedule_message:
  channel: "#daily-updates"
  text: "Good morning! Don't forget to update your tickets."
  post_at: "{{ now | add(days=1) | start_of_day | add(hours=9) | timestamp }}"
```

### Weekly Reminder Pattern

```yaml
# Monday morning team sync reminder
skill__slack__schedule_message:
  channel: "#team-engineering"
  text: "📅 Weekly planning meeting at 10 AM in Conference Room A"
  post_at: "{{ next_monday | set_hour(9) | set_minute(30) | timestamp }}"
```

### List Scheduled Messages

```yaml
skill__slack__scheduled_messages_list:
  channel: "#reminders"
  cursor: "dXNlcjpVMDYxTkZUTD"  # Pagination cursor
  limit: 100
```

### Delete Scheduled Message

```yaml
skill__slack__scheduled_messages_delete:
  channel: "#reminders"
  scheduled_message_id: "Q12345678.1234567890"
```

---

## Block Kit Formatting

Build rich, interactive message layouts using Slack's Block Kit.

### Block Types

#### 1. Section

Text with optional accessory (button, image, etc.):

```json
{
  "type": "section",
  "text": {
    "type": "mrkdwn",
    "text": "*Bold* and _italic_ text with <https://example.com|links>"
  },
  "accessory": {
    "type": "button",
    "text": {
      "type": "plain_text",
      "text": "Click me"
    },
    "action_id": "button_click"
  }
}
```

#### 2. Header

Large bold text for titles:

```json
{
  "type": "header",
  "text": {
    "type": "plain_text",
    "text": "Deployment Summary",
    "emoji": true
  }
}
```

#### 3. Divider

Visual separator:

```json
{
  "type": "divider"
}
```

#### 4. Image

Display images:

```json
{
  "type": "image",
  "image_url": "https://example.com/chart.png",
  "alt_text": "Performance chart"
}
```

#### 5. Actions

Row of interactive elements (buttons, selects, etc.):

```json
{
  "type": "actions",
  "elements": [
    {
      "type": "button",
      "text": {
        "type": "plain_text",
        "text": "Approve"
      },
      "style": "primary",
      "action_id": "approve_request"
    },
    {
      "type": "button",
      "text": {
        "type": "plain_text",
        "text": "Reject"
      },
      "style": "danger",
      "action_id": "reject_request"
    }
  ]
}
```

#### 6. Context

Smaller, secondary text:

```json
{
  "type": "context",
  "elements": [
    {
      "type": "mrkdwn",
      "text": "Last updated: 2024-01-15 09:30 UTC"
    }
  ]
}
```

#### 7. Input (Modals only)

Text input fields:

```json
{
  "type": "input",
  "element": {
    "type": "plain_text_input",
    "action_id": "title_input"
  },
  "label": {
    "type": "plain_text",
    "text": "Title"
  }
}
```

### Complete Example: Incident Report

```yaml
blocks:
  - type: "header"
    text:
      type: "plain_text"
      text: "🚨 Production Incident Report"
      emoji: true
  
  - type: "section"
    fields:
      - type: "mrkdwn"
        text: "*Incident ID:*\nINC-2024-001"
      - type: "mrkdwn"
        text: "*Severity:*\nP1 - Critical"
      - type: "mrkdwn"
        text: "*Service:*\nPayment Processing"
      - type: "mrkdwn"
        text: "*Status:*\nInvestigating"
  
  - type: "divider"
  
  - type: "section"
    text:
      type: "mrkdwn"
      text: |
        *Summary:*
        Payment webhooks failing with 5xx errors. 
        Error rate increased from 0.1% to 12% over 5 minutes.
  
  - type: "actions"
    elements:
      - type: "button"
        text:
          type: "plain_text"
          text: "View Runbook"
        url: "https://wiki.internal/incidents/payment-failures"
        style: "primary"
      - type: "button"
        text:
          type: "plain_text"
          text: "Dashboard"
        url: "https://grafana.internal/d/payments"
      - type: "button"
        text:
          type: "plain_text"
          text: "Escalate"
        action_id: "escalate_incident"
  
  - type: "context"
    elements:
      - type: "mrkdwn"
        text: "Reported by: <@U1234567890> | <https://pagerduty.com|PagerDuty>"
```

### mrkdwn Formatting

| Syntax | Result |
|--------|--------|
| `*bold*` | **bold** |
| `_italic_` | _italic_ |
| `~strikethrough~` | ~~strikethrough~~ |
| `` `code` `` | `code` |
| ``` ``code block`` ``` | Code block |
| `<https://url.com\|text>` | [text](https://url.com) |
| `<#C1234567890>` | Channel link |
| `<@U1234567890>` | User mention |
| `<!here>` | @here mention |
| `<!channel>` | @channel mention |
| `>` | Quote block prefix |

### Builder Tool

Use Slack's [Block Kit Builder](https://app.slack.com/block-kit-builder) to preview and test layouts.

---

## Webhook vs API Posting

Choose the right integration method for your use case.

### Incoming Webhooks

**Best for:** Simple notifications from external services

#### Setup

1. Create app at [api.slack.com](https://api.slack.com)
2. Enable "Incoming Webhooks"
3. Add new webhook to workspace
4. Copy webhook URL: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX`

#### Usage

```yaml
skill__slack__webhook_post:
  webhook_url: "https://hooks.slack.com/services/T00/B00/XXX"
  text: "Simple text message"
  blocks:  # Optional rich formatting
    - type: "section"
      text:
        type: "mrkdwn"
        text: "*Deployment Complete*"
```

#### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| No token management | Single channel per webhook |
| Easy setup | No user lookup |
| Works with curl | No file uploads |
| Minimal permissions | Can't reply in threads |

---

### Bot Token API

**Best for:** Full-featured integrations, user interactions

#### Usage

```yaml
skill__slack__send_message:
  channel: "#general"  # Any channel
  text: "Message with full API features"
  thread_ts: "1234567890.123456"  # Thread support
  unfurl_links: true
```

#### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Post to any channel | Requires token management |
| Thread support | More complex setup |
| File uploads | Need scopes for each feature |
| User/emoji lookups | Rate limits apply |
| Interactive components | |

---

### Decision Matrix

| Use Case | Method |
|----------|--------|
| GitHub/Jira notifications | Webhook |
| Deployment alerts | Webhook or API |
| Interactive bots | API (Bot Token) |
| File uploads | API only |
| DM users | API only |
| Thread conversations | API only |
| Scheduled messages | API only |
| Cross-workspace posting | API only |

---

### Combined Approach

```yaml
# Use webhook for simple notifications
skill__slack__webhook_post:
  webhook_url: "{{ env.SLACK_WEBHOOK_DEPLOYS }}"
  blocks:
    - type: "header"
      text:
        type: "plain_text"
        text: "🚀 Deployment Started"

# Use API for follow-up actions
skill__slack__send_message:
  channel: "#deployments"
  thread_ts: "{{ deployment_message_ts }}"
  text: "Deployment completed in {{ duration }} seconds"
```

---

## Notification Automation Patterns

Common patterns for automated Slack notifications.

### 1. Multi-Channel Alert Routing

Route alerts based on severity:

```yaml
notify_failure:
  if: "{{ status == 'failed' }}"
  then:
    - skill__slack__send_message:
        channel: "#alerts-critical"
        text: "🔴 CRITICAL: {{ service }} deployment failed"
        blocks:
          - type: "section"
            text:
              type: "mrkdwn"
              text: "*{{ service }}* deployment to *{{ environment }}* failed at {{ timestamp }}"
          - type: "actions"
            elements:
              - type: "button"
                text:
                  type: "plain_text"
                  text: "View Logs"
                url: "{{ build_url }}"
                style: "primary"
              - type: "button"
                text:
                  type: "plain_text"
                  text: "Rollback"
                action_id: "rollback_deployment"
  
  else:
    - skill__slack__send_message:
        channel: "#alerts-info"
        text: "✅ {{ service }} deployment succeeded"
```

### 2. Thread-Based Updates

Keep context in a single thread:

```yaml
# Initial notification
- skill__slack__send_message:
    channel: "#deployments"
    text: "🚀 Starting deployment of {{ version }}"
  register: deployment_msg

# Progress updates in thread
- skill__slack__send_message:
    channel: "#deployments"
    thread_ts: "{{ deployment_msg.ts }}"
    text: "📦 Build complete, starting tests..."

# Final result
- skill__slack__send_message:
    channel: "#deployments"
    thread_ts: "{{ deployment_msg.ts }}"
    text: "{{ '✅ Success!' if success else '❌ Failed' }}"
```

### 3. Dynamic Channel Selection

```yaml
# Map teams to channels
channel_map:
  backend: "#team-backend"
  frontend: "#team-frontend"
  data: "#team-data"

- skill__slack__send_message:
    channel: "{{ channel_map[team] | default('#general') }}"
    text: "{{ message }}"
```

### 4. User Mention from Email

```yaml
# Look up user
- skill__slack__users_lookup_by_email:
    email: "{{ assignee_email }}"
  register: user_info

# Mention in message
- skill__slack__send_message:
    channel: "#tickets"
    text: "<@{{ user_info.user.id }}> - Ticket #{{ ticket_id }} requires your review"
    blocks:
      - type: "section"
        text:
          type: "mrkdwn"
          text: "<@{{ user_info.user.id }}> - *Ticket #{{ ticket_id }}* needs attention"
```

### 5. Scheduled Daily Summary

```yaml
schedule_daily_report:
  # Calculate next 9 AM
  - set_fact:
      next_run: "{{ now | start_of_day | add(hours=9) if now.hour < 9 else now | start_of_day | add(days=1, hours=9) }}"
  
  # Schedule the message
  - skill__slack__schedule_message:
      channel: "#daily-standup"
      text: |
        📊 Daily Metrics Summary
        • New users: {{ metrics.new_users }}
        • Revenue: ${{ metrics.revenue }}
        • Tickets resolved: {{ metrics.resolved }}
        • Errors: {{ metrics.errors }}
      post_at: "{{ next_run | timestamp }}"
```

### 6. File Report Automation

```yaml
# Generate and upload report
- name: Generate CSV
  shell: |
    echo "date,users,revenue" > /tmp/report.csv
    echo "{{ today }},{{ users }},{{ revenue }}" >> /tmp/report.csv

- skill__slack__upload_file:
    channels: ["#reports", "C1234567890"]
    file: "/tmp/report.csv"
    filename: "daily-report-{{ today }}.csv"
    initial_comment: "Daily metrics report for {{ today }}"
    title: "Metrics Report {{ today }}"
```

### 7. Incident Management Workflow

```yaml
create_incident_channel:
  # Create dedicated incident channel
  - skill__slack__create_channel:
      name: "incident-{{ incident.id | lower }}"
      is_private: false
      description: "Incident: {{ incident.title }}"
    register: incident_channel
  
  # Invite key responders
  - skill__slack__conversations_invite:
      channel: "{{ incident_channel.channel.id }}"
      users: ["U1234567890", "U0987654321"]
  
  # Post initial incident report
  - skill__slack__send_message:
      channel: "{{ incident_channel.channel.id }}"
      blocks:
        - type: "header"
          text:
            type: "plain_text"
            text: "🚨 Incident {{ incident.id }}: {{ incident.severity }}"
        - type: "section"
          fields:
            - type: "mrkdwn"
              text: "*Status:*\n{{ incident.status }}"
            - type: "mrkdwn"
              text: "*Severity:*\n{{ incident.severity }}"
            - type: "mrkdwn"
              text: "*Reporter:*\n<@{{ incident.reporter_id }}>"
            - type: "mrkdwn"
              text: "*Started:*\n{{ incident.started_at }}"
        - type: "section"
          text:
            type: "mrkdwn"
            text: "*Description:*\n{{ incident.description }}"
  
  # Cross-post to main alerts channel
  - skill__slack__send_message:
      channel: "#incidents"
      text: "New incident created: <#{{ incident_channel.channel.id }}>"
```

### 8. Smart Notification Batching

```yaml
batch_notifications:
  # Collect alerts
  - set_fact:
      alerts_batch: "{{ alerts_batch | default([]) + [alert] }}"
  
  # Send batch every 5 minutes or when reaching 10 alerts
  - skill__slack__send_message:
      channel: "#alerts"
      blocks:
        - type: "header"
          text:
            type: "plain_text"
            text: "📦 Alert Batch ({{ alerts_batch | length }} items)"
        - type: "section"
          text:
            type: "mrkdwn"
            text: |
              {% for alert in alerts_batch %}
              • [{{ alert.severity }}] {{ alert.message }}
              {% endfor %}
        - type: "actions"
          elements:
            - type: "button"
              text:
                type: "plain_text"
                text: "View All"
              url: "{{ dashboard_url }}"
  when: "alerts_batch | length >= 10 or (last_batch_time | default(0) | int) < (now | timestamp - 300)"
```

### 9. Approval Workflow

```yaml
request_approval:
  - skill__slack__send_message:
      channel: "#approvals"
      blocks:
        - type: "header"
          text:
            type: "plain_text"
            text: "⏳ Approval Required"
        - type: "section"
          text:
            type: "mrkdwn"
            text: |
              *Request:* {{ request.title }}
              *Requester:* <@{{ requester_id }}>
              *Amount:* ${{ request.amount }}
        - type: "actions"
          elements:
            - type: "button"
              text:
                type: "plain_text"
                text: "Approve"
              style: "primary"
              action_id: "approve_{{ request.id }}"
              value: "{{ request.id }}"
            - type: "button"
              text:
                type: "plain_text"
                text: "Reject"
              style: "danger"
              action_id: "reject_{{ request.id }}"
              value: "{{ request.id }}"
```

### 10. On-Call Handoff

```yaml
handoff_rotation:
  # Find on-call user from PagerDuty/Opsgenie
  - skill__pagerduty__get_oncall:
      schedule_id: "PABC123"
    register: oncall
  
  # Lookup Slack user by email
  - skill__slack__users_lookup_by_email:
      email: "{{ oncall.user.email }}"
    register: slack_user
  
  # Send DM to incoming on-call
  - skill__slack__send_message:
      channel: "{{ slack_user.user.id }}"
      text: "🔄 You're now on-call for {{ oncall.schedule.summary }}"
      blocks:
        - type: "section"
          text:
            type: "mrkdwn"
            text: |
              *On-call handoff*
              
              You are now the primary on-call engineer.
              
              • Schedule: {{ oncall.schedule.summary }}
              • Until: {{ oncall.end }}
              • Escalation: <#{{ escalation_channel }}>
        - type: "actions"
          elements:
            - type: "button"
              text:
                type: "plain_text"
                text: "View Runbook"
              url: "{{ runbook_url }}"
            - type: "button"
              text:
                type: "plain_text"
                text: "Acknowledge"
              action_id: "ack_oncall"
```

---

## Error Handling

Common errors and resolutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `channel_not_found` | Channel doesn't exist or bot not invited | Verify channel ID, invite bot with `/invite @YourBot` |
| `not_in_channel` | Bot not member of private channel | Invite bot to channel first |
| `is_archived` | Target channel is archived | Unarchive or use different channel |
| `msg_too_long` | Message exceeds 40,000 characters | Split into multiple messages |
| `rate_limited` | Too many requests | Implement exponential backoff |
| `invalid_blocks` | Block Kit JSON malformed | Validate with Block Kit Builder |
| `invalid_auth` | Token revoked or wrong workspace | Regenerate bot token |
| `account_inactive` | User account deactivated | Check user status |

### Retry Logic

```yaml
- skill__slack__send_message:
    channel: "#alerts"
    text: "Important notification"
  retries: 3
  delay: 5
  until: result is succeeded
```

---

## Rate Limits

| API Tier | Requests per minute |
|----------|---------------------|
| Web API (chat.postMessage) | 1 per channel per second |
| Files API | 20 per minute per token |
| Scheduled messages | 100 per token per hour |
| Admin APIs | Varies by endpoint |

**Best practices:**
- Use threads to consolidate updates
- Batch multiple notifications
- Implement exponential backoff on 429 responses
- Cache user/channel lookups

---

## Related Skills

- **PagerDuty** - On-call rotation and incident escalation
- **GitHub** - PR and issue notifications
- **Jira** - Ticket updates and workflow automation
- **Datadog/New Relic** - Alert routing to Slack

---

## Resources

- [Slack API Documentation](https://api.slack.com/)
- [Block Kit Builder](https://app.slack.com/block-kit-builder)
- [Slack API Tester](https://api.slack.com/methods)
- [Rate Limits Guide](https://api.slack.com/docs/rate-limits)
- [Permissions Scopes](https://api.slack.com/scopes)
