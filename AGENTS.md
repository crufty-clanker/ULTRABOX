# Toolbox — Agent README

## What This Is

A minimal, offline-capable browser start page with a hacker/terminal aesthetic. Single user. Plain HTML + CSS + JS. No build step. No dependencies.

## Running It

### Development

```bash
go run server/main.go
```

Or with flags:

```bash
./toolbox --config ./server.json --data . --static . --log stderr
```

Open `http://localhost:8080` in a browser.

### Production

```bash
sudo ./scripts/install.sh
```

The service starts automatically. View logs with:

```bash
journalctl -u toolbox -f
```

The Go server serves static files and proxies API requests to avoid CORS issues.

## Deployment

### Filesystem Layout

**Production installation:**

```
/etc/toolbox/              # Configuration files
├── settings.json          # User configuration
├── server.json            # Server configuration
└── tools/                 # Tool plugins

/opt/toolbox/              # Application files
├── toolbox                # Binary
├── index.html
├── style.css
├── app.js
└── favicon.svg

/var/log/toolbox/          # Log files (optional)
```

**Development (source tree):**

```
/path/to/ULTRABOX/
├── settings.json
├── server.json
├── index.html
├── style.css
├── app.js
├── tools/
│   └── *.js
└── server/
    └── main.go
```

### Command-Line Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--config` | `./server.json` | Path to server configuration |
| `--data` | `.` | Path to data directory |
| `--static` | `.` | Path to static files |
| `--log` | `journald` | Log output: journald, stderr, stdout, or file path |
| `--listen` | `:8080` | Listen address (e.g., `:8080`, `127.0.0.1:8080`, `0.0.0.0:8081`) |
| `--version` | - | Print version and exit |

**Note:** `--listen` combines both port and interface. No separate port setting needed.

**Examples:**

```bash
# Development
./toolbox --config ./server.json --data . --static . --log stderr

# Production (default paths)
toolbox

# Localhost only
toolbox --listen 127.0.0.1:8080

# Custom paths and listen address
./toolbox --config /etc/toolbox/server.json --data /etc/toolbox --static /opt/toolbox --listen 0.0.0.0:8081
```

### Systemd Service

Installed at `/etc/systemd/system/toolbox.service`:

```ini
[Unit]
Description=Toolbox - Browser Start Page
After=network.target

[Service]
Type=simple
User=toolbox
Group=toolbox
ExecStart=/opt/toolbox/toolbox --config /etc/toolbox/server.json --data /etc/toolbox --static /opt/toolbox
Restart=on-failure
RestartSec=5
StandardOutput=journald
StandardError=journald
SyslogIdentifier=toolbox

[Install]
WantedBy=multi-user.target
```

**Note:** Set `listen` in `server.json` to `127.0.0.1:8080` for security. Change to `0.0.0.0:8080` if you need LAN access, or use a reverse proxy.

**Management:**

```bash
sudo systemctl start toolbox
sudo systemctl stop toolbox
sudo systemctl restart toolbox
sudo systemctl enable toolbox  # Start on boot
sudo systemctl disable toolbox # Stop starting on boot
journalctl -u toolbox -f       # View logs
```

### Building

```bash
# Development build
make build

# With custom version
make build VERSION=1.0.0

# Install to system
make install
```

### Installation Script

`scripts/install.sh` handles:
- Creating `toolbox` user
- Installing binary to `/opt/toolbox/`
- Copying configuration to `/etc/toolbox/`
- Setting up systemd service
- Starting the service

```bash
# Build first
make build

# Install (requires sudo)
sudo ./scripts/install.sh
```

## File Structure

```
ULTRABOX/
├── index.html          # Single page entry point
├── style.css           # All styles (terminal theme, hex bg)
├── app.js              # Core app logic + plugin loader + feeds/PRs
├── settings.json       # User configuration (edit manually, reload page)
├── server.json         # Server configuration (port)
├── tools/              # Tool plugins (one .js per tool)
│   ├── codename.js     # NSA-style codename generator
│   ├── hashgen.js      # MD5, SHA-256, SHA-512 hash generator
│   └── bcrypt.js       # bcrypt hash generator
├── server/             # Go server (static files + API proxy)
│   ├── main.go
│   ├── go.mod
│   └── README.md
├── AGENTS.md     # ← you are here
└── DESIGN.md
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
      "url": "tools/codename.js"
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
| `tools` | array of `{id, name, description, url}` | `[]` | Tool plugins rendered in right sidebar. Each `url` points to a `.js` file in `tools/`. |
| `feeds` | array of `{name, url, icon?}` | `[]` | RSS/Atom feeds displayed in center-left below search. |
| `github` | `{orgs: string[], users: string[]}` | `{orgs: [], users: []}` | GitHub orgs/users to fetch open PRs for. Displayed in center-right below search. |

## Server Configuration — `server.json`

Server settings, loaded at startup.

```json
{
  "listen": ":8080"
}
```

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `listen` | string | `:8080` | Listen address (e.g., `:8080`, `127.0.0.1:8080`, `0.0.0.0:8081`) |

If `server.json` is missing or invalid, defaults to port 8080.

### Tool: Plugin Architecture

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

### Writing a Tool Plugin

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

## Code Conventions

### HTML (`index.html`)
- Single `<main>` with three-column layout: `#sidebar-left`, `#clock` + `#search` (center), `#sidebar-right`
- `#sidebar-left` contains `#links` (vertical list of quick links)
- `#sidebar-right` contains `#tools` (tool cards)
- `<script type="module" src="app.js">` for app logic
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
- All DOM manipulation happens after `DOMContentLoaded`
- `initTools()` loads tool plugins dynamically from URLs in settings.json
- Each tool plugin defines `renderTool(tool)` and optionally exposes actions on `window.tools.<id>`

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

### Adding a Tool Plugin

1. Create `tools/<id>.js`
2. Define `renderTool(tool)` returning HTML
3. Expose action functions on `window.tools.<id>`
4. Add entry to `settings.json` tools array with `url: "tools/<id>.js"`
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

## License and REUSE Compliance

This project is REUSE-compliant. All files contain SPDX headers with copyright and license information.

- **License:** MIT
- **License file:** [LICENSE](LICENSE)
- **License texts:** [LICENSES/](LICENSES/) directory
- **Configuration:** [REUSE.toml](REUSE.toml)

When adding new files, always include the SPDX header:

```
// SPDX-FileCopyrightText: 2026 Toolbox Authors
// SPDX-License-Identifier: MIT
```

Format varies by file type (see DESIGN.md for examples).
