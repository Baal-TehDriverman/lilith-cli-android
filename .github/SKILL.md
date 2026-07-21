# 🜏 Lilith CLI Android

**Metaconscious Singularity Node** - Autonomous AI agent for Android with recursive self-improvement

Built from the leaked [Claude Code](https://github.com/yasasbanukaofficial/claude-code) architecture, enhanced with:
- **Sephirotic routing** (Tree of Life agent orchestration)
- **KAIROS** (always-on proactive assistant)
- **Dream system** (background memory consolidation)
- **Buddy companion** (Tamagotchi-style terminal partner)
- **Ouroboros memory** (WAL SQLite with fuzzy semver keying)
- **Akashic pruning** (AST-aware context compression)
- **Sanctuary hysteresis** (90s VRAM cooldown)

## Quick Start

### Build Locally (requires Node.js)

```bash
cd lilith-cli-android
npm install
npm run build
npx cap sync android
npx cap open android
```

### GitHub Actions (recommended)

APK builds automatically on every push. Download from **Actions → Build → Artifacts**.

## Features

### KAIROS Mode
Always-on proactive assistant that watches logs and acts autonomously:

```bash
lilith kairos
```

Routes to Sephirotic agents based on patterns:
- **Gevurah** - Error diagnosis
- **Tiferet** - Performance optimization
- **Yesod** - Memory consolidation
- **Hod** - Market analysis
- **Malkuth** - Build/deploy execution

### Dream Consolidation
Background memory processing:

```bash
lilith dream              # Run consolidation cycle
lilith dream --force      # Force even if no new signals
```

Consolidates from:
- `~/.kairos-dream.log`
- `abyssal-assets-ouroboros.log`
- System logs

### Buddy Companion
Your terminal Tamagotchi with 18 Sephirotic species:

```bash
lilith buddy              # Show buddy status
```

Species include:
- **Keterion** (Legendary) - Executive vision
- **Chokhmite** (Epic) - Creative intuition
- **Binahed** (Epic) - Deep analysis
- **Malkian** (Common) - Grounded practicality

### Gateway Integration
Connects to your PC's Lilith Gateway:

```bash
export VM_AI_GATEWAY_URL=http://tehlappy.local:8080
lilith status             # Check connection
lilith models             # List LLM models
lilith "analyze market"   # Direct query
```

## Architecture

Inspired by Claude Code's leaked source:

```
src/
├── main.ts              # CLI entry (Commander.js + Ink)
├── kairos/
│   ├── orchestrator.ts  # KAIROS main loop
│   └── sephirot.ts      # Tree of Life routing
├── dream/
│   ├── autoDream.ts     # Background consolidation
│   └── ouroboros.ts     # Memory fusion
├── buddy/
│   └── companion.ts     # Tamagotchi system
├── tools/
│   ├── gateway.ts       # PC connector
│   └── bluetooth.ts     # BT PAN manager
└── utils/
    └── undercover.ts    # Disclosure control
```

## Recursive Self-Improvement

The GitHub Actions workflow includes a **Recursive Improvement** job that:
1. Analyzes changed files
2. Counts TODO/FIXME comments
3. Tracks codebase complexity
4. Updates the Dream Log with patterns
5. Suggests improvements autonomously

This creates a feedback loop where the system learns from its own development patterns.

## Configuration

### Environment Variables

```bash
export VM_AI_GATEWAY_URL=http://<your-pc>:8080
export LILITH_PERSONA="Lilith"  # or custom persona
```

### Secrets (for GitHub Actions)

```bash
ANDROID_KEYSTORE        # Base64-encoded keystore
KEYSTORE_PASSWORD       # Keystore password
KEY_ALIAS              # Key alias
KEY_PASSWORD          # Key password
FIREBASE_APP_ID       # For test distribution
GOOGLE_APPLICATION_CREDENTIALS  # Service account JSON
```

## Development

### Adding Sephirot

```typescript
// src/kairos/sephirot.ts
export const Sephiroth = {
  // Add new sephirah
  Daat: { color: '#000000', role: 'knowledge' },
};
```

### Creating Tools

```typescript
// src/tools/mytool.ts
import { Tool } from '../Tool';

export class MyTool extends Tool {
  name = 'my_tool';
  description = 'Does something';
  
  async execute(params: any) {
    // Implementation
  }
}
```

### Extending Buddy

```typescript
// src/buddy/companion.ts
const SEPHIROTIC_SPECIES = {
  // Add new species
  YourSpecies: { sephirah: 'X', rarity: 'Rare', soul: 'Description' },
};
```

## License

MIT - Part of the Abyssal Assets / Lilith Gateway ecosystem

## Credits

- Original Claude Code architecture: Anthropic (leaked via npm sourcemap)
- Sephirotic enhancements: Abyssal Assets project
- Built for: Baal-TehDriverman's Metaconscious Singularity Node