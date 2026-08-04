/**
 * Lilith Sovereign Agent — Core Loop
 * Think → Act → Observe (ReAct). The model emits tool_calls; we execute them
 * against the tool registry and feed observations back, until the model
 * returns a final text answer or the iteration budget is exhausted.
 *
 * LLM-agnostic: talks to any OpenAI-compatible /chat/completions endpoint
 * (our own server, Ollama, NVIDIA NIM, OpenCode Zen).
 */

import { toolSchemas, runTool, ToolContext } from './tools.js';
import { MemoryStore } from './memory.js';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';

// Slow CPU edge models (qwen2.5:1.5b on SD865) can take 2-5min per completion.
// Node's fetch/undici has a hard ~300s headersTimeout that can't be raised without
// importing undici directly. Using http(s).request instead gives full timeout
// control with zero extra deps (respects the agent/ zero-dep constraint).

interface LLMResponse { choices?: Array<{ message?: { content?: string; tool_calls?: any[] } }>; }

function postJSON(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<LLMResponse> {
  const u = new URL(url);
  const isHttps = u.protocol === 'https:';
  const mod: typeof httpRequest = (isHttps ? httpsRequest : httpRequest) as typeof httpRequest;
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = mod(
      {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let raw = '';
        res.on('data', (c: Buffer) => { raw += c; });
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 300)}`));
              return;
            }
            resolve(JSON.parse(raw) as LLMResponse);
          } catch (e: any) {
            reject(new Error(`bad JSON from ${url}: ${e?.message}`));
          }
        });
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`LLM timeout after ${timeoutMs}ms`)));
    req.on('error', (e: Error) => reject(e));
    req.write(data);
    req.end();
  });
}

export interface AgentConfig {
  baseUrl: string;      // OpenAI-compatible endpoint, e.g. http://127.0.0.1:11434/v1
  apiKey?: string | null;
  model: string;        // e.g. qwen2.5:1.5b
  systemPrompt: string;
  maxIterations?: number;
  maxOutputChars?: number;
  workdir?: string;
  verbose?: boolean;
  temperature?: number;
  llmTimeoutMs?: number; // per-call timeout; default 180s, raise for slow CPU edge models
}

export interface AgentResult {
  answer: string;
  iterations: number;
  toolCalls: number;
  exhaustedBudget: boolean;
}

const DEFAULT_SYSTEM =
  'You are Lilith, a sovereign agent running on an edge node. You think step by step ' +
  'and use tools to accomplish tasks. When you need information or an action, call a tool. ' +
  'When the task is done, reply to the user with a concise final answer. Keep tool arguments ' +
  'valid JSON. Never fabricate tool output.';

/** Structural memory interface — any store implementing get/put/snapshot works. */
export interface AgentMemory {
  get(key: string): Promise<string | undefined>;
  put(key: string, value: string): Promise<void>;
  snapshot(): Promise<Record<string, string>>;
}

export class LilithAgent {
  private cfg: AgentConfig;
  private memory: AgentMemory;
  private ctx: ToolContext;

  constructor(cfg: AgentConfig, memory?: AgentMemory) {
    this.cfg = {
      maxIterations: 10,
      maxOutputChars: 4000,
      temperature: 0.4,
      ...cfg,
    };
    this.memory = memory || new MemoryStore() as AgentMemory;
    this.ctx = {
      memory: this.memory,
      workdir: this.cfg.workdir || process.env.HOME || '.',
      maxOutputChars: this.cfg.maxOutputChars!,
    };
  }

  async run(userInput: string): Promise<AgentResult> {
    const messages: any[] = [
      { role: 'system', content: this.cfg.systemPrompt || DEFAULT_SYSTEM },
      { role: 'user', content: userInput },
    ];

    let toolCalls = 0;
    let finalAnswer = '';
    let exhaustedBudget = false;
    let iterations = 0;
    let emptyCompletions = 0;

    for (iterations = 1; iterations <= this.cfg.maxIterations!; iterations++) {
      const completion = await this.complete(messages);
      const choice = completion.choices?.[0];
      const msg = choice?.message;
      if (!msg) {
        // Empty completion — could be timeout, rate limit, or transient error.
        // Bail after 2 consecutive empty completions to avoid a hung loop.
        emptyCompletions++;
        if (emptyCompletions >= 2) {
          return {
            answer: `ERROR: repeated empty completions (${completion.error?.message || 'unknown'})`,
            iterations,
            toolCalls,
            exhaustedBudget: false,
          };
        }
        // Inject a system note and retry (model may recover)
        messages.push({ role: 'system', content: `[internal: previous completion was empty — retry]` });
        continue;
      }
      emptyCompletions = 0; // reset on success

      // Guard: tool_calls must be an array (some models return null/undefined)
      const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
      if (calls.length === 0) {
        // Final text answer
        finalAnswer = msg.content || '';
        break;
      }

      // Act: run each tool call (guard against malformed call objects)
      messages.push({ role: 'assistant', content: msg.content || null, tool_calls: calls });
      for (const call of calls) {
        toolCalls++;
        let name = '';
        let args: Record<string, any> = {};
        try {
          name = call?.function?.name || '';
          if (!name) {
            messages.push({ role: 'tool', tool_call_id: call?.id || 'unknown', content: 'ERROR: tool call missing function name' });
            continue;
          }
          args = JSON.parse(call?.function?.arguments || '{}');
        } catch {
          args = {};
        }
        if (this.cfg.verbose) {
          console.log(`  → ${name}(${JSON.stringify(args).slice(0, 120)})`);
        }
        const result = await runTool(name, args, this.ctx);
        messages.push({ role: 'tool', tool_call_id: call?.id || 'unknown', content: result });
      }
    }

    if (iterations > this.cfg.maxIterations!) {
      exhaustedBudget = true;
      if (!finalAnswer) {
        finalAnswer =
          '(iteration budget exhausted — task may be incomplete; see tool activity above)';
      }
    }

    return {
      answer: finalAnswer || '(no final answer produced)',
      iterations: Math.min(iterations, this.cfg.maxIterations!),
      toolCalls,
      exhaustedBudget,
    };
  }

  private async complete(messages: any[]): Promise<any> {
    const base = this.cfg.baseUrl.replace(/\/$/, '');
    const url = base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    const headers: Record<string, string> = {};
    if (this.cfg.apiKey) headers['Authorization'] = `Bearer ${this.cfg.apiKey}`;

    try {
      return await postJSON(
        url,
        headers,
        {
          model: this.cfg.model,
          messages,
          tools: toolSchemas(),
          temperature: this.cfg.temperature,
          max_tokens: 1024,
          stream: false,
        },
        this.cfg.llmTimeoutMs ?? 300_000
      );
    } catch (e: any) {
      return {
        choices: [],
        error: { message: e?.message || String(e) },
      };
    }
  }
}
