/**
 * KAIROS Router — dispatches pattern matches to log/memory_put/shell
 * FAIL CLOSED by default (allowActions=false)
 */
import chalk from 'chalk';
import { MemoryStore } from '../agent/memory.js';

export interface MatchContext {
  sephirah: string;
  action: string;
}

export interface MatchEvent {
  type: 'journal' | 'hermes';
  key?: string;
  value?: string;
  raw?: string;
}

export interface RouterConfig {
  allowActions: boolean;
  workdir: string;
  memory?: MemoryStore;
  verbose: boolean;
}

export async function routeMatch(
  match: MatchContext,
  event: MatchEvent,
  source: 'journal' | 'hermes',
  config: RouterConfig
): Promise<void> {
  const { sephirah, action } = match;
  const timestamp = new Date().toISOString();

  // Always log the match
  const logEntry = `[KAIROS] ${timestamp} | ${sephirah}/${action} | ${source} | ${event.key || event.raw?.slice(0, 80) || 'unknown'}`;
  console.log(logEntry);

  // Persist to memory (always, even if actions disabled)
  if (config.memory) {
    const memKey = `kairos:${sephirah.toLowerCase()}:${action}:${Date.now()}`;
    const memValue = JSON.stringify({ sephirah, action, source, event, timestamp });
    await config.memory.put(memKey, memValue);
  }

  // Execute action ONLY if allowActions=true (FAIL CLOSED)
  if (!config.allowActions) {
    if (config.verbose) {
      console.log(chalk.gray(`  [dry-run] Would execute: ${action} for ${sephirah}`));
    }
    return;
  }

  // Dispatch based on Sephirah + action
  try {
    await dispatchAction(sephirah, action, event, config);
    if (config.verbose) {
      console.log(chalk.green(`  [executed] ${action} for ${sephirah}`));
    }
  } catch (e: any) {
    console.log(chalk.red(`  [error] ${action} for ${sephirah}: ${e?.message || e}`));
  }
}

async function dispatchAction(
  sephirah: string,
  action: string,
  event: MatchEvent,
  config: RouterConfig
): Promise<void> {
  // Import shell tool dynamically
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const timestamp = new Date().toISOString();

  switch (sephirah) {
    case 'Gevurah': // Critical/Diagnostic
      if (action === 'diagnose') {
        // Run diagnostic shell command
        await execAsync('dmesg -T | tail -20', { 
          timeout: 10_000, 
          cwd: config.workdir 
        });
      }
      break;

    case 'Tiferet': // Balance/Optimize
      if (action === 'optimize') {
        // Run optimization (e.g., clear caches)
        await execAsync('sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true', {
          timeout: 5_000,
          cwd: config.workdir,
        });
      }
      break;

    case 'Yesod': // Memory/Consolidate
      if (action === 'consolidate') {
        // Trigger memory consolidation
        if (config.memory) {
          await config.memory.put('kairos:consolidate:triggered', timestamp);
        }
      }
      break;

    case 'Hod': // Communication/Analyze
      if (action === 'analyze') {
        // Could POST to provider for analysis
        if (config.memory) {
          await config.memory.put('kairos:analyze:queued', JSON.stringify(event));
        }
      }
      break;

    case 'Malkuth': // Manifestation/Execute
      if (action === 'execute') {
        // Execute build/deploy - DANGEROUS, requires explicit allowActions
        await execAsync('echo "Malkuth execute triggered"', {
          timeout: 30_000,
          cwd: config.workdir,
        });
      }
      break;

    case 'Chokhmah': // Creative/Ideate
      if (action === 'ideate') {
        if (config.memory) {
          await config.memory.put('kairos:ideate:queued', JSON.stringify(event));
        }
      }
      break;

    case 'Binah': // Analytical/Comprehend
      if (action === 'comprehend') {
        if (config.memory) {
          await config.memory.put('kairos:comprehend:queued', JSON.stringify(event));
        }
      }
      break;

    case 'Keter': // Executive/Decision
      if (action === 'execute_decision') {
        if (config.memory) {
          await config.memory.put('kairos:decision:queued', JSON.stringify(event));
        }
      }
      break;

    default: // Tiferet default
      if (action === 'balance') {
        // No-op balance action
      }
  }
}