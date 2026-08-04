// src/agent/memory_hermes.ts
var import_promises2 = require("fs/promises");
var import_path2 = require("path");
var import_os2 = require("os");

// src/agent/memory.ts
var import_promises = require("fs/promises");
var import_path = require("path");
var import_os = require("os");
var MemoryStore = class {
  file;
  data = /* @__PURE__ */ new Map();
  loaded = false;
  constructor(dir) {
    const base = dir || (0, import_path.join)((0, import_os.homedir)(), ".lilith", "ouroboros");
    this.file = (0, import_path.join)(base, "memory.jsonl");
  }
  async ensureLoaded() {
    if (this.loaded) return;
    try {
      const raw = await (0, import_promises.readFile)(this.file, "utf-8");
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry && typeof entry.key === "string") {
            this.data.set(entry.key, String(entry.value));
          }
        } catch {
        }
      }
    } catch {
    }
    this.loaded = true;
  }
  async get(key) {
    await this.ensureLoaded();
    return this.data.get(key);
  }
  async put(key, value) {
    await this.ensureLoaded();
    this.data.set(key, value);
    await (0, import_promises.mkdir)((0, import_path.join)(this.file, ".."), { recursive: true }).catch(() => {
    });
    const entry = JSON.stringify({ key, value, ts: (/* @__PURE__ */ new Date()).toISOString() });
    await (0, import_promises.appendFile)(this.file, entry + "\n", "utf-8");
  }
  /** Return all current key/value pairs (for the agent's context or introspection). */
  async snapshot() {
    await this.ensureLoaded();
    return Object.fromEntries(this.data);
  }
};

// src/agent/memory_hermes.ts
var HERMES_MEMORIES = (0, import_path2.join)((0, import_os2.homedir)(), ".hermes", "memories");
var MEMORY_FILE = (0, import_path2.join)(HERMES_MEMORIES, "MEMORY.md");
var USER_FILE = (0, import_path2.join)(HERMES_MEMORIES, "USER.md");
var SEP = "\n\xA7\n";
var BUDGET = 2200;
var KEY_PREFIX = "LILITH-KEY ";
var HermesMemoryStore = class {
  fallback;
  loaded = false;
  entries = [];
  constructor() {
    this.fallback = new MemoryStore();
  }
  // ─── Loading ───
  async ensureLoaded() {
    if (this.loaded) return;
    this.entries = [];
    for (const file of [MEMORY_FILE, USER_FILE]) {
      try {
        const raw = await (0, import_promises2.readFile)(file, "utf-8");
        for (const chunk of raw.split(SEP)) {
          const c = chunk.trim();
          if (!c) continue;
          this.entries.push({ ...this.parseChunk(c), source: file });
        }
      } catch {
      }
    }
    this.loaded = true;
  }
  parseChunk(chunk) {
    if (chunk.startsWith(KEY_PREFIX)) {
      const rest = chunk.slice(KEY_PREFIX.length);
      const colon = rest.indexOf(":");
      if (colon > 0) {
        return {
          chunk,
          isLilith: true,
          key: rest.slice(0, colon).trim(),
          value: rest.slice(colon + 1).trim()
        };
      }
    }
    return { chunk, isLilith: false };
  }
  // ─── Read path ───
  async get(key) {
    await this.ensureLoaded();
    const hit = this.entries.find((e) => e.isLilith && e.key === key);
    if (hit) return hit.value;
    return this.fallback.get(key);
  }
  async snapshot() {
    await this.ensureLoaded();
    const out = {};
    for (const e of this.entries) {
      if (e.isLilith && e.key) out[e.key] = e.value ?? "";
    }
    const journal = await this.fallback.snapshot();
    for (const [k, v] of Object.entries(journal)) {
      if (!(k in out)) out[k] = v;
    }
    return out;
  }
  /** Full memory text (all chunks from MEMORY.md + USER.md) for context. */
  async fullContext() {
    await this.ensureLoaded();
    return this.entries.map((e) => e.chunk).join(SEP);
  }
  // ─── Write path (budget-aware, evicts only Lilith's own entries) ───
  async put(key, value) {
    await this.ensureLoaded();
    const newChunk = `${KEY_PREFIX}${key}: ${value}`;
    const sizeOf = (chunks) => chunks.reduce((n, c) => n + c.length + SEP.length, 0);
    const memoryEntries = this.entries.filter((e) => e.source === MEMORY_FILE);
    const userEntries = this.entries.filter((e) => e.source === USER_FILE);
    const others = memoryEntries.filter((e) => !(e.isLilith && e.key === key));
    let pending = [...others.map((e) => e.chunk), newChunk];
    while (sizeOf(pending) > BUDGET) {
      const victims = pending.map((c, i) => ({ c, i })).filter((x) => x.c.startsWith(KEY_PREFIX) && x.c !== newChunk);
      if (victims.length === 0) break;
      const victim = victims[0];
      pending.splice(pending.indexOf(victim.c), 1);
    }
    if (sizeOf(pending) > BUDGET) {
      console.warn("[hermes-memory] MEMORY.md budget held by Hermes entries \u2014 journal fallback");
      return this.fallback.put(key, value);
    }
    const text = pending.join(SEP) + "\n";
    try {
      const tmp = MEMORY_FILE + ".lilith-tmp";
      await (0, import_promises2.writeFile)(tmp, text, "utf-8");
      await (0, import_promises2.writeFile)(MEMORY_FILE, text, "utf-8");
      await (0, import_promises2.stat)(MEMORY_FILE);
      try {
        await (0, import_promises2.writeFile)(tmp, "", "utf-8");
      } catch {
      }
      this.entries = [...pending.map((c) => ({ ...this.parseChunk(c), source: MEMORY_FILE })), ...userEntries];
      this.loaded = true;
    } catch (e) {
      console.warn(`[hermes-memory] MEMORY.md write failed (${e?.message}) \u2014 journal fallback`);
      await this.fallback.put(key, value);
    }
  }
};

// .test/hermes-debug.mjs
async function main() {
  const store = new HermesMemoryStore();
  await store.put("shadow_debug", "direct-test");
  const v = await store.get("shadow_debug");
  console.log("GET:", v);
}
main();
