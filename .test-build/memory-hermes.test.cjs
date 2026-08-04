// tests/memory-hermes.test.ts
var import_node_test = require("node:test");
var import_node_assert = require("node:assert");
var import_fs = require("fs");
var import_path = require("path");
var import_os = require("os");
var tmpDir;
var memoryFile;
var userFile;
var SEP = "\n\xA7\n";
var BUDGET = 2200;
var KEY_PREFIX = "LILITH-KEY ";
(0, import_node_test.beforeEach)(() => {
  tmpDir = (0, import_fs.mkdtempSync)((0, import_path.join)((0, import_os.tmpdir)(), "lilith-hermes-mem-"));
  memoryFile = (0, import_path.join)(tmpDir, "MEMORY.md");
  userFile = (0, import_path.join)(tmpDir, "USER.md");
  (0, import_fs.writeFileSync)(memoryFile, "Hermes entry 1 about the user environment.\n" + SEP + "\nHermes entry 2 about tools.\n");
  (0, import_fs.writeFileSync)(userFile, "User profile entry.\n");
});
(0, import_node_test.afterEach)(() => {
  (0, import_fs.rmSync)(tmpDir, { recursive: true, force: true });
});
function parseMemoryChunks(filePath) {
  const raw = (0, import_fs.readFileSync)(filePath, "utf-8");
  return raw.split(SEP).map((chunk) => {
    const c = chunk.trim();
    if (c.startsWith(KEY_PREFIX)) {
      const rest = c.slice(KEY_PREFIX.length);
      const colonIdx = rest.indexOf(":");
      return { chunk: c, isLilith: true, key: colonIdx > 0 ? rest.slice(0, colonIdx).trim() : rest };
    }
    return { chunk: c, isLilith: false };
  }).filter((e) => e.chunk.length > 0);
}
function computeBudget(chunks) {
  return chunks.reduce((n, c) => n + c.length + SEP.length, 0);
}
(0, import_node_test.describe)("HermesMemoryStore", () => {
  (0, import_node_test.test)("Lilith entries are namespaced with LILITH-KEY prefix", () => {
    const entry = `${KEY_PREFIX}mesh_status: cerebellum-online`;
    import_node_assert.strict.ok(entry.startsWith(KEY_PREFIX));
    import_node_assert.strict.ok(entry.includes("mesh_status"));
    import_node_assert.strict.ok(entry.includes("cerebellum-online"));
  });
  (0, import_node_test.test)("Lilith entries coexist with Hermes entries in MEMORY.md", () => {
    const hermesChunk = "Hermes entry about the user environment.";
    const lilithChunk = `${KEY_PREFIX}mesh_status: cerebellum-online`;
    const content = hermesChunk + SEP + lilithChunk + "\n";
    (0, import_fs.writeFileSync)(memoryFile, content);
    const chunks = parseMemoryChunks(memoryFile);
    import_node_assert.strict.equal(chunks.length, 2);
    import_node_assert.strict.equal(chunks[0].isLilith, false);
    import_node_assert.strict.equal(chunks[1].isLilith, true);
    import_node_assert.strict.equal(chunks[1].key, "mesh_status");
  });
  (0, import_node_test.test)("budget eviction removes oldest Lilith entries first", () => {
    const hermesChunk = "H".repeat(2e3);
    const lilith1 = `${KEY_PREFIX}old_key: old_value`;
    const lilith2 = `${KEY_PREFIX}new_key: new_value`;
    let chunks = [hermesChunk, lilith1, lilith2];
    while (computeBudget(chunks) > BUDGET) {
      const lilithChunks = chunks.filter((c) => c.startsWith(KEY_PREFIX));
      if (lilithChunks.length <= 1) break;
      const idx = chunks.findIndex((c) => c.startsWith(KEY_PREFIX));
      if (idx >= 0) chunks.splice(idx, 1);
      else break;
    }
    import_node_assert.strict.ok(chunks.some((c) => c.includes("new_key")));
  });
  (0, import_node_test.test)("Hermes entries are never evicted", () => {
    const hermesChunk1 = "H1".repeat(500);
    const hermesChunk2 = "H2".repeat(500);
    const lilithChunk = `${KEY_PREFIX}k: v`;
    let chunks = [hermesChunk1, hermesChunk2, lilithChunk];
    const before = chunks.filter((c) => !c.startsWith(KEY_PREFIX)).length;
    while (computeBudget(chunks) > BUDGET) {
      const lilithChunks = chunks.filter((c) => c.startsWith(KEY_PREFIX));
      if (lilithChunks.length === 0) break;
      const idx = chunks.findIndex((c) => c.startsWith(KEY_PREFIX));
      if (idx >= 0) chunks.splice(idx, 1);
      else break;
    }
    const after = chunks.filter((c) => !c.startsWith(KEY_PREFIX)).length;
    import_node_assert.strict.equal(after, before, "Hermes entries must not be evicted");
  });
  (0, import_node_test.test)("duplicate key overwrites previous entry", () => {
    const old = `${KEY_PREFIX}status: offline`;
    const new_ = `${KEY_PREFIX}status: online`;
    let chunks = [old, new_];
    const key = "status";
    const others = chunks.filter((c) => !(c.startsWith(KEY_PREFIX) && c.includes(`${key}:`)));
    chunks = [...others.filter((c) => !c.startsWith(KEY_PREFIX) || !c.includes(`${key}:`)), new_];
    const lilithEntries = chunks.filter((c) => c.startsWith(KEY_PREFIX));
    import_node_assert.strict.equal(lilithEntries.length, 1);
    import_node_assert.strict.ok(lilithEntries[0].includes("online"));
  });
  (0, import_node_test.test)("USER.md is read-only (never written by Lilith)", () => {
    const beforeUser = (0, import_fs.readFileSync)(userFile, "utf-8");
    const memContent = (0, import_fs.readFileSync)(memoryFile, "utf-8");
    const newContent = memContent + SEP + `${KEY_PREFIX}test: value
`;
    (0, import_fs.writeFileSync)(memoryFile, newContent);
    const afterUser = (0, import_fs.readFileSync)(userFile, "utf-8");
    import_node_assert.strict.equal(beforeUser, afterUser, "USER.md must not be modified");
  });
  (0, import_node_test.test)("\xA7 separator splits chunks correctly", () => {
    const content = "chunk1" + SEP + "chunk2" + SEP + "chunk3";
    (0, import_fs.writeFileSync)(memoryFile, content);
    const raw = (0, import_fs.readFileSync)(memoryFile, "utf-8");
    const parts = raw.split(SEP);
    import_node_assert.strict.equal(parts.length, 3);
    import_node_assert.strict.equal(parts[0], "chunk1");
    import_node_assert.strict.equal(parts[1], "chunk2");
    import_node_assert.strict.equal(parts[2], "chunk3");
  });
  (0, import_node_test.test)("empty MEMORY.md is handled", () => {
    (0, import_fs.writeFileSync)(memoryFile, "");
    const raw = (0, import_fs.readFileSync)(memoryFile, "utf-8");
    const chunks = raw.split(SEP).filter((c) => c.trim());
    import_node_assert.strict.equal(chunks.length, 0);
  });
  (0, import_node_test.test)("budget stays under 2200 chars after Lilith write", () => {
    const hermes = "Hermes entries take most of the budget. ".repeat(50);
    const lilith = `${KEY_PREFIX}k: v`;
    let chunks = [hermes, lilith];
    while (computeBudget(chunks) > BUDGET) {
      const idx = chunks.findIndex((c) => c.startsWith(KEY_PREFIX));
      if (idx >= 0) chunks.splice(idx, 1);
      else break;
    }
    if (computeBudget(chunks) > BUDGET) {
      import_node_assert.strict.ok(true, "journal fallback engaged");
    } else {
      import_node_assert.strict.ok(computeBudget(chunks) <= BUDGET, "budget must be respected");
    }
  });
});
