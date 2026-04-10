# Webhook Skill

Send HTTP webhooks to automate workflows, integrate with external services, and trigger notifications. Connect to Zapier, Make, Slack, Discord, CI/CD pipelines, and any custom HTTP endpoint.

---

## Overview

The Webhook skill provides tools for sending HTTP requests to external services. It's essential for:

- **No-code automation** — Trigger Zapier, Make, or n8n workflows
- **Notifications** — Send alerts to Slack, Discord, Microsoft Teams
- **CI/CD integration** — Trigger deployments, builds, or pipeline stages
- **App integrations** — Connect to any service with a webhook URL
- **Event forwarding** — Forward events from your system to external handlers

---

## Actions

### `setup`

Configure webhook defaults and signing secrets for verification.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `secret` | string | No | Webhook signing secret for HMAC signature verification |

**Usage:**
```yaml
# Save a webhook secret for later verification
skill__webhook__setup:
  secret: "whsec_1234567890abcdef"
```

**Note:** The secret is stored in the skill's credential store and can be used to verify incoming webhooks using HMAC signatures.

---

### `send_webhook`

Send a JSON webhook via HTTP POST to any endpoint.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | **Yes** | Webhook URL to send the request to |
| `payload` | object | No | JSON payload to send (default: empty object) |
| `headers` | object | No | Additional HTTP headers to include |

**Usage:**
```yaml
# Send a simple notification
skill__webhook__send_webhook:
  url: "https://hooks.slack.com/services/T000/B000/XXXX"
  payload:
    text: "Build completed successfully!"
    channel: "#deployments"

# Send with custom headers
skill__webhook__send_webhook:
  url: "https://api.example.com/webhook"
  payload:
    event: "user.created"
    user_id: 12345
  headers:
    X-Event-Source: "kai-automation"
    X-Request-ID: "req_{{timestamp}}"
```

**Response:**
```json
{
  "sent": true,
  "status": 200,
  "statusText": "OK",
  "response": { "message": "Webhook received" }
}
```

---

### `send_with_auth`

Send a webhook with Bearer token or API key authentication.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | **Yes** | Webhook URL to send the request to |
| `auth_type` | string | **Yes** | Authentication type: `bearer` or `api_key` |
| `auth_token` | string | No | Bearer token (use this or `api_key`) |
| `api_key` | string | No | API key (alternative to `auth_token`, sent as `X-API-Key` header) |
| `payload` | object | No | JSON payload to send |
| `headers` | object | No | Additional HTTP headers to include |

**Usage:**

**Bearer Token Authentication:**
```yaml
skill__webhook__send_with_auth:
  url: "https://api.github.com/repos/owner/repo/dispatches"
  auth_type: bearer
  auth_token: "ghp_your_token_here"
  payload:
    event_type: "trigger-workflow"
    client_payload:
      environment: "production"
```

**API Key Authentication:**
```yaml
skill__webhook__send_with_auth:
  url: "https://api.sendgrid.com/v3/mail/send"
  auth_type: api_key
  api_key: "SG.your_api_key"
  payload:
    personalizations:
      - to:
          - email: "user@example.com"
    subject: "Alert from Kai"
```

---

### `test_endpoint`

Test connectivity to an endpoint with various HTTP methods.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | **Yes** | URL to test |
| `method` | string | No | HTTP method: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS (default: GET) |
| `headers` | object | No | Additional HTTP headers to include |
| `timeout` | number | No | Request timeout in milliseconds (default: 10000) |

**Usage:**
```yaml
# Quick health check
skill__webhook__test_endpoint:
  url: "https://api.example.com/health"

# Test POST endpoint before sending real data
skill__webhook__test_endpoint:
  url: "https://api.example.com/webhook"
  method: POST
  headers:
    Authorization: "Bearer test-token"
```

---

## Configuration Example

While the webhook skill requires no permanent configuration (all parameters are passed per-action), you can use the `setup` action to store secrets for verification purposes:

```yaml
# Example: Storing secrets for webhook verification
skills:
  webhook:
    # No required config schema - everything is action-based
    
# Or via setup action in your workflow:
steps:
  - id: configure
    action: skill__webhook__setup
    params:
      secret: "whsec_{{env.WEBHOOK_SECRET}}"
```

---

## Security Best Practices

### Webhook Secret Verification

When receiving webhooks from external services (Stripe, GitHub, etc.), verify the signature to ensure the payload is authentic:

```javascript
// Example: Verifying a Stripe-style webhook signature
import crypto from 'crypto';

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Security Tips:**

1. **Use HTTPS only** — Never send webhooks to HTTP endpoints in production
2. **Store secrets securely** — Use environment variables or the skill's credential store
3. **Verify signatures** — Always validate webhook signatures from providers
4. **Idempotency** — Include idempotency keys to prevent duplicate processing
5. **Timeout handling** — Set reasonable timeouts to prevent hanging requests
6. **Retry logic** — Implement exponential backoff for failed webhooks
7. **IP allowlisting** — When possible, restrict webhook sources to known IPs

### Environment Variables

Store sensitive tokens in environment variables:

```yaml
skill__webhook__send_with_auth:
  url: "{{env.WEBHOOK_URL}}"
  auth_type: bearer
  auth_token: "{{env.WEBHOOK_TOKEN}}"
```

---

## Common Use Cases

### CI/CD Integration

Trigger deployment pipelines from Kai workflows:

```yaml
# Trigger GitHub Actions workflow
skill__webhook__send_with_auth:
  url: "https://api.github.com/repos/acme/app/dispatches"
  auth_type: bearer
  auth_token: "{{env.GITHUB_TOKEN}}"
  payload:
    event_type: "deploy-production"
    client_payload:
      version: "{{build.version}}"
      commit_sha: "{{git.sha}}"

# Notify deployment completion
skill__webhook__send_webhook:
  url: "{{env.SLACK_WEBHOOK_URL}}"
  payload:
    text: ":rocket: Production deployment started"
    blocks:
      - type: "section"
        text:
          type: "mrkdwn"
          text: "*Version:* {{build.version}}\\n*Commit:* {{git.sha}}"
```

### External Integrations

Connect to popular automation platforms:

```yaml
# Zapier webhook
skill__webhook__send_webhook:
  url: "https://hooks.zapier.com/hooks/catch/12345/67890/"
  payload:
    lead_name: "{{contact.name}}"
    lead_email: "{{contact.email}}"
    source: "kai-automation"

# Make (Integromat) webhook
skill__webhook__send_webhook:
  url: "https://hook.make.com/xxxxxxxxxx"
  payload:
    event: "form.submitted"
    data: "{{form.data}}"

# n8n webhook
skill__webhook__send_webhook:
  url: "https://n8n.example.com/webhook/abc123"
  payload:
    workflow: "customer-onboarding"
    customer_id: "{{customer.id}}"
```

### Notifications

Send alerts to team channels:

```yaml
# Slack notification
skill__webhook__send_webhook:
  url: "{{env.SLACK_WEBHOOK_URL}}"
  payload:
    channel: "#alerts"
    username: "Kai Bot"
    icon_emoji: ":gear:"
    attachments:
      - color: "danger"
        title: "High Error Rate Detected"
        text: "Error rate exceeded 5% threshold"
        fields:
          - title: "Service"
            value: "api-gateway"
            short: true
          - title: "Time"
            value: "{{timestamp}}"
            short: true

# Discord notification
skill__webhook__send_webhook:
  url: "{{env.DISCORD_WEBHOOK_URL}}"
  payload:
    username: "Kai Automation"
    embeds:
      - title: "Task Completed"
        description: "Data processing finished"
        color: 3066993
        fields:
          - name: "Records Processed"
            value: "{{count}}"
            inline: true
```

### Event Forwarding

Forward events between systems:

```yaml
# Forward to multiple endpoints
parallel:
  - skill__webhook__send_webhook:
      url: "{{env.ANALYTICS_ENDPOINT}}"
      payload:
        event: "{{event.type}}"
        user: "{{event.user_id}}"
        timestamp: "{{event.timestamp}}"
  
  - skill__webhook__send_webhook:
      url: "{{env.AUDIT_LOG_ENDPOINT}}"
      payload:
        action: "{{event.action}}"
        actor: "{{event.actor}}"
        details: "{{event.details}}"
```

### API Gateway Integration

Trigger AWS API Gateway, Azure Functions, or Cloud Functions:

```yaml
# AWS API Gateway
skill__webhook__send_with_auth:
  url: "https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/webhook"
  auth_type: api_key
  api_key: "{{env.AWS_API_KEY}}"
  payload:
    action: "process-order"
    order_id: "{{order.id}}"

# Azure Function
skill__webhook__send_webhook:
  url: "https://myapp.azurewebsites.net/api/webhook"
  payload:
    trigger: "file-uploaded"
    blob_url: "{{file.url}}"
  headers:
    x-functions-key: "{{env.AZURE_FUNCTION_KEY}}"
```

---

## Error Handling

All actions return a consistent response format:

```json
{
  "sent": true|false,
  "status": 200,
  "statusText": "OK",
  "response": { ... },
  "error": "Error message (if failed)"
}
```

**Common HTTP Status Codes:**

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Webhook delivered |
| 400 | Bad Request | Check payload format |
| 401 | Unauthorized | Verify authentication |
| 403 | Forbidden | Check API key permissions |
| 404 | Not Found | Verify webhook URL |
| 429 | Rate Limited | Implement retry with backoff |
| 500+ | Server Error | Retry or contact provider |

---

## Dependencies

This skill uses native `fetch` — no npm dependencies required. Works in Node.js 18+ and modern browsers.

---

## Tags

`webhook`, `automation`, `zapier`, `make`, `api`, `integration`, `notifications`, `slack`, `discord`, `ci-cd`

---

## Author

Kai

## Version

1.0.0
