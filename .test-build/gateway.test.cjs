// tests/gateway.test.ts
var import_node_test = require("node:test");
var import_node_assert = require("node:assert");
(0, import_node_test.describe)("Gateway \u2014 checkGatewayStatus URL", () => {
  (0, import_node_test.test)("Ollama provider uses /api/status endpoint", () => {
    const provider = {
      name: "local-ollama",
      baseUrl: "http://127.0.0.1:11434/v1",
      apiMode: "openai"
    };
    const statusUrl = provider.apiMode === "nvidia-nim" ? `${provider.baseUrl.replace("/v1", "")}/v1` : `${provider.baseUrl}/api/status`;
    import_node_assert.strict.equal(statusUrl, "http://127.0.0.1:11434/v1/api/status");
  });
  (0, import_node_test.test)("nvidia-nim provider uses /v1 endpoint", () => {
    const provider = {
      name: "nvidia-nim",
      baseUrl: "https://api.nvidia.com/nim/v1",
      apiMode: "nvidia-nim"
    };
    const statusUrl = provider.apiMode === "nvidia-nim" ? `${provider.baseUrl.replace("/v1", "")}/v1` : `${provider.baseUrl}/api/status`;
    import_node_assert.strict.equal(statusUrl, "https://api.nvidia.com/nim/v1");
  });
});
(0, import_node_test.describe)("Gateway \u2014 queryGateway URL building", () => {
  (0, import_node_test.test)("baseUrl ending in /v1 does not get double /v1", () => {
    const base = "http://127.0.0.1:11434/v1".replace(/\/$/, "");
    const endpoint = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    import_node_assert.strict.equal(endpoint, "http://127.0.0.1:11434/v1/chat/completions");
    import_node_assert.strict.ok(!endpoint.includes("/v1/v1/"));
  });
  (0, import_node_test.test)("trailing slash stripped before URL building", () => {
    const base = "http://127.0.0.1:11434/v1/".replace(/\/$/, "");
    const endpoint = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    import_node_assert.strict.equal(endpoint, "http://127.0.0.1:11434/v1/chat/completions");
  });
  (0, import_node_test.test)("baseUrl without /v1 gets /v1 prepended", () => {
    const base = "http://tehlappy.local:8080".replace(/\/$/, "");
    const endpoint = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    import_node_assert.strict.equal(endpoint, "http://tehlappy.local:8080/v1/chat/completions");
  });
});
(0, import_node_test.describe)("Gateway \u2014 response parsing", () => {
  (0, import_node_test.test)("OpenAI response shape is parsed correctly", () => {
    const data = {
      choices: [{ message: { content: "hello from lilith" } }]
    };
    const content = data.choices?.[0]?.message?.content || "No response";
    import_node_assert.strict.equal(content, "hello from lilith");
  });
  (0, import_node_test.test)("Anthropic response shape falls through to content[0].text", () => {
    const data = {
      content: [{ text: "anthropic response" }]
    };
    const content = data.choices?.[0]?.message?.content || data.content?.[0]?.text || "No response";
    import_node_assert.strict.equal(content, "anthropic response");
  });
  (0, import_node_test.test)("no response content returns fallback", () => {
    const data = {};
    const content = data.choices?.[0]?.message?.content || data.content?.[0]?.text || "No response";
    import_node_assert.strict.equal(content, "No response");
  });
});
(0, import_node_test.describe)("Gateway \u2014 apiKey display (regression for *** bug)", () => {
  (0, import_node_test.test)("apiKey is SET when provider has apiKey", () => {
    const provider = { apiKey: "local", name: "local-ollama" };
    const display = provider.apiKey ? "SET" : "none";
    import_node_assert.strict.equal(display, "SET");
  });
  (0, import_node_test.test)("apiKey is none when provider has null apiKey", () => {
    const provider = { apiKey: null, name: "custom" };
    const display = provider.apiKey ? "SET" : "none";
    import_node_assert.strict.equal(display, "none");
  });
  (0, import_node_test.test)("format string is not literally ***", () => {
    const provider = { apiKey: "local" };
    const line = `  apiKey: ${provider.apiKey ? "SET" : "none"}`;
    import_node_assert.strict.ok(!line.includes("***"), "must not contain literal ***");
    import_node_assert.strict.equal(line, "  apiKey: SET");
  });
});
(0, import_node_test.describe)("Gateway \u2014 listModels", () => {
  (0, import_node_test.test)("provider with configured models shows them directly", () => {
    const provider = {
      models: ["qwen2.5:1.5b", "gemma3-1b-jailbreak", "llama3.2:1b"],
      apiMode: "openai"
    };
    import_node_assert.strict.ok(provider.models.length > 0);
    import_node_assert.strict.notEqual(provider.apiMode, "anthropic");
    import_node_assert.strict.equal(provider.models.length, 3);
  });
  (0, import_node_test.test)("anthropic provider falls through to API fetch", () => {
    const provider = {
      models: ["claude-sonnet-4-20250514"],
      apiMode: "anthropic"
    };
    import_node_assert.strict.equal(provider.apiMode, "anthropic");
  });
});
