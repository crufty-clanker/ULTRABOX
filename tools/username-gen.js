// ── Username Generator Tool ──
// Plugin API: define `renderTool(tool)` — returns HTML string.
// Expose any action functions on `window.tools.<id>`.

const USERNAME_ADJECTIVES = [
  "SILVER", "DARK", "NEON", "SILENT", "FAST", "CYBER", "LUNAR", "STEEL",
  "GHOST", "SHADOW", "IRON", "FROST", "BLOOD", "CRIMSON", "ECHO", "FALCON",
  "HYDRA", "JADE", "KINETIC", "LONE", "MIDNIGHT", "ONYX", "PHANTOM", "RAZOR",
  "SABLE", "STEALTH", "THUNDER", "URBAN", "VENOM", "VOID", "WOLF", "ZERO"
];

const USERNAME_NOUNS = [
  "FOX", "PANDA", "TIGER", "WOLF", "HAWK", "DRAGON", "PHOENIX", "EAGLE",
  "COBRA", "VIPER", "SHARK", "BEAR", "LION", "JACKAL", "RAVEN", "CRANE",
  "FALCON", "STORM", "BLAZE", "FROST", "THORN", "STEEL", "IRON", "ONYX"
];

const USERNAME_SEPARATORS = ["-", "_", ".", ""];

function renderTool(tool) {
  return `
    <div class="tool-card" id="tool-${tool.id}">
      <div class="tool-title">${tool.name}</div>
      <div class="tool-description">${tool.description}</div>
      <button class="tool-action" onclick="window.tools.usernamegen.generate()">Generate</button>
      <div class="tool-result" id="usernamegen-result"></div>
      <button class="tool-action copy-btn" onclick="window.tools.usernamegen.copy()" style="display:none; margin-top:0.5rem;">Copy</button>
    </div>
  `;
}

window.tools = window.tools || {};
window.tools.usernamegen = {
  generate() {
    const adj = USERNAME_ADJECTIVES[Math.floor(Math.random() * USERNAME_ADJECTIVES.length)];
    const noun = USERNAME_NOUNS[Math.floor(Math.random() * USERNAME_NOUNS.length)];
    const sep = USERNAME_SEPARATORS[Math.floor(Math.random() * USERNAME_SEPARATORS.length)];
    const num = Math.floor(Math.random() * 1000);
    
    const username = `${adj.toLowerCase()}${sep}${noun.toLowerCase()}${num}`;
    
    const result = document.getElementById("usernamegen-result");
    const copyBtn = document.querySelector(".copy-btn");
    if (result) result.textContent = username;
    if (copyBtn) {
      copyBtn.style.display = "block";
      copyBtn.textContent = "Copy";
    }
    window._currentUsername = username;
  },

  async copy() {
    const username = window._currentUsername;
    if (!username) return;
    try {
      await navigator.clipboard.writeText(username);
      const copyBtn = document.querySelector(".copy-btn");
      if (copyBtn) {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }
};
