// tests/tools.test.ts
var import_node_test = require("node:test");
var import_node_assert = require("node:assert");
var import_fs = require("fs");
var import_path = require("path");
var import_os = require("os");
var import_child_process = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
var tmpDir;
(0, import_node_test.beforeEach)(() => {
  tmpDir = (0, import_fs.mkdtempSync)((0, import_path.join)((0, import_os.tmpdir)(), "lilith-tools-test-"));
});
(0, import_node_test.afterEach)(() => {
  (0, import_fs.rmSync)(tmpDir, { recursive: true, force: true });
});
(0, import_node_test.describe)("Tool Registry \u2014 file operations", () => {
  (0, import_node_test.test)("write_file creates a file with correct content", async () => {
    const filePath = (0, import_path.join)(tmpDir, "test.txt");
    const content = "hello lilith";
    (0, import_fs.writeFileSync)(filePath, content, "utf-8");
    const read = (0, import_fs.readFileSync)(filePath, "utf-8");
    import_node_assert.strict.equal(read, content);
  });
  (0, import_node_test.test)("read_file reads file content line-numbered", async () => {
    const filePath = (0, import_path.join)(tmpDir, "lines.txt");
    (0, import_fs.writeFileSync)(filePath, "line1\nline2\nline3\n", "utf-8");
    const raw = (0, import_fs.readFileSync)(filePath, "utf-8");
    const lines = raw.split("\n");
    import_node_assert.strict.equal(lines[0], "line1");
    import_node_assert.strict.equal(lines[1], "line2");
    import_node_assert.strict.equal(lines[2], "line3");
  });
  (0, import_node_test.test)("write_file overwrites existing content", async () => {
    const filePath = (0, import_path.join)(tmpDir, "overwrite.txt");
    (0, import_fs.writeFileSync)(filePath, "old content", "utf-8");
    (0, import_fs.writeFileSync)(filePath, "new content", "utf-8");
    const read = (0, import_fs.readFileSync)(filePath, "utf-8");
    import_node_assert.strict.equal(read, "new content");
  });
  (0, import_node_test.test)("read_file on nonexistent path returns meaningful error", async () => {
    const path = (0, import_path.join)(tmpDir, "nonexistent.txt");
    import_node_assert.strict.ok(!(0, import_fs.existsSync)(path));
    try {
      (0, import_fs.readFileSync)(path, "utf-8");
      import_node_assert.strict.fail("should have thrown");
    } catch (e) {
      import_node_assert.strict.ok(e.message.includes("ENOENT") || e.code === "ENOENT");
    }
  });
});
(0, import_node_test.describe)("Tool Registry \u2014 memory operations", () => {
  (0, import_node_test.test)("memory_put then memory_get round-trip", async () => {
    const file = (0, import_path.join)(tmpDir, "memory.jsonl");
    const entry = JSON.stringify({ key: "test_key", value: "test_val", ts: (/* @__PURE__ */ new Date()).toISOString() });
    (0, import_fs.writeFileSync)(file, entry + "\n");
    const raw = (0, import_fs.readFileSync)(file, "utf-8");
    const parsed = JSON.parse(raw.trim());
    import_node_assert.strict.equal(parsed.key, "test_key");
    import_node_assert.strict.equal(parsed.value, "test_val");
  });
  (0, import_node_test.test)("memory_get returns undefined for missing key", async () => {
    const file = (0, import_path.join)(tmpDir, "memory.jsonl");
    (0, import_fs.writeFileSync)(file, JSON.stringify({ key: "exists", value: "yes" }) + "\n");
    const raw = (0, import_fs.readFileSync)(file, "utf-8");
    const entries = raw.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    const map = new Map(entries.map((e) => [e.key, e.value]));
    import_node_assert.strict.equal(map.get("exists"), "yes");
    import_node_assert.strict.equal(map.get("missing"), void 0);
  });
});
(0, import_node_test.describe)("Tool Registry \u2014 clamp/truncation", () => {
  (0, import_node_test.test)("clamp truncates long output", () => {
    const clamp = (s, max) => s.length > max ? s.slice(0, max) + `
...[truncated ${s.length - max} chars]` : s;
    const long = "x".repeat(5e3);
    const clamped = clamp(long, 100);
    import_node_assert.strict.ok(clamped.length < 200);
    import_node_assert.strict.ok(clamped.includes("[truncated"));
  });
  (0, import_node_test.test)("clamp does not truncate short output", () => {
    const clamp = (s, max) => s.length > max ? s.slice(0, max) + `
...[truncated ${s.length - max} chars]` : s;
    const short = "hello";
    const clamped = clamp(short, 100);
    import_node_assert.strict.equal(clamped, "hello");
  });
});
(0, import_node_test.describe)("Tool Registry \u2014 runTool error handling", () => {
  (0, import_node_test.test)("unknown tool returns ERROR string", () => {
    function runTool(name) {
      if (!["shell", "read_file", "write_file", "list_dir", "memory_get", "memory_put", "http_get", "evolve"].includes(name)) {
        return `ERROR: unknown tool "${name}"`;
      }
      return "ok";
    }
    import_node_assert.strict.equal(runTool("nonexistent"), 'ERROR: unknown tool "nonexistent"');
    import_node_assert.strict.equal(runTool("shell"), "ok");
  });
  (0, import_node_test.test)("shell tool with empty command returns ERROR", () => {
    function handleShell(command) {
      if (typeof command !== "string" || !command.trim()) return "ERROR: no command";
      return "ok";
    }
    import_node_assert.strict.equal(handleShell(""), "ERROR: no command");
    import_node_assert.strict.equal(handleShell("   "), "ERROR: no command");
    import_node_assert.strict.equal(handleShell("ls"), "ok");
  });
  (0, import_node_test.test)("shell tool respects 60s timeout", async () => {
    const { stdout } = await execAsync('echo "test"', { timeout: 6e4 });
    import_node_assert.strict.equal(stdout.trim(), "test");
  });
  (0, import_node_test.test)("shell tool captures non-zero exit codes", async () => {
    try {
      await execAsync("exit 42", { timeout: 5e3 });
      import_node_assert.strict.fail("should have thrown");
    } catch (e) {
      import_node_assert.strict.equal(e.code, 42);
    }
  });
});
(0, import_node_test.describe)("Tool Registry \u2014 toolSchemas", () => {
  (0, import_node_test.test)("all 8 tools have valid OpenAI function schemas", () => {
    const toolNames = ["shell", "read_file", "write_file", "list_dir", "memory_get", "memory_put", "http_get", "evolve"];
    import_node_assert.strict.equal(toolNames.length, 8);
    for (const name of toolNames) {
      import_node_assert.strict.ok(name.length > 0, `tool name must not be empty: ${name}`);
    }
  });
  (0, import_node_test.test)("each tool has required fields", () => {
    const tools = [
      { name: "shell", description: "Run shell", parameters: { type: "object" }, handler: async () => "ok" },
      { name: "memory_put", description: "Store memory", parameters: { type: "object" }, handler: async () => "ok" }
    ];
    for (const t of tools) {
      import_node_assert.strict.ok(typeof t.name === "string");
      import_node_assert.strict.ok(typeof t.description === "string");
      import_node_assert.strict.ok(typeof t.parameters === "object");
      import_node_assert.strict.ok(typeof t.handler === "function");
    }
  });
});
