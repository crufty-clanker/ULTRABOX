// ── Hash Generator Tool ──
// Supports: MD5, SHA-256, SHA-512 (bcrypt requires native module, not included)
// Plugin API: define `renderTool(tool)` — returns HTML string.
// Expose any action functions on `window.tools.<id>`.

// ── Compact MD5 (pure JS, ~3KB) ──
// Based on Paul Johnston's implementation, adapted for this tool.
var MD5 = (function () {
  function safeAdd(x, y) {
    var lsw = (x & 0xffff) + (y & 0xffff);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q, a, b, x, s, t) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a, b, c, d, x, s, t) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a, b, c, d, x, s, t) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a, b, c, d, x, s, t) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a, b, c, d, x, s, t) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function binlMD5(x, len) {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (var i = 0; i < x.length; i += 16) {
      var olda = a, oldb = b, oldc = c, oldd = d;
      a = md5ff(a, b, c, d, x[i], 7, -680876936);
      d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = md5gg(b, c, d, a, x[i + 0], 20, -373897302);
      a = md5gg(a, b, c, d, x[i + 5], 5, -701557275);
      d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
      d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = md5hh(d, a, b, c, x[i + 0], 11, -358537222);
      c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
      b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = md5ii(a, b, c, d, x[i + 0], 6, -198630844);
      d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5ii(a, b, c, d, x[i + 12], 6, 1746729465);
      d = md5ii(d, a, b, c, x[i + 3], 10, -1636756402);
      c = md5ii(c, d, a, b, x[i + 10], 15, -1178030128);
      b = md5ii(b, c, d, a, x[i + 1], 21, 1477861065);
      a = md5ii(a, b, c, d, x[i + 8], 6, -1021578775);
      d = md5ii(d, a, b, c, x[i + 15], 10, 191413456);
      c = md5ii(c, d, a, b, x[i + 6], 15, -1740746414);
      b = md5ii(b, c, d, a, x[i + 13], 21, -147327139);
      a = md5ii(a, b, c, d, x[i + 4], 6, -1657151952);
      d = md5ii(d, a, b, c, x[i + 11], 10, -1272893353);
      c = md5ii(c, d, a, b, x[i + 2], 15, 1354607233);
      b = md5ii(b, c, d, a, x[i + 9], 21, -1183691310);
      a = safeAdd(a, olda);
      b = safeAdd(b, oldb);
      c = safeAdd(c, oldc);
      d = safeAdd(d, oldd);
    }
    return [a, b, c, d];
  }
  function binl2hex(binarray) {
    var hexTab = "0123456789abcdef";
    var str = "";
    for (var i = 0; i < binarray.length * 4; i++) {
      str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0x0f) +
             hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0x0f);
    }
    return str;
  }
  function str2binl(str) {
    var bin = [];
    var mask = (1 << 8) - 1;
    for (var i = 0; i < str.length * 8; i += 8) {
      bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32);
    }
    return bin;
  }
  return function (input) {
    return binl2hex(str2binl(input));
  };
})();

// ── SHA-256 / SHA-512 via Web Crypto API ──
async function cryptoHash(algorithm, data) {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest(algorithm, encoder.encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Render ──
function renderTool(tool) {
  return `
    <div class="tool-card" id="tool-${tool.id}">
      <div class="tool-title">${tool.name}</div>
      <div class="tool-description">${tool.description}</div>
      <textarea class="hashgen-input" placeholder="Enter text to hash..." rows="3" id="hashgen-input"></textarea>
      <button class="tool-action" onclick="window.tools.hashgen.generate()">Hash</button>
      <div class="hashgen-results">
        <div class="hashgen-row">
          <span class="hashgen-label">MD5:</span>
          <span class="hashgen-value" id="hash-md5">—</span>
          <button class="hashgen-copy" onclick="window.tools.hashgen.copy('md5')">Copy</button>
        </div>
        <div class="hashgen-row">
          <span class="hashgen-label">SHA-256:</span>
          <span class="hashgen-value" id="hash-sha256">—</span>
          <button class="hashgen-copy" onclick="window.tools.hashgen.copy('sha256')">Copy</button>
        </div>
        <div class="hashgen-row">
          <span class="hashgen-label">SHA-512:</span>
          <span class="hashgen-value" id="hash-sha512">—</span>
          <button class="hashgen-copy" onclick="window.tools.hashgen.copy('sha512')">Copy</button>
        </div>
        <div class="hashgen-row hashgen-bcrypt">
          <span class="hashgen-label">bcrypt:</span>
          <span class="hashgen-value" id="hash-bcrypt">Requires native module (offline-incompatible)</span>
        </div>
      </div>
    </div>
  `;
}

window.tools = window.tools || {};
window.tools.hashgen = {
  _cache: {},

  async generate() {
    const input = document.getElementById("hashgen-input").value;
    if (!input) return;

    this._cache.md5 = MD5(input);
    this._cache.sha256 = await cryptoHash("SHA-256", input);
    this._cache.sha512 = await cryptoHash("SHA-512", input);

    document.getElementById("hash-md5").textContent = this._cache.md5;
    document.getElementById("hash-sha256").textContent = this._cache.sha256;
    document.getElementById("hash-sha512").textContent = this._cache.sha512;
  },

  async copy(algo) {
    const val = this._cache[algo];
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      const el = document.querySelector(`#hash-${algo}`).nextSibling;
      // flash the copy button
      const btns = document.querySelectorAll(".hashgen-copy");
      for (const btn of btns) {
        if (btn.onclick.toString().includes(algo)) {
          btn.textContent = "Copied!";
          setTimeout(() => { btn.textContent = "Copy"; }, 2000);
        }
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }
};
