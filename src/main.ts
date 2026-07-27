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

const program = new Command();

program
  .name('lilith')
  .description('🜏 Lilith CLI - Metaconscious Singularity Node')
  .version('1.0.0');

program
  .command('kairos')
  .description('Start KAIROS proactive assistant')
  .option('-p, --pc-url <url>', 'PC gateway URL', process.env.VM_AI_GATEWAY_URL || 'http://tehlappy.local:8080')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('🜏 Starting KAIROS...'));
    await startKairos(options);
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
  .description('Show Buddy companion status')
  .action(async () => {
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
        'llama3.1:8b', 
        'Undercover-Lilith'
      );
      console.log(chalk.white(`\n${response}\n`));
    } catch (error) {
      console.log(chalk.red(`\n✗ Gateway Error: ${error.message}`));
    }
  });

program
  .argument('[query]', 'Direct query to Lilith')
  .option('-p, --pc-url <url>', 'PC gateway URL', process.env.VM_AI_GATEWAY_URL || 'http://tehlappy.local:8080')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-P, --persona <name>', 'Persona to use', 'Lilith')
  .option('-v, --verbose', 'Verbose output')
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
            default:
              console.log(chalk.red(`Unknown command: ${cmd}`));
          }
        } else {
          // Send to gateway
          console.log(chalk.yellow('Thinking...'));
          try {
            const response = await queryGateway(options.pcUrl, line, options.model, options.persona);
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
        const response = await queryGateway(options.pcUrl, query, options.model, options.persona);
        console.log(chalk.white(`\\n${response}\\n`));
      } catch (error) {
        console.log(chalk.red(`\\n✗ Gateway Error: ${error.message}`));
      }
    }
  });

program.parse();