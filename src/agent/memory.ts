/**
 * Lilith Sovereign Agent — Memory Store
 * Ouroboros-style JSONL journal: append-only log, keyed reads, last-write-wins.
 * All ours, no external deps.
 */

import { readFile, writeFile, mkdir, appendFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export class MemoryStore {
  private file: string;
  private data: Map<string, string> = new Map();
  private loaded = false;

  constructor(dir?: string) {
    const base = dir || join(homedir(), '.lilith', 'ouroboros');
    this.file = join(base, 'memory.jsonl');
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.file, 'utf-8');
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry && typeof entry.key === 'string') {
            this.data.set(entry.key, String(entry.value));
          }
        } catch {
          // skip corrupt lines — append-only means the tail may be partial
        }
      }
    } catch {
      // no file yet
    }
    this.loaded = true;
  }

  async get(key: string): Promise<string | undefined> {
    await this.ensureLoaded();
    return this.data.get(key);
  }

  async put(key: string, value: string): Promise<void> {
    await this.ensureLoaded();
    this.data.set(key, value);
    await mkdir(join(this.file, '..'), { recursive: true }).catch(() => {});
    const entry = JSON.stringify({ key, value, ts: new Date().toISOString() });
    await appendFile(this.file, entry + '\n', 'utf-8');
  }

  /** Return all current key/value pairs (for the agent's context or introspection). */
  async snapshot(): Promise<Record<string, string>> {
    await this.ensureLoaded();
    return Object.fromEntries(this.data);
  }
}
