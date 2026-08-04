/**
 * Lilith Sovereign Agent — OpenAI-compatible Server
 * Pure Node http (zero deps). Serves:
 *   GET  /v1/models                    — model list
 *   POST /v1/chat/completions          — full agent loop (tool calling)
 *   GET  /health                       — liveness
 *
 * Any OpenAI-compatible client (curl, Hermes, custom code) can talk to it.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { LilithAgent, AgentConfig } from './core.js';
import { createMemoryStore } from './memory_hermes.js';

interface ServerOptions {
  host?: string;
  port?: number;
  agentCfg: AgentConfig;
  verbose?: boolean;
  memoryBackend?: string;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 10 * 1024 * 1024) {
        reject(new Error('body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, obj: unknown): void {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function startAgentServer(opts: ServerOptions): ReturnType<typeof createServer> {
  const { host = '127.0.0.1', port = 8765, agentCfg, verbose = false, memoryBackend } = opts;
  const sharedMemory = createMemoryStore(memoryBackend);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    try {
      // Health
      if (req.method === 'GET' && path === '/health') {
        sendJson(res, 200, { status: 'ok', service: 'lilith-agent' });
        return;
      }

      // Model list
      if (req.method === 'GET' && path === '/v1/models') {
        sendJson(res, 200, {
          object: 'list',
          data: [{ id: agentCfg.model, object: 'model', owned_by: 'lilith' }],
        });
        return;
      }

      // Chat completions — run the agent loop
      if (req.method === 'POST' && path === '/v1/chat/completions') {
        const raw = await readBody(req);
        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          sendJson(res, 400, { error: { message: 'invalid JSON body' } });
          return;
        }

        const userMessage = (payload.messages || [])
          .filter((m: any) => m.role === 'user')
          .map((m: any) => (typeof m.content === 'string' ? m.content : ''))
          .join('\n');

        if (!userMessage.trim()) {
          sendJson(res, 400, { error: { message: 'no user message in payload' } });
          return;
        }

        const agent = new LilithAgent({ ...agentCfg, verbose: verbose || !!payload.verbose }, sharedMemory);
        const result = await agent.run(userMessage);

        sendJson(res, 200, {
          id: `lilith-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: agentCfg.model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: result.answer },
              finish_reason: result.exhaustedBudget ? 'length' : 'stop',
            },
          ],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
          lilith_meta: {
            iterations: result.iterations,
            tool_calls: result.toolCalls,
          },
        });
        return;
      }

      sendJson(res, 404, { error: { message: `not found: ${req.method} ${path}` } });
    } catch (e: any) {
      sendJson(res, 500, { error: { message: e?.message || String(e) } });
    }
  });

  server.listen(port, host, () => {
    if (verbose) {
      console.log(`🜏 Lilith agent server on http://${host}:${port}`);
      console.log(`   model: ${agentCfg.model}`);
      console.log(`   POST /v1/chat/completions  (OpenAI-compatible)`);
    }
  });

  return server;
}
