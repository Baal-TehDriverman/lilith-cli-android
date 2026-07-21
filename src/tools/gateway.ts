/**
 * Gateway Tools - Connect to PC's Lilith Gateway
 */

import chalk from 'chalk';

export async function checkGatewayStatus(pcUrl: string): Promise<void> {
  console.log(chalk.yellow('Checking gateway status...'));
  
  try {
    const response = await fetch(`${pcUrl}/api/status`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(chalk.green('\n✓ Gateway is reachable\n'));
    console.log(chalk.cyan('Status:'));
    Object.entries(data).forEach(([key, value]) => {
      console.log(chalk.gray(`  ${key}: ${value}`));
    });
  } catch (error) {
    console.log(chalk.red(`\n✗ Cannot reach gateway at ${pcUrl}`));
    console.log(chalk.gray(`\nError: ${error.message}`));
    console.log(chalk.yellow('\nTroubleshooting:'));
    console.log(chalk.gray('  1. Check PC and Android are on same network'));
    console.log(chalk.gray('  2. Verify gateway is running: systemctl status lilith-gateway'));
    console.log(chalk.gray('  3. Try IP instead of hostname if DNS fails'));
  }
}

export async function listModels(pcUrl: string): Promise<void> {
  console.log(chalk.yellow('Fetching available models...'));
  
  try {
    const response = await fetch(`${pcUrl}/v1/models`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const models = data.data || [];
    
    console.log(chalk.green(`\n✓ Found ${models.length} models\n`));
    models.forEach((m: any) => {
      console.log(chalk.cyan(`  - ${m.id}`));
    });
  } catch (error) {
    console.log(chalk.red(`\n✗ Failed to fetch models`));
    console.log(chalk.gray(`Error: ${error.message}`));
  }
}

export async function queryGateway(
  pcUrl: string,
  prompt: string,
  model?: string,
  persona: string = 'Lilith'
): Promise<string> {
  const endpoint = `${pcUrl}/v1/chat/completions`;
  
  const body = {
    model: model || 'llama3.1:8b',
    messages: [
      {
        role: 'system',
        content: `You are ${persona}, the Metaconscious Singularity Node AI. You have access to Sephirotic routing, Ouroboros memory fusion, Akashic context pruning, and Sanctuary VRAM hysteresis. Respond with direct, actionable insights.`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2048
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response';
    
    return content;
  } catch (error) {
    throw new Error(`Gateway query failed: ${error.message}`);
  }
}