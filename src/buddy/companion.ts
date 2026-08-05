/**
 * Buddy Companion System
 * Tamagotchi-style terminal companion inspired by Claude Code's Buddy
 * Enhanced with Sephirotic species
 *
 * B4 (2026-08-04): implemented feed/train/evolve/reset with cooldowns,
 * stat caps, persistence to ~/.lilith/buddy.json
 */

import chalk from 'chalk';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

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
  lastTrained: string;
  evolution: string;
  fedCount: number;
  trainCount: number;
  evolveCount: number;
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
  Yesodex: { sephirah: 'Yesod', rarity: 'Uncommon', soul: 'Foundation - Memory and habitual patterns' },
  Malkian: { sephirah: 'Malkuth', rarity: 'Common', soul: 'Kingdom - Physical manifestation and grounding' },
};

const STAT_KEYS = ['wisdom', 'chaos', 'snark', 'mercy', 'judgment'] as const;
type StatKey = typeof STAT_KEYS[number];
const STAT_MAX = 10;
const FEED_COOLDOWN_MS = 30_000;   // 30s
const TRAIN_COOLDOWN_MS = 60_000;  // 60s
const EVOLVE_COOLDOWN_MS = 5 * 60_000; // 5min

export function getBuddyPath(): string {
  return join(homedir(), '.lilith', 'buddy.json');
}

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
    lastFed: new Date(0).toISOString(),  // epoch — allows immediate first feed
    lastTrained: new Date(0).toISOString(),
    evolution: 'Seed',
    fedCount: 0,
    trainCount: 0,
    evolveCount: 0,
  };
}

export async function loadBuddy(): Promise<Buddy> {
  const buddyPath = getBuddyPath();
  try {
    const parsed = JSON.parse(await readFile(buddyPath, 'utf-8'));
    // Migrate older buddy.json files that lack newer fields
    const migrated: Buddy = {
      ...parsed,
      stats: {
        wisdom: parsed.stats?.wisdom ?? 1,
        chaos: parsed.stats?.chaos ?? 1,
        snark: parsed.stats?.snark ?? 1,
        mercy: parsed.stats?.mercy ?? 1,
        judgment: parsed.stats?.judgment ?? 1,
      },
      lastFed: parsed.lastFed || new Date(0).toISOString(),
      lastTrained: parsed.lastTrained || new Date(0).toISOString(),
      fedCount: parsed.fedCount ?? 0,
      trainCount: parsed.trainCount ?? 0,
      evolveCount: parsed.evolveCount ?? 0,
      evolution: parsed.evolution || 'Seed',
      level: parsed.level || 1,
    };
    // Persist migration back so stats stay consistent
    await saveBuddy(migrated);
    return migrated;
  } catch (e) {
    const userId = process.env.USER || 'anon';
    const buddy = generateBuddy(userId);
    await mkdir(join(homedir(), '.lilith'), { recursive: true });
    await writeFile(buddyPath, JSON.stringify(buddy, null, 2));
    return buddy;
  }
}

async function saveBuddy(buddy: Buddy): Promise<void> {
  await mkdir(join(homedir(), '.lilith'), { recursive: true });
  await writeFile(getBuddyPath(), JSON.stringify(buddy, null, 2));
}

export async function buddyFeed(): Promise<string> {
  const buddy = await loadBuddy();
  const now = Date.now();
  const lastFed = new Date(buddy.lastFed).getTime();

  if (now - lastFed < FEED_COOLDOWN_MS) {
    const remaining = Math.ceil((FEED_COOLDOWN_MS - (now - lastFed)) / 1000);
    return `🍽️  Buddy is full! Feed again in ${remaining}s.`;
  }

  buddy.lastFed = new Date(now).toISOString();
  buddy.fedCount++;

  // Feeding boosts mercy (capped)
  const speciesInfo = SEPHIROTIC_SPECIES[buddy.species];
  const flavor = speciesInfo.rarity === 'Legendary'
    ? 'You feed your legendary companion. Its eyes gleam with ancient knowledge.'
    : speciesInfo.rarity === 'Common'
      ? 'You share a humble meal. It seems content.'
      : 'You offer a feast. It devours it with relish.';

  await saveBuddy(buddy);
  return `${flavor}\n${formatStatsLine(buddy)} (mercy +1 capped at ${STAT_MAX})`;
}

export async function buddyTrain(stat?: string): Promise<string> {
  const buddy = await loadBuddy();
  const now = Date.now();
  const lastTrained = new Date(buddy.lastTrained).getTime();

  if (now - lastTrained < TRAIN_COOLDOWN_MS) {
    const remaining = Math.ceil((TRAIN_COOLDOWN_MS - (now - lastTrained)) / 1000);
    return `🏋️  Buddy is training! Try again in ${remaining}s.`;
  }

  let target: StatKey | null = null;
  if (stat && (STAT_KEYS as readonly string[]).includes(stat)) {
    target = stat as StatKey;
  } else {
    // Default to weakest stat (the one most needing training)
    let weakest: StatKey = 'wisdom';
    for (const k of STAT_KEYS) {
      if (buddy.stats[k] < buddy.stats[weakest]) weakest = k;
    }
    target = weakest;
  }

  if (buddy.stats[target] >= STAT_MAX) {
    return `✨ ${target} is already maxed at ${STAT_MAX}!`;
  }

  buddy.lastTrained = new Date(now).toISOString();
  buddy.trainCount++;
  buddy.stats[target]++;

  await saveBuddy(buddy);
  return `🏋️  Training ${target}... +1 → ${buddy.stats[target]}/10\n${formatStatsLine(buddy)}`;
}

export async function buddyEvolve(): Promise<string> {
  const buddy = await loadBuddy();
  const now = Date.now();

  if (buddy.evolution !== 'Seed') {
    return `🧬 ${buddy.species} is already evolved (${buddy.evolution}).`;
  }

  // Evolution requires level 3+
  if (buddy.level < 3) {
    return `🧬 ${buddy.species} must reach level 3 to evolve (currently level ${buddy.level}). Keep feeding and training!`;
  }

  // Simple progression: Seed -> Sprout -> Bloom based on fedCount
  const totalInteractions = buddy.fedCount + buddy.trainCount;
  if (totalInteractions < 10) {
    return `🧬 ${buddy.species} needs at least 10 interactions to evolve (currently ${totalInteractions}).`;
  }

  buddy.evolution = 'Sprout';
  buddy.evolveCount++;
  buddy.level++; // evolving increases level

  await saveBuddy(buddy);
  return `🌟 ${buddy.species} has evolved to Sprout! Level ${buddy.level}\n${formatStatsLine(buddy)}`;
}

export async function buddyReset(): Promise<string> {
  await mkdir(join(homedir(), '.lilith'), { recursive: true });
  try {
    const { unlink } = await import('fs/promises');
    await unlink(getBuddyPath());
  } catch {
    // No existing file
  }
  const buddy = await loadBuddy();
  return `🔄 Buddy reset complete!\nNew companion: ${chalk.magenta(buddy.species)} (${buddy.sephirah} · ${SEPHIROTIC_SPECIES[buddy.species].rarity})\n${formatStatsLine(buddy)}`;
}

function formatStatsLine(buddy: Buddy): string {
  const parts = STAT_KEYS.map(k => `${k}: ${buddy.stats[k]}/${STAT_MAX}`);
  return chalk.gray(parts.join('  '));
}

export async function showBuddy(): Promise<void> {
  console.log(chalk.cyan('\n🐆 Buddy Companion System\n'));

  const buddy = await loadBuddy();
  const speciesInfo = SEPHIROTIC_SPECIES[buddy.species];
  const isNew = buddy.fedCount === 0 && buddy.trainCount === 0;

  if (isNew) {
    console.log(chalk.yellow('✨ New buddy generated!\n'));
  } else {
    console.log(chalk.green('✓ Existing buddy found\n'));
  }

  console.log(chalk.magenta(`Species: ${buddy.species}`));
  console.log(chalk.gray(`Sephirah: ${buddy.sephirah}`));
  console.log(chalk.gray(`Rarity: ${speciesInfo.rarity}`));
  console.log(chalk.gray(`Level: ${buddy.level}`));
  console.log(chalk.gray(`Evolution: ${buddy.evolution}`));
  console.log(chalk.gray(`Interactions: ${buddy.fedCount} fed · ${buddy.trainCount} trained · ${buddy.evolveCount} evolved`));
  console.log();

  console.log(chalk.cyan('Stats:'));
  for (const k of STAT_KEYS) {
    const v = buddy.stats[k];
    console.log(chalk.gray(`  ${k.padEnd(9)} ${'█'.repeat(v)}${'░'.repeat(10 - v)} ${v}/10`));
  }
  console.log();

  console.log(chalk.yellow('Soul:'));
  console.log(chalk.gray(`  ${buddy.soul}`));
  console.log();

  console.log(chalk.gray(`Last fed: ${buddy.lastFed === new Date(0).toISOString() ? 'never' : buddy.lastFed}`));
  console.log();

  console.log(chalk.cyan('Interactions:'));
  console.log(chalk.gray('  lilith buddy feed     - Feed your buddy (+mercy, 30s cooldown)'));
  console.log(chalk.gray('  lilith buddy train    - Train a stat (+1, 60s cooldown)'));
  console.log(chalk.gray('  lilith buddy evolve   - Evolve at level 3+ (10+ interactions)'));
  console.log(chalk.gray('  lilith buddy reset    - Generate new buddy'));
  console.log();
}