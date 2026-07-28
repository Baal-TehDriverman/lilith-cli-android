/**
 * Provider Registry — AI provider selection and switching
 * Supports PC Gateway (Ollama), NVIDIA NIM, local Ollama, and custom URLs
 */

import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export type ApiMode = 'openai' | 'anthropic' | 'nvidia-nim';

export interface AIProvider {
  name: string;
  baseUrl: string;
  apiKey: string | null;
  apiMode: ApiMode;
  models: string[];
  active: boolean;
}

export interface ProviderConfig {
  defaultProvider: string;
  providers: AIProvider[];
}

const CONFIG_PATH = join(process.cwd(), 'src', 'config', 'providers.json');
const USER_CONFIG_PATH = join(process.cwd(), '.lilith', 'providers.json');

const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    name: 'pc-gateway',
    baseUrl: 'http://tehlappy.local:8080/v1',
    apiKey: null,
    apiMode: 'openai',
    models: [
      'llama3.1:8b',
      'granite3-guardian:8b',
      'codellama:latest',
      'lilith-frankenstein-keter:latest',
      'lilith-tiferet:latest',
      'lilith-binah:latest',
      'grok-msn:latest',
      'grok-gtc-msn:latest',
      'msn-cyberpunk:latest',
      'qwen2.5-coder:7b',
      'nemotron-mini:latest',
      'gemma2:2b',
      'deepseek-coder-v2:lite',
      'llama3:8b',
    ],
    active: true,
  },
  {
    name: 'nvidia-nim',
    baseUrl: 'https://api.nvidia.com/nim/v1',
    apiKey: null,
    apiMode: 'nvidia-nim',
    models: [
      'nvidia/llama3-70b-instruct',
      'nvidia/llama3-8b-instruct',
      'nvidia/mistral-7b-instruct',
      'nvidia/phi-3-mini-128k-instruct',
      'nvidia/e5-mini-v2',
    ],
    active: false,
  },
  {
    name: 'local-ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKey: null,
    apiMode: 'openai',
    models: [],
    active: false,
  },
  {
    name: 'custom',
    baseUrl: '',
    apiKey: null,
    apiMode: 'openai',
    models: [],
    active: false,
  },
];

/** Load provider config, merging user overrides with defaults */
export function loadProviders(): ProviderConfig {
  // Try user config first, then fall back to defaults
  let config: ProviderConfig;

  if (existsSync(USER_CONFIG_PATH)) {
    try {
      const raw = readFileSync(USER_CONFIG_PATH, 'utf-8');
      const userConfig = JSON.parse(raw);
      const defaults = { defaultProvider: 'pc-gateway', providers: DEFAULT_PROVIDERS };
      config = { ...defaults, ...userConfig };

      // Merge provider list — user configs override by name
      if (userConfig.providers) {
        config.providers = DEFAULT_PROVIDERS.map((dp) => {
          const userP = userConfig.providers.find((p: AIProvider) => p.name === dp.name);
          return userP ? { ...dp, ...userP } : dp;
        });
        // Add any new providers the user defined
        const existingNames = new Set(config.providers.map((p) => p.name));
        userConfig.providers.forEach((p: AIProvider) => {
          if (!existingNames.has(p.name)) {
            config.providers.push(p);
          }
        });
      }
    } catch {
      config = { defaultProvider: 'pc-gateway', providers: DEFAULT_PROVIDERS };
    }
  } else {
    config = { defaultProvider: 'pc-gateway', providers: DEFAULT_PROVIDERS };
  }

  // Ensure at least one provider is active
  const activeCount = config.providers.filter((p) => p.active).length;
  if (activeCount === 0) {
    const defaultP = config.providers.find((p) => p.name === config.defaultProvider) || config.providers[0];
    defaultP.active = true;
  }

  return config;
}

/** Get the currently active provider */
export function getActiveProvider(config: ProviderConfig): AIProvider {
  const active = config.providers.find((p) => p.active);
  if (active) return active;

  const fallback = config.providers.find((p) => p.name === config.defaultProvider) || config.providers[0];
  fallback.active = true;
  return fallback;
}

/** Switch active provider by name */
export function setActiveProvider(
  config: ProviderConfig,
  providerName: string
): ProviderConfig {
  const provider = config.providers.find((p) => p.name === providerName);
  if (!provider) {
    throw new Error(`Provider "${providerName}" not found. Run 'lilith providers' to see available providers.`);
  }

  // Deactivate all, activate the chosen one
  config.providers.forEach((p) => { p.active = false; });
  provider.active = true;
  config.defaultProvider = providerName;

  saveProviders(config);
  return config;
}

/** Add or update a custom provider */
export function upsertProvider(
  config: ProviderConfig,
  provider: AIProvider
): ProviderConfig {
  const existing = config.providers.findIndex((p) => p.name === provider.name);
  if (existing >= 0) {
    config.providers[existing] = provider;
  } else {
    config.providers.push(provider);
  }
  saveProviders(config);
  return config;
}

/** Persist config to user config path */
export function saveProviders(config: ProviderConfig): void {
  const dir = join(process.cwd(), '.lilith');
  try {
    writeFileSync(USER_CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch {
    // If user config path fails, write to the local config dir
    try {
      writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch {
      // Last resort: just log, don't crash
      console.warn(chalk.yellow('Warning: Could not save provider config.'));
    }
  }
}

/** Format provider info for display */
export function formatProvider(p: AIProvider): string {
  const status = p.active ? chalk.green('● ACTIVE') : chalk.gray('○ inactive');
  const keyStatus = p.apiKey ? chalk.green('KEY SET') : chalk.yellow('no key');
  const models = p.models.length > 0 ? `${p.models.length} models` : chalk.gray('no models');
  return `${chalk.cyan(p.name.padEnd(16))} ${status.padEnd(14)} ${keyStatus.padEnd(12)} ${models}  ${p.baseUrl || '(custom URL)'}`;
}

/** List all providers formatted for CLI output */
export function listProviders(config: ProviderConfig): void {
  console.log(chalk.cyan('\n═══ AI Providers ═══\n'));
  console.log(`  ${'Name'.padEnd(16)} ${'Status'.padEnd(14)} ${'Key'.padEnd(12)} Models          Base URL`);
  console.log(`  ${'-'.repeat(80)}`);
  config.providers.forEach((p) => console.log(`  ${formatProvider(p)}`));
  console.log();
}