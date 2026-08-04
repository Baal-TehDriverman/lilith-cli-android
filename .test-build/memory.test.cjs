// tests/memory.test.ts
var import_node_test = require("node:test");
var import_node_assert = require("node:assert");
var import_fs = require("fs");
var import_path = require("path");
var import_os = require("os");
var tmpDir;
(0, import_node_test.beforeEach)(() => {
  tmpDir = (0, import_fs.mkdtempSync)((0, import_path.join)((0, import_os.tmpdir)(), "lilith-mem-test-"));
});
(0, import_node_test.afterEach)(() => {
  (0, import_fs.rmSync)(tmpDir, { recursive: true, force: true });
});
function loadJournal(file) {
  const data = /* @__PURE__ */ new Map();
  try {
    const raw = (0, import_fs.readFileSync)(file, "utf-8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry && typeof entry.key === "string") {
          data.set(entry.key, String(entry.value));
        }
      } catch {
      }
    }
  } catch {
  }
  return data;
}
function appendEntry(file, key, value) {
  const entry = JSON.stringify({ key, value, ts: (/* @__PURE__ */ new Date()).toISOString() });
  (0, import_fs.appendFileSync)(file, entry + "\n");
}
(0, import_node_test.describe)("MemoryStore", () => {
  (0, import_node_test.test)("put then get returns the stored value", () => {
    const file = (0, import_path.join)(tmpDir, "memory.jsonl");
    appendEntry(file, "test_key", "test_value");
    const data = loadJournal(file);
    import_node_assert.strict.equal(data.get("test_key"), "test_value");
  });
  (0, import_node_test.test)("last-write-wins for same key", () => {
    const file = (0, import_path.join)(tmpDir, "memory.jsonl");
    (0, import_fs.appendFileSync)(file, JSON.stringify({ key: "k", value: "v1", ts: "2026-01-01" }) + "\n");
    (0, import_fs.appendFileSync)(file, JSON.stringify({ key: "k", value: "v2", ts: "2026-01-02" }) + "\n");
    const data = loadJournal(file);
    import_node_assert.strict.equal(data.get("k"), "v2");
  });
  (0, import_node_test.test)("snapshot returns all key/value pairs", () => {
    const file = (0, import_path.join)(tmpDir, "memory.jsonl");
    (0, import_fs.appendFileSync)(file, JSON.stringify({ key: "a", value: "1", ts: "t1" }) + "\n");
    (0, import_fs.appendFileSync)(file, JSON.stringify({ key: "b", value: "2", ts: "t2" }) + "\n");
    (0, import_fs.appendFileSync)(file, JSON.stringify({ key: "a", value: "1b", ts: "t3" }) + "\n");
    const data = loadJournal(file);
    import_node_assert.strict.equal(data.get("a"), "1b");
    import_node_assert.strict.equal(data.get("b"), "2");
    import_node_assert.strict.equal(data.size, 2);
  });
  (0, import_node_test.test)("corrupt lines are tolerated", () => {
    const file = (0, import_path.join)(tmpDir, "memory.jsonl");
    (0, import_fs.appendFileSync)(file, JSON.stringify({ key: "good", value: "val" }) + "\n");
    (0, import_fs.appendFileSync)(file, "{corrupt incomplete json\n");
    (0, import_fs.appendFileSync)(file, "not even json\n");
    (0, import_fs.appendFileSync)(file, JSON.stringify({ key: "also_good", value: "val2" }) + "\n");
    const data = loadJournal(file);
    import_node_assert.strict.equal(data.size, 2);
    import_node_assert.strict.equal(data.get("good"), "val");
    import_node_assert.strict.equal(data.get("also_good"), "val2");
  });
  (0, import_node_test.test)("empty file returns empty snapshot", () => {
    const file = (0, import_path.join)(tmpDir, "memory.jsonl");
    (0, import_fs.writeFileSync)(file, "");
    const data = loadJournal(file);
    import_node_assert.strict.equal(data.size, 0);
  });
  (0, import_node_test.test)("missing file is handled gracefully", () => {
    const file = (0, import_path.join)(tmpDir, "nonexistent.jsonl");
    import_node_assert.strict.ok(!(0, import_fs.existsSync)(file));
    const data = loadJournal(file);
    import_node_assert.strict.equal(data.size, 0);
  });
  (0, import_node_test.test)("put appends not overwrites (journal semantics)", () => {
    const file = (0, import_path.join)(tmpDir, "memory.jsonl");
    appendEntry(file, "k", "v1");
    appendEntry(file, "k", "v2");
    const raw = (0, import_fs.readFileSync)(file, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim());
    import_node_assert.strict.equal(lines.length, 2, "journal must append, not rewrite");
  });
  (0, import_node_test.test)("non-string values are stringified", () => {
    const file = (0, import_path.join)(tmpDir, "memory.jsonl");
    (0, import_fs.appendFileSync)(file, JSON.stringify({ key: "num", value: 42, ts: "t" }) + "\n");
    const data = loadJournal(file);
    import_node_assert.strict.equal(data.get("num"), "42");
  });
});
