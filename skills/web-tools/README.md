# Web Tools

A Kai skill for web operations. Provides web page fetching and Tavily web search.

## Tools

- **fetch** - Fetch content from a URL
  - `url` (required): URL to fetch
  - `method`: HTTP method (default: GET)

- **search** - Search the web using Tavily
  - `query` (required): Search query
  - `max_results`: Maximum results (default: 5)

## Installation

1. Copy this directory to your Kai skills folder
2. Set your Tavily API key as an environment variable:
   ```bash
   export TAVILY_API_KEY=your_api_key_here
   ```
   Or configure it in the skill config under `tavily_api_key`.

Get your Tavily API key at: https://tavily.com

## Configuration

- `TAVILY_API_KEY` - Required for the search tool
