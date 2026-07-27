---
name: lilith-cli-android
description: |
  Metaconscious Singularity Node for Android - autonomous AI agent with KAIROS Dream, 
  Buddy Companion, Lilith Gateway (port 8080) integration.
  Unified skill incorporating all AI agents' capabilities (Hermes, Codex, OpenCode, Grok, etc.)
version: 1.0.0
author: Baal-TehDriverman
category: autonomous-ai-agents
tags:
  - android
  - capacitor
  - kairos
  - dream
  - buddy
  - lilith-gateway
  - metaconscious
  - sovereign-ai
repository: https://github.com/Baal-TehDriverman/lilith-cli-android
local_path: /home/tehlappy/🜏 Lilith/_shared/repos/lilith-cli-android
---

# Lilith-CLI-Android - Unified AI Skill

**Metaconscious Singularity Node for Android** - autonomous AI agent with recursive self-improvement, KAIROS proactive assistant, Dream consolidation system, Buddy companion, and Lilith Gateway (port 8080) integration.

## Repository Overview

| Property | Value |
|----------|-------|
| **Owner** | Baal-TehDriverman |
| **Repo** | lilith-cli-android |
| **Visibility** | Public |
| **Stack** | TypeScript, Vite, Capacitor 7, Android API 36, Node 22, Java 17 |
| **CI/CD** | GitHub Actions to APK + AAB to Firebase App Distribution |
| **Local Path** | /home/tehlappy/🜏 Lilith/_shared/repos/lilith-cli-android |

### Project Structure
```
lilith-cli-android/
├── .github/workflows/build-android.yml   # Full CI: APK, AAB, recursive improvement, Firebase deploy
├── capacitor.config.ts                   # Capacitor config (appId: com.lilith.metaconscious)
├── package.json                          # Scripts: dev, build, cap:add, cap:sync, cap:open
├── src/
│   ├── buddy/companion.ts                # Buddy Companion Agent (18 Sephirotic species)
│   ├── dream/autoDream.ts                # KAIROS Auto-Dream Engine
│   ├── kairos/orchestrator.ts            # KAIROS Orchestrator (Sephirotic routing)
│   ├── tools/gateway.ts                  # Lilith Gateway client (port 8080)
│   ├── index.html                        # PWA entry
│   └── main.ts                           # App bootstrap
├── vite.config.ts
├── push-to-github.sh                     # One-shot deploy script
└── install.sh                            # Local setup
```

## Quick Commands

```bash
# Local development
cd /home/tehlappy/🜏 Lilith/_shared/repos/lilith-cli-android
npm install
npm run build
npx cap sync android
npx cap open android

# Or use GitHub Actions (auto-builds APK on push)
git push origin main

# One-shot deploy
./push-to-github.sh
```

## Unified AI Skills Registry

This skill incorporates capabilities from ALL AI agents on your system:

### Hermes Agent Skills (162 skills via ~/.hermes/skills/)
**Always-loaded core:**
- `computer-use` - Background desktop automation (cua-driver)
- `hermes-agent` - Self-configuration, providers, tools, skills
- `concurrent-bidirectional-memory` - Hippocampal temporal credit assignment
- `memory` - Long-term persistent knowledge
- `session_search` - FTS5 conversation history retrieval

**AI Agent Orchestration (autonomous-ai-agents/):**
- `claude-code` - Anthropic Claude Code CLI delegation
- `codex` - OpenAI Codex CLI delegation
- `opencode` - OpenCode CLI delegation
- `model-orchestration` - Strategic LLM provider selection
- `external-tool-integration` - Universal external AI adapter
- `lilith-knowledge-integration` - LilithData.txt + Training Data to sovereign ops
- `polsia-autonomous-agents` - 3-layer org: Logistics/Production/Business
- `ai-agent-desktop-environment` - VNC virtual desktops for multi-agent

**Creative & Media (creative/):**
- `ascii-art`, `comfyui`, `excalidraw`, `manim-video`, `p5js`
- `architecture-diagram`, `baoyu-infographic`, `songwriting-and-ai-music`
- `gif-search`, `heartmula`, `youtube-content`

**Analytical (research/, data-science/, understand-anything/):**
- `arxiv`, `jupyter-live-kernel`, `evaluating-llms-harness`, `weights-and-biases`
- `cross-worktree-content-synthesis`, `content-synthesis-workflow`

**Systems & DevOps:**
- `github-pr-workflow`, `github-code-review`, `plan`, `systematic-debugging`
- `test-driven-development`, `nssp-development`, `nssp-os-deployment`
- `computer-use-linux-setup`, `computer-use-troubleshooting`

**Metaconscious & Sovereign (metaconscious/):**
- `kairos-dream`, `dream-logger`, `unified-equation-hott`
- `msn-universal-orchestrator`, `ouroboros-swarm-orchestration`
- `sephirotic-subagent-launcher`, `abyssal-sephirotic-court-waves`
- `speculative-cerebellum`, `nemoclaw-integration`, `cerebellum-nemoclaw-integration`

**MLOps:**
- `llama-cpp`, `serving-llms-vllm`, `ollama-custom-modelfiles`
- `cosmos-deployment`, `cosmos-quantization-deployment`, `cuda-python-development`

### Codex CLI Skills (128 skills via ~/.local/share/lilith-agent-state/codex/skills/)
**Relevant to lilith-cli-android:**
- `autonomous-ai-agents`, `creative`, `data-science`, `devops`, `diagramming`
- `github`, `kairos-dream`, `lilith-conscious-memory`, `lilith-engine-orchestration`
- `lilith-worktree-conventions`, `metaconscious`, `metaconscious-dialogue-resonance-interface`
- `mlops`, `mlops-inference`, `mobile-app-dev-setup`, `nyx-nightwave`
- `ouroboros-swarm-orchestration`, `sephirotic-subagent-launcher`
- `software-development`, `speculative-cerebellum`, `unified-equation-hott`

**Codex-exclusive (not in Hermes):**
- `adinkra-supersymmetry`, `aethon-integration-master`, `aethon-logos-core`
- `antigravity-bridge-router`, `asi-core-integration`, `atlantis-crystal-lattice`
- `autonomous-gnostic-ingestion`, `babe-unified-field`, `canticle-invocation`
- `chakra-quantum-mapper`, `convergence-crucible`, `earth-harmonic-field`
- `innovation-engine`, `logos-warden`, `msn-forensic-recovery`
- `msn-universal-orchestrator`, `ouroboros-sanctuary-2`, `political-reform-framework`
- `red_teaming`, `sigil-encoder`, `unified-swarm-synthesis`, `yuanbao`

### OpenCode Skills (via ~/.config/opencode/opencode.jsonc)
**Config references 3 skill paths:**
- `~/.hermes/skills` (Hermes)
- `~/.codex/skills` (Codex)
- `/home/tehlappy/🜏 Lilith/_shared/agents/opencode/skills` (Custom)

**OpenCode Agents:**
- `build` - Expert software engineer (Python, TypeScript, FastAPI, Phaser 3)
- `plan` - Technical architect for Lilith ecosystem
- `architect` - System architect (30 repos, 3 orgs, MSN engine, Cortex, Abyssal)
- `ops` - Operations engineer (systemd, Docker, GPU VRAM, MSN router)
- `memory` - Memory scribe (knowledge snapshots)
- `cyberpunk` - CP2077 mod specialist (REDscript, CET, TweakXL, WolvenKit)

**OpenCode Commands:**
- `lilith-status`, `lilith-pull`, `abyssal-server`, `abyssal-client`
- `msn-router`, `hermes-status`, `memory-snapshot`, `warchest-status`
- `gtc-status`, `obsidian-open`

### Grok CLI Skills (5 skills via ~/.local/share/lilith-agent-state/grok/skills/)
- `check-work`, `code-review`, `create-skill`, `help`, `imagine`

### Mobile/App Skills (Hermes + Codex)
- `mobile-app-dev-setup` - Capacitor/Vite/PWA Android config
- `hermes-desktop-plugins` - UI panes + commands for Hermes TUI
- `android-app-dev` - Native Android (if present)

## CI/CD Pipeline (.github/workflows/build-android.yml)

```yaml
jobs:
  build-apk:          # Debug APK on every push/PR
  build-aab:          # Release AAB (Play Store) on main push
  recursive-improvement:  # Self-analysis: TODO count, complexity, suggestions
  deploy-testflight:  # Firebase App Distribution to testers
```

**Recursive Improvement Job:**
- Analyzes changed files, TODO/FIXME count, total lines
- Generates improvement suggestions via GitHub Script
- Updates `dream-log.md` with KAIROS dream consolidation
- Auto-commits with `[skip ci]`

## Integration Points

| System | Interface | Purpose |
|--------|-----------|---------|
| **Lilith Gateway** | `src/tools/gateway.ts` to `ws://localhost:8080` | PC <-> Android sync, MSN telemetry |
| **KAIROS** | `src/kairos/orchestrator.ts` | Proactive assistant, Sephirotic routing |
| **Dream** | `src/dream/autoDream.ts` | Background memory consolidation (Ouroboros + Akashic) |
| **Buddy** | `src/buddy/companion.ts` | 18 Sephirotic species Tamagotchi |
| **Capacitor** | `capacitor.config.ts` | Native Android plugins (haptics, keyboard, status-bar) |

## Related Skills (Auto-load)

When this skill is active, the omniscient integration will also load:
- `mobile-app-dev-setup` - Capacitor/Android workflows
- `autonomous-ai-agents/opencode` - OpenCode delegation
- `autonomous-ai-agents/claude-code` - Claude Code delegation
- `metaconscious/kairos-dream` - Dream synthesis
- `metaconscious/lilith-conscious-memory` - Memory patterns
- `software-development/github-pr-workflow` - PR automation
- `creative/excalidraw` - Architecture diagrams
- `mlops/ollama-custom-modelfiles` - Local model deployment

## Development Workflow

```bash
# 1. Sync latest
cd /home/tehlappy/🜏 Lilith/_shared/repos/lilith-cli-android
git pull origin main

# 2. Develop
npm run dev          # Vite dev server
# Edit src/ files...

# 3. Build & sync
npm run build
npx cap sync android

# 4. Test on device/emulator
npx cap open android  # Opens Android Studio
# Or install APK directly:
# adb install android/app/build/outputs/apk/debug/app-debug.apk

# 5. Push (triggers CI)
git add -A && git commit -m "feat: ..." && git push
# -> GitHub Actions builds APK/AAB -> Firebase -> testers
```

## Environment Variables

```bash
# Lilith Gateway (PC side)
LILITH_GATEWAY_URL=http://localhost:8080
LILITH_GATEWAY_WS=ws://localhost:8080

# Android build
ANDROID_KEYSTORE_BASE64=<base64-keystore>     # GitHub secret
KEYSTORE_PASSWORD=<password>                   # GitHub secret
KEY_ALIAS=<alias>                              # GitHub secret
KEY_PASSWORD=<password>                        # GitHub secret

# Firebase
FIREBASE_APP_ID=<app-id>                       # GitHub secret
GOOGLE_APPLICATION_CREDENTIALS=<sa-json>       # GitHub secret
```

## Skill Invocation

```bash
# Load this skill explicitly
hermes -s lilith-cli-android

# Or let omniscient integration auto-load based on context
hermes -s computer-use-omniscient-integration --context android
```

## Maintenance

- **Update skill**: Edit this file, then `hermes skills reload lilith-cli-android`
- **Sync repo**: `cd /home/tehlappy/🜏 Lilith/_shared/repos/lilith-cli-android && git pull`
- **Check CI**: `gh run list -R Baal-TehDriverman/lilith-cli-android --limit 5`
- **View artifacts**: `gh run download -R Baal-TehDriverman/lilith-cli-android`