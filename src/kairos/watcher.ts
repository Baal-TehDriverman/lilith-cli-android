/**
 * KAIROS Watcher — polls memory journal for new entries, runs pattern detection
 * Zero-dep, runs on stock Termux node.
 */
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { detectPattern } from './orchestrator.js';
import { routeMatch } from './router.js';

export interface WatcherConfig {
  journalPath?: string;      // default: ~/.lilith/ouroboros/memory.jsonl
  hermesMemoryPath?: string; // default: ~/.hermes/memories/MEMORY.md
  pollIntervalMs?: number;    // default: 2000
  verbose?: boolean;
  allowActions?: boolean;     // false = log only (FAIL CLOSED)
}

const DEFAULT_JOURNAL = join(homedir(), '.lilith', 'ouroboros', 'memory.jsonl');
const DEFAULT_HERMES = join(homedir(), '.hermes', 'memories', 'MEMORY.md');
const SEP = '\n§\n';

export class KairosWatcher {
  private config: Required<WatcherConfig>;
  private journalPos = 0;
  private hermesPos = 0;
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: WatcherConfig) {
    this.config = {
      journalPath: config.journalPath || DEFAULT_JOURNAL,
      hermesMemoryPath: config.hermesMemoryPath || DEFAULT_HERMES,
      pollIntervalMs: config.pollIntervalMs || 2000,
      verbose: config.verbose || false,
      allowActions: config.allowActions || false,
    };
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Initialize positions to end of files (only watch NEW entries)
    await this.initPositions();

    if (this.config.verbose) {
      console.log(chalk.blue('🚀 KAIROS Watcher started'));
      console.log(chalk.gray(`Journal: ${this.config.journalPath}`));
      console.log(chalk.gray(`Hermes:  ${this.config.hermesMemoryPath}`));
      console.log(chalk.gray(`Poll:    ${this.config.pollIntervalMs}ms`));
      console.log(chalk.gray(`Actions: ${this.config.allowActions ? 'ENABLED' : 'DISABLED (FAIL CLOSED)'}`));
      console.log(chalk.yellow('Watching for patterns... (Ctrl+C to stop)\n'));
    }

    this.intervalId = setInterval(() => this.tick(), this.config.pollIntervalMs);
    
    // Initial tick
    await this.tick();
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    if (this.config.verbose) {
      console.log('\n' + chalk.yellow('KAIROS Watcher stopped'));
    }
  }

  private async initPositions(): Promise<void> {
    try {
      const jStat = await stat(this.config.journalPath);
      this.journalPos = jStat.size;
    } catch { this.journalPos = 0; }

    try {
      const hStat = await stat(this.config.hermesMemoryPath);
      this.hermesPos = hStat.size;
    } catch { this.hermesPos = 0; }
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    try {
      // Check journal
      await this.checkJournal();
      // Check Hermes memory
      await this.checkHermesMemory();
    } catch (e: any) {
      if (this.config.verbose) {
        console.log(chalk.red(`Watcher tick error: ${e?.message || e}`));
      }
    }
  }

  private async checkJournal(): Promise<void> {
    try {
      const st = await stat(this.config.journalPath);
      if (st.size <= this.journalPos) return;

      const raw = await readFile(this.config.journalPath, 'utf-8');
      const newContent = raw.slice(this.journalPos);
      this.journalPos = st.size;

      for (const line of newContent.split('\n')) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry && typeof entry.key === 'string') {
            // Run pattern detection on the value (and key)
            const text = `${entry.key}: ${entry.value}`;
            const match = detectPattern(text);
            if (match) {
              await routeMatch(match, entry, 'journal', this.config);
            }
          }
        } catch {
          // Skip corrupt lines
        }
      }
    } catch {
      // File missing or unreadable
    }
  }

  private async checkHermesMemory(): Promise<void> {
    try {
      const st = await stat(this.config.hermesMemoryPath);
      if (st.size <= this.hermesPos) return;

      const raw = await readFile(this.config.hermesMemoryPath, 'utf-8');
      const newContent = raw.slice(this.hermesPos);
      this.hermesPos = st.size;

      // Split by § separator, process new chunks
      const chunks = newContent.split(SEP);
      for (const chunk of chunks) {
        const c = chunk.trim();
        if (!c) continue;
        // Only process Lilith entries (LILITH-KEY prefix)
        if (c.startsWith('LILITH-KEY ')) {
          const match = detectPattern(c);
          if (match) {
            await routeMatch(match, { raw: c }, 'hermes', this.config);
          }
        }
      }
    } catch {
      // File missing or unreadable
    }
  }
}

import chalk from 'chalk';

export async function createWatcher(config?: Partial<WatcherConfig>): Promise<KairosWatcher> {
  return new KairosWatcher(config || {});
}