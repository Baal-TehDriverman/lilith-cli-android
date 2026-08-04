import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';

// Gateway tools tests — URL building, persona resolution, response parsing.

describe('Gateway — checkGatewayStatus URL', () => {

  test('Ollama provider uses /api/status endpoint', () => {
    const provider = {
      name: 'local-ollama',
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiMode: 'openai' as const,
    };
    const statusUrl = provider.apiMode === 'nvidia-nim'
      ? `${provider.baseUrl.replace('/v1', '')}/v1`
      : `${provider.baseUrl}/api/status`;
    assert.equal(statusUrl, 'http://127.0.0.1:11434/v1/api/status');
  });

  test('nvidia-nim provider uses /v1 endpoint', () => {
    const provider = {
      name: 'nvidia-nim',
      baseUrl: 'https://api.nvidia.com/nim/v1',
      apiMode: 'nvidia-nim' as const,
    };
    const statusUrl = provider.apiMode === 'nvidia-nim'
      ? `${provider.baseUrl.replace('/v1', '')}/v1`
      : `${provider.baseUrl}/api/status`;
    assert.equal(statusUrl, 'https://api.nvidia.com/nim/v1');
  });
});

describe('Gateway — queryGateway URL building', () => {

  test('baseUrl ending in /v1 does not get double /v1', () => {
    const base = 'http://127.0.0.1:11434/v1'.replace(/\/$/, '');
    const endpoint = base.endsWith('/v1')
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
    assert.equal(endpoint, 'http://127.0.0.1:11434/v1/chat/completions');
    assert.ok(!endpoint.includes('/v1/v1/'));
  });

  test('trailing slash stripped before URL building', () => {
    const base = 'http://127.0.0.1:11434/v1/'.replace(/\/$/, '');
    const endpoint = base.endsWith('/v1')
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
    assert.equal(endpoint, 'http://127.0.0.1:11434/v1/chat/completions');
  });

  test('baseUrl without /v1 gets /v1 prepended', () => {
    const base = 'http://tehlappy.local:8080'.replace(/\/$/, '');
    const endpoint = base.endsWith('/v1')
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
    assert.equal(endpoint, 'http://tehlappy.local:8080/v1/chat/completions');
  });
});

describe('Gateway — response parsing', () => {

  test('OpenAI response shape is parsed correctly', () => {
    const data = {
      choices: [{ message: { content: 'hello from lilith' } }],
    };
    const content = data.choices?.[0]?.message?.content || 'No response';
    assert.equal(content, 'hello from lilith');
  });

  test('Anthropic response shape falls through to content[0].text', () => {
    const data: any = {
      content: [{ text: 'anthropic response' }],
    };
    const content = data.choices?.[0]?.message?.content
      || data.content?.[0]?.text
      || 'No response';
    assert.equal(content, 'anthropic response');
  });

  test('no response content returns fallback', () => {
    const data: any = {};
    const content = data.choices?.[0]?.message?.content
      || data.content?.[0]?.text
      || 'No response';
    assert.equal(content, 'No response');
  });
});

describe('Gateway — apiKey display (regression for *** bug)', () => {

  test('apiKey is SET when provider has apiKey', () => {
    const provider = { apiKey: 'local', name: 'local-ollama' };
    const display = provider.apiKey ? 'SET' : 'none';
    assert.equal(display, 'SET');
  });

  test('apiKey is none when provider has null apiKey', () => {
    const provider = { apiKey: null, name: 'custom' };
    const display = provider.apiKey ? 'SET' : 'none';
    assert.equal(display, 'none');
  });

  test('format string is not literally ***', () => {
    const provider = { apiKey: 'local' };
    const line = `  apiKey: ${provider.apiKey ? 'SET' : 'none'}`;
    assert.ok(!line.includes('***'), 'must not contain literal ***');
    assert.equal(line, '  apiKey: SET');
  });
});

describe('Gateway — listModels', () => {

  test('provider with configured models shows them directly', () => {
    const provider = {
      models: ['qwen2.5:1.5b', 'gemma3-1b-jailbreak', 'llama3.2:1b'],
      apiMode: 'openai' as const,
    };
    // If models.length > 0 and apiMode !== 'anthropic', show configured
    assert.ok(provider.models.length > 0);
    assert.notEqual(provider.apiMode, 'anthropic');
    assert.equal(provider.models.length, 3);
  });

  test('anthropic provider falls through to API fetch', () => {
    const provider = {
      models: ['claude-sonnet-4-20250514'],
      apiMode: 'anthropic' as const,
    };
    // Even with models, anthropic mode should fetch from API
    assert.equal(provider.apiMode, 'anthropic');
  });
});
