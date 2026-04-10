# Google Sheets Skill

A comprehensive skill for interacting with Google Sheets spreadsheets programmatically. Supports reading, writing, formatting, and automating spreadsheet workflows.

## Overview

This skill provides tools for:
- **Reading data** from spreadsheet ranges
- **Writing and updating** cell values
- **Appending rows** to existing sheets
- **Creating new spreadsheets**
- **Formatting** cells and ranges
- **Exporting data** from various sources
- **Automating** data pipelines

## Prerequisites

### 1. Google Cloud Console Setup

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Enable the **Google Drive API** (required for file operations)

### 2. Authentication Setup

#### Option A: OAuth 2.0 (User Authentication)

Best for personal access or interactive workflows.

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure OAuth consent screen (external or internal)
4. Select application type: "Desktop app" or "Web application"
5. Download the `client_secret.json` file
6. Store it in your project: `config/google-sheets/credentials.json`

```bash
# First run will open browser for authorization
skill__google_sheets__setup --auth-type oauth --credentials-path config/google-sheets/credentials.json
```

#### Option B: Service Account (Server-to-Server)

Best for automation, cron jobs, and CI/CD pipelines.

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service account"
3. Enter name and description
4. Grant roles: "Editor" or "Viewer" as needed
5. Go to the service account > "Keys" tab
6. Click "Add Key" > "Create new key" > JSON
7. Download the service account key file
8. Store it in your project: `config/google-sheets/service-account.json`

```bash
skill__google_sheets__setup --auth-type service-account --credentials-path config/google-sheets/service-account.json
```

**Note:** For service accounts to access existing spreadsheets, you must share the spreadsheet with the service account email (e.g., `your-service@project-id.iam.gserviceaccount.com`).

## Core Functions

### skill__google_sheets__setup

Initialize authentication and configuration for Google Sheets access.

```bash
# OAuth setup (interactive)
skill__google_sheets__setup \
  --auth-type oauth \
  --credentials-path ./config/credentials.json \
  --token-path ./config/token.json

# Service account setup (non-interactive)
skill__google_sheets__setup \
  --auth-type service-account \
  --credentials-path ./config/service-account.json
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `--auth-type` | string | Yes | Authentication type: `oauth` or `service-account` |
| `--credentials-path` | string | Yes | Path to credentials JSON file |
| `--token-path` | string | No* | Path to store/refresh OAuth token (*required for OAuth) |
| `--scopes` | array | No | OAuth scopes (default: `['https://www.googleapis.com/auth/spreadsheets']`) |

---

### skill__google_sheets__read_range

Read data from a specific range in a spreadsheet.

```bash
# Read entire sheet
skill__google_sheets__read_range \
  --spreadsheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --range "Sheet1"

# Read specific range
skill__google_sheets__read_range \
  --spreadsheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --range "Sheet1!A1:D10" \
  --format json

# Read with headers (treats first row as column names)
skill__google_sheets__read_range \
  --spreadsheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --range "Sheet1!A2:F" \
  --has-headers \
  --output ./data/export.json
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `--spreadsheet-id` | string | Yes | Spreadsheet ID (from URL) |
| `--range` | string | Yes | Range to read (e.g., `Sheet1!A1:D10` or `Sheet1`) |
| `--has-headers` | boolean | No | Treat first row as headers (default: false) |
| `--format` | string | No | Output format: `raw`, `json`, `csv` (default: raw) |
| `--output` | string | No | File path to save output |
| `--credentials-path` | string | No | Override default credentials path |

**Output Formats:**
- `raw`: 2D array of values
- `json`: Array of objects (requires `--has-headers`)
- `csv`: Comma-separated values

---

### skill__google_sheets__write_range

Write data to a specific range in a spreadsheet.

```bash
# Write simple values
skill__google_sheets__write_range \
  --spreadsheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --range "Sheet1!A1" \
  --values '[["Name", "Email", "Status"]]'

# Write from JSON data
skill__google_sheets__write_range \
  --spreadsheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --range "Sheet1!A1" \
  --input ./data/input.json \
  --input-format json

# Write with formatting
skill__google_sheets__write_range \
  --spreadsheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --range "Sheet1!A1:D5" \
  --values '[["Header1", "Header2"], ["Data1", "Data2"]]' \
  --format-as-header \
  --background-color "#4285F4" \
  --text-color "#FFFFFF"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `--spreadsheet-id` | string | Yes | Spreadsheet ID |
| `--range` | string | Yes | Target range |
| `--values` | array | No* | 2D array of values to write (*or use `--input`) |
| `--input` | string | No* | Input file path |
| `--input-format` | string | No | Format of input: `json`, `csv` (default: json) |
| `--format-as-header` | boolean | No | Apply header formatting |
| `--background-color` | string | No | Cell background color (hex) |
| `--text-color` | string | No | Text color (hex) |
| `--bold` | boolean | No | Make text bold |
| `--raw` | boolean | No | Use RAW input mode (no parsing) |

---

### skill__google_sheets__append_rows

Append rows to the end of a sheet (preserving existing data).

```bash
# Append single row
skill__google_sheets__append_rows \
  --spreadsheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --sheet-name "Sheet1" \
  --values '["John Doe", "john@example.com", "2024-01-15"]' \
  --timestamp-column "C"

# Append multiple rows
skill__google_sheets__append_rows \
  --spreadsheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --sheet-name "Logs" \
  --input ./data/logs.csv \
  --input-format csv

# Append with auto-timestamp
skill__google_sheets__append_rows \
  --spreadsheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --sheet-name "Sheet1" \
  --values '["Event occurred"]' \
  --auto-timestamp
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `--spreadsheet-id` | string | Yes | Spreadsheet ID |
| `--sheet-name` | string | Yes | Sheet/tab name |
| `--values` | array | No* | Row data to append (*or use `--input`) |
| `--input` | string | No* | Input file path |
| `--input-format` | string | No | Format: `json`, `csv` (default: json) |
| `--auto-timestamp` | boolean | No | Add current timestamp as first column |
| `--timestamp-column` | string | No | Column letter for timestamp |
| `--insert-empty-rows` | number | No | Insert N empty rows before appending |

---

### skill__google_sheets__create_sheet

Create a new Google Sheets spreadsheet.

```bash
# Create basic spreadsheet
skill__google_sheets__create_sheet \
  --title "Project Tracking 2024" \
  --output ./output/spreadsheet_info.json

# Create with initial data and formatting
skill__google_sheets__create_sheet \
  --title "Sales Report" \
  --sheets '["Q1", "Q2", "Q3", "Q4"]' \
  --initial-data ./templates/sales_headers.json \
  --share-with "team@company.com" \
  --role writer

# Create from template
skill__google_sheets__create_sheet \
  --title "Monthly Budget" \
  --template-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" \
  --folder-id "0B1234567890abcdef"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `--title` | string | Yes | Spreadsheet title |
| `--sheets` | array | No | Array of sheet names to create |
| `--initial-data` | string | No | Path to JSON/CSV with initial data |
| `--template-id` | string | No | Copy from existing spreadsheet |
| `--folder-id` | string | No | Google Drive folder ID |
| `--share-with` | string | No | Email to share with |
| `--role` | string | No | Share role: `reader`, `writer`, `owner` (default: reader) |
| `--output` | string | No | Save spreadsheet info to file |

**Returns:** Spreadsheet ID, URL, and created sheet metadata

---

## Data Export Workflows

### Database to Sheets

```bash
# Export SQL query results
eval $(skill__database__query \
  --connection "postgresql://user:pass@localhost/db" \
  --query "SELECT * FROM sales WHERE date >= '2024-01-01'" \
  --format json) | skill__google_sheets__write_range \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --range "Sheet1!A1" \
  --input - \
  --input-format json
```

### API Data to Sheets

```bash
# Fetch API data and write to sheet
eval $(skill__web_fetch \
  --url "https://api.example.com/metrics" \
  --extract '.data.metrics' \
  --format json) | skill__google_sheets__append_rows \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --sheet-name "Metrics" \
  --input - \
  --auto-timestamp
```

### Local CSV Export

```bash
# Convert CSV to formatted sheet
skill__google_sheets__create_sheet \
  --title "CSV Import $(date +%Y-%m-%d)" \
  --initial-data ./data/export.csv \
  --output ./output/sheet_info.json

# Then apply formatting
skill__google_sheets__write_range \
  --spreadsheet-id $(jq -r '.spreadsheetId' ./output/sheet_info.json) \
  --range "Sheet1!A1:Z1" \
  --format-as-header \
  --background-color "#1a73e8" \
  --text-color "#ffffff"
```

---

## Formatting

### Cell Formatting Options

When using `skill__google_sheets__write_range`, you can apply formatting:

| Option | Description | Example |
|--------|-------------|---------|
| `--background-color` | Cell background | `#4285F4` |
| `--text-color` | Font color | `#FFFFFF` |
| `--bold` | Bold text | `true` |
| `--italic` | Italic text | `true` |
| `--font-size` | Font size in points | `11` |
| `--horizontal-align` | Text alignment | `LEFT`, `CENTER`, `RIGHT` |
| `--number-format` | Number format pattern | `"#,##0.00"` |
| `--date-format` | Date format pattern | `"yyyy-MM-dd"` |

### Format Presets

```bash
# Header row preset
--format-as-header

# Currency format
--format-currency "USD"

# Percentage format
--format-percentage

# Date format
--format-date "yyyy-MM-dd"
```

### Conditional Formatting (Advanced)

```bash
# Apply conditional formatting via batch update
skill__google_sheets__batch_update \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --requests '[{
    "addConditionalFormatRule": {
      "rule": {
        "ranges": [{"sheetId": 0, "startRowIndex": 1, "endRowIndex": 100}],
        "booleanRule": {
          "condition": {"type": "NUMBER_GREATER", "values": [{"userEnteredValue": "1000"}]},
          "format": {"backgroundColor": {"red": 0.8, "green": 1, "blue": 0.8}}
        }
      }
    }
  }]'
```

---

## Automation Use Cases

### 1. Daily Sales Report Automation

```bash
#!/bin/bash
# daily_sales_report.sh

set -e

# Configuration
SPREADSHEET_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
SHEET_NAME="$(date +%Y-%m-%d)"

# Create new sheet for today
skill__google_sheets__create_sheet \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --sheet-name "$SHEET_NAME"

# Query database and write data
DB_RESULTS=$(skill__database__query \
  --connection "$DATABASE_URL" \
  --query "SELECT * FROM daily_sales WHERE date = CURRENT_DATE" \
  --format json)

skill__google_sheets__write_range \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --range "${SHEET_NAME}!A1" \
  --values "$DB_RESULTS" \
  --format-as-header

# Send notification
echo "Daily report updated: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}"
```

Add to crontab:
```cron
0 9 * * * /path/to/daily_sales_report.sh >> /var/log/sheets_automation.log 2>&1
```

### 2. Form Response Collector

```bash
#!/bin/bash
# collect_form_responses.sh

SPREADSHEET_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

# Read new form responses (from API or database)
NEW_RESPONSES=$(skill__api__fetch \
  --url "https://api.forms.com/responses?since=$(date -d '1 hour ago' +%s)" \
  --jq '.responses[] | [.timestamp, .name, .email, .feedback]')

# Append to spreadsheet
if [ -n "$NEW_RESPONSES" ]; then
  skill__google_sheets__append_rows \
    --spreadsheet-id "$SPREADSHEET_ID" \
    --sheet-name "Form Responses" \
    --values "$NEW_RESPONSES"
  
  echo "$(date): Appended $(echo "$NEW_RESPONSES" | wc -l) responses"
fi
```

### 3. Inventory Sync

```bash
#!/bin/bash
# inventory_sync.sh

SPREADSHEET_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

# Read current inventory from warehouse system
INVENTORY=$(skill__api__fetch \
  --url "https://warehouse.internal/api/v1/inventory" \
  --headers "Authorization: Bearer $WAREHOUSE_TOKEN")

# Clear existing data
skill__google_sheets__clear_range \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --range "Inventory!A2:Z"

# Write fresh data
skill__google_sheets__write_range \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --range "Inventory!A2" \
  --values "$INVENTORY"

# Apply conditional formatting for low stock
skill__google_sheets__batch_update \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --requests "$LOW_STOCK_CONDITIONAL_FORMAT"
```

### 4. Multi-Source Data Consolidation

```bash
#!/bin/bash
# consolidate_metrics.sh

MASTER_SHEET="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

# Collect metrics from multiple sources
SALES=$(skill__database__query --query "SELECT SUM(amount) FROM sales" --scalar)
USERS=$(skill__api__fetch --url "https://analytics.example.com/users" --jq '.total')
ERRORS=$(skill__logs__query --filter "severity=ERROR" --count)

# Append consolidated row
skill__google_sheets__append_rows \
  --spreadsheet-id "$MASTER_SHEET" \
  --sheet-name "Consolidated" \
  --values "[\"$(date -Iseconds)\", $SALES, $USERS, $ERRORS]"
```

### 5. Report Generation and Distribution

```bash
#!/bin/bash
# generate_weekly_report.sh

# Create new spreadsheet from template
eval $(skill__google_sheets__create_sheet \
  --title "Weekly Report $(date +%Y-W%V)" \
  --template-id "$REPORT_TEMPLATE_ID" \
  --output /tmp/sheet_info.json)

SPREADSHEET_ID=$(jq -r '.spreadsheetId' /tmp/sheet_info.json)

# Populate with data
skill__google_sheets__write_range \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --range "Data!A1" \
  --input ./weekly_data.csv \
  --format-as-header

# Share with stakeholders
eval $(skill__google_sheets__share \
  --spreadsheet-id "$SPREADSHEET_ID" \
  --email "stakeholders@company.com" \
  --role reader)

# Send email notification
eval $(skill__email__send \
  --to "stakeholders@company.com" \
  --subject "Weekly Report Available" \
  --body "View at: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}")
```

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid credentials | Re-run setup, check credentials file |
| `403 Forbidden` | Insufficient permissions | Share spreadsheet with service account/email |
| `404 Not Found` | Spreadsheet doesn't exist | Verify spreadsheet ID |
| `400 Invalid Value` | Malformed data | Check JSON/CSV format |
| `429 Rate Limited` | Too many requests | Add delays between calls, use batch operations |

### Retry Logic

```bash
# Add retry with exponential backoff
for i in 1 2 4 8; do
  if skill__google_sheets__read_range --spreadsheet-id "$ID" --range "A1"; then
    break
  fi
  echo "Retrying in ${i}s..."
  sleep $i
done
```

---

## Security Best Practices

1. **Never commit credentials** - Store in `.env` or secure vault
2. **Use service accounts** for automation (more secure than OAuth)
3. **Limit scopes** - Only request necessary permissions
4. **Rotate keys regularly** - Regenerate service account keys quarterly
5. **Audit access** - Review sharing permissions periodically
6. **Enable audit logging** - Track API usage in Google Cloud Console

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_SHEETS_CREDENTIALS` | Path to credentials file |
| `GOOGLE_SHEETS_TOKEN` | Path to OAuth token file |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Default spreadsheet ID |
| `GOOGLE_SHEETS_SERVICE_ACCOUNT` | Service account email |

---

## Integration with Other Skills

```bash
# Database → Sheets
skill__database__query → skill__google_sheets__write_range

# API → Sheets
skill__web_fetch → skill__google_sheets__append_rows

# Sheets → Analysis
skill__google_sheets__read_range → skill__data_analysis__stats

# Sheets → Email
skill__google_sheets__read_range → skill__email__send

# Sheets → Storage
skill__google_sheets__read_range → skill__s3__upload
```

---

## License

MIT - Part of the Kai Skills Collection
