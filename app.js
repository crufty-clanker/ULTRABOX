// SPDX-FileCopyrightText: 2026 Toolbox Authors
// SPDX-License-Identifier: MIT

// ── Settings ──
let settings = {};

async function loadSettings() {
  try {
    const res = await fetch("settings.json");
    settings = await res.json();
  } catch {
    // silently use defaults
  }
}

// ── Clock ──
function initClock() {
  const timeEl = document.querySelector(".clock-time");
  const tzEl = document.querySelector(".clock-tz");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const format = settings.clock?.format || "24h";
  const is12h = format === "12h";

  function update() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    if (is12h) {
      const h12 = hours % 12 || 12;
      const hh = String(h12).padStart(2, "0");
      timeEl.innerHTML = `${hh}:${minutes}:${seconds}<span class="clock-ampm">${hours < 12 ? "AM" : "PM"}</span>`;
    } else {
      const hh = String(hours).padStart(2, "0");
      timeEl.textContent = `${hh}:${minutes}:${seconds}`;
    }

    tzEl.textContent = tz;
  }

  update();
  setInterval(update, 1000);
}

// ── Search ──
function initSearch() {
  const form = document.querySelector("#search form");
  const input = form.querySelector("input");
  const placeholder = settings.search?.placeholder || "search...";
  input.placeholder = placeholder;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || !settings.search?.url) return;
    const url = settings.search.url.replace("%s", encodeURIComponent(q));
    window.open(url, "_blank");
  });
}

// ── Links ──
function initLinks() {
  const container = document.getElementById("links");
  const links = settings.links || [];

  if (links.length === 0) return;

  container.innerHTML = links
    .map(
      (link) => `
    <a href="${link.url}" target="_blank" rel="noopener" class="link-item">
      <span class="link-icon">${link.icon || "→"}</span>
      <span class="link-label">${link.name}</span>
    </a>`
    )
    .join("");
}

// ── Tools (Plugin Loader) ──
async function initTools() {
  const container = document.getElementById("tools");
  const tools = settings.tools || [];

  if (tools.length === 0) return;

  container.innerHTML = "";

  for (const tool of tools) {
    try {
      await loadToolScript(tool.url);
      if (typeof renderTool === "function") {
        container.innerHTML += renderTool(tool);
      }
    } catch (err) {
      console.warn(`Failed to load tool: ${tool.url}`, err);
    }
  }
}

function loadToolScript(url) {
  return new Promise((resolve, reject) => {
    // Avoid duplicate loads
    if (document.querySelector(`script[data-tool="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.dataset.tool = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load tool: ${url}`));
    document.head.appendChild(script);
  });
}

// ── Feeds & PRs ──
async function initFeedsAndPRs() {
  const feeds = settings.feeds || [];
  const github = settings.github || { orgs: [], users: [] };

  if (feeds.length > 0) {
    await loadFeeds(feeds);
  }

  if (github.orgs.length > 0 || github.users.length > 0) {
    await loadPRs(github);
  }
}

async function loadFeeds(feeds) {
  const container = document.getElementById("feeds");
  container.innerHTML = "";

  for (const feed of feeds) {
    try {
      const items = await fetchRSS(feed.url);
      if (items.length === 0) continue;

      const feedEl = document.createElement("div");
      feedEl.className = "feed-item";
      feedEl.innerHTML = `
        <div class="feed-name">${feed.icon || "•"} ${feed.name}</div>
        <ul class="feed-list">
          ${items.map(item => `
            <li class="feed-link">
              <a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>
              <span class="feed-time">${formatTimeAgo(item.published)}</span>
            </li>
          `).join("")}
        </ul>
      `;
      container.appendChild(feedEl);
    } catch (err) {
      console.warn(`Failed to load feed: ${feed.name}`, err);
    }
  }
}

async function fetchRSS(url) {
  const encodedUrl = encodeURIComponent(url);
  const res = await fetch(`/api/rss?url=${encodedUrl}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

async function loadPRs(github) {
  const container = document.getElementById("prs");
  container.innerHTML = "";

  const allPRs = [];

  // Fetch PRs for orgs
  for (const org of github.orgs) {
    try {
      const prs = await fetchGitHubPRs(org, "org");
      allPRs.push(...prs);
    } catch (err) {
      console.warn(`Failed to load PRs for org: ${org}`, err);
    }
  }

  // Fetch PRs for users
  for (const user of github.users) {
    try {
      const prs = await fetchGitHubPRs(user, "user");
      allPRs.push(...prs);
    } catch (err) {
      console.warn(`Failed to load PRs for user: ${user}`, err);
    }
  }

  // Sort by created date (newest first)
  allPRs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Display top 20
  const topPRs = allPRs.slice(0, 20);
  container.innerHTML = topPRs
    .map(pr => `
      <div class="pr-item">
        <a href="${pr.html_url}" target="_blank" rel="noopener" class="pr-title">${pr.title}</a>
        <div class="pr-meta">
          <span class="pr-author">#${pr.number} by ${pr.user.login}</span>
          <span class="pr-time">${formatTimeAgo(pr.created_at)}</span>
        </div>
      </div>
    `)
    .join("");
}

async function fetchGitHubPRs(target, type) {
  const params = type === "org" ? `org=${encodeURIComponent(target)}` : `user=${encodeURIComponent(target)}`;
  const res = await fetch(`/api/github/pulls?${params}`);
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  return data.prs || [];
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  initClock();
  initSearch();
  initLinks();
  initTools();
  await initFeedsAndPRs();
});
