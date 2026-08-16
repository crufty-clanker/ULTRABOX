// ── Codename Generator Tool ──
// Plugin API: define `renderTool(tool)` — returns HTML string.
// Expose any action functions on `window.tools.<id>`.

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

function renderTool(tool) {
  return `
    <div class="tool-card" id="tool-${tool.id}">
      <div class="tool-title">${tool.name}</div>
      <div class="tool-description">${tool.description}</div>
      <button class="tool-action" onclick="window.tools.codename.generate()">Generate</button>
      <div class="tool-result" id="codename-result" onclick="window.tools.codename.copy()" style="cursor: pointer;" title="Click to copy"></div>
    </div>
  `;
}

window.tools = window.tools || {};
window.tools.codename = {
  generate() {
    const adj = CODENAME_ADJECTIVES[Math.floor(Math.random() * CODENAME_ADJECTIVES.length)];
    const noun = CODENAME_NOUNS[Math.floor(Math.random() * CODENAME_NOUNS.length)];
    const codename = `${adj} ${noun}`;
    const result = document.getElementById("codename-result");
    if (result) {
      result.textContent = codename;
      result.title = "Click to copy";
    }
    window._currentCodename = codename;
  },

  async copy() {
    const codename = window._currentCodename;
    if (!codename) return;
    try {
      await navigator.clipboard.writeText(codename);
      const result = document.getElementById("codename-result");
      if (result) {
        const originalText = result.textContent;
        result.textContent = "Copied!";
        setTimeout(() => { result.textContent = originalText; }, 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }
};
