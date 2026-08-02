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

export class LilithAgent {
  private cfg: AgentConfig;
  private memory: MemoryStore;
  private ctx: ToolContext;

  constructor(cfg: AgentConfig, memory?: MemoryStore) {
    this.cfg = {
      maxIterations: 10,
      maxOutputChars: 4000,
      temperature: 0.4,
      ...cfg,
    };
    this.memory = memory || new MemoryStore();
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

    for (iterations = 1; iterations <= this.cfg.maxIterations!; iterations++) {
      const completion = await this.complete(messages);
      const choice = completion.choices?.[0];
      const msg = choice?.message;
      if (!msg) {
        return {
          answer: `ERROR: empty completion (${completion.error?.message || 'unknown'})`,
          iterations,
          toolCalls,
          exhaustedBudget: false,
        };
      }

      const calls = msg.tool_calls || [];
      if (calls.length === 0) {
        // Final text answer
        finalAnswer = msg.content || '';
        break;
      }

      // Act: run each tool call
      messages.push({ role: 'assistant', content: msg.content || null, tool_calls: calls });
      for (const call of calls) {
        toolCalls++;
        let name = '';
        let args: Record<string, any> = {};
        try {
          name = call.function?.name || '';
          args = JSON.parse(call.function?.arguments || '{}');
        } catch {
          args = {};
        }
        if (this.cfg.verbose) {
          console.log(`  → ${name}(${JSON.stringify(args).slice(0, 120)})`);
        }
        const result = await runTool(name, args, this.ctx);
        messages.push({ role: 'tool', tool_call_id: call.id, content: result });
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
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.cfg.apiKey) headers['Authorization'] = `Bearer ${this.cfg.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({
        model: this.cfg.model,
        messages,
        tools: toolSchemas(),
        temperature: this.cfg.temperature,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { choices: [], error: { message: `HTTP ${res.status} ${body.slice(0, 200)}` } };
    }
    return res.json();
  }
}
