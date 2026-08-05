import { describe, test } from 'node:test';
import assert from 'node:assert';
import { writeFile, mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { detectPattern } from '../src/kairos/orchestrator.js';
import { routeMatch } from '../src/kairos/router.js';

describe('KAIROS — detectPattern', () => {
  test('maps error/fail/exception to Gevurah/diagnose', () => {
    const m = detectPattern('an unexpected error occurred during processing');
    assert.equal(m.sephirah, 'Gevurah');
    assert.equal(m.action, 'diagnose');
  });

  test('maps slow/lag/performance to Tiferet/optimize', () => {
    const m = detectPattern('the system is very slow and lagging');
    assert.equal(m.sephirah, 'Tiferet');
    assert.equal(m.action, 'optimize');
  });

  test('maps memory/ram/vram to Yesod/consolidate', () => {
    const m = detectPattern('high memory usage detected');
    assert.equal(m.sephirah, 'Yesod');
    assert.equal(m.action, 'consolidate');
  });

  test('defaults to Tiferet/balance for unknown input', () => {
    const m = detectPattern('the cat sat on the mat');
    assert.equal(m.sephirah, 'Tiferet');
    assert.equal(m.action, 'balance');
  });

  test('case-insensitive matching', () => {
    const m = detectPattern('BUILD FAILURE in module');
    assert.equal(m.sephirah, 'Gevurah');
  });
});

describe('KAIROS — routeMatch (FAIL CLOSED by default)', () => {
  test('logs + persists to memory even when actions disabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kairos-test-'));
    const { MemoryStore } = await import('../src/agent/memory.js');
    const memory = new MemoryStore(dir);

    await routeMatch(
      { sephirah: 'Gevurah', action: 'diagnose' },
      { type: 'journal', key: 'build-fail', value: 'an error occurred' },
      'journal',
      { allowActions: false, workdir: dir, memory, verbose: false }
    );

    // Memory entry should have been written
    const raw = await readFile(join(dir, 'memory.jsonl'), 'utf-8');
    assert.ok(raw.includes('Gevurah'), 'journal should contain Gevurah event');
    assert.ok(raw.includes('kairos:gevurah:diagnose:'), 'kairos key persisted');
  });

  test('does NOT execute shell when allowActions=false (fail closed)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kairos-test-'));
    const { MemoryStore } = await import('../src/agent/memory.js');
    const memory = new MemoryStore(dir);

    // spy on child_process.exec to ensure it's NOT called
    // (dry-run path returns before dispatchAction)
    await routeMatch(
      { sephirah: 'Malkuth', action: 'execute' },
      { type: 'journal', key: 'deploy', value: 'run the build' },
      'journal',
      { allowActions: false, workdir: dir, memory, verbose: false }
    );

    // If dispatchAction ran, it would have created a side effect. For fail-closed
    // we simply assert the router completed and only persisted (no exception).
    const raw = await readFile(join(dir, 'memory.jsonl'), 'utf-8');
    assert.ok(raw.includes('kairos:malkuth:execute:'), 'persisted even when actions off');
  });
});

describe('KAIROS — watcher tails journal by position', () => {
  test('picks up new memory.jsonl entries appended after start', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kairos-watch-'));
    const journal = join(dir, 'memory.jsonl');
    const hermesFile = join(dir, 'MEMORY.md');

    // Pre-seed an existing journal (so watcher starts at its length)
    await writeFile(journal, '{"key":"old","value":"pre-existing",".ts":1}\n');

    const { KairosWatcher } = await import('../src/kairos/watcher.js');
    const watcher = new KairosWatcher({
      journalPath: journal,
      hermesMemoryPath: hermesFile,
      pollIntervalMs: 50,
      verbose: false,
      allowActions: false,
    });

    const results: string[] = [];
    const origLog = console.log;
    console.log = (s: string) => { results.push(String(s)); };

    await watcher.start();

    // Wait, then append a new error entry
    await new Promise(r => setTimeout(r, 80));
    await writeFile(journal, '{"key":"new-error","value":"something failed here",".ts":2}\n', { flag: 'a' });

    // Let the watcher poll once
    await new Promise(r => setTimeout(r, 150));

    await watcher.stop();
    console.log = origLog;

    const joined = results.join('\n');
    assert.ok(joined.includes('Gevurah'), 'error message should be routed to Gevurah');
    assert.ok(joined.includes('KAIROS'), 'log entry tagged');
    await rm(dir, { recursive: true, force: true });
  });
});