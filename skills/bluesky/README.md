# Bluesky Skill (PLANNED/UPCOMING)

> **Status:** 🚧 Planned / Upcoming  
> **Priority:** High  
> **ETA:** Q1 2025  

---

## Overview

The Bluesky skill enables seamless integration with the [Bluesky](https://bsky.app) decentralized social network, allowing users and agents to publish content, manage feeds, upload media, and engage with the AT Protocol ecosystem.

Bluesky is built on the **AT Protocol** (Authenticated Transfer Protocol), a decentralized social networking protocol designed for interoperability, user ownership of data, and algorithmic choice.

---

## Why Bluesky?

| Feature | Benefit |
|---------|---------|
| **Decentralization** | No single company controls the network |
| **Data Portability** | Users own their data and can migrate between providers |
| **Algorithmic Choice** | Custom feeds and ranking algorithms |
| **Federated Identity** | Handle-based identity system (e.g., `@username.bsky.social`) |
| **Open Protocol** | Anyone can build clients, servers, or tools |

---

## Planned Capabilities

### 1. Posting (Skeets) ✍️

Publish short-form posts ("skeets") to the Bluesky network.

**Core Features:**
- **Text Posts**: Up to 300 characters per skeet
- **Rich Text**: Support for mentions (`@handle`), hashtags (`#topic`), and URLs
- **Reply Chains**: Respond to existing posts
- **Reposts**: Quote or re-share content
- **Likes**: Engage with community content
- **Facets**: Rich metadata for links, mentions, and tags

**Example Use Cases:**
```
- Publish status updates from agents
- Cross-post from other social platforms
- Automated announcements (builds, deployments, alerts)
- Scheduled content publishing
```

### 2. Media Uploads 📸

Attach images, GIFs, and videos to posts.

**Supported Formats:**
| Type | Formats | Limits |
|------|---------|--------|
| Images | JPEG, PNG, WebP | 1MB per image, max 4 per post |
| GIFs | Animated GIF | 1MB |
| Videos | MP4, MOV | In development |

**Features:**
- Image resizing and optimization
- Alt text support for accessibility
- Multi-image galleries
- Automatic format conversion

### 3. Thread Creation 🧵

Create connected series of posts for longer-form content.

**Capabilities:**
- Automatic thread splitting for content >300 characters
- Smart break points (sentence/paragraph boundaries)
- Reply-chain linking between thread posts
- Thread indexing (1/N, 2/N, etc.)
- Draft and preview before publishing

**Use Cases:**
- Long-form explanations and tutorials
- Storytelling and narratives
- Step-by-step guides
- Live event coverage

### 4. Feed Management 📰

Interact with Bluesky's customizable feed system.

**Feed Operations:**
- **Read Feeds**: Fetch posts from algorithmic feeds
- **Custom Feeds**: Create and curate custom algorithms
- **Saved Feeds**: Manage user's feed subscriptions
- **Feed Generators**: Deploy custom feed algorithms

**Feed Types:**
| Feed | Description |
|------|-------------|
| `following` | Posts from followed accounts |
| `popular` | Trending content network-wide |
| `custom` | User-defined algorithmic feeds |
| `search` | Query-based ephemeral feeds |

---

## AT Protocol Fundamentals

### Core Concepts

The AT Protocol is the foundation of Bluesky's architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    AT PROTOCOL STACK                     │
├─────────────────────────────────────────────────────────┤
│  Identity  │  DID (Decentralized Identifier) + Handle   │
├─────────────────────────────────────────────────────────┤
│  Data      │  Repositories (signed Merkle trees)       │
├─────────────────────────────────────────────────────────┤
│  Network   │  Federation of Personal Data Servers (PDS)│
├─────────────────────────────────────────────────────────┤
│  Labeling  │  Distributed moderation & labeling        │
├─────────────────────────────────────────────────────────┤
│  App View  │  Client applications (Bluesky app, etc.)  │
└─────────────────────────────────────────────────────────┘
```

### Key Terminology

| Term | Description |
|------|-------------|
| **DID** | Decentralized Identifier - permanent user ID |
| **PDS** | Personal Data Server - hosts user repositories |
| **Repo** | Repository - user's signed data store |
| **Lexicon** | Schema definitions for record types |
| **Record** | Individual piece of content (post, like, follow) |
| **NSID** | Namespaced Identifier (e.g., `app.bsky.feed.post`) |

### Record Types (Lexicons)

```typescript
// Post record structure
{
  "$type": "app.bsky.feed.post",
  "text": "Hello, Bluesky! 🦋",
  "createdAt": "2024-01-15T10:30:00Z",
  "facets": [
    {
      "index": { "byteStart": 0, "byteEnd": 5 },
      "features": [{ "$type": "app.bsky.richtext.facet#mention", "did": "..." }]
    }
  ],
  "embed": {
    "$type": "app.bsky.embed.images",
    "images": [{ "alt": "Description", "image": { "$type": "blob", ... } }]
  }
}
```

---

## Developer-Friendly API Structure

### Authentication

```javascript
// Session-based authentication
const session = await bluesky.authenticate({
  identifier: "handle.bsky.social",
  password: "app-specific-password"
});
```

### Posting

```javascript
// Simple text post
await bluesky.post({
  text: "Hello from Kai! 👋"
});

// Post with media
await bluesky.post({
  text: "Check out this view! 🌅",
  images: ["/path/to/image.jpg"],
  altText: ["Sunset over mountains"]
});

// Reply to a post
await bluesky.post({
  text: "Great point!",
  replyTo: "at://did:plc:.../app.bsky.feed.post/..."
});
```

### Thread Creation

```javascript
// Auto-split long content into threads
await bluesky.thread({
  content: "Long article here...",
  maxLength: 300,
  autoNumber: true  // Adds (1/N) indicators
});

// Manual thread with specific posts
await bluesky.thread([
  { text: "Part 1: Introduction" },
  { text: "Part 2: The Details" },
  { text: "Part 3: Conclusion" }
]);
```

### Feed Operations

```javascript
// Fetch home timeline
const timeline = await bluesky.getTimeline({ limit: 50 });

// Fetch specific feed
const feed = await bluesky.getFeed("at://did:plc:.../app.bsky.feed.generator/...");

// Search posts
const results = await bluesky.search({
  query: "#javascript",
  sort: "latest"
});
```

### Media Handling

```javascript
// Upload image
const blob = await bluesky.uploadImage("/path/to/photo.png", {
  alt: "Description for accessibility"
});

// Upload multiple images
const images = await bluesky.uploadImages([
  { path: "/img1.jpg", alt: "First image" },
  { path: "/img2.jpg", alt: "Second image" }
]);
```

---

## Decentralized Social Concepts

### Data Ownership

Unlike centralized platforms, Bluesky users:
- **Own their identity** via cryptographic DIDs
- **Control their data** stored in personal repositories
- **Choose their server** (PDS) or self-host
- **Export everything** at any time

### Federation Model

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User A    │     │   User B    │     │   User C    │
│  @alice.com │◄───►│ @bob.social │◄───►│@charlie.app │
│   (PDS 1)   │     │   (PDS 2)   │     │   (PDS 3)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Relay/Firehose  │
                    │  (Sync layer)    │
                    └─────────────┘
```

### Algorithmic Choice

Bluesky separates content hosting from content ranking:
- **Hosting layer**: Stores and serves posts (PDS)
- **Application layer**: Ranks and displays content (App Views)
- **Custom feeds**: Third-party algorithms users can subscribe to

This enables:
- No forced algorithm
- Community-built feed generators
- Diverse content discovery methods

---

## Configuration

### Environment Variables

```bash
# Authentication
BLUESKY_HANDLE=username.bsky.social
BLUESKY_PASSWORD=app-specific-password

# Optional: Custom PDS endpoint
BLUESKY_PDS_URL=https://bsky.social

# Optional: Rate limiting
BLUESKY_RATE_LIMIT=100  # requests per minute
BLUESKY_RETRY_ATTEMPTS=3
```

### Skill Configuration

```json
{
  "skill": "bluesky",
  "version": "1.0.0",
  "config": {
    "defaultVisibility": "public",
    "autoAltText": true,
    "threadNumbering": true,
    "mediaOptimization": true
  }
}
```

---

## Integration Patterns

### Agent Workflows

```yaml
# Example: Automated release announcements
on:
  release:
    types: [published]

steps:
  - uses: kai/bluesky
    with:
      action: thread
      content: |
        🚀 New Release: ${{ release.name }}
        
        ${{ release.notes }}
        
        ${{ release.url }}
```

### Cross-Platform Posting

```javascript
// Sync content across platforms
async function crossPost(content, image) {
  const results = await Promise.all([
    bluesky.post({ text: content, images: [image] }),
    twitter.post({ text: content, media: [image] }),
    mastodon.post({ status: content, media: [image] })
  ]);
  return results;
}
```

---

## Roadmap

### Phase 1: Core Posting (MVP)
- [ ] Authentication and session management
- [ ] Text skeet creation
- [ ] Reply functionality
- [ ] Basic media uploads

### Phase 2: Enhanced Features
- [ ] Thread creation and management
- [ ] Rich text with facets
- [ ] Feed reading and search
- [ ] Reposts and likes

### Phase 3: Advanced Capabilities
- [ ] Custom feed generators
- [ ] Real-time firehose streaming
- [ ] Labeling and moderation tools
- [ ] Analytics and engagement metrics

### Phase 4: Ecosystem Integration
- [ ] Third-party PDS support
- [ ] Data export/migration tools
- [ ] Custom lexicon support
- [ ] Federation monitoring

---

## Resources

### Official Documentation
- [AT Protocol Docs](https://atproto.com)
- [Bluesky API Reference](https://docs.bsky.app)
- [Lexicon Schemas](https://github.com/bluesky-social/atproto/tree/main/lexicons)

### Community
- [Bluesky Developer Discord](https://discord.gg/bluesky)
- [AT Protocol Discussions](https://github.com/bluesky-social/atproto/discussions)

### SDKs & Libraries
- [@atproto/api](https://www.npmjs.com/package/@atproto/api) - Official JavaScript client
- [atproto](https://github.com/bluesky-social/atproto) - Reference implementation

---

## Security & Best Practices

### Authentication
- Use **App Passwords** (not main account password)
- Rotate credentials regularly
- Store tokens securely (keychain/keystore)
- Implement proper session refresh

### Content
- Respect rate limits (avoid spam)
- Include alt text for accessibility
- Follow community guidelines
- Handle sensitive content appropriately

### Privacy
- Users control their data visibility
- Respect blocking/muting preferences
- Don't scrape without permission
- Handle DMs with encryption awareness

---

## Contributing

This skill is in the planning phase. To contribute:

1. Review the [AT Protocol specifications](https://atproto.com/specs)
2. Propose features via GitHub issues
3. Follow the existing skill structure patterns
4. Test against Bluesky's staging environment

---

## License

MIT - See root repository for full license text.

---

*Built for the decentralized future. 🦋*
