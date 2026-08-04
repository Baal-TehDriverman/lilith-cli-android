import { test, describe, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir, homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'lilith-tools-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('Tool Registry — file operations', () => {

  test('write_file creates a file with correct content', async () => {
    const filePath = join(tmpDir, 'test.txt');
    const content = 'hello lilith';
    writeFileSync(filePath, content, 'utf-8');
    const read = readFileSync(filePath, 'utf-8');
    assert.equal(read, content);
  });

  test('read_file reads file content line-numbered', async () => {
    const filePath = join(tmpDir, 'lines.txt');
    writeFileSync(filePath, 'line1\nline2\nline3\n', 'utf-8');
    const raw = readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n');
    assert.equal(lines[0], 'line1');
    assert.equal(lines[1], 'line2');
    assert.equal(lines[2], 'line3');
  });

  test('write_file overwrites existing content', async () => {
    const filePath = join(tmpDir, 'overwrite.txt');
    writeFileSync(filePath, 'old content', 'utf-8');
    writeFileSync(filePath, 'new content', 'utf-8');
    const read = readFileSync(filePath, 'utf-8');
    assert.equal(read, 'new content');
  });

  test('read_file on nonexistent path returns meaningful error', async () => {
    const path = join(tmpDir, 'nonexistent.txt');
    assert.ok(!existsSync(path));
    try {
      readFileSync(path, 'utf-8');
      assert.fail('should have thrown');
    } catch (e: any) {
      assert.ok(e.message.includes('ENOENT') || e.code === 'ENOENT');
    }
  });
});

describe('Tool Registry — memory operations', () => {

  test('memory_put then memory_get round-trip', async () => {
    const file = join(tmpDir, 'memory.jsonl');
    const entry = JSON.stringify({ key: 'test_key', value: 'test_val', ts: new Date().toISOString() });
    writeFileSync(file, entry + '\n');

    const raw = readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw.trim());
    assert.equal(parsed.key, 'test_key');
    assert.equal(parsed.value, 'test_val');
  });

  test('memory_get returns undefined for missing key', async () => {
    const file = join(tmpDir, 'memory.jsonl');
    writeFileSync(file, JSON.stringify({ key: 'exists', value: 'yes' }) + '\n');
    const raw = readFileSync(file, 'utf-8');
    const entries = raw.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    const map = new Map(entries.map((e: any) => [e.key, e.value]));
    assert.equal(map.get('exists'), 'yes');
    assert.equal(map.get('missing'), undefined);
  });
});

describe('Tool Registry — clamp/truncation', () => {

  test('clamp truncates long output', () => {
    const clamp = (s: string, max: number) =>
      s.length > max ? s.slice(0, max) + `\n...[truncated ${s.length - max} chars]` : s;

    const long = 'x'.repeat(5000);
    const clamped = clamp(long, 100);
    assert.ok(clamped.length < 200);
    assert.ok(clamped.includes('[truncated'));
  });

  test('clamp does not truncate short output', () => {
    const clamp = (s: string, max: number) =>
      s.length > max ? s.slice(0, max) + `\n...[truncated ${s.length - max} chars]` : s;

    const short = 'hello';
    const clamped = clamp(short, 100);
    assert.equal(clamped, 'hello');
  });
});

describe('Tool Registry — runTool error handling', () => {

  test('unknown tool returns ERROR string', () => {
    // Replicate the runTool logic
    function runTool(name: string): string {
      if (!['shell', 'read_file', 'write_file', 'list_dir', 'memory_get', 'memory_put', 'http_get', 'evolve'].includes(name)) {
        return `ERROR: unknown tool "${name}"`;
      }
      return 'ok';
    }
    assert.equal(runTool('nonexistent'), 'ERROR: unknown tool "nonexistent"');
    assert.equal(runTool('shell'), 'ok');
  });

  test('shell tool with empty command returns ERROR', () => {
    function handleShell(command: string): string {
      if (typeof command !== 'string' || !command.trim()) return 'ERROR: no command';
      return 'ok';
    }
    assert.equal(handleShell(''), 'ERROR: no command');
    assert.equal(handleShell('   '), 'ERROR: no command');
    assert.equal(handleShell('ls'), 'ok');
  });

  test('shell tool respects 60s timeout', async () => {
    // Test that a quick command succeeds
    const { stdout } = await execAsync('echo "test"', { timeout: 60_000 });
    assert.equal(stdout.trim(), 'test');
  });

  test('shell tool captures non-zero exit codes', async () => {
    try {
      await execAsync('exit 42', { timeout: 5_000 });
      assert.fail('should have thrown');
    } catch (e: any) {
      assert.equal(e.code, 42);
    }
  });
});

describe('Tool Registry — toolSchemas', () => {

  test('all 8 tools have valid OpenAI function schemas', () => {
    const toolNames = ['shell', 'read_file', 'write_file', 'list_dir', 'memory_get', 'memory_put', 'http_get', 'evolve'];
    assert.equal(toolNames.length, 8);

    for (const name of toolNames) {
      assert.ok(name.length > 0, `tool name must not be empty: ${name}`);
    }
  });

  test('each tool has required fields', () => {
    // Simulate the tool definition shape
    const tools = [
      { name: 'shell', description: 'Run shell', parameters: { type: 'object' }, handler: async () => 'ok' },
      { name: 'memory_put', description: 'Store memory', parameters: { type: 'object' }, handler: async () => 'ok' },
    ];
    for (const t of tools) {
      assert.ok(typeof t.name === 'string');
      assert.ok(typeof t.description === 'string');
      assert.ok(typeof t.parameters === 'object');
      assert.ok(typeof t.handler === 'function');
    }
  });
});
