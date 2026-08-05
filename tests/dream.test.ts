import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, writeFile, rm, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { estimateTokens, pruneToBudget, readJournal, TOKEN_BUDGET, cleanupArchives } from '../src/dream/autoDream.js';

describe('Dream — estimateTokens', () => {
  test('approximates ~1 token per 4 chars', () => {
    assert.equal(estimateTokens('abcd'), 1);
    assert.equal(estimateTokens('abcdefghijkl'), 3); // 12/4
    assert.equal(estimateTokens(''), 0);
  });
});

describe('Dream — readJournal', () => {
  test('parses structured JSONL, tolerates corrupt lines', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dream-'));
    const j = join(dir, 'memory.jsonl');
    await writeFile(j, [
      '{"key":"a","value":"hello",".ts":1}',
      'not json {{',
      '{"key":"b","value":"world",".ts":2}',
      '',
    ].join('\n'));

    const entries = await readJournal(j);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].key, 'a');
    assert.equal(entries[1].key, 'b');
    await rm(dir, { recursive: true, force: true });
  });

  test('returns empty array when journal missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dream-'));
    const entries = await readJournal(join(dir, 'nope.jsonl'));
    assert.deepEqual(entries, []);
    await rm(dir, { recursive: true, force: true });
  });
});

describe('Dream — pruneToBudget', () => {
  test('keeps text intact when under budget', () => {
    const text = '# Header\nshort body\n';
    assert.equal(pruneToBudget(text, TOKEN_BUDGET), text);
  });

  test('drops oldest body lines when over budget', () => {
    const lines = ['# Header'];
    for (let i = 0; i < 100; i++) lines.push(`line-${i}-${'x'.repeat(80)}`);
    const text = lines.join('\n');

    const pruned = pruneToBudget(text, 500); // very tight budget
    assert.ok(pruned.length < text.length, 'pruned should be smaller');
    assert.ok(pruned.startsWith('# Header'), 'header preserved');
  });

  test('keeps at least some body content under tiny budget', () => {
    const text = '# H\n' + 'a'.repeat(2000);
    const pruned = pruneToBudget(text, 50);
    assert.ok(pruned.includes('# H'), 'header kept');
    assert.ok(pruned.length > 0);
    assert.ok(estimateTokens(pruned) <= 500, 'pruned within relaxed budget');
  });
});

describe('Dream — cleanupArchives', () => {
  test('removes oldest archives beyond keep count', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dream-arch-'));
    const files = [
      'memory-2026-07-25.md',
      'memory-2026-07-26.md',
      'memory-2026-07-27.md',
      'memory-2026-07-28.md',
      'memory-2026-07-29.md',
      'memory-2026-07-30.md',
      'memory-2026-07-31.md',
      'memory-2026-08-01.md',
      'memory-2026-08-02.md',
      'memory-2026-08-03.md',
      'other-file.txt',
    ];
    for (const f of files) await writeFile(join(dir, f), 'x');

    await cleanupArchives(dir, 7);

    const remaining = await readdir(dir);
    assert.ok(!remaining.includes('memory-2026-07-25.md'), 'oldest removed');
    assert.ok(remaining.includes('memory-2026-08-03.md'), 'newest kept');
    assert.ok(remaining.includes('other-file.txt'), 'non-archive untouched');
    const archivesLeft = remaining.filter(f => /^memory-\d{4}-\d{2}-\d{2}\.md$/.test(f));
    assert.ok(archivesLeft.length <= 7, 'at most 7 archives remain');
    await rm(dir, { recursive: true, force: true });
  });
});