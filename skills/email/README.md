# Email Skill

Send and read emails via SMTP/IMAP using Nodemailer. Supports any SMTP provider (Gmail, Outlook, custom servers).

## Install

```bash
kai skill install email
```

Or manually:

```bash
cd skills/email
npm install
```

## Configure

Set these environment variables (or via `kai config`):

| Variable | Description | Default |
|----------|-------------|---------|
| `KAI_SKILL_EMAIL_SMTP_HOST` | SMTP server hostname | - |
| `KAI_SKILL_EMAIL_SMTP_PORT` | SMTP server port | 587 |
| `KAI_SKILL_EMAIL_SMTP_USER` | SMTP username / email address | - |
| `KAI_SKILL_EMAIL_SMTP_PASS` | SMTP password or app password | - |
| `KAI_SKILL_EMAIL_SMTP_SECURE` | Use SSL/TLS (true for port 465) | false |
| `KAI_SKILL_EMAIL_IMAP_HOST` | IMAP server hostname | (auto from SMTP) |
| `KAI_SKILL_EMAIL_IMAP_PORT` | IMAP server port | 993 |
| `KAI_SKILL_EMAIL_IMAP_USER` | IMAP username | (same as SMTP_USER) |
| `KAI_SKILL_EMAIL_IMAP_PASS` | IMAP password | (same as SMTP_PASS) |

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password (not your regular password) for `SMTP_PASS`

```bash
export KAI_SKILL_EMAIL_SMTP_HOST=smtp.gmail.com
export KAI_SKILL_EMAIL_SMTP_PORT=587
export KAI_SKILL_EMAIL_SMTP_USER=your.email@gmail.com
export KAI_SKILL_EMAIL_SMTP_PASS=xxxx xxxx xxxx xxxx  # app password
export KAI_SKILL_EMAIL_SMTP_SECURE=false
```

### Outlook/Office 365 Setup

```bash
export KAI_SKILL_EMAIL_SMTP_HOST=smtp.office365.com
export KAI_SKILL_EMAIL_SMTP_PORT=587
export KAI_SKILL_EMAIL_SMTP_USER=your.email@outlook.com
export KAI_SKILL_EMAIL_SMTP_PASS=your_password
export KAI_SKILL_EMAIL_SMTP_SECURE=false
```

## Tools

### `send`

Send an email to one or more recipients.

**Parameters:**
- `to` (required): Recipient email address(es), comma-separated for multiple
- `subject` (required): Email subject line
- `body` (required): Email body (plain text)
- `html`: HTML email body (optional, sent alongside plain text)
- `cc`: CC recipients, comma-separated
- `bcc`: BCC recipients, comma-separated
- `reply_to`: Reply-To address
- `from_name`: Display name for the sender

**Example:**
```json
{
  "to": "recipient@example.com",
  "subject": "Hello from Kai",
  "body": "This is a test email sent via the Email skill.",
  "from_name": "Kai Assistant"
}
```

### `read`

Read recent emails from the inbox via IMAP.

**Parameters:**
- `folder`: Mailbox folder to read from (default: INBOX)
- `limit`: Number of recent emails to fetch (default: 10, max: 50)
- `unseen_only`: Only fetch unread/unseen emails (default: false)

**Example:**
```json
{
  "folder": "INBOX",
  "limit": 5,
  "unseen_only": true
}
```

### `search`

Search emails by criteria via IMAP.

**Parameters:**
- `from`: Filter by sender address or name
- `subject`: Filter by subject line (substring match)
- `since`: Emails since this date (format: YYYY-MM-DD)
- `before`: Emails before this date (format: YYYY-MM-DD)
- `unseen_only`: Only return unread emails
- `limit`: Max results to return (default: 10)

**Example:**
```json
{
  "from": "boss@company.com",
  "since": "2024-01-01",
  "limit": 20
}
```

### `verify`

Test the SMTP connection to verify credentials are working.

**Parameters:** None

**Example:**
```json
{}
```

## Dependencies

- [nodemailer](https://www.npmjs.com/package/nodemailer) - SMTP email sending
- Node.js built-in `tls` module - IMAP client implementation

## License

MIT
