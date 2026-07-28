/**
 * Gateway Tools - Connect to PC's Lilith Gateway or any AI provider
 * Updated with provider registry integration
 */

import chalk from 'chalk';
import { AIProvider, ProviderConfig, loadProviders, getActiveProvider, formatProvider } from './providers.js';

export async function checkGatewayStatus(pcUrl?: string): Promise<void> {
  const config = loadProviders();
  const provider = pcUrl ? config.providers.find((p) => p.baseUrl.includes(pcUrl)) || getActiveProvider(config) : getActiveProvider(config);

  console.log(chalk.yellow(`Checking ${provider.name} gateway...`));

  const statusUrl = provider.apiMode === 'nvidia-nim'
    ? `${provider.baseUrl.replace('/v1', '')}/v1`
    : `${provider.baseUrl}/api/status`;

  try {
    const response = await fetch(statusUrl, {
      headers: provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {}
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log(chalk.green(`\n✓ ${provider.name} is reachable\n`));
    console.log(chalk.cyan('Status:'));
    if (data.models) {
      const modelCount = Array.isArray(data.models) ? data.models.length : Object.keys(data.models).length;
      console.log(chalk.gray(`  models: ${modelCount}`));
    }
    console.log(chalk.gray(`  baseUrl: ${provider.baseUrl}`));
    console.log(chalk.gray(`  apiMode: ${provider.apiMode}`));
    console.log(chalk.gray(`  apiKey: ${provider.apiKey ? 'SET' : 'none'}\n`));
  } catch (error) {
    console.log(chalk.red(`\n✗ Cannot reach ${provider.name} at ${provider.baseUrl}`));
    console.log(chalk.gray(`\nError: ${error.message}`));
    console.log(chalk.yellow('\nTroubleshooting:'));
    console.log(chalk.gray('  1. Check that the provider/service is running'));
    console.log(chalk.gray('  2. Verify network connectivity to the gateway'));
    console.log(chalk.gray('  3. Try IP instead of hostname if DNS fails'));
    console.log(chalk.gray(`  4. Run "lilith providers" to see provider details`));
  }
}

export async function listModels(pcUrl?: string): Promise<void> {
  const config = loadProviders();
  let provider: AIProvider;

  if (pcUrl) {
    provider = config.providers.find((p) => p.baseUrl.includes(pcUrl)) || config.providers[0];
  } else {
    provider = getActiveProvider(config);
  }

  console.log(chalk.yellow(`Fetching models from ${provider.name}...`));

  // If provider has hardcoded models, show them directly
  if (provider.models.length > 0 && provider.apiMode !== 'anthropic') {
    console.log(chalk.green(`\n✓ ${provider.models.length} models available (configured)\n`));
    provider.models.forEach((m: string) => {
      console.log(chalk.cyan(`  - ${m}`));
    });
    return;
  }

  try {
    const response = await fetch(`${provider.baseUrl}/v1/models`, {
      headers: provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {}
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const models = data.data || [];

    console.log(chalk.green(`\n✓ Found ${models.length} models\n`));
    models.forEach((m: any) => {
      const providerName = m.provider?.name || '';
      console.log(chalk.cyan(`  - ${m.id}${providerName ? ` (${providerName})` : ''}`));
    });
  } catch (error) {
    console.log(chalk.red(`\n✗ Failed to fetch models from ${provider.name}`));
    console.log(chalk.gray(`Error: ${error.message}`));
  }
}

export async function queryGateway(
  prompt: string,
  providerName?: string,
  model?: string,
  persona: string = 'Lilith'
): Promise<string> {
  const config = loadProviders();
  let provider: AIProvider;

  if (providerName) {
    provider = config.providers.find((p) => p.name === providerName) || getActiveProvider(config);
  } else {
    provider = getActiveProvider(config);
  }

  const endpoint = `${provider.baseUrl}/v1/chat/completions`;

  // Build request body based on API mode
  let body: any;
  if (provider.apiMode === 'anthropic') {
    body = {
      model: model || provider.models[0] || 'claude-sonnet-4-20250514',
      messages: [
        { role: 'system', content: persona ? `You are ${persona}.` : 'You are a helpful AI assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048,
      temperature: 0.7
    };
  } else if (provider.apiMode === 'nvidia-nim') {
    // NIM uses a different payload shape in some deployments
    body = {
      model: model || provider.models[0] || 'default',
      messages: [
        { role: 'system', content: persona ? `You are ${persona}.` : 'You are a helpful AI assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 1.0
    };
  } else {
    // OpenAI-compatible (default for PC Gateway and Ollama)
    body = {
      model: model || 'llama3.1:8b',
      messages: [
        {
          role: 'system',
          content: `You are ${persona}, the Metaconscious Singularity Node AI. You have access to Sephirotic routing, Ouroboros memory fusion, Akashic context pruning, and Sanctuary VRAM hysteresis. Respond with direct, actionable insights.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048
    };
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();

    // Handle both OpenAI and Anthropic response shapes
    const content = data.choices?.[0]?.message?.content
      || data.content?.[0]?.text
      || 'No response';

    return content;
  } catch (error) {
    throw new Error(`Gateway query to ${provider.name} failed: ${error.message}`);
  }
}