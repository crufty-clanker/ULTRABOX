# Toolbox — Agent README

## What This Is

A minimal, offline-capable browser start page with a hacker/terminal aesthetic. Single user. Plain HTML + CSS + JS. No build step. No dependencies.

## Running It

```bash
cd /home/pi-agent/drafts/ULTRABOX
python3 -m http.server 8080
```

Open `http://localhost:8080` in a browser.

## File Structure

```
ULTRABOX/
├── index.html          # Single page entry point
├── style.css           # All styles (terminal theme, hex bg)
├── app.js              # All application logic
├── settings.json       # User configuration (edit manually, reload page)
├── AGENTS.md     # ← you are here
└── favicon.svg         # Terminal-style favicon
```

## Config Schema — `settings.json`

All config lives in one file. **No in-browser editor.** Edit the file, refresh the browser.

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
    { "name": "GitHub", "url": "https://github.com", "icon": "⌘" },
    { "name": "Docker", "url": "http://localhost:2375", "icon": "▦" }
  ],
  "tools": [
    {
      "id": "codename",
      "name": "Codename Generator",
      "description": "Generate NSA-style code names",
      "type": "codename"
    }
  ]
}
```

### Config Field Reference

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `clock.format` | string | `"24h"` | Time format: `"12h"` or `"24h"` |
| `search.url` | string | `https://duckduckgo.com/?q=%s` | `%s` is replaced with the query |
| `search.placeholder` | string | `"search..."` | Placeholder text in the search bar |
| `links` | array of `{name, url, icon}` | `[]` | Quick link shortcuts. `icon` is optional. Renders in left sidebar. |
| `tools` | array of `{id, name, description, type}` | `[]` | Tools rendered in right sidebar. See tool specs below. |

### Tool: Codename Generator

| Property | Value | Notes |
|----------|-------|-------|
| `id` | `"codename"` | Unique tool identifier |
| `name` | `"Codename Generator"` | Display name |
| `description` | `"Generate NSA-style code names"` | Shown under the tool title |
| `type` | `"codename"` | Determines rendering logic |

**Behavior:** Clicking the "Generate" button picks a random adjective + noun from hardcoded lists and displays the result in large terminal-green text with glow. No network calls. Word lists are embedded in `app.js`. Example outputs: "IRON HAWK", "SILVER STORM", "DARK PHOENIX", "BLUE VIPER".

## Code Conventions

### HTML (`index.html`)
- Single `<main>` with three-column layout: `#sidebar-left`, `#clock` + `#search` (center), `#sidebar-right`
- `#sidebar-left` contains `#links` (vertical list of quick links)
- `#sidebar-right` contains `#tools` (tool cards)
- Inline `<script>` tags for `settings.json` loading (ESM import) and `app.js`
- Semantic, minimal markup — no frameworks, no template engines

### CSS (`style.css`)
- Terminal green (`#00ff41`) on pure black
- CSS hexagon pattern background (subtle)
- Glow effects via `text-shadow` and `box-shadow`
- Three-column layout: left sidebar (~200px), center (flex), right sidebar (~250px)
- Sidebar labels as small uppercase headers
- Sidebar content scrollable if it overflows
- System monospace stack
- No CSS framework. No preprocessors.

### JavaScript (`app.js`)
- One IIFE or module — no class frameworks
- Functions are named and grouped by feature: `initClock()`, `initSearch()`, `initLinks()`, `initTools()`
- `loadSettings()` reads the inline JSON blob injected by `index.html`
- All DOM manipulation happens after `DOMContentLoaded`
- Codename generator uses hardcoded word lists (adjectives + nouns) for NSA-style name generation

### Error Handling (Offline / API Failures)
- **Never show error messages or alerts**
- When an API call fails, silently skip that section
- The page should always look complete — never broken or flashing

## Adding Features

1. Add the HTML section to `index.html`
2. Add styles to `style.css`
3. Add logic to `app.js` under the relevant feature group
4. Add config fields to `settings.json` if needed
5. Update this README

## Testing

- Open in Chrome/Firefox/Safari
- Verify all sections render
- Disconnect network — confirm graceful degradation (no errors, no blank screens)
- Edit `settings.json`, reload, confirm changes apply

## Important Notes

- **No build step.** Everything is plain files.
- **No external JS/CSS CDN dependencies.** Everything self-contained.
- **Settings are read once at load.** Changing `settings.json` requires a page reload.
- **Never invent features.** Only implement what is explicitly specified in DESIGN.md or AGENTS.md, or what the user directly asks for. Do not assume or add features that are not documented.
