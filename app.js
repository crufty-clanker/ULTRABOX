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

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  initClock();
  initSearch();
  initLinks();
  initTools();
});
