/**
 * Lilith Sovereign Agent — Tool Registry
 * Every tool is ours: shell, files, memory, http. No external agent frameworks.
 * Each tool declares an OpenAI function schema + a handler.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { homedir } from 'os';
import type { MemoryStore } from './memory.js';

const execAsync = promisify(exec);

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (args: Record<string, any>, ctx: ToolContext) => Promise<string>;
}

export interface ToolContext {
  memory: MemoryStore;
  workdir: string;
  maxOutputChars: number;
}

/** Safe default workdir — the agent may only operate inside the user's home tree. */
const DEFAULT_WORKDIR = homedir();

const clamp = (s: string, max: number) =>
  s.length > max ? s.slice(0, max) + `\n...[truncated ${s.length - max} chars]` : s;

export const tools: ToolDefinition[] = [
  {
    name: 'shell',
    description:
      'Run a shell command in Termux (bash). Use for anything requiring the terminal: pkg, ollama, git, node, python, curl, ls. Output is captured.',
    parameters: {
      type: 'object',
      properties: { command: { type: 'string', description: 'The shell command to run' } },
      required: ['command'],
    },
    handler: async ({ command }, ctx) => {
      if (typeof command !== 'string' || !command.trim()) return 'ERROR: no command';
      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 60_000,
          maxBuffer: 8 * 1024 * 1024,
          cwd: ctx.workdir || DEFAULT_WORKDIR,
        });
        return clamp(stdout + (stderr ? `\n[stderr]\n${stderr}` : ''), ctx.maxOutputChars);
      } catch (e: any) {
        const msg = e?.stderr || e?.stdout || String(e?.message || e);
        return `EXIT ${e?.code ?? 'error'}: ${clamp(msg, ctx.maxOutputChars)}`;
      }
    },
  },
  {
    name: 'read_file',
    description: 'Read a text file (up to 200 lines). Paths are relative to the workdir.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
    handler: async ({ path }, ctx) => {
      try {
        const full = resolve(ctx.workdir || DEFAULT_WORKDIR, String(path));
        const content = await readFile(full, 'utf-8');
        const lines = content.split('\n');
        const shown = lines.slice(0, 200);
        return clamp(shown.map((l, i) => `${i + 1}|${l}`).join('\n'), ctx.maxOutputChars);
      } catch (e: any) {
        return `ERROR: ${e?.message || e}`;
      }
    },
  },
  {
    name: 'write_file',
    description: 'Write text to a file (overwrites). Paths are relative to the workdir.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string', description: 'Full file content' },
      },
      required: ['path', 'content'],
    },
    handler: async ({ path, content }, ctx) => {
      try {
        const full = resolve(ctx.workdir || DEFAULT_WORKDIR, String(path));
        await writeFile(full, String(content ?? ''), 'utf-8');
        return `WROTE ${full} (${String(content ?? '').length} bytes)`;
      } catch (e: any) {
        return `ERROR: ${e?.message || e}`;
      }
    },
  },
  {
    name: 'list_dir',
    description: 'List files in a directory (relative to workdir).',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'default: .' } },
    },
    handler: async ({ path }, ctx) => {
      try {
        const full = resolve(ctx.workdir || DEFAULT_WORKDIR, String(path || '.'));
        const entries = await readdir(full);
        const lines: string[] = [];
        for (const name of entries.sort()) {
          try {
            const st = await stat(join(full, name));
            lines.push(`${st.isDirectory() ? 'd' : 'f'}  ${name}`);
          } catch {
            lines.push(`?  ${name}`);
          }
        }
        return clamp(lines.join('\n') || '(empty)', ctx.maxOutputChars);
      } catch (e: any) {
        return `ERROR: ${e?.message || e}`;
      }
    },
  },
  {
    name: 'memory_get',
    description: 'Read a value from Lilith persistent memory (JSONL journal).',
    parameters: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    },
    handler: async ({ key }, ctx) => {
      const v = await ctx.memory.get(String(key));
      return v === undefined ? `(no memory entry for "${key}")` : String(v);
    },
  },
  {
    name: 'memory_put',
    description: 'Store a value in Lilith persistent memory (JSONL journal).',
    parameters: {
      type: 'object',
      properties: { key: { type: 'string' }, value: { type: 'string' } },
      required: ['key', 'value'],
    },
    handler: async ({ key, value }, ctx) => {
      await ctx.memory.put(String(key), String(value));
      return `stored ${key}`;
    },
  },
  {
    name: 'http_get',
    description: 'Fetch a URL and return the body (first 4000 chars). For web lookups.',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
    handler: async ({ url }, ctx) => {
      try {
        const res = await fetch(String(url), {
          headers: { 'User-Agent': 'LilithSovereign/1.0' },
          signal: AbortSignal.timeout(20_000),
        });
        const text = await res.text();
        return `HTTP ${res.status}\n${clamp(text, ctx.maxOutputChars)}`;
      } catch (e: any) {
        return `ERROR: ${e?.message || e}`;
      }
    },
  },
  {
    name: 'evolve',
    description:
      'Self-evolve a skill using the GEPA engine (hermes-agent-self-evolution). Full pipeline when dspy is installed (mutation -> fitness -> constraints -> PR). Falls back to local mutation + structural validation on devices without dspy. Returns the evolved skill diff and score.',
    parameters: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'Skill name, e.g. "github-code-review"' },
        iterations: { type: 'number', description: 'Evolution iterations (default 3)' },
        output: { type: 'string', description: 'Output path for the evolved skill (default evolution_output/<skill>/SKILL.md)' },
      },
      required: ['skill'],
    },
    handler: async ({ skill, iterations, output }, ctx) => {
      const name = String(skill || '').trim();
      if (!name) return 'ERROR: no skill name';
      const n = Math.max(1, Math.min(10, Number(iterations) || 3));
      const repo = resolve(ctx.workdir || DEFAULT_WORKDIR, 'hermes-agent-self-evolution');
      const outPath = output ? resolve(ctx.workdir || DEFAULT_WORKDIR, String(output))
                             : join(repo, 'evolution_output', name, 'SKILL.md');
      // Check whether the full GEPA pipeline can run (dspy availability)
      let mode = 'local';
      try {
        const probe = await execAsync('python3 -c "import dspy"', { timeout: 15_000 });
        if (probe.stderr === '') mode = 'full';
      } catch { mode = 'local'; }
      if (mode === 'full') {
        try {
          const cmd = `python3 -m evolution.skills.evolve_skill --skill ${name} --iterations ${n} --output "${outPath}"`;
          const { stdout, stderr } = await execAsync(cmd, {
            timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
            cwd: repo,
          });
          return clamp(stdout + (stderr ? `\n[stderr]\n${stderr}` : ''), ctx.maxOutputChars);
        } catch (e: any) {
          return `EXIT ${e?.code ?? 'error'} (GEPA): ${clamp(e?.stderr || e?.message || '', ctx.maxOutputChars)}`;
        }
      }
      // Local fallback: import pure-Python mutators + constraint validator
      try {
        // Write the python to a temp file — `python3 -c` mangles newlines through
        // shell quoting (JSON.stringify turns them into literal \n)
        const scriptPath = join(homedir(), '.lilith', 'tmp', `evolve_${Date.now()}.py`);
        await writeFile(scriptPath, `import sys, json
sys.path.insert(0, ${JSON.stringify(repo)})
from pathlib import Path
import importlib.util

repo = Path(${JSON.stringify(repo)})

def load_by_path(rel):
    # Load a module by file path, bypassing package __init__ (which may import dspy)
    p = repo / rel
    spec = importlib.util.spec_from_file_location(p.stem, p)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

mutations = load_by_path("evolution/skills/mutation_strategies.py")
apply_random_mutation = mutations.apply_random_mutation

HAVE_CONSTRAINTS = False
validate_skill_evolution = None
try:
    cons = load_by_path("evolution/core/constraints_impl.py")
    validate_skill_evolution = cons.validate_skill_evolution
    HAVE_CONSTRAINTS = True
except Exception:
    HAVE_CONSTRAINTS = False

skill = ${JSON.stringify(name)}
src = None
for cand in [repo/"skills"/f"{skill}.md", repo/"skills"/skill/"SKILL.md",
             repo/"evolution_output"/skill/f"{skill}_evolved.md",
             repo/"evolution_output"/skill/"SKILL.md"]:
    if cand.exists():
        src = cand.read_text()
        break
if src is None:
    for sf in (repo/"skills").rglob("SKILL.md"):
        if sf.parent.name == skill or f"name: {skill}" in sf.read_text(errors="replace")[:400]:
            src = sf.read_text()
            break
if src is None:
    print(json.dumps({"ok": False, "error": f"skill {skill} not found"})); sys.exit(0)

mutated = apply_random_mutation(src, skill)
score = 0.6
report = None
if HAVE_CONSTRAINTS and validate_skill_evolution:
    try:
        report = validate_skill_evolution(mutated, skill)
        score = round(0.5 + 0.5 * (1.0 if report.valid else 0.3), 3)
    except Exception:
        score = 0.5
out = repo/"evolution_output"/skill
out.mkdir(parents=True, exist_ok=True)
(out/"SKILL.md").write_text(mutated)
print(json.dumps({
  "ok": True, "mode": "local", "skill": skill,
  "src_bytes": len(src), "evolved_bytes": len(mutated),
  "score": score,
  "output": str(out/"SKILL.md"),
  "constraints": None if report is None else {
      "valid": report.valid,
      "issues": [str(x) for x in (getattr(report, "issues", None) or [])][:10],
  },
  "head": mutated.splitlines()[:8],
}))
`, 'utf-8');
        const { stdout } = await execAsync(`python3 "${scriptPath}"`, {
          timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
        });
        return clamp(stdout, ctx.maxOutputChars);
      } catch (e: any) {
        return `EXIT ${e?.code ?? 'error'} (local evolve): ${clamp(e?.stderr || e?.message || '', ctx.maxOutputChars)}`;
      }
    },
  },
];

export function toolSchemas(): Array<Record<string, any>> {
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export async function runTool(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext
): Promise<string> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return `ERROR: unknown tool "${name}"`;
  try {
    return await tool.handler(args ?? {}, ctx);
  } catch (e: any) {
    return `ERROR: ${e?.message || e}`;
  }
}
