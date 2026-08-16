# Toolbox

A minimal, offline-capable browser start page with a hacker/terminal aesthetic. Single user. Plain HTML + CSS + JS. No build step. No dependencies.

![Terminal Theme](https://img.shields.io/badge/theme-terminal-green) ![Offline](https://img.shields.io/badge/status-offline--capable-brightgreen) [![AI Usage Scale: Level 4 — Prompted](https://img.shields.io/badge/AI_Usage_Level-4_Prompted-e67e22?style=flat)](https://usagescale.org/4)

## Features

- **Clock** - Current time in your local timezone (12h/24h format)
- **Search** - Configurable search engine (DuckDuckGo default)
- **Quick Links** - Customizable sidebar links
- **RSS Feeds** - Display RSS/Atom feeds (Hacker News, Reddit, etc.)
- **GitHub PRs** - Track open pull requests for orgs/users
- **Tools** - Plugin system for custom tools:
  - Codename Generator (NSA-style code names)
  - Hash Generator (MD5, SHA-256, SHA-512)
  - Bcrypt Hash Generator
  - Username Generator

## Quick Start (Development)

### Prerequisites

- Go 1.21+
- Modern web browser

### Run Locally

```bash
# Clone the repository
git clone <repository-url>
cd ULTRABOX

# Run with Go (development)
go run server/main.go

# Or build and run
make build
./toolbox --config ./server.json --data . --static . --log stderr
```

Open `http://localhost:8080` in your browser.

### Configuration

Edit `settings.json` to customize:

```json
{
  "clock": { "format": "24h" },
  "search": {
    "url": "https://duckduckgo.com/?q=%s",
    "placeholder": "search..."
  },
  "links": [
    { "name": "GitHub", "url": "https://github.com", "icon": "⌘" }
  ],
  "feeds": [
    { "name": "Hacker News", "url": "https://hnrss.org/frontpage" }
  ],
  "github": {
    "orgs": [],
    "users": []
  },
  "tools": [
    { "id": "codename", "name": "Codename Generator", "url": "tools/codename.js" }
  ]
}
```

Changes require a page reload.

## Production Installation

### Automated Installation

```bash
# Build the binary
make build

# Install (requires sudo)
sudo ./scripts/install.sh
```

This will:
- Create a `toolbox` system user
- Install the binary to `/opt/toolbox/`
- Copy configuration to `/etc/toolbox/`
- Set up and enable the systemd service
- Start the service

### Manual Installation

```bash
# Build
cd server
go build -o ../toolbox .
cd ..

# Create directories
sudo mkdir -p /opt/toolbox /etc/toolbox /var/log/toolbox

# Create user
sudo useradd -r -s /usr/sbin/nologin toolbox

# Copy files
sudo cp toolbox /opt/toolbox/
sudo cp index.html style.css app.js favicon.svg /opt/toolbox/
sudo cp -r tools/ /opt/toolbox/
sudo cp settings.json server.json /etc/toolbox/

# Set ownership
sudo chown -R toolbox:toolbox /opt/toolbox /etc/toolbox /var/log/toolbox

# Install systemd service
sudo cp scripts/toolbox.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now toolbox
```

### Verify Installation

```bash
# Check service status
sudo systemctl status toolbox

# View logs
journalctl -u toolbox -f

# Test the page
curl http://localhost:8080
```

## Configuration

### Server Configuration (`/etc/toolbox/server.json`)

```json
{
  "port": 8080
}
```

### Command-Line Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--config` | `/etc/toolbox/server.json` | Path to server configuration |
| `--data` | `/etc/toolbox` | Path to data directory |
| `--static` | `/opt/toolbox` | Path to static files |
| `--log` | `journald` | Log output: journald, stderr, stdout, or file path |
| `--version` | - | Print version and exit |

### Systemd Service

The service runs as the `toolbox` user and logs to journald by default.

```bash
# View logs
journalctl -u toolbox -f

# Restart service
sudo systemctl restart toolbox

# Disable auto-start
sudo systemctl disable toolbox
```

## Troubleshooting

### Service won't start

```bash
# Check logs
journalctl -u toolbox -n 50

# Check if port is in use
sudo lsof -i :8080

# Check file permissions
ls -la /opt/toolbox/
ls -la /etc/toolbox/
```

### CORS errors

The server proxies API requests to avoid CORS issues. If you see CORS errors:
- Ensure you're accessing via the server (http://localhost:8080)
- Don't open `index.html` directly from the filesystem

### RSS feeds not loading

- Check network connectivity
- Verify feed URLs in `settings.json`
- Check server logs: `journalctl -u toolbox -n 50`

### GitHub API rate limiting

- The server caches GitHub responses (2 minutes)
- Add `GITHUB_TOKEN` environment variable for higher rate limits
- Check logs for rate limit errors

## Adding Tools

Create a new file in `tools/`:

```javascript
// tools/mytool.js
function renderTool(tool) {
  return `
    <div class="tool-card">
      <div class="tool-title">${tool.name}</div>
      <div class="tool-description">${tool.description}</div>
      <button onclick="window.tools.mytool.doThing()">Do Thing</button>
    </div>
  `;
}

window.tools = window.tools || {};
window.tools.mytool = {
  doThing() {
    console.log("Thing done!");
  }
};
```

Add to `settings.json`:

```json
{
  "tools": [
    {
      "id": "mytool",
      "name": "My Tool",
      "description": "Does a thing",
      "url": "tools/mytool.js"
    }
  ]
}
```

## Architecture

```
┌─────────────────────────────────────────┐
│           Browser (Client)              │
│  ┌────────┐  ┌──────────────────────┐   │
│  │  Links │  │   Clock + Search     │   │
│  │ Sidebar│  │                      │   │
│  │  (L)   │  │   Feeds + PRs        │   │
│  └────────┘  └──────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │         Tools Sidebar (R)        │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Go Server (server/)           │
│  ┌──────────────────────────────────┐   │
│  │  Static files + API proxy        │   │
│  │  /api/rss/* → RSS feeds          │   │
│  │  /api/github/* → GitHub API      │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

All files are REUSE-compliant. See [LICENSES/](LICENSES/) directory for full license texts.

## Contributing

Contributions welcome! Please read `DESIGN.md` for architecture details and `AGENTS.md` for development guidelines.
