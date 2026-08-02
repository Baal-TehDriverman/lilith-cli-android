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
      const v = ctx.memory.get(String(key));
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
      ctx.memory.put(String(key), String(value));
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
