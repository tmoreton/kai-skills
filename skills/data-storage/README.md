# Data Storage Skill

A simple file I/O skill for reading and writing JSON, Markdown, and text files.

## Installation

```bash
cd /path/to/kai-skills
kai skills add ./skills/data-storage
```

Or install from a registry:

```bash
kai skills install data-storage
```

## Tools

### Generic File I/O
- **read** - Auto-detect file type and read (JSON or text)
- **write** - Auto-detect and write (JSON or text)
- **append** - Append content to a file (creates if doesn't exist)

### JSON Files
- **read_json** - Read and parse a JSON file
- **write_json** - Write data to a JSON file with optional pretty-printing

### Markdown Files
- **read_markdown** - Read a Markdown file
- **write_markdown** - Write content to a Markdown file with optional append mode

### Text Files
- **read_text** - Read any text file
- **write_text** - Write text to a file with optional append mode

## Usage Example

```yaml
# In your kai skill.yaml
dependencies:
  - data-storage
```

```javascript
// In your handler
const result = await ctx.invoke("data-storage:read_json", {
  file_path: "./data/config.json"
});
console.log(result.content);  // JSON string content
```

## Return Format

All tools return an object with a `content` property:

```javascript
{ content: "...file content or status message..." }
```
