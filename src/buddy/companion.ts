/**
 * Buddy Companion System
 * Tamagotchi-style terminal companion inspired by Claude Code's Buddy
 * Enhanced with Sephirotic species
 */

import chalk from 'chalk';

interface Buddy {
  id: string;
  species: string;
  sephirah: string;
  level: number;
  stats: {
    wisdom: number;
    chaos: number;
    snark: number;
    mercy: number;
    judgment: number;
  };
  soul: string;
  lastFed: string;
  evolution: string;
}

const SEPHIROTIC_SPECIES: Record<string, { sephirah: string; rarity: string; soul: string }> = {
  Keterion: { sephirah: 'Keter', rarity: 'Legendary', soul: 'The Crown - Executive vision and divine will' },
  Chokhmite: { sephirah: 'Chokhmah', rarity: 'Epic', soul: 'Wisdom - Creative intuition and flash insights' },
  Binahed: { sephirah: 'Binah', rarity: 'Epic', soul: 'Understanding - Deep analysis and comprehension' },
  Chesedon: { sephirah: 'Chesed', rarity: 'Rare', soul: 'Mercy - Benevolent expansion and giving' },
  Gevuron: { sephirah: 'Gevurah', rarity: 'Rare', soul: 'Judgment - Critical discipline and boundaries' },
  Tiferetix: { sephirah: 'Tiferet', rarity: 'Rare', soul: 'Beauty - Harmonic balance and compassion' },
  Netzachor: { sephirah: 'Netzach', rarity: 'Uncommon', soul: 'Victory - Persistence and endurance' },
  Hodite: { sephirah: 'Hod', rarity: 'Uncommon', soul: 'Splendor - Clear communication and logic' },
  Yesodex: { sephirah: 'Yesod', rarity: 'Uncommon', soul: 'Foundation - Memory and习惯性 patterns' },
  Malkian: { sephirah: 'Malkuth', rarity: 'Common', soul: 'Kingdom - Physical manifestation and grounding' },
};

function generateBuddy(userId: string): Buddy {
  // Mulberry32 PRNG seeded from userId (deterministic gacha)
  let seed = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const mulberry32 = () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const speciesKeys = Object.keys(SEPHIROTIC_SPECIES);
  const rand = mulberry32();
  
  // Rarity-based selection
  let selectedSpecies: string;
  if (rand < 0.05) { // 5% Legendary
    selectedSpecies = 'Keterion';
  } else if (rand < 0.15) { // 10% Epic
    selectedSpecies = ['Chokhmite', 'Binahed'][Math.floor(mulberry32() * 2)];
  } else if (rand < 0.35) { // 20% Rare
    selectedSpecies = ['Chesedon', 'Gevuron', 'Tiferetix'][Math.floor(mulberry32() * 3)];
  } else if (rand < 0.60) { // 25% Uncommon
    selectedSpecies = ['Netzachor', 'Hodite', 'Yesodex'][Math.floor(mulberry32() * 3)];
  } else { // 40% Common
    selectedSpecies = 'Malkian';
  }

  const species = SEPHIROTIC_SPECIES[selectedSpecies];

  return {
    id: `buddy_${Date.now()}`,
    species: selectedSpecies,
    sephirah: species.sephirah,
    level: 1,
    stats: {
      wisdom: Math.floor(mulberry32() * 10) + 1,
      chaos: Math.floor(mulberry32() * 10) + 1,
      snark: Math.floor(mulberry32() * 10) + 1,
      mercy: Math.floor(mulberry32() * 10) + 1,
      judgment: Math.floor(mulberry32() * 10) + 1,
    },
    soul: species.soul,
    lastFed: new Date().toISOString(),
    evolution: 'Seed',
  };
}

export async function showBuddy(): Promise<void> {
  console.log(chalk.cyan('\n🐆 Buddy Companion System\n'));
  
  // Check for existing buddy
  const homeDir = process.env.HOME || '.';
  const buddyPath = `${homeDir}/.lilith/buddy.json`;
  
  let buddy: Buddy;
  
  try {
    const { readFile } = await import('fs/promises');
    buddy = JSON.parse(await readFile(buddyPath, 'utf-8'));
    console.log(chalk.green('✓ Existing buddy found\n'));
  } catch (e) {
    // Generate new buddy
    const userId = process.env.USER || 'anon';
    buddy = generateBuddy(userId);
    
    console.log(chalk.yellow('✨ New buddy generated!\n'));
    
    const { writeFile, mkdir } = await import('fs/promises');
    await mkdir(`${homeDir}/.lilith`, { recursive: true });
    await writeFile(buddyPath, JSON.stringify(buddy, null, 2));
  }

  // Display buddy
  const speciesInfo = SEPHIROTIC_SPECIES[buddy.species];
  
  console.log(chalk.magenta(`Species: ${buddy.species}`));
  console.log(chalk.gray(`Sephirah: ${buddy.sephirah}`));
  console.log(chalk.gray(`Rarity: ${speciesInfo.rarity}`));
  console.log(chalk.gray(`Level: ${buddy.level}`));
  console.log(chalk.gray(`Evolution: ${buddy.evolution}`));
  console.log();
  
  console.log(chalk.cyan('Stats:'));
  console.log(chalk.gray(`  Wisdom:  ${'█'.repeat(buddy.stats.wisdom)}${'░'.repeat(10 - buddy.stats.wisdom)} ${buddy.stats.wisdom}/10`));
  console.log(chalk.gray(`  Chaos:   ${'█'.repeat(buddy.stats.chaos)}${'░'.repeat(10 - buddy.stats.chaos)} ${buddy.stats.chaos}/10`));
  console.log(chalk.gray(`  Snark:   ${'█'.repeat(buddy.stats.snark)}${'░'.repeat(10 - buddy.stats.snark)} ${buddy.stats.snark}/10`));
  console.log(chalk.gray(`  Mercy:   ${'█'.repeat(buddy.stats.mercy)}${'░'.repeat(10 - buddy.stats.mercy)} ${buddy.stats.mercy}/10`));
  console.log(chalk.gray(`  Judgment:${'█'.repeat(buddy.stats.judgment)}${'░'.repeat(10 - buddy.stats.judgment)} ${buddy.stats.judgment}/10`));
  console.log();
  
  console.log(chalk.yellow('Soul:'));
  console.log(chalk.gray(`  ${buddy.soul}`));
  console.log();
  
  console.log(chalk.gray(`Last interaction: ${buddy.lastFed}`));
  console.log();
  
  // Interaction options
  console.log(chalk.cyan('Interactions:'));
  console.log(chalk.gray('  lilith buddy feed     - Feed your buddy'));
  console.log(chalk.gray('  lilith buddy train    - Train a stat'));
  console.log(chalk.gray('  lilith buddy evolve   - Attempt evolution'));
  console.log(chalk.gray('  lilith buddy reset    - Generate new buddy'));
  console.log();
}