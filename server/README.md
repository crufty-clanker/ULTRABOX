# Toolbox Server

A minimal Go HTTP server that serves static files and proxies external API requests.

## Why

- Avoids CORS issues when fetching GitHub API or RSS feeds from the browser
- Provides a single entry point for the application
- Enables future features (auth, caching, rate limiting)

## Running

```bash
cd /path/to/ULTRABOX
go run server/main.go
```

Open `http://localhost:8080` in a browser.

## Configuration

Reads `server.json` from the project root:

```json
{
  "port": 8080
}
```

If `server.json` is missing or invalid, defaults to port 8080.

## API Endpoints

### `GET /api/rss?url={encoded_url}`

Fetches and parses RSS/Atom XML, returns JSON:

```json
{
  "title": "Feed Title",
  "items": [
    { "title": "Item Title", "link": "https://...", "published": "2024-01-01T00:00:00Z" }
  ]
}
```

Limits to 10 items per feed.

### `GET /api/github/pulls?org={org}&user={user}`

Fetches open PRs for orgs and users:

```json
{
  "prs": [
    {
      "title": "PR Title",
      "html_url": "https://...",
      "number": 123,
      "user": { "login": "username" },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

- For orgs: fetches `https://api.github.com/repos/{org}/*/pulls?state=open`
- For users: fetches `https://api.github.com/search/issues?q=type:pr+author:{user}+state:open`
- Limits to 20 PRs total, sorted by creation date (newest first)
- Optionally reads `GITHUB_TOKEN` env var for authenticated requests (higher rate limits)

## Static Files

All files in the project root are served as static files:

- `index.html`
- `style.css`
- `app.js`
- `settings.json`
- `favicon.svg`
- `tools/*.js`

## Dependencies

None. Uses only Go standard library.
