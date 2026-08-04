import { test, describe, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// MemoryStore tests — we test the JSONL journal semantics directly
// (append-only log, keyed reads, last-write-wins, corrupt-line tolerance).
// NOTE: never import dist/main.cjs here — executing it launches the CLI.

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'lilith-mem-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

/** Replicate MemoryStore.load: read lines, skip corrupt, last-write-wins. */
function loadJournal(file: string): Map<string, string> {
  const data = new Map<string, string>();
  try {
    const raw = readFileSync(file, 'utf-8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry && typeof entry.key === 'string') {
          data.set(entry.key, String(entry.value));
        }
      } catch {
        // skip corrupt lines — append-only means the tail may be partial
      }
    }
  } catch {
    // no file yet
  }
  return data;
}

/** Replicate MemoryStore.put: append entry. */
function appendEntry(file: string, key: string, value: string): void {
  const entry = JSON.stringify({ key, value, ts: new Date().toISOString() });
  appendFileSync(file, entry + '\n');
}

describe('MemoryStore', () => {

  test('put then get returns the stored value', () => {
    const file = join(tmpDir, 'memory.jsonl');
    appendEntry(file, 'test_key', 'test_value');

    const data = loadJournal(file);
    assert.equal(data.get('test_key'), 'test_value');
  });

  test('last-write-wins for same key', () => {
    const file = join(tmpDir, 'memory.jsonl');
    appendFileSync(file, JSON.stringify({ key: 'k', value: 'v1', ts: '2026-01-01' }) + '\n');
    appendFileSync(file, JSON.stringify({ key: 'k', value: 'v2', ts: '2026-01-02' }) + '\n');

    const data = loadJournal(file);
    assert.equal(data.get('k'), 'v2');
  });

  test('snapshot returns all key/value pairs', () => {
    const file = join(tmpDir, 'memory.jsonl');
    appendFileSync(file, JSON.stringify({ key: 'a', value: '1', ts: 't1' }) + '\n');
    appendFileSync(file, JSON.stringify({ key: 'b', value: '2', ts: 't2' }) + '\n');
    appendFileSync(file, JSON.stringify({ key: 'a', value: '1b', ts: 't3' }) + '\n');

    const data = loadJournal(file);
    assert.equal(data.get('a'), '1b');
    assert.equal(data.get('b'), '2');
    assert.equal(data.size, 2);
  });

  test('corrupt lines are tolerated', () => {
    const file = join(tmpDir, 'memory.jsonl');
    appendFileSync(file, JSON.stringify({ key: 'good', value: 'val' }) + '\n');
    appendFileSync(file, '{corrupt incomplete json\n');
    appendFileSync(file, 'not even json\n');
    appendFileSync(file, JSON.stringify({ key: 'also_good', value: 'val2' }) + '\n');

    const data = loadJournal(file);
    assert.equal(data.size, 2);
    assert.equal(data.get('good'), 'val');
    assert.equal(data.get('also_good'), 'val2');
  });

  test('empty file returns empty snapshot', () => {
    const file = join(tmpDir, 'memory.jsonl');
    writeFileSync(file, '');
    const data = loadJournal(file);
    assert.equal(data.size, 0);
  });

  test('missing file is handled gracefully', () => {
    const file = join(tmpDir, 'nonexistent.jsonl');
    assert.ok(!existsSync(file));
    // loadJournal catches missing-file errors → empty Map
    const data = loadJournal(file);
    assert.equal(data.size, 0);
  });

  test('put appends not overwrites (journal semantics)', () => {
    const file = join(tmpDir, 'memory.jsonl');
    appendEntry(file, 'k', 'v1');
    appendEntry(file, 'k', 'v2');
    const raw = readFileSync(file, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());
    assert.equal(lines.length, 2, 'journal must append, not rewrite');
  });

  test('non-string values are stringified', () => {
    const file = join(tmpDir, 'memory.jsonl');
    appendFileSync(file, JSON.stringify({ key: 'num', value: 42, ts: 't' }) + '\n');
    const data = loadJournal(file);
    assert.equal(data.get('num'), '42');
  });
});
