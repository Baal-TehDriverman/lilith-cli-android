# Lilith CLI — Hardening & Feature Expansion Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Harden the existing Lilith CLI (bug fixes, real functional KAIROS/Dream/Buddy, agent-loop polish, tests) AND ship the next wave of features (streaming, chat history, multi-turn agent sessions, more agent tools, NSSP mesh sync).

**Architecture:** Lilith CLI is a TypeScript program that bundles to a single CJS file (`dist/main.cjs`) via esbuild for Android/Termux, driven by Commander. The Lilith Sovereign Agent (`src/agent/`) is a zero-dependency ReAct loop (think→act→observe) with an OpenAI function-tool registry and a keyboardless OpenAI-compatible HTTP server. All work is done in `~/lilith-cli-android`, built with `npm run build:cli` and launched via `~/.bin/lilith`.

**Tech Stack:** Node ≥18, TypeScript 5.3, esbuild 0.23 (android-arm64), Commander 11, Chalk 5, Capacitor 5 (Android wrapper), node:test for unit tests, Ollama/NVIDIA NIM/OpenCode Zen as providers.

---

## Current State (verified 2026-08-03)

- 8 commands: `kairos`, `dream`, `buddy`, `status`, `models`, `undercover`, `agent`, `serve` + direct query + interactive `/` commands.
- Sovereign Agent: ReAct loop (`core.ts`), 7 tools (`tools.ts`: shell, read_file, write_file, list_dir, memory_get, memory_put, http_get), JSONL memory (`memory.ts`), OpenAI-compatible server (`server.ts`).
- KAIROS (`kairos/orchestrator.ts`): **stub** — 5s tick with Sephirotic display; no real log Watchdog, no memory monitoring, no routing execution.
- Dream (`dream/autoDream.ts`): scans 3 hardcoded log paths, appends to `~/.lilith/ouroboros/MEMORY.md`, simple last-1000-lines prune, archives full copy.
- Buddy (`buddy/companion.ts`): deterministic gacha generation + display only. `feed`/`train`/`evolve`/`reset` are printed as suggestions, **not implemented**.
- Provider registry (`tools/providers.ts`): multi-provider (local-ollama, pc-gateway, nvidia-nim, opencode-zen, custom), user config at `.lilith/providers.json` (gitignored).
- 3 uncommitted modified files: `src/main.ts`, `src/agent/tools.ts`, `dist/main.cjs`.

---

## Proposed Approach

Phase A hardens correctness first (tests + bug fixes + commit), then Phase B makes KAIROS/Dream/Buddy genuinely functional, Phase C adds new marquee features (streaming, chat history, multi-turn, extra tools, NSSP mesh sync), Phase D is docs/build/user experience polish. Each task is bite-sized with TDD cycle: write failing test → run to confirm failure → implement → run to confirm pass → commit.

Key hygiene: the agent uses native `fetch`, fs/promises, node:http — no new runtime deps needed. Unit tests use `node:test`. Because the CLI bundles to CJS for Termux, tests run against TS via a small esbuild/tsx harness or directly against `dist` — prefer `node --test` on a compiled test bundle to avoid ESM/CJS friction.

---

## Step-by-Step Plan

### Phase A — Hardening (Tests + Bug Fixes)

#### Task A1: Add test harness for the repo
**Objective:** Enable `node --test` unit tests without ESM/CJS friction.
- Create: `scripts/test-build.mjs` — esbuild-bundle `src/**` + `tests/**` into CJS, then run `node --test dist-test/*.test.cjs`.
- Add: `package.json` script `"test": "node scripts/test-build.mjs"`.
- Verify: `npm test` prints passing test count.

#### Task A2: Provider registry unit tests
- Create: `src/tools/__pycache__`…› tests at `tests/providers.test.ts`.
- Cover: `loadProviders` merging user override by name, default fallback, `getActiveProvider` active-fallback, `setActiveProvider`, `upsertProvider`, `saveProviders` write.
- Expected: all pass.

#### Task A3: Agent MemoryStore unit tests
- Cover: `put` then `get`, last-write-wins, snapshot, corrupt-line tolerance, directory creation.
- Verify: `npm test` green.

#### Task A4: Agent Tool registry tests
- Cover: `read_file`/`write_file`/`list_dir` round-trip in tmp workdir; `memory_get`/`memory_put`; `http_get` error path; unknown tool returns `ERROR: unknown tool`.
- Verify: green.

#### Task A5: Fix open correctness/robustness bugs in the agent loop
- `core.ts`: guard empty `tool_calls`, non-array, missing `function.name`; bail to final answer on repeated empty completions to avoid infinite loop.
- `server.ts`: default `host` should be configurable to `0.0.0.0` for LAN access; add `finish_reason: 'stop'` on clean stop.
- `gateway.ts` line 37: broken template literal `*** ? ...` — replace with `provider.apiKey ? 'SET' : 'none'`.
- Verify: `npm test` and manual `lilith agent "hello"` on local Ollama.

### Task A6: Commit phase A
```bash
git add -A
git commit -m "test: add unit test harness + provider/memory/tool tests, harden agent loop"
```

### Phase B — Make KAIROS / Dream / Buddy Functional

#### Task B1: KAIROS real log & memory watcher
**Objective:** Replace 5s stub with a genuine watcher over `~/.lilith/ouroboros/memory.jsonl` + a configurable log path list.
- Add `src/kairos/watcher.ts`: poll `memory.jsonl` tail (inode/mtime + lastLine), run `detectPattern(input)`, push matches to a queue.
- Add `src/kairos/router.ts`: dispatch queued patterns → route action (log, memory_put, optional `shell` action). Fails closed — never executes shell without explicit `--allow-actions`.
- Convert `orchestrator.ts` to use watcher; `routeToSephirot` now real.
- Tests: watcher detects appended lines; router maps pattern→sephirah.

#### Task B2: KAIROS integration + gateway alerting
- On match, optionally `POST /v1/chat/completions` via active provider to get a one-line summary; print or `/memory` entry.
- Verify: append an error line to `memory.jsonl`, watch KAIROS tick it.

#### Task B3: Dream — real consolidation from callback queue
- Replace hardcoded log paths with the `memory.jsonl` journal parse; consolidate into `MEMORY.md` with proper structured entries, not raw log lines.
- Implement determinism-friendly pruning (track lines consumed; write `.pruned` only when over a token budget via `estimateTokens`).
- Tests: seed journal → runDreamCycle → MEMORY.md has structured entries; no duplicates.

#### Task B4: Buddy — implement feed / train / evolve / reset
- Add subcommands to `buddy/companion.ts` and `main.ts`:
  - `feed`: `+1` to random stat, update `lastFed`, cap at 10. Cooldown.
  - `train <stat>`: target stat +1, spend cooldown.
  - `evolve`: level+1 when stats sum ≥ threshold; upgrades species/rarity once.
  - `reset`: regenerate.
- Tests: deterministic PRNG seed → expected stat deltas.

#### Task B5: Commit & Done (Phase G forward)
```bash
git add -A && git commit -m "feat: functional KAIROS watcher/router, Dream journal consolidation, Buddy feed/train/evolve/reset"
```

### Phase C — New Feature: Streaming, Chat History, Multi-turn, Extra Tools, Mesh Sync

#### Task C1: Streaming LLM responses (CLI + server)
- Agent core: add `stream: true` support that emits tokens to stdout; when `--stream`, avoid waiting for full JSON.
- Check tool-call responses still work when streaming.
- Tests: mock SSE, assert token emission + final assembly for non-tool answer. (Because live may be flaky, prefer a mock upstream.)

Note: many OpenAI-compatible OSS servers (Ollama) are streaming-only in some configs; fall back to non-stream when `stream:false` errors.

#### Task C2: Chat history / multi-turn in shell
- Add `--save`/`chat` mode in `main.ts`: maintain a `session.jsonl` under `~/.lilith/sessions/<ts>.jsonl`, reload on request, and treat multi-turn in `agent`.
- MemoryStore gains `appendSession`/`readRelevant`.

#### Task C3: Additional agent tools
- Add `search_files` (grep via `exec` `grep -rn`) that fall back gracefully when ripgrep missing.
- Add `http_post` mirror of `http_get`.
- Add `pexec` (`command; args[]`) safe command runner.
- Add `kill_process`? — likely second order; skip. Confirm intent.

#### Task C4: NSSP mesh sync (Lilith ↔ Hermes / Garuda PC)
- Add `mesh/` module: reads `$HOME/.nssp/mesh.json` (edge address), `POST /v1/sync` or use existing `serve` HTTP.
- Implement `clone` of memory topic: push `memory snapshot` with a `mesh-aware` field; accept `node_id`.
- Wire CLI `lilith mesh status`, `lilith mesh sync`.
- Note integration is bespoke to Lilith + `vm-ai-gateway`; mark as provisional.

#### Task C5: Commit & markdown verification
```bash
git add -A && git commit -m "feat: streaming, chat sessions, new tools, NSSP mesh sync"
```

---

### Phase D — Docs, Build, UX

#### Task D1: README + command documentation
- Update `README.md`: document `agent`, `serve`, `mesh`, `chat`, streaming flag, NSSP integration invariants.

#### Task D2: Build + dist hygiene
- Ensure shebang (`build-cli.mjs`) still targets Termux node path; re-run `npm run build:cli` after each task so `dist` stays fresh.
- Confirm `lilith.status` provider default matches.

#### Task D3: final end-to-end verification
- On Termux: `npm run build:cli`, then `lilith agent "hello"` (local Ollama), `lilith serve &`, `curl localhost:8765/v1/chat/completions`, plus a mesh sync run.

---

## Files Likely to Change (exact paths under `~/lilith-cli-android/`)

- `src/main.ts` — new commands (buddy subcommands, chat, mesh, stream flag), wiring
- `src/agent/core.ts` — streaming, multi-turn, robustness
- `src/agent/tools.ts` — new tools (search_files, http_post)
- `src/agent/memory.ts` — session journal
- `src/agent/server.ts` — streaming output, host config
- `src/tools/gateway.ts` — template-literal bug fix + streaming passthrough
- `src/tools/providers.ts` — minor
- `src/kairos/orchestrator.ts` — real watcher + router
- `src/kairos/watcher.ts`, `src/kairos/router.ts` — NEW
- `src/dream/autoDream.ts` — journal based consolidation
- `src/buddy/companion.ts` — lifecycle subcommands
- `src/mesh/sync.ts` — NEW (NSSP mesh)
- `tests/*` — new unit tests
- `scripts/test-build.mjs` — NEW test harness
- `package.json` — `test` script
- `dist/main.cjs` — regenerated bundle

---

## Tests / Validation

- `npm test` green at every phase gate.
- Manual Termux verification per task and final Phase D:
  - `lilith agent "hello"` against local Ollama (qwen2.5:1.5b)
  - `lilith status` / `lilith models`
  - `lilith serve --port 8763` then `curl localhost:8763/v1/chat/completions`
  - `kairos` watcher turns a new error line into a Sephiroth-tagged event (no action without `--allow-actions`)
  - Buddy feed/train/evolve writes `buddy.json`

---

## Key Risks & Tradeoffs

- **Live-streaming + Ollama:** Ollama may default to streaming; non-stream must be explicitly requested. Mitigate with fallback-to-non-stream on error.
- **Zero-dep constraint:** keep `node:test`; avoid new runtime deps for Termux arm64 to avoid build issues (matches esbuild `android-arm64` need).
- **mesh sync shape is bespoke:** mark NSSP sync provisional, isolate behind `mesh/` module, don't block other phases.
- **Security:** agent `shell` has full user privileges in Termux — never auto-run actions; KAIROS fails closed unless `--allow-actions`.
- **buddy PRNG determinism:** tests rely on fixed seed; keep `generateBuddy(userId)` deterministic.

## Open Questions

- Confirm streaming UX: is a `--no-stream` default preferable on mobile/Termux to keep latency predictable?
- Which addition —`search_files` vs `http_post` — is higher value; both included as cheap.
- Should KAIROS have a `--once` mode for cron (`lilith kairos --once`) vs an interactive run?

---

## Execution Handoff

Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed with Phase A?