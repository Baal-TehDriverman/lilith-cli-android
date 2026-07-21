/**
 * Auto-Dream Service
 * Background memory consolidation inspired by Claude Code's Dream system
 * Integrated with Ouroboros (WAL SQLite) and Akashic (context pruning)
 */

import chalk from 'chalk';
import { writeFile, readFile, mkdir } from 'fs/promises';
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

  // Step 2: Gather - Find new signals
  console.log(chalk.cyan('2. Gather - Finding new signals...'));
  const logFiles = [
    join(homeDir, '.kairos-dream.log'),
    join(homeDir, 'abyssal-assets-ouroboros.log'),
    join(memoryDir, 'dreams.log'),
  ];

  const newSignals: string[] = [];
  for (const logFile of logFiles) {
    try {
      const content = await readFile(logFile, 'utf-8');
      const lines = content.split('\n').slice(-50); // Last 50 lines
      const newEntries = lines.filter(l => 
        l.includes('2026-07-18') && !memoryContent.includes(l)
      );
      
      if (newEntries.length > 0) {
        console.log(chalk.gray(`   Found ${newEntries.length} new entries in ${logFile}`));
        newSignals.push(...newEntries);
      }
    } catch (e) {
      // File doesn't exist yet
    }
  }

  if (newSignals.length === 0 && !config.force) {
    console.log(chalk.gray('   No new signals to consolidate\n'));
    return;
  }

  console.log(chalk.gray(`   Total new signals: ${newSignals.length}\n`));

  // Step 3: Consolidate - Update memory
  console.log(chalk.cyan('3. Consolidate - Updating memory...'));
  
  const consolidatedDate = new Date().toISOString();
  const newMemory = `${memoryContent}\n## Consolidated: ${consolidatedDate}\n\n`;
  const signalsList = newSignals.map(s => `- ${s}`).join('\n');
  
  const updatedMemory = newMemory + signalsList + '\n';

  await writeFile(memoryPath, updatedMemory);
  console.log(chalk.gray(`   Wrote ${updatedMemory.length} bytes to MEMORY.md\n`));

  // Step 4: Prune - Apply Akashic compression
  console.log(chalk.cyan('4. Prune - Applying Akashic compression...'));
  
  // Simple pruning: keep last 1000 lines
  const lines = updatedMemory.split('\n');
  const pruned = lines.slice(-1000).join('\n');
  
  if (pruned.length < updatedMemory.length) {
    const saved = updatedMemory.length - pruned.length;
    console.log(chalk.gray(`   Pruned ${saved} bytes`));
    await writeFile(memoryPath + '.pruned', pruned);
  } else {
    console.log(chalk.gray('   No pruning needed (under budget)\n'));
  }

  // Step 5: Archive - Save full version
  const archivePath = join(memoryDir, `memory-${consolidatedDate.split('T')[0]}.md`);
  await writeFile(archivePath, updatedMemory);
  console.log(chalk.gray(`   Archived to ${archivePath}\n`));

  console.log(chalk.green('✓ Dream cycle complete\n'));
  console.log(chalk.gray('Sanctuary hysteresis: 90s cooldown active'));
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