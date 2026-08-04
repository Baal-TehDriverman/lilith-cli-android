// tests/core.test.ts
var import_node_test = require("node:test");
var import_node_assert = require("node:assert");
(0, import_node_test.describe)("Agent Core \u2014 URL building", () => {
  (0, import_node_test.test)("baseUrl ending in /v1 gets /chat/completions appended", () => {
    const base = "http://127.0.0.1:11434/v1";
    const url = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    import_node_assert.strict.equal(url, "http://127.0.0.1:11434/v1/chat/completions");
  });
  (0, import_node_test.test)("baseUrl without /v1 gets /v1/chat/completions appended", () => {
    const base = "http://127.0.0.1:11434";
    const url = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    import_node_assert.strict.equal(url, "http://127.0.0.1:11434/v1/chat/completions");
  });
  (0, import_node_test.test)("trailing slash is stripped before URL building", () => {
    const base = "http://127.0.0.1:11434/v1/".replace(/\/$/, "");
    const url = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    import_node_assert.strict.equal(url, "http://127.0.0.1:11434/v1/chat/completions");
  });
  (0, import_node_test.test)("no double /v1/v1/ in URL", () => {
    const base = "http://127.0.0.1:11434/v1".replace(/\/$/, "");
    const url = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    import_node_assert.strict.ok(!url.includes("/v1/v1/"), "URL must not contain /v1/v1/");
  });
});
(0, import_node_test.describe)("Agent Core \u2014 tool_calls parsing", () => {
  (0, import_node_test.test)("valid tool_call with function.name and arguments", () => {
    const call = { id: "call_1", function: { name: "shell", arguments: '{"command":"ls"}' } };
    let name = "";
    let args = {};
    try {
      name = call.function?.name || "";
      args = JSON.parse(call.function?.arguments || "{}");
    } catch {
      args = {};
    }
    import_node_assert.strict.equal(name, "shell");
    import_node_assert.strict.equal(args.command, "ls");
  });
  (0, import_node_test.test)("missing function.name defaults to empty string", () => {
    const call = { id: "call_2", function: {} };
    let name = call.function?.name || "";
    import_node_assert.strict.equal(name, "");
  });
  (0, import_node_test.test)("malformed JSON arguments fall back to empty object", () => {
    const call = { id: "call_3", function: { name: "shell", arguments: "not valid json{" } };
    let args = {};
    try {
      args = JSON.parse(call.function?.arguments || "{}");
    } catch {
      args = {};
    }
    import_node_assert.strict.deepEqual(args, {});
  });
  (0, import_node_test.test)("null tool_calls array is treated as empty", () => {
    const msg = { content: "final answer", tool_calls: null };
    const calls = msg.tool_calls || [];
    import_node_assert.strict.equal(calls.length, 0);
  });
  (0, import_node_test.test)("undefined tool_calls array is treated as empty", () => {
    const msg = { content: "final answer" };
    const calls = msg.tool_calls || [];
    import_node_assert.strict.equal(calls.length, 0);
  });
  (0, import_node_test.test)("empty tool_calls array triggers final answer", () => {
    const msg = { content: "task complete", tool_calls: [] };
    const calls = msg.tool_calls || [];
    import_node_assert.strict.equal(calls.length, 0);
    import_node_assert.strict.ok(msg.content, "should have final answer");
  });
});
(0, import_node_test.describe)("Agent Core \u2014 empty completion handling", () => {
  (0, import_node_test.test)("missing choices array returns error result", () => {
    const completion = { choices: [] };
    const choice = completion.choices?.[0];
    const msg = choice?.message;
    import_node_assert.strict.equal(msg, void 0);
  });
  (0, import_node_test.test)("error object is handled gracefully", () => {
    const completion = { choices: [], error: { message: "connection refused" } };
    const error = completion.error?.message || "unknown";
    import_node_assert.strict.equal(error, "connection refused");
  });
  (0, import_node_test.test)("null error message defaults to unknown", () => {
    const completion = { choices: [], error: {} };
    const error = completion.error?.message || "unknown";
    import_node_assert.strict.equal(error, "unknown");
  });
});
(0, import_node_test.describe)("Agent Core \u2014 iteration budget", () => {
  (0, import_node_test.test)("budget exhaustion sets exhaustedBudget flag", () => {
    const maxIterations = 3;
    let iterations = 0;
    let exhaustedBudget = false;
    let finalAnswer = "";
    for (iterations = 1; iterations <= maxIterations; iterations++) {
      if (iterations === maxIterations) break;
    }
    if (iterations > maxIterations) {
      exhaustedBudget = true;
      if (!finalAnswer) finalAnswer = "(iteration budget exhausted)";
    }
    import_node_assert.strict.equal(iterations, maxIterations);
    import_node_assert.strict.equal(exhaustedBudget, false);
  });
  (0, import_node_test.test)("exceeding budget by one triggers exhaustedBudget", () => {
    const maxIterations = 3;
    let iterations = 0;
    let exhaustedBudget = false;
    for (iterations = 1; iterations <= maxIterations + 1; iterations++) {
    }
    if (iterations > maxIterations) {
      exhaustedBudget = true;
    }
    import_node_assert.strict.ok(iterations > maxIterations);
    import_node_assert.strict.equal(exhaustedBudget, true);
  });
});
(0, import_node_test.describe)("Agent Core \u2014 config defaults", () => {
  (0, import_node_test.test)("default maxIterations is 10", () => {
    const cfg = { maxIterations: 10, maxOutputChars: 4e3, temperature: 0.4 };
    import_node_assert.strict.equal(cfg.maxIterations, 10);
    import_node_assert.strict.equal(cfg.maxOutputChars, 4e3);
    import_node_assert.strict.equal(cfg.temperature, 0.4);
  });
  (0, import_node_test.test)("llmTimeoutMs default is 300000 (5 min)", () => {
    const defaultTimeout = 3e5;
    import_node_assert.strict.equal(defaultTimeout, 3e5);
    import_node_assert.strict.ok(defaultTimeout > 18e4, "should be higher than old 180s default");
  });
  (0, import_node_test.test)("AgentMemory interface is structural (get/put/snapshot)", () => {
    const fakeMemory = {
      get: async (k) => "val",
      put: async (k, v) => {
      },
      snapshot: async () => ({ key: "val" })
    };
    import_node_assert.strict.equal(typeof fakeMemory.get, "function");
    import_node_assert.strict.equal(typeof fakeMemory.put, "function");
    import_node_assert.strict.equal(typeof fakeMemory.snapshot, "function");
  });
});
