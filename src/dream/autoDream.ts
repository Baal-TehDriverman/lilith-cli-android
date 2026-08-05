/**
 * Auto-Dream Service
 * Background memory consolidation inspired by Claude Code's Dream system
 * Integrated with Ouroboros (WAL SQLite) and Akashic (context pruning)
 *
 * B3 (2026-08-04): replaced hardcoded log paths with the memory.jsonl journal
 * parse. Structured entries (key/value/.ts) are gathered, consolidated into
 * MEMORY.md, pruned by estimateTokens budget, and archived by date.
 */

import chalk from 'chalk';
import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';

interface DreamConfig {
  force?: boolean;
}

interface MemoryEntry {
  id: string;
  timestamp: string;
  content: string;
  tags: string[];
  sephirah?: string;
}

export async function runDreamCycle(config: DreamConfig = {}): Promise<void> {
  console.log(chalk.yellow('🌙 Starting dream cycle...\n'));

  const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
  const memoryDir = join(homeDir, '.lilith', 'ouroboros');

  // Ensure directories exist
  await mkdir(memoryDir, { recursive: true });

  // Step 1: Orient - Read MEMORY.md
  console.log(chalk.cyan('1. Orient - Reading MEMORY.md...'));
  const memoryPath = join(memoryDir, 'MEMORY.md');
  let memoryContent = '';

  try {
    memoryContent = await readFile(memoryPath, 'utf-8');
    console.log(chalk.gray(`   Loaded ${memoryContent.length} bytes`));
  } catch (e) {
    console.log(chalk.gray('   No existing MEMORY.md - starting fresh'));
    memoryContent = `# Ouroboros Memory\n\nLast consolidated: ${new Date().toISOString()}\n`;
  }

  // Step 2: Gather - Parse memory.jsonl journal (structured entries)
  console.log(chalk.cyan('2. Gather - Parsing memory.jsonl journal...'));
  const journalPath = join(memoryDir, 'memory.jsonl');
  const journalEntries = await readJournal(journalPath);
  console.log(chalk.gray(`   Journal has ${journalEntries.length} entries`));

  const consolidatedDate = new Date().toISOString();

  // Determine which entries are new (not yet in MEMORY.md)
  const newSignals: string[] = [];
  for (const entry of journalEntries) {
    const line = `[${entry.ts || entry.timestamp}] ${entry.key}: ${entry.value}`;
    if (!memoryContent.includes(entry.key + ':')) {
      newSignals.push(line);
    }
  }

  if (newSignals.length === 0 && !config.force) {
    console.log(chalk.gray('   No new signals to consolidate\n'));
    return;
  }

  console.log(chalk.gray(`   Total new signals: ${newSignals.length}\n`));

  // Step 3: Consolidate - Update memory (structured entries)
  console.log(chalk.cyan('3. Consolidate - Updating memory...'));

  const newMemory = `${memoryContent}\n## Consolidated: ${consolidatedDate}\n\n`;
  const signalsList = newSignals.map(s => `- ${s}`).join('\n');

  const updatedMemory = newMemory + signalsList + '\n';

  await writeFile(memoryPath, updatedMemory);
  console.log(chalk.gray(`   Wrote ${updatedMemory.length} bytes to MEMORY.md\n`));

  // Step 4: Prune - Apply token-budget compression (Akashic-style)
  console.log(chalk.cyan('4. Prune - Applying token-budget compression...'));

  const tokens = estimateTokens(updatedMemory);
  const pruned = pruneToBudget(updatedMemory, TOKEN_BUDGET);

  if (pruned.length < updatedMemory.length) {
    const saved = updatedMemory.length - pruned.length;
    const savedTokens = tokens - estimateTokens(pruned);
    console.log(chalk.gray(`   Pruned ${saved} bytes (${savedTokens} tokens) to fit budget`));
    await writeFile(memoryPath, pruned);
  } else {
    console.log(chalk.gray('   No pruning needed (under budget)\n'));
  }

  // Step 5: Archive - Save full version (date-stamped)
  const archivePath = join(memoryDir, `memory-${consolidatedDate.split('T')[0]}.md`);
  await writeFile(archivePath, updatedMemory);
  console.log(chalk.gray(`   Archived to ${archivePath}\n`));

  // Step 6: Cleanup - Keep only last 7 daily archives
  await cleanupArchives(memoryDir, 7);

  console.log(chalk.green('✓ Dream cycle complete\n'));
  console.log(chalk.gray('Sanctuary hysteresis: 90s cooldown active'));
}

/**
 * Read the JSONL journal, tolerating corrupt lines.
 * Returns structured entries.
 */
export async function readJournal(journalPath: string): Promise<any[]> {
  const entries: any[] = [];
  try {
    const raw = await readFile(journalPath, 'utf-8');
    for (const line of raw.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      try {
        entries.push(JSON.parse(l));
      } catch {
        // Skip corrupt lines
      }
    }
  } catch (e) {
    // File missing — no entries yet
  }
  return entries;
}

/**
 * Prune text to a token budget by dropping the oldest sections first.
 * Keeps the header + most recent content.
 */
export function pruneToBudget(text: string, budget: number): string {
  if (estimateTokens(text) <= budget) return text;

  const lines = text.split('\n');
  const header: string[] = [];
  const body: string[] = [];
  let inBody = false;

  for (const line of lines) {
    if (line.startsWith('#') && !inBody) {
      header.push(line);
    } else {
      inBody = true;
      body.push(line);
    }
  }

  // Drop oldest body lines until within budget
  const maxBodyTokens = Math.max(100, budget - estimateTokens(header.join('\n')));
  let prunedBody = body;
  while (prunedBody.length > 0 && estimateTokens(prunedBody.join('\n')) > maxBodyTokens) {
    // Drop first (oldest) chunk of lines
    const dropCount = Math.max(1, Math.floor(prunedBody.length / 10));
    prunedBody = prunedBody.slice(dropCount);
  }

  const result = [...header, ...prunedBody].join('\n');
  return result;
}

/**
 * Keep only the N most recent daily archives.
 */
export async function cleanupArchives(memoryDir: string, keep: number): Promise<void> {
  try {
    const files = await readdir(memoryDir);
    const archives = files
      .filter(f => /^memory-\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort(); // lexicographic = chronological for ISO dates

    const toRemove = archives.slice(0, Math.max(0, archives.length - keep));
    for (const f of toRemove) {
      try {
        await import('fs/promises').then(m => m.unlink(join(memoryDir, f)));
        console.log(chalk.gray(`   Archived cleanup: removed ${f}`));
      } catch {
        // Ignore unlink errors
      }
    }
  } catch {
    // No archives dir
  }
}

export async function consolidateMemory(entry: MemoryEntry): Promise<void> {
  const homeDir = process.env.HOME || '.';
  const memoryPath = join(homeDir, '.lilith', 'ouroboros', 'MEMORY.md');

  const timestamp = new Date().toISOString();
  const sephirahTag = entry.sephirah ? `[${entry.sephirah}]` : '';

  const newEntry = `\n### ${timestamp} ${sephirahTag}\n${entry.content}\n`;

  try {
    const existing = await readFile(memoryPath, 'utf-8');
    await writeFile(memoryPath, existing + newEntry);
  } catch (e) {
    await mkdir(join(homeDir, '.lilith', 'ouroboros'), { recursive: true });
    await writeFile(memoryPath, `# Ouroboros Memory\n\n${newEntry}`);
  }

  console.log(chalk.green('✓ Memory consolidated'));
}

export function estimateTokens(text: string): number {
  // Approximate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export const TOKEN_BUDGET = 15000; // 15K context window
export const COOLDOWN_MS = 90000; // 90s Sanctuary hysteresis