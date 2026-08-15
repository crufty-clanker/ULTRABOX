# Toolbox — Design Document

## Vision

A minimal, offline-capable browser start page with a hacker/terminal aesthetic. Single user. Plain HTML + CSS + JS. No build step. No dependencies.

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
┌───────────────────────────────────────────────────────┐
│                    index.html                         │
│  ┌────────┐  ┌──────────────────────┐  ┌──────────┐  │
│  │  Links │  │                      │  │  Tools   │  │
│  │Sidebar │  │   Clock + Search     │  │ Sidebar  │  │
│  │  (L)   │  │                      │  │   (R)    │  │
│  └────────┘  └──────────────────────┘  └──────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │         app.js (logic + plugin loader)           │  │
│  │              style.css (looks)                   │  │
│  │         settings.json (fetched)                  │  │
│  │         tools/*.js (loaded dynamically)          │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

Three-column layout: left sidebar (links), center (clock + search), right sidebar (tools). All logic in `app.js`. All styles in `style.css`. Settings in `settings.json` (injected as inline JSON into the HTML). Tools are loaded as independent `.js` plugins from the `tools/` directory.

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

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `clock.format` | string | `"24h"` | Time format: `"12h"` or `"24h"` |
| `search.url` | string | `https://duckduckgo.com/?q=%s` | `%s` is replaced with the query |
| `search.placeholder` | string | `"search..."` | Placeholder text in the search bar |
| `links` | array of `{name, url, icon}` | `[]` | Quick link shortcuts. `icon` is optional. Renders in left sidebar. |
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
└─────────────────────────────────────────────────────┘
```

## Error Handling (Offline / API Failures)

The page should **never show an error message**. When external services are unavailable:

| Feature | Failure behavior |
|---------|-----------------|
| Clock | Always works (no network needed) |
| Search | Always works (no network needed) |
| Links | Always works (static data from settings.json) |

Implementation: wrap all `fetch()` calls in try/catch. On failure, skip rendering that section or render an empty state. Never throw, never alert.

## Layout

```
┌──────────┬──────────────────────────────────┬──────────┐
│  Links   │                                  │  Tools   │
│ Sidebar  │      HH:MM                       │ Sidebar  │
│          │       Asia/Seoul                 │          │
│ ⌘ GitHub │                                  │ 🎲 Codename│
│ ◆ GitLab │  ┌──────────────────────────┐    │  [Generate]│
│ ▦ Docker │  │ $ search...               │    │            │
│ ⬡ Proxmox│  └──────────────────────────┘    │            │
│ ☰ Notes  │                                  │            │
└──────────┴──────────────────────────────────┴──────────┘
```

- Full-screen width layout: left sidebar (~200px), center (flex), right sidebar (~250px)
- Left sidebar: vertical list of links, scrollable
- Center: clock + search, vertically and horizontally centered
- Right sidebar: tool cards, each with a title, description, and interactive area
- Sidebar labels ("LINKS", "TOOLS") as small uppercase headers

## Responsive

- Desktop-first design
- Mobile: single column, smaller clock, full-width search
- Breakpoint: 600px

## Performance

- Zero external dependencies
- No images (all icons are Unicode or inline SVG)
- No analytics, no tracking
- Page weight target: < 30KB total
- First contentful paint: < 200ms on local server
