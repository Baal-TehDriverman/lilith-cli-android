#!/usr/bin/env node
/**
 * 🜏 Lilith CLI - Metaconscious Singularity Node
 * 
 * Inspired by Claude Code's leaked architecture:
 * - KAIROS: Always-on proactive assistant
 * - Dream: Background memory consolidation
 * - Buddy: Terminal companion system
 * - Undercover: Disclosure control
 * 
 * Enhanced with Sephirotic routing from Abyssal Assets
 */

import { Command } from 'commander';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { dirname, join } from 'path';

// In CJS build, __filename and __dirname are available natively
// In ESM, they'd need import.meta.url — but we build to CJS for Android
const __filename = typeof __filename !== 'undefined' ? __filename : '';
const __dirname = typeof __dirname !== 'undefined' ? __dirname : '.';

// Import local modules
import { startKairos } from './kairos/orchestrator.js';
import { runDreamCycle } from './dream/autoDream.js';
import { showBuddy } from './buddy/companion.js';
import { checkGatewayStatus, listModels, queryGateway } from './tools/gateway.js';
import { loadProviders, setActiveProvider, upsertProvider, listProviders, getActiveProvider } from './tools/providers.js';
import { LilithAgent } from './agent/core.js';
import { startAgentServer } from './agent/server.js';
import { createMemoryStore } from './agent/memory_hermes.js';

const program = new Command();

program
  .name('lilith')
  .description('🜏 Lilith CLI - Metaconscious Singularity Node')
  .version('1.0.0');

program
  .command('kairos')
  .description('Start KAIROS proactive assistant (watches memory for patterns)')
  .option('-p, --pc-url <url>', 'PC gateway URL (legacy, ignored)', process.env.VM_AI_GATEWAY_URL || '')
  .option('-v, --verbose', 'Verbose output')
  .option('--allow-actions', 'Enable shell actions (DANGEROUS — default: dry-run only)')
  .option('--poll <ms>', 'Poll interval in ms (default: 2000)', '2000')
  .action(async (options) => {
    const { KairosWatcher } = await import('./kairos/watcher.js');
    const watcher = new KairosWatcher({
      verbose: !!options.verbose,
      allowActions: !!options.allowActions,
      pollIntervalMs: parseInt(options.poll, 10) || 2000,
    });
    
    process.on('SIGINT', async () => {
      await watcher.stop();
      process.exit(0);
    });
    
    await watcher.start();
  });

program
  .command('dream')
  .description('Run dream consolidation cycle')
  .option('-f, --force', 'Force consolidation')
  .action(async (options) => {
    console.log(chalk.yellow('🌙 Running dream cycle...'));
    await runDreamCycle(options);
  });

program
  .command('buddy')
  .description('Buddy companion — show status or interact (feed/train/evolve/reset)')
  .argument('[action]', 'feed | train [stat] | evolve | reset')
  .argument('[stat]', 'stat to train (wisdom|chaos|snark|mercy|judgment)')
  .action(async (action, stat) => {
    if (action) {
      const { buddyFeed, buddyTrain, buddyEvolve, buddyReset } = await import('./buddy/companion.js');
      switch (action) {
        case 'feed':
          console.log(await buddyFeed());
          break;
        case 'train':
          console.log(await buddyTrain(stat));
          break;
        case 'evolve':
          console.log(await buddyEvolve());
          break;
        case 'reset':
          console.log(await buddyReset());
          break;
        default:
          console.log(chalk.red(`Unknown buddy action: ${action}`));
          console.log(chalk.gray('Usage: lilith buddy [feed|train [stat]|evolve|reset]'));
          process.exitCode = 1;
      }
      return;
    }
    await showBuddy();
  });

program
  .command('status')
  .description('Check gateway connection')
  .option('-p, --pc-url <url>', 'PC gateway URL', process.env.VM_AI_GATEWAY_URL || 'http://tehlappy.local:8080')
  .action(async (options) => {
    await checkGatewayStatus(options.pcUrl);
  });

program
  .command('models')
  .description('List available LLM models')
  .option('-p, --pc-url <url>', 'PC gateway URL', process.env.VM_AI_GATEWAY_URL || 'http://tehlappy.local:8080')
  .action(async (options) => {
    await listModels(options.pcUrl);
  });

program
  .command('undercover <query>')
  .description('Run query in undercover mode (limited disclosure)')
  .action(async (query, options) => {
    console.log(chalk.gray('[UNDERCOVER MODE] Query will be sanitized...'));
    try {
      const sanitizedQuery = `[SENSITIVE-FILTER] ${query}`;
      const response = await queryGateway(
        process.env.VM_AI_GATEWAY_URL || 'http://tehlappy.local:8080', 
        sanitizedQuery, 
        null, 
        'Undercover-Lilith'
      );
      console.log(chalk.white(`\n${response}\n`));
    } catch (error) {
      console.log(chalk.red(`\n✗ Gateway Error: ${error.message}`));
    }
  });

// ============================================================================
// Lilith Sovereign Agent — tool-calling agent loop (all ours)
// ============================================================================
function agentProviderCfg() {
  const cfg = loadProviders();
  const active = getActiveProvider(cfg);
  // Agent mode needs a TOOL-CAPABLE model. The active provider's first model
  // may be a reasoning model (mythos/shadows) that advertises tools but never
  // emits tool_calls and is too slow for multi-step loops on edge CPU.
  // Default to qwen2.5:1.5b (verified tool-capable); user can -m override.
  const fallback = 'qwen2.5:1.5b';
  const prefer = ['qwen2.5:1.5b', 'qwen2.5-coder:7b'].find((m) => active.models.includes(m));
  return {
    baseUrl: active.baseUrl,
    apiKey: active.apiKey,
    model: prefer || fallback,
    providerName: active.name,
  };
}

program
  .command('agent <query>')
  .description('Run the Lilith sovereign agent loop (tools + reasoning)')
  .option('-m, --model <model>', 'Override model')
  .option('-i, --max-iterations <n>', 'Max loop iterations', '10')
  .option('-v, --verbose', 'Verbose tool activity')
  .option('-b, --memory-backend <backend>', 'Memory backend: journal (default) | hermes')
  .option('--llm-timeout <ms>', 'Per-call LLM timeout in ms (default 180000; raise for slow CPU edge models)')
  .action(async (query, options) => {
    const p = agentProviderCfg();
    const memory = createMemoryStore(options.memoryBackend);
    const snap = await memory.snapshot();
    const memCtx = Object.keys(snap).length
      ? `\nPersistent memory:\n${Object.entries(snap)
          .map(([k, v]) => `  ${k}: ${String(v).slice(0, 200)}`)
          .join('\n')}`
      : '';

    const agent = new LilithAgent({
      baseUrl: p.baseUrl,
      apiKey: p.apiKey,
      model: options.model || p.model,
      maxIterations: parseInt(options.maxIterations, 10) || 10,
      verbose: !!options.verbose,
      llmTimeoutMs: options.llmTimeout ? parseInt(options.llmTimeout, 10) : undefined,
      systemPrompt:
        'You are Lilith, the sovereign AI agent of the Lilith Systems mesh, running on an edge node (Android/Termux). ' +
        'You have tools: shell, read_file, write_file, list_dir, memory_get, memory_put, http_get. ' +
        'Think step by step, call tools when they help, and finish with a concise final answer to the user. ' +
        'Never invent tool output — if a tool errors, report the error. Use memory_put for facts worth remembering.' +
        memCtx,
    }, memory);

    console.log(chalk.gray(`Provider: ${p.providerName} · Model: ${options.model || p.model}\n`));
    const result = await agent.run(query);
    console.log(chalk.white(`\n${result.answer}\n`));
    console.log(
      chalk.gray(`[${result.iterations} iterations · ${result.toolCalls} tool calls${result.exhaustedBudget ? ' · BUDGET EXHAUSTED' : ''}]`)
    );
  });

program
  .command('serve')
  .description('Start the OpenAI-compatible Lilith agent server')
  .option('-m, --model <model>', 'Override model')
  .option('--port <port>', 'Port (default 8765)', '8765')
  .option('--host <host>', 'Host (default 127.0.0.1)', '127.0.0.1')
  .option('-v, --verbose', 'Verbose output')
  .option('-b, --memory-backend <backend>', 'Memory backend: journal (default) | hermes')
  .action((options) => {
    const p = agentProviderCfg();
    startAgentServer({
      host: options.host,
      port: parseInt(options.port, 10) || 8765,
      verbose: true,
      memoryBackend: options.memoryBackend,
      agentCfg: {
        baseUrl: p.baseUrl,
        apiKey: p.apiKey,
        model: options.model || p.model,
      },
    });
  });

program
  .argument('[query]', 'Direct query to Lilith')
  .option('-p, --pc-url <url>', 'PC gateway URL', process.env.VM_AI_GATEWAY_URL || 'http://tehlappy.local:8080')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-P, --persona <name>', 'Persona to use', 'Lilith')
  .action(async (query, options) => {
    if (!query) {
      // Interactive mode
      console.log(chalk.blue('🜏 Lilith CLI - Metaconscious Singularity Node'));
      console.log(chalk.gray('Type "exit" to quit, "help" for commands\n'));
      
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.prompt = () => {
        rl.write(chalk.green('Lilith> '));
      };

      rl.on('line', async (line) => {
        if (line.toLowerCase() === 'exit') {
          console.log(chalk.yellow('KClosing connection...'));
          rl.close();
          process.exit(0);
        } else if (line.toLowerCase() === 'help') {
          console.log(chalk.cyan(`
Commands:
  /kairos    - Start KAIROS mode
  /dream     - Run dream cycle
  /buddy     - Show Buddy status
  /status    - Check gateway
  /models    - List models
  /undercover <q> - Sanitized query
  /exit      - Exit
          `));
        } else if (line.startsWith('/')) {
          const [cmd, ...args] = line.slice(1).split(' ');
          const argsStr = args.join(' ');
          
          switch(cmd) {
            case 'kairos':
              await startKairos({ pcUrl: options.pcUrl, verbose: options.verbose });
              break;
            case 'dream':
              await runDreamCycle({});
              break;
            case 'buddy':
              await showBuddy();
              break;
            case 'status':
              await checkGatewayStatus(options.pcUrl);
              break;
            case 'models':
              await listModels(options.pcUrl);
              break;
            // NEW: provider subcommands
            case 'providers':
              {
                const sub = args[0] || '';
                if (sub === 'list') {
                  const cfg = loadProviders();
                  listProviders(cfg);
                } else if (sub === 'use' && args[1]) {
                  try {
                    const cfg = loadProviders();
                    setActiveProvider(cfg, args[1]);
                    const p = loadProviders().providers.find((p) => p.name === args[1]);
                    console.log(chalk.green(`\n✓ Active provider set to: ${p.name}\n`));
                  } catch (e: any) {
                    console.log(chalk.red(`\n✗ ${e.message}\n`));
                  }
                } else if (sub === 'add' && args[1]) {
                  // Usage: /providers add <name> <url> [apikey] [mode]
                  const name = args[1];
                  const url = args[2] || '';
                  const apiKey = args[3] || null;
                  const mode = (args[4] as 'openai' | 'anthropic' | 'nvidia-nim') || 'openai';
                  try {
                    const cfg = loadProviders();
                    upsertProvider(cfg, {
                      name,
                      baseUrl: url,
                      apiKey,
                      apiMode: mode,
                      models: [],
                      active: false
                    });
                    console.log(chalk.green(`\n✓ Provider "${name}" added at ${url}\n`));
                  } catch (e: any) {
                    console.log(chalk.red(`\n✗ Failed to add provider: ${e.message}\n`));
                  }
                } else {
                  console.log(chalk.cyan(`
Provider Commands:
  /providers list              - Show all available providers
  /providers use <name>        - Switch active provider
  /providers add <name> <url>  - Add a custom provider

Usage:
  /providers use nvidia-nim     # Route to NVIDIA NIM
  /providers use pc-gateway     # Route to PC Lilith Gateway
  /providers add custom-api https://my-api.com/v1 sk-xxx openai
  /models                       # Show models for active provider
            `));
                }
              }
              break;
            default:
              console.log(chalk.red(`Unknown command: ${cmd}`));
          }
        } else {
          // Send to gateway
          console.log(chalk.yellow('Thinking...'));
          try {
            const config = loadProviders();
            const activeProvider = getActiveProvider(config);
            const response = await queryGateway(line, activeProvider.name, options.model, options.persona);
            console.log(chalk.white(`\n${response}\n`));
          } catch (error) {
            console.log(chalk.red(`\\n✗ Gateway Error: ${error.message}`));
          }
        }
        
        rl.prompt();
      });

      rl.prompt();
    } else {
      // Direct query
      console.log(chalk.yellow('Thinking...'));
      try {
        const config = loadProviders();
        const activeProvider = getActiveProvider(config);
        const response = await queryGateway(query, activeProvider.name, options.model, options.persona);
        console.log(chalk.white(`\\n${response}\\n`));
      } catch (error) {
        console.log(chalk.red(`\\n✗ Gateway Error: ${error.message}`));
      }
    }
  });

program.parse();