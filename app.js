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

// ── Tools ──
function initTools() {
  const container = document.getElementById("tools");
  const tools = settings.tools || [];

  if (tools.length === 0) return;

  container.innerHTML = tools
    .map((tool) => {
      if (tool.type === "codename") {
        return renderCodenameTool(tool);
      }
      return "";
    })
    .join("");
}

// ── Codename Generator ──
const CODENAME_ADJECTIVES = [
  "IRON", "SILVER", "DARK", "BLUE", "STEEL", "SHADOW", "STEALTH",
  "CRIMSON", "FROST", "GHOST", "BLACK", "BLOOD", "COPPER", "ELECTRIC",
  "FALCON", "FURY", "GOLDEN", "HAUNT", "HOLLOW", "ICE", "JADE",
  "KILLER", "LONE", "MIDNIGHT", "NIGHT", "ONYX", "PHANTOM", "RAZOR",
  "RED", "RUBY", "SABLE", "SILENT", "SOLAR", "STEEL", "THUNDER",
  "TITAN", "URBAN", "VENOM", "VOID", "WOLF", "YELLOW", "ZEPHYR",
  "ACID", "ASH", "BONE", "BRAZEN", "CHROME", "COBRA", "CORVUS",
  "COLD", "COPPER", "CRACKER", "CURSE", "DUSK", "ECHO", "EMBER",
  "FERAL", "FLAME", "FLINT", "GLACIAL", "GRIM", "HAZE", "HELLFIRE",
  "HUSH", "HYDRA", "ICED", "JACKAL", "KINETIC", "LACER", "MAELSTROM",
  "MALICE", "MIST", "MOON", "MUTANT", "NEON", "NEMESIS", "NOCTURN",
  "OBLIVION", "ONYX", "ORACLE", "PALE", "PHASE", "PIERCING", "PRIMAL",
  "RAVEN", "REAPER", "RIME", "RIPPER", "ROGUE", "RUNE", "SCARLET",
  "SERPENT", "SHARD", "SIREN", "SMOKE", "SNARL", "SPECTER", "SPITE",
  "STORM", "STRIKE", "SUBZERO", "SULFUR", "SUNLESS", "SWIFT", "THORN",
  "TOMAHAWK", "TRAP", "TUNGSTEN", "ULTRA", "VAPOR", "VORTEX", "WAR",
  "WRAITH", "WRECK", "ZERO"
];

const CODENAME_NOUNS = [
  "HAWK", "STORM", "VIPER", "THUNDER", "REAPER", "FALCON", "WOLF",
  "PHANTOM", "DRAGON", "COBRA", "EAGLE", "FANG", "GHOST", "HAWK",
  "IRON", "JACKAL", "KNIFE", "LANCE", "MONK", "NIGHT", "ONYX",
  "PIKE", "QUELL", "RAVEN", "SERPENT", "TIGER", "URSA", "VENOM",
  "WOLF", "XENON", "YAK", "ZEAL", "BLADE", "CIPHER", "DUSK",
  "EMBER", "FLUX", "GLINT", "HAVOC", "INFERNO", "JOLT", "KRAKEN",
  "APEX", "ARROW", "ASH", "AXE", "BANE", "BOLT", "BONE", "BRIGADE",
  "BURN", "CANNON", "CATALYST", "CAULDRON", "CHASM", "CLAW", "CLAYMORE",
  "COLLAPSE", "COMET", "CORTEX", "COUGAR", "CRASH", "CRESCENT", "CROW",
  "CYPHER", "DAGGER", "DAEMON", "DART", "DECOY", "DELTA", "DYNAMO",
  "EDGE", "ENIGMA", "ETERNAL", "FALCON", "FERAL", "FISSION", "FLARE",
  "FURY", "GAMMA", "GAUNTLET", "GLACIER", "GRIP", "HALO", "HAMMER",
  "HAVEN", "HEADHUNT", "HELIX", "HERETIC", "HUNTER", "HYPER", "HYSTRIX",
  "IMPACT", "INFERNO", "JACKAL", "JAVELIN", "JUNGLE", "KINETIC", "KNIFE",
  "LANCE", "LANCELOT", "LASER", "LETHAL", "LIMB", "LONGBOW", "MAGMA",
  "MARAUDER", "MAULER", "MEDUSA", "METEOR", "MORTAL", "MUTANT", "NEMESIS",
  "NEON", "NOVA", "ONYX", "ORACLE", "OUTLAW", "PIKE", "PULSE", "PYRE",
  "RAVEN", "REBEL", "REND", "RIOT", "RIPPER", "RITUAL", "ROCKET",
  "RUCKUS", "RUNE", "SABLE", "SCAR", "SCORCH", "SHARD", "SHADOW",
  "SIREN", "SKULL", "SLICE", "SNIPER", "SPARK", "SPARROW", "SPHERE",
  "SPY", "STALKER", "STRIKE", "SULFUR", "SWIFT", "SWORD", "TALON",
  "TEMPEST", "THORN", "TITAN", "TORCH", "TRAP", "TSUNAMI", "TYRANT",
  "ULTRA", "URSAN", "VAPOR", "VEIL", "VENOM", "VIGIL", "VOLT", "VORTEX",
  "WAR", "WATCH", "WHISPER", "WOLF", "WRATH", "ZERO"
];

function renderCodenameTool(tool) {
  return `
    <div class="tool-card" id="tool-${tool.id}">
      <div class="tool-title">${tool.name}</div>
      <div class="tool-description">${tool.description}</div>
      <button class="tool-action" onclick="generateCodename()">Generate</button>
      <div class="tool-result" id="codename-result"></div>
      <button class="tool-action copy-btn" onclick="copyCodename()" style="display:none; margin-top:0.5rem;">Copy</button>
    </div>
  `;
}

window.generateCodename = function generateCodename() {
  const adj = CODENAME_ADJECTIVES[Math.floor(Math.random() * CODENAME_ADJECTIVES.length)];
  const noun = CODENAME_NOUNS[Math.floor(Math.random() * CODENAME_NOUNS.length)];
  const codename = `${adj} ${noun}`;
  const result = document.getElementById("codename-result");
  const copyBtn = document.querySelector(".copy-btn");
  if (result) {
    result.textContent = codename;
  }
  if (copyBtn) {
    copyBtn.style.display = "block";
    copyBtn.textContent = "Copy";
  }
  window._currentCodename = codename;
}

window.copyCodename = async function copyCodename() {
  const codename = window._currentCodename;
  if (!codename) return;
  
  try {
    await navigator.clipboard.writeText(codename);
    const copyBtn = document.querySelector(".copy-btn");
    if (copyBtn) {
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 2000);
    }
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  initClock();
  initSearch();
  initLinks();
  initTools();
});
