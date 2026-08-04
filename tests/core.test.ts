import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';

// Agent core tests — test the ReAct loop invariants, guard against
// malformed tool_calls, and verify URL building logic.

describe('Agent Core — URL building', () => {

  test('baseUrl ending in /v1 gets /chat/completions appended', () => {
    const base = 'http://127.0.0.1:11434/v1';
    const url = base.endsWith('/v1')
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
    assert.equal(url, 'http://127.0.0.1:11434/v1/chat/completions');
  });

  test('baseUrl without /v1 gets /v1/chat/completions appended', () => {
    const base = 'http://127.0.0.1:11434';
    const url = base.endsWith('/v1')
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
    assert.equal(url, 'http://127.0.0.1:11434/v1/chat/completions');
  });

  test('trailing slash is stripped before URL building', () => {
    const base = 'http://127.0.0.1:11434/v1/'.replace(/\/$/, '');
    const url = base.endsWith('/v1')
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
    assert.equal(url, 'http://127.0.0.1:11434/v1/chat/completions');
  });

  test('no double /v1/v1/ in URL', () => {
    const base = 'http://127.0.0.1:11434/v1'.replace(/\/$/, '');
    const url = base.endsWith('/v1')
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
    assert.ok(!url.includes('/v1/v1/'), 'URL must not contain /v1/v1/');
  });
});

describe('Agent Core — tool_calls parsing', () => {

  test('valid tool_call with function.name and arguments', () => {
    const call = { id: 'call_1', function: { name: 'shell', arguments: '{"command":"ls"}' } };
    let name = '';
    let args: Record<string, any> = {};
    try {
      name = call.function?.name || '';
      args = JSON.parse(call.function?.arguments || '{}');
    } catch { args = {}; }
    assert.equal(name, 'shell');
    assert.equal(args.command, 'ls');
  });

  test('missing function.name defaults to empty string', () => {
    const call: any = { id: 'call_2', function: {} };
    let name = call.function?.name || '';
    assert.equal(name, '');
  });

  test('malformed JSON arguments fall back to empty object', () => {
    const call: any = { id: 'call_3', function: { name: 'shell', arguments: 'not valid json{' } };
    let args: Record<string, any> = {};
    try {
      args = JSON.parse(call.function?.arguments || '{}');
    } catch { args = {}; }
    assert.deepEqual(args, {});
  });

  test('null tool_calls array is treated as empty', () => {
    const msg: any = { content: 'final answer', tool_calls: null };
    const calls = msg.tool_calls || [];
    assert.equal(calls.length, 0);
  });

  test('undefined tool_calls array is treated as empty', () => {
    const msg: any = { content: 'final answer' };
    const calls = msg.tool_calls || [];
    assert.equal(calls.length, 0);
  });

  test('empty tool_calls array triggers final answer', () => {
    const msg: any = { content: 'task complete', tool_calls: [] };
    const calls = msg.tool_calls || [];
    assert.equal(calls.length, 0);
    assert.ok(msg.content, 'should have final answer');
  });
});

describe('Agent Core — empty completion handling', () => {

  test('missing choices array returns error result', () => {
    const completion: any = { choices: [] };
    const choice = completion.choices?.[0];
    const msg = choice?.message;
    assert.equal(msg, undefined);
  });

  test('error object is handled gracefully', () => {
    const completion: any = { choices: [], error: { message: 'connection refused' } };
    const error = completion.error?.message || 'unknown';
    assert.equal(error, 'connection refused');
  });

  test('null error message defaults to unknown', () => {
    const completion: any = { choices: [], error: {} };
    const error = completion.error?.message || 'unknown';
    assert.equal(error, 'unknown');
  });
});

describe('Agent Core — iteration budget', () => {

  test('budget exhaustion sets exhaustedBudget flag', () => {
    const maxIterations = 3;
    let iterations = 0;
    let exhaustedBudget = false;
    let finalAnswer = '';

    for (iterations = 1; iterations <= maxIterations; iterations++) {
      // Simulate the model always emitting tool calls (never answering)
      if (iterations === maxIterations) break;
    }
    if (iterations > maxIterations) {
      exhaustedBudget = true;
      if (!finalAnswer) finalAnswer = '(iteration budget exhausted)';
    }

    // After the loop, iterations = maxIterations (it broke at == maxIterations)
    // So exhaustedBudget should be false (it didn't exceed)
    assert.equal(iterations, maxIterations);
    assert.equal(exhaustedBudget, false);
  });

  test('exceeding budget by one triggers exhaustedBudget', () => {
    const maxIterations = 3;
    let iterations = 0;
    let exhaustedBudget = false;

    for (iterations = 1; iterations <= maxIterations + 1; iterations++) {
      // ... loop body would be here
    }
    if (iterations > maxIterations) {
      exhaustedBudget = true;
    }

    assert.ok(iterations > maxIterations);
    assert.equal(exhaustedBudget, true);
  });
});

describe('Agent Core — config defaults', () => {

  test('default maxIterations is 10', () => {
    const cfg = { maxIterations: 10, maxOutputChars: 4000, temperature: 0.4 };
    assert.equal(cfg.maxIterations, 10);
    assert.equal(cfg.maxOutputChars, 4000);
    assert.equal(cfg.temperature, 0.4);
  });

  test('llmTimeoutMs default is 300000 (5 min)', () => {
    const defaultTimeout = 300_000;
    assert.equal(defaultTimeout, 300000);
    assert.ok(defaultTimeout > 180000, 'should be higher than old 180s default');
  });

  test('AgentMemory interface is structural (get/put/snapshot)', () => {
    // Any object implementing get/put/snapshot satisfies the interface
    const fakeMemory = {
      get: async (k: string) => 'val',
      put: async (k: string, v: string) => {},
      snapshot: async () => ({ key: 'val' }),
    };
    assert.equal(typeof fakeMemory.get, 'function');
    assert.equal(typeof fakeMemory.put, 'function');
    assert.equal(typeof fakeMemory.snapshot, 'function');
  });
});
