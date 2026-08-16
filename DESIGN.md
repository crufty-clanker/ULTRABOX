# Toolbox — Design Document

## Vision

A minimal, offline-capable browser start page with a hacker/terminal aesthetic. Single user. Plain HTML + CSS + JS. No build step. No dependencies (client-side).

## Aesthetic Direction

### Mood
- **Hacker terminal** — green phosphor on black
- Think: late-night coding, old CRT monitors, `matrix` screensaver
- Functional, fast, no-nonsense

### Color Palette — Terminal Green

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#000000` | Main background (pure black) |
| `--green` | `#00ff41` | Primary accent (terminal green) |
| `--green-dim` | `#00ff4140` | Subtle glows, borders |
| `--green-faint` | `#00ff4110` | Background patterns |
| `--text` | `#00ff41` | Primary text |
| `--text-dim` | `#008f11` | Secondary text, labels |

### Typography
- **Font family:** system monospace stack (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`)
- Terminal green (`#00ff41`) on pure black
- Clock uses large monospace digits with letter-spacing
- No decorative fonts. The aesthetic comes from color, spacing, and restraint.

### Visual Language
- Glow effects via `text-shadow` and `box-shadow`
- CSS hexagon pattern background (subtle)
- Thin 1px borders with `--green-dim`
- Rounded corners: 4px
- Subtle opacity transitions on hover (0.2s ease)
- Icons are Unicode/SVG — no icon libraries

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  ┌────────┐  ┌──────────────────────┐  ┌──────────┐    │
│  │  Links │  │                      │  │  Tools   │    │
│  │Sidebar │  │   Clock + Search     │  │ Sidebar  │    │
│  │  (L)   │  │                      │  │   (R)    │    │
│  └────────┘  └──────────────────────┘  └──────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │    app.js (logic + plugin loader + feeds/PRs)     │  │
│  │    style.css (looks)                              │  │
│  │    settings.json (fetched)                        │  │
│  │    tools/*.js (loaded dynamically)                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Go Server (server/)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Static file server (port 8080)                   │  │
│  │  / → serves index.html, style.css, app.js, etc.   │  │
│  │                                                   │  │
│  │  /api/github/* → proxies to GitHub API            │  │
│  │    - Avoids CORS issues                           │  │
│  │    - Adds auth token if configured                │  │
│  │                                                   │  │
│  │  /api/rss/* → proxies RSS/Atom feeds              │  │
│  │    - Avoids CORS issues                           │  │
│  │    - Parses and returns JSON                      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

```
ULTRABOX/
├── index.html
├── style.css
├── app.js
├── settings.json
├── server.json         # Server configuration (port)
├── tools/
│   ├── codename.js     # NSA-style codename generator
│   ├── hashgen.js      # MD5, SHA-256, SHA-512 hash generator
│   └── bcrypt.js       # bcrypt hash generator
├── server/
│   ├── main.go         # Go server entry point
│   ├── go.mod          # Go module definition
│   └── README.md       # Server documentation
├── AGENTS.md
└── DESIGN.md
```

Three-column layout: left sidebar (links), center (clock + search + feeds/PRs), right sidebar (tools). Client-side logic in `app.js`, styles in `style.css`, settings in `settings.json`. Tools loaded as independent `.js` plugins from `tools/`. Server in `server/` handles static file serving and API proxying.

## Server Component (`server/`)

**What:** A minimal Go HTTP server that serves static files and proxies external API requests.

**Why:**
- Avoids CORS issues when fetching GitHub API or RSS feeds from the browser
- Provides a single entry point for the application
- Enables future features (auth, caching, rate limiting)

**Spec:**
- Written in Go (no dependencies beyond stdlib)
- Reads configuration from `server.json` at project root
- Serves static files from project root
- Proxies `/api/github/*` requests to GitHub API
- Proxies `/api/rss/*` requests to RSS feed URLs (returns JSON)
- Single binary, no build step for the client
- Runs via `go run server/main.go` or compiled binary

### Configuration (`server.json`)

```json
{
  "port": 8080
}
```

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `port` | int | `8080` | Port to listen on |

If `server.json` is missing or invalid, defaults to port 8080.

### Running the Server

```bash
cd /path/to/ULTRABOX
go run server/main.go
# Open http://localhost:8080
```

### API Endpoints

#### `GET /api/github/repos/{org}`
Proxies to GitHub API for org repos.

#### `GET /api/github/pulls?org={org}&user={user}`
Fetches open PRs for orgs and users.

#### `GET /api/rss?url={encoded_url}`
Fetches and parses RSS/Atom XML, returns JSON:
```json
{
  "title": "Feed Title",
  "items": [
    { "title": "Item Title", "link": "https://...", "published": "2024-01-01T00:00:00Z" }
  ]
}
```

## Components

### Tool: Plugin Architecture (`#sidebar-right`)

Tools are loaded as independent `.js` files from the `tools/` directory. Each tool is a self-contained plugin.

**Config schema:**
```json
{
  "tools": [
    {
      "id": "codename",
      "name": "Codename Generator",
      "description": "Generate NSA-style code names",
      "url": "tools/codename.js"
    }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Unique tool identifier |
| `name` | string | yes | Display name |
| `description` | string | yes | Shown under the tool title |
| `url` | string | yes | Path to the tool's `.js` file (relative to page root) |

**Plugin API:**

Each tool file must define a global `renderTool(tool)` function that returns an HTML string:

```js
// tools/mytool.js
function renderTool(tool) {
  return `
    <div class="tool-card" id="tool-${tool.id}">
      <div class="tool-title">${tool.name}</div>
      <div class="tool-description">${tool.description}</div>
      <button class="tool-action" onclick="window.tools.mytool.doThing()">Do Thing</button>
      <div class="tool-result" id="mytool-result"></div>
    </div>
  `;
}
```

For event handlers, expose functions on `window.tools.<id>`:

```js
window.tools = window.tools || {};
window.tools.mytool = {
  doThing() {
    // your logic here
    document.getElementById("mytool-result").textContent = "done";
  }
};
```

**Rules:**
- No build step. Plain `.js` files.
- No external dependencies.
- Tool files run in the global scope — avoid polluting `window` beyond `window.tools.<id>`.
- The `tool` parameter is the full config object from `settings.json`.
- Use `tool.id`, `tool.name`, `tool.description` for rendering.
- Error handling: if a tool script fails to load, it's silently skipped (no errors shown).

**Example: Codename Generator** (`tools/codename.js`)

Generates NSA-style two-part code names (e.g., "IRON HAWK", "SILVER STORM").

- One button: "Generate"
- On click: picks a random adjective + random noun from internal word lists
- Displays the generated codename in large terminal-green text with glow
- Each click produces a new random codename
- Word lists are hardcoded in `tools/codename.js` (no external calls)
- Example outputs: "DARK PHOENIX", "BLUE VIPER", "STEEL THUNDER", "SHADOW REAPER"

**Word Lists (internal, in `tools/codename.js`):**
- Adjectives: IRON, SILVER, DARK, BLUE, STEEL, SHADOW, STEALTH, CRIMSON, FROST, GHOST, etc.
- Nouns: HAWK, STORM, VIPER, THUNDER, REAPER, FALCON, WOLF, PHANTOM, DRAGON, etc.

**Example: Hash Generator** (`tools/hashgen.js`)

Generates MD5, SHA-256, and SHA-512 hashes for any input string.

- Textarea input for the string to hash
- "Hash" button triggers all three algorithms
- SHA-256/SHA-512 use the Web Crypto API (native, no deps)
- MD5 uses a compact pure JS implementation (~3KB embedded)
- Each hash has a copy button
- Example outputs (for "hello"):
  - MD5: `5d41402abc4b2a76b9719d911017c592`
  - SHA-256: `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`
  - SHA-512: `9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72...`

**Example: Bcrypt Hash Generator** (`tools/bcrypt.js`)

Generates a bcrypt hash for any input string using a pure-JS bcrypt implementation.

- Textarea input for the string to hash
- "Hash" button triggers bcrypt hashing
- Uses a pure-JS bcrypt implementation (no native/WASM module needed)
- Includes a configurable cost factor (default: 10)
- Copy button for the resulting hash
- Example output (for "hello", cost 10):
  - `$2b$10$<60-char bcrypt hash>`

### 1. Clock (`#clock`)

**What:** Current time in the user's local timezone.

**Spec:**
- Reads timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Format controlled by `settings.json` → `clock.format` (`"12h"` or `"24h"`)
- Updates every second via `setInterval`
- Large monospace font, centered
- Subtle label below showing timezone name (e.g., "Asia/Seoul")

**12h variant:** Shows `AM`/`PM` as a small superscript next to the time.

### 2. Search (`#search`)

**What:** A search bar that submits to a configurable URL.

**Spec:**
- Single input field, full width of its container
- `settings.json` → `search.url` defines the endpoint (`%s` replaced with encoded query)
- `settings.json` → `search.placeholder` defines placeholder text
- Submits on `Enter` key
- No autocomplete, no suggestions — just a clean bar
- Focus state: `--green` border color

### 3. Left Sidebar — Links (`#sidebar-left`)

**What:** Quick link shortcuts from `settings.json` → `links[]`, displayed in a fixed left sidebar.

**Spec:**
- Renders one entry per `links` array item
- Each entry: `{ name, url, icon? }` — `icon` is optional
- Displays as a vertical list in the left sidebar
- No external dependencies — icons are Unicode characters or custom icons
- **Offline:** Always works (static data from `settings.json`)
- Sidebar is fixed-width (~200px), scrollable if links overflow

### 4. Center — RSS Feeds (`#feeds`)

**What:** RSS/Atom feeds from `settings.json` → `feeds[]`, displayed in the center-left below the search bar.

**Spec:**
- Renders one feed block per `feeds` array item
- Each feed: `{ name, url, icon? }` — `icon` is optional
- Fetches via Go server proxy (`/api/rss?url=...`) to avoid CORS
- Parses RSS/Atom XML server-side, returns JSON
- Displays up to 10 items per feed
- Each item: title (link), relative time (e.g., "2h ago")
- **Online required:** Fetches external RSS feeds
- Falls back silently on failure (no errors shown)

### 5. Center — GitHub PRs (`#prs`)

**What:** Open pull requests from `settings.json` → `github.{orgs, users}`, displayed in the center-right below the search bar.

**Spec:**
- Config: `{ orgs: ["myorg"], users: ["myuser"] }`
- Fetches via Go server proxy (`/api/github/pulls?...`) to avoid CORS
- Displays up to 20 PRs sorted by creation date (newest first)
- Each PR: title (link), PR number, author, relative time
- **Online required:** Fetches from GitHub API
- Rate limited: 60 requests/hour without auth (1000 with auth)
- Falls back silently on failure (no errors shown)

## Settings (`settings.json`)

**What:** All user configuration, loaded once at page load.

**Spec:**
- Single JSON file at project root
- No API, no backend, no database
- Loaded via `fetch("settings.json")` at page load
- Read by `app.js` via `res.json()`
- Changes require manual file edit + browser reload
- If loading fails, defaults are used silently (no errors shown)

### Config Schema

```json
{
  "clock": {
    "format": "24h"
  },
  "search": {
    "url": "https://duckduckgo.com/?q=%s",
    "placeholder": "search..."
  },
  "links": [
    { "name": "GitHub", "url": "https://github.com", "icon": "⌘" }
  ],
  "feeds": [
    { "name": "Hacker News", "url": "https://hnrss.org/frontpage", "icon": "🔥" }
  ],
  "github": {
    "orgs": [],
    "users": []
  },
  "tools": [
    {
      "id": "codename",
      "name": "Codename Generator",
      "description": "Generate NSA-style code names",
      "url": "tools/codename.js"
    },
    {
      "id": "hashgen",
      "name": "Hash Generator",
      "description": "MD5, SHA-256, SHA-512 for any input string",
      "url": "tools/hashgen.js"
    },
    {
      "id": "bcrypt",
      "name": "Bcrypt Hash Generator",
      "description": "Generate bcrypt hashes for passwords",
      "url": "tools/bcrypt.js"
    }
  ]
}
```

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `clock.format` | string | `"24h"` | Time format: `"12h"` or `"24h"` |
| `search.url` | string | `https://duckduckgo.com/?q=%s` | `%s` is replaced with the query |
| `search.placeholder` | string | `"search..."` | Placeholder text in the search bar |
| `links` | array of `{name, url, icon}` | `[]` | Quick link shortcuts. `icon` is optional. Renders in left sidebar. |
| `feeds` | array of `{name, url, icon?}` | `[]` | RSS/Atom feeds displayed in center-left below search. |
| `github` | `{orgs: string[], users: string[]}` | `{orgs: [], users: []}` | GitHub orgs/users to fetch open PRs for. Displayed in center-right below search. |
| `tools` | array of `{id, name, description, url}` | `[]` | Tool plugins rendered in right sidebar. Each `url` points to a `.js` file in `tools/`. |

## Data Flow

```
settings.json
    ↓ (fetched at page load)
index.html → fetch("settings.json")
    ↓ (parsed on DOMContentLoaded)
app.js
    ↓
┌─────────────────────────────────────────────────────┐
│  initClock() → reads timezone from browser           │
│  initSearch() → reads URL from config                │
│  initLinks() → reads links from config → left sidebar│
│  initTools() → loads tool plugins → right sidebar    │
│    loadToolScript(url) → <script> tag injection       │
│    renderTool(tool) → HTML string from plugin        │
│  initFeedsAndPRs() → center-bottom panels            │
│    loadFeeds() → fetch /api/rss?url=... → parse → render│
│    loadPRs() → fetch /api/github/pulls → sort → render│
└─────────────────────────────────────────────────────┘
    ↓ (HTTP requests)
Go Server (server/main.go)
    ↓
┌─────────────────────────────────────────────────────┐
│  Static files (index.html, style.css, etc.)          │
│  /api/github/* → proxies to GitHub API               │
│  /api/rss/* → fetches RSS/Atom XML → returns JSON    │
└─────────────────────────────────────────────────────┘
```

## Error Handling (Offline / API Failures)

The page should **never show an error message**. When external services are unavailable:

| Feature | Failure behavior |
|---------|-----------------|
| Clock | Always works (no network needed) |
| Search | Always works (no network needed) |
| Links | Always works (static data from settings.json) |
| Tools | Always works (static data from settings.json + local JS) |
| Feeds | Silently skips on failure (no errors shown) |
| PRs | Silently skips on failure (no errors shown) |

Implementation: wrap all `fetch()` calls in try/catch. On failure, skip rendering that section or render an empty state. Never throw, never alert.

## Layout

```
┌──────────┬──────────────────────────────────────────────┬──────────┐
│  Links   │                                              │  Tools   │
│ Sidebar  │          HH:MM                               │ Sidebar  │
│          │           Asia/Seoul                         │          │
│ ⌘ GitHub │                                              │ 🎲 Codename│
│ ◆ GitLab │  ┌──────────────────────────────────────┐   │  [Generate]│
│ ▦ Docker │  │ $ search...                          │   │            │
│ ⬡ Proxmox│  └──────────────────────────────────────┘   │            │
│ ☰ Notes  │  ┌──────────────────┐  ┌────────────────┐   │            │
│          │  │ RSS FEEDS        │  │ PULL REQUESTS  │   │            │
│          │  │ • Item 1         │  │ PR #123 - Title│   │            │
│          │  │ • Item 2         │  │ #456 by author │   │            │
│          │  │ • Item 3         │  │ PR #789 - Title│   │            │
│          │  └──────────────────┘  └────────────────┘   │            │
└──────────┴──────────────────────────────────────────────┴──────────┘
```

- Full-screen width layout: left sidebar (~200px), center (flex), right sidebar (~250px)
- Left sidebar: vertical list of links, scrollable
- Center: clock + search + feeds/PRs, vertically and horizontally centered
- Right sidebar: tool cards, each with a title, description, and interactive area
- Sidebar labels ("LINKS", "TOOLS") as small uppercase headers

## Responsive

- Desktop-first design
- Mobile: single column, smaller clock, full-width search
- Breakpoint: 600px

## Performance

- Zero external dependencies (client-side)
- No images (all icons are Unicode or inline SVG)
- No analytics, no tracking
- Page weight target: < 30KB total (excluding Go server)
- First contentful paint: < 200ms on local server
- Go server: single binary, no dependencies beyond stdlib
