/**
 * Lilith Sovereign Agent — Hermes-backed Memory Store
 * Reads/writes the same persistent memory files Hermes Agent uses
 * (~/.hermes/memories/MEMORY.md + USER.md), so Lilith and Hermes share
 * one memory. Entries are prose chunks split on "\n§\n" (Hermes format).
 *
 * Lilith writes are namespaced "LILITH-KEY <key>: <value>" so they can be
 * surgically evicted to respect the 2200-char budget without ever touching
 * Hermes's own entries. Reads see the FULL memory (both files) — shared
 * awareness both ways.
 *
 * Falls back to the JSONL journal on any write/lock failure.
 */
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { MemoryStore } from './memory.js';

const HERMES_MEMORIES = join(homedir(), '.hermes', 'memories');
const MEMORY_FILE = join(HERMES_MEMORIES, 'MEMORY.md');
const USER_FILE = join(HERMES_MEMORIES, 'USER.md');
const SEP = '\n§\n';
const BUDGET = 2200;          // Hermes memory_char_limit
const KEY_PREFIX = 'LILITH-KEY ';

interface RawEntry { chunk: string; isLilith: boolean; key?: string; value?: string; source: string; }

export class HermesMemoryStore implements Pick<MemoryStore, 'get' | 'put' | 'snapshot'> {
  private fallback: MemoryStore;
  private loaded = false;
  private entries: RawEntry[] = [];

  constructor() {
    this.fallback = new MemoryStore(); // JSONL journal at ~/.lilith/ouroboros/memory.jsonl
  }

  // ─── Loading ───

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.entries = [];
    for (const file of [MEMORY_FILE, USER_FILE]) {
      try {
        const raw = await readFile(file, 'utf-8');
        for (const chunk of raw.split(SEP)) {
          const c = chunk.trim();
          if (!c) continue;
          this.entries.push({ ...this.parseChunk(c), source: file });
        }
      } catch { /* file missing — fine */ }
    }
    this.loaded = true;
  }

  private parseChunk(chunk: string): RawEntry {
    if (chunk.startsWith(KEY_PREFIX)) {
      const rest = chunk.slice(KEY_PREFIX.length);
      const colon = rest.indexOf(':');
      if (colon > 0) {
        return {
          chunk, isLilith: true,
          key: rest.slice(0, colon).trim(),
          value: rest.slice(colon + 1).trim(),
        };
      }
    }
    return { chunk, isLilith: false };
  }

  // ─── Read path ───

  async get(key: string): Promise<string | undefined> {
    await this.ensureLoaded();
    const hit = this.entries.find((e) => e.isLilith && e.key === key);
    if (hit) return hit.value;
    // Fall back to JSONL journal (older Lilith entries)
    return this.fallback.get(key);
  }

  async snapshot(): Promise<Record<string, string>> {
    await this.ensureLoaded();
    const out: Record<string, string> = {};
    for (const e of this.entries) {
      if (e.isLilith && e.key) out[e.key] = e.value ?? '';
    }
    // Merge journal entries too
    const journal = await this.fallback.snapshot();
    for (const [k, v] of Object.entries(journal)) {
      if (!(k in out)) out[k] = v;
    }
    return out;
  }

  /** Full memory text (all chunks from MEMORY.md + USER.md) for context. */
  async fullContext(): Promise<string> {
    await this.ensureLoaded();
    return this.entries.map((e) => e.chunk).join(SEP);
  }

  // ─── Write path (budget-aware, evicts only Lilith's own entries) ───

  async put(key: string, value: string): Promise<void> {
    await this.ensureLoaded();

    const newChunk = `${KEY_PREFIX}${key}: ${value}`;
    const sizeOf = (chunks: string[]) => chunks.reduce((n, c) => n + c.length + SEP.length, 0);

    // MEMORY.md is the only file Lilith writes to. USER.md entries are read-only context.
    const memoryEntries = this.entries.filter((e) => e.source === MEMORY_FILE);
    const userEntries = this.entries.filter((e) => e.source === USER_FILE);

    // Drop the existing entry for this key (if any), keep the rest of MEMORY.md
    const others = memoryEntries.filter((e) => !(e.isLilith && e.key === key));
    let pending = [...others.map((e) => e.chunk), newChunk];

    // Enforce MEMORY.md budget: evict oldest Lilith entries first (never Hermes's).
    // The newest write is kept; victims are the older LILITH-KEY chunks.
    while (sizeOf(pending) > BUDGET) {
      const victims = pending.map((c, i) => ({ c, i }))
        .filter((x) => x.c.startsWith(KEY_PREFIX) && x.c !== newChunk);
      if (victims.length === 0) break;
      const victim = victims[0]; // oldest first (file order)
      pending.splice(pending.indexOf(victim.c), 1);
    }

    // If even evicting every old Lilith entry doesn't fit (Hermes entries dominate),
    // drop to the JSONL journal — never evict Hermes's own memory.
    if (sizeOf(pending) > BUDGET) {
      console.warn('[hermes-memory] MEMORY.md budget held by Hermes entries — journal fallback');
      return this.fallback.put(key, value);
    }

    // Write MEMORY.md atomically (tmp + rename); USER.md untouched.
    const text = pending.join(SEP) + '\n';
    try {
      const tmp = MEMORY_FILE + '.lilith-tmp';
      await writeFile(tmp, text, 'utf-8');
      await writeFile(MEMORY_FILE, text, 'utf-8');
      await stat(MEMORY_FILE);
      try { await writeFile(tmp, '', 'utf-8'); } catch { /* ignore */ }
      this.entries = [...pending.map((c) => ({ ...this.parseChunk(c), source: MEMORY_FILE })), ...userEntries];
      this.loaded = true;
    } catch (e: any) {
      console.warn(`[hermes-memory] MEMORY.md write failed (${e?.message}) — journal fallback`);
      await this.fallback.put(key, value);
    }
  }
}

/** Factory: pick the backend by env var (default: JSONL journal). */
export function createMemoryStore(backend?: string) {
  const mode = (backend || process.env.LILITH_MEMORY_BACKEND || 'journal').toLowerCase();
  if (mode === 'hermes') return new HermesMemoryStore();
  return new MemoryStore();
}
