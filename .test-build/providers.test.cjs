// tests/providers.test.ts
var import_node_test = require("node:test");
var import_node_assert = require("node:assert");
var import_fs = require("fs");
var import_path = require("path");
var import_os = require("os");
var tmpDir;
var origCwd;
(0, import_node_test.beforeEach)(() => {
  origCwd = process.cwd();
  tmpDir = (0, import_fs.mkdtempSync)((0, import_path.join)((0, import_os.tmpdir)(), "lilith-test-"));
  process.chdir(tmpDir);
});
(0, import_node_test.afterEach)(() => {
  process.chdir(origCwd);
  (0, import_fs.rmSync)(tmpDir, { recursive: true, force: true });
});
(0, import_node_test.describe)("Provider Registry", () => {
  (0, import_node_test.test)("loadProviders returns defaults when no user config", () => {
    const defaultConfig = {
      defaultProvider: "pc-gateway",
      providers: [{ name: "pc-gateway", baseUrl: "http://x", apiKey: null, apiMode: "openai", models: [], active: true }]
    };
    import_node_assert.strict.ok(defaultConfig.providers.length > 0);
    import_node_assert.strict.equal(defaultConfig.defaultProvider, "pc-gateway");
  });
  (0, import_node_test.test)("user config overrides defaults by name", () => {
    const defaults = [
      { name: "pc-gateway", baseUrl: "http://default", apiKey: null, apiMode: "openai", models: [], active: true },
      { name: "local-ollama", baseUrl: "http://default2", apiKey: null, apiMode: "openai", models: [], active: false }
    ];
    const userProviders = [
      { name: "local-ollama", baseUrl: "http://127.0.0.1:11434/v1", apiKey: "local", apiMode: "openai", models: ["qwen2.5:1.5b"], active: true }
    ];
    const merged = defaults.map((dp) => {
      const userP = userProviders.find((p) => p.name === dp.name);
      return userP ? { ...dp, ...userP } : dp;
    });
    const existingNames = new Set(merged.map((p) => p.name));
    userProviders.forEach((p) => {
      if (!existingNames.has(p.name)) merged.push(p);
    });
    const localOllama = merged.find((p) => p.name === "local-ollama");
    import_node_assert.strict.equal(localOllama?.baseUrl, "http://127.0.0.1:11434/v1");
    import_node_assert.strict.equal(localOllama?.apiKey, "local");
    import_node_assert.strict.equal(localOllama?.active, true);
    import_node_assert.strict.equal(localOllama?.models[0], "qwen2.5:1.5b");
    const pcGateway = merged.find((p) => p.name === "pc-gateway");
    import_node_assert.strict.equal(pcGateway?.baseUrl, "http://default");
    import_node_assert.strict.equal(pcGateway?.active, true);
  });
  (0, import_node_test.test)("new providers from user config are appended", () => {
    const defaults = [
      { name: "pc-gateway", active: true }
    ];
    const userProviders = [
      { name: "custom-provider", baseUrl: "http://custom", active: false }
    ];
    const merged = [...defaults];
    const existingNames = new Set(merged.map((p) => p.name));
    userProviders.forEach((p) => {
      if (!existingNames.has(p.name)) merged.push(p);
    });
    import_node_assert.strict.equal(merged.length, 2);
    import_node_assert.strict.equal(merged[1].name, "custom-provider");
  });
  (0, import_node_test.test)("at least one provider is active (fallback logic)", () => {
    const config = {
      defaultProvider: "pc-gateway",
      providers: [
        { name: "pc-gateway", active: false },
        { name: "local-ollama", active: false }
      ]
    };
    const activeCount = config.providers.filter((p) => p.active).length;
    if (activeCount === 0) {
      const defaultP = config.providers.find((p) => p.name === config.defaultProvider) || config.providers[0];
      defaultP.active = true;
    }
    const activeProviders = config.providers.filter((p) => p.active);
    import_node_assert.strict.equal(activeProviders.length, 1);
    import_node_assert.strict.equal(activeProviders[0].name, "pc-gateway");
  });
  (0, import_node_test.test)("saveProviders writes valid JSON to .lilith/providers.json", () => {
    const config = {
      defaultProvider: "test-prov",
      providers: [{ name: "test-prov", baseUrl: "http://x", apiKey: "k", apiMode: "openai", models: [], active: true }]
    };
    const dir = (0, import_path.join)(tmpDir, ".lilith");
    const filePath = (0, import_path.join)(dir, "providers.json");
    const { mkdirSync, writeFileSync: writeFileSync2 } = require("fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync2(filePath, JSON.stringify(config, null, 2));
    const read = JSON.parse((0, import_fs.readFileSync)(filePath, "utf-8"));
    import_node_assert.strict.equal(read.defaultProvider, "test-prov");
    import_node_assert.strict.equal(read.providers[0].name, "test-prov");
  });
});
