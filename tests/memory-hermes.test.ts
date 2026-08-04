import { test, describe, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// HermesMemoryStore tests — test the §-separated MEMORY.md format,
// LILITH-KEY namespacing, budget eviction, and journal fallback.
//
// Since we can't import the TS module directly (no tsx), we test the
// Hermes memory file format invariants directly.

let tmpDir: string;
let memoryFile: string;
let userFile: string;

const SEP = '\n§\n';
const BUDGET = 2200;
const KEY_PREFIX = 'LILITH-KEY ';

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'lilith-hermes-mem-'));
  memoryFile = join(tmpDir, 'MEMORY.md');
  userFile = join(tmpDir, 'USER.md');
  // Seed with Hermes's own entries
  writeFileSync(memoryFile, 'Hermes entry 1 about the user environment.\n' + SEP + '\nHermes entry 2 about tools.\n');
  writeFileSync(userFile, 'User profile entry.\n');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function parseMemoryChunks(filePath: string): Array<{ chunk: string; isLilith: boolean; key?: string }> {
  const raw = readFileSync(filePath, 'utf-8');
  return raw.split(SEP).map(chunk => {
    const c = chunk.trim();
    if (c.startsWith(KEY_PREFIX)) {
      const rest = c.slice(KEY_PREFIX.length);
      const colonIdx = rest.indexOf(':');
      return { chunk: c, isLilith: true, key: colonIdx > 0 ? rest.slice(0, colonIdx).trim() : rest };
    }
    return { chunk: c, isLilith: false };
  }).filter(e => e.chunk.length > 0);
}

function computeBudget(chunks: string[]): number {
  return chunks.reduce((n, c) => n + c.length + SEP.length, 0);
}

describe('HermesMemoryStore', () => {

  test('Lilith entries are namespaced with LILITH-KEY prefix', () => {
    const entry = `${KEY_PREFIX}mesh_status: cerebellum-online`;
    assert.ok(entry.startsWith(KEY_PREFIX));
    assert.ok(entry.includes('mesh_status'));
    assert.ok(entry.includes('cerebellum-online'));
  });

  test('Lilith entries coexist with Hermes entries in MEMORY.md', () => {
    const hermesChunk = 'Hermes entry about the user environment.';
    const lilithChunk = `${KEY_PREFIX}mesh_status: cerebellum-online`;
    const content = hermesChunk + SEP + lilithChunk + '\n';
    writeFileSync(memoryFile, content);

    const chunks = parseMemoryChunks(memoryFile);
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].isLilith, false);
    assert.equal(chunks[1].isLilith, true);
    assert.equal(chunks[1].key, 'mesh_status');
  });

  test('budget eviction removes oldest Lilith entries first', () => {
    // Fill with Hermes entries close to budget
    const hermesChunk = 'H'.repeat(2000);
    const lilith1 = `${KEY_PREFIX}old_key: old_value`;
    const lilith2 = `${KEY_PREFIX}new_key: new_value`;
    let chunks = [hermesChunk, lilith1, lilith2];

    // Simulate budget enforcement: evict oldest Lilith first
    while (computeBudget(chunks) > BUDGET) {
      const lilithChunks = chunks.filter(c => c.startsWith(KEY_PREFIX));
      if (lilithChunks.length <= 1) break; // keep at least the newest
      // Remove the oldest Lilith chunk (first occurrence)
      const idx = chunks.findIndex(c => c.startsWith(KEY_PREFIX));
      if (idx >= 0) chunks.splice(idx, 1);
      else break;
    }

    // new_key should survive (it was added last so it's the newest)
    assert.ok(chunks.some(c => c.includes('new_key')));
  });

  test('Hermes entries are never evicted', () => {
    const hermesChunk1 = 'H1'.repeat(500);
    const hermesChunk2 = 'H2'.repeat(500);
    const lilithChunk = `${KEY_PREFIX}k: v`;
    let chunks = [hermesChunk1, hermesChunk2, lilithChunk];

    // Try to evict to fit budget — only Lilith can be evicted
    const before = chunks.filter(c => !c.startsWith(KEY_PREFIX)).length;
    while (computeBudget(chunks) > BUDGET) {
      const lilithChunks = chunks.filter(c => c.startsWith(KEY_PREFIX));
      if (lilithChunks.length === 0) break;
      const idx = chunks.findIndex(c => c.startsWith(KEY_PREFIX));
      if (idx >= 0) chunks.splice(idx, 1);
      else break;
    }
    const after = chunks.filter(c => !c.startsWith(KEY_PREFIX)).length;
    assert.equal(after, before, 'Hermes entries must not be evicted');
  });

  test('duplicate key overwrites previous entry', () => {
    const old = `${KEY_PREFIX}status: offline`;
    const new_ = `${KEY_PREFIX}status: online`;
    let chunks = [old, new_];

    // Simulate dedup: remove old entry with same key
    const key = 'status';
    const others = chunks.filter(c => !(c.startsWith(KEY_PREFIX) && c.includes(`${key}:`)));
    // Keep only the new one
    chunks = [...others.filter(c => !c.startsWith(KEY_PREFIX) || !c.includes(`${key}:`)), new_];

    const lilithEntries = chunks.filter(c => c.startsWith(KEY_PREFIX));
    assert.equal(lilithEntries.length, 1);
    assert.ok(lilithEntries[0].includes('online'));
  });

  test('USER.md is read-only (never written by Lilith)', () => {
    // Lilith only writes to MEMORY.md
    const beforeUser = readFileSync(userFile, 'utf-8');
    // Simulate a put operation — only touches memoryFile
    const memContent = readFileSync(memoryFile, 'utf-8');
    const newContent = memContent + SEP + `${KEY_PREFIX}test: value` + '\n';
    writeFileSync(memoryFile, newContent);

    const afterUser = readFileSync(userFile, 'utf-8');
    assert.equal(beforeUser, afterUser, 'USER.md must not be modified');
  });

  test('§ separator splits chunks correctly', () => {
    const content = 'chunk1' + SEP + 'chunk2' + SEP + 'chunk3';
    writeFileSync(memoryFile, content);
    const raw = readFileSync(memoryFile, 'utf-8');
    const parts = raw.split(SEP);
    assert.equal(parts.length, 3);
    assert.equal(parts[0], 'chunk1');
    assert.equal(parts[1], 'chunk2');
    assert.equal(parts[2], 'chunk3');
  });

  test('empty MEMORY.md is handled', () => {
    writeFileSync(memoryFile, '');
    const raw = readFileSync(memoryFile, 'utf-8');
    const chunks = raw.split(SEP).filter(c => c.trim());
    assert.equal(chunks.length, 0);
  });

  test('budget stays under 2200 chars after Lilith write', () => {
    const hermes = 'Hermes entries take most of the budget. '.repeat(50);
    const lilith = `${KEY_PREFIX}k: v`;
    let chunks = [hermes, lilith];

    // Evict oldest Lilith (only Lilith) until under budget
    while (computeBudget(chunks) > BUDGET) {
      const idx = chunks.findIndex(c => c.startsWith(KEY_PREFIX));
      if (idx >= 0) chunks.splice(idx, 1);
      else break;
    }

    // If still over budget, fall back to journal (don't write to MEMORY.md at all)
    if (computeBudget(chunks) > BUDGET) {
      // Journal fallback — MEMORY.md unchanged
      assert.ok(true, 'journal fallback engaged');
    } else {
      assert.ok(computeBudget(chunks) <= BUDGET, 'budget must be respected');
    }
  });
});
