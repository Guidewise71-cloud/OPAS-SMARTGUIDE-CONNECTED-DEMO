// Registers the AI Application Filler API on the SmartGuide dev server.
//
// server.ts mounts Vite's middlewares inside Express in development, so this plugin's
// routes are served by the same SmartGuide server (port 3001) after express.json() has
// parsed the body. Like the local Simulated OPAS connector, the feature is development
// only: production builds do not include it.
//
//   POST /api/smartguide/application-prefill/chat          one conversation turn (Gemini)
//   POST /api/smartguide/application-prefill/send-to-opas  signed hand-off to Simulated OPAS
import type { Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  createRateLimiter,
  parsePrefillTurnRequest,
  runPrefillTurn,
  sanitizePrefillDraft,
  sendPrefillDraftToOpas,
} from './applicationPrefill.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const AI_TIMEOUT_MS = 25_000;

export function resolveSimulatedOpasBase(rawUrl: string | undefined, nodeEnv = process.env.NODE_ENV): string {
  const value = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!value) throw new Error('SIMULATED_OPAS_API_BASE_URL is not configured in OPAS-SmartGuide/.env.local.');
  if (nodeEnv === 'production') throw new Error('Sending drafts to the local Simulated OPAS is disabled in production.');
  const base = new URL(value);
  if (base.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(base.hostname) || base.username || base.password) {
    throw new Error('SIMULATED_OPAS_API_BASE_URL must point to a local HTTP development server.');
  }
  return base.origin;
}

function sendJson(res: any, status: number, payload: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

/** Uses the body parsed by express.json(); falls back to reading the stream. */
async function readJsonBody(req: any): Promise<unknown> {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await new Promise<string>((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      if (body.length < 60_000) body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', () => resolve(''));
  });
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('AI Request timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function applicationPrefillPlugin(): Plugin {
  const chatLimiter = createRateLimiter(30, 10 * 60 * 1000);
  const sendLimiter = createRateLimiter(5, 10 * 60 * 1000);

  return {
    name: 'smartguide-application-prefill',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: () => void) => {
        const url = (req.url || '').split('?')[0];
        const isChat = url === '/api/smartguide/application-prefill/chat';
        const isSend = url === '/api/smartguide/application-prefill/send-to-opas';
        if (!isChat && !isSend) return next();
        if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method not allowed.' });
        const clientKey = String(req.ip || req.socket?.remoteAddress || 'unknown');

        void (async () => {
          const body = await readJsonBody(req);

          if (isChat) {
            if (!chatLimiter(clientKey)) {
              return sendJson(res, 429, { success: false, error: 'Too many messages. Please wait a few minutes and try again.' });
            }
            const parsed = parsePrefillTurnRequest(body);
            if (!parsed.ok) return sendJson(res, 400, { success: false, error: parsed.error });
            const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
            if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
              return sendJson(res, 503, { success: false, error: 'SmartGuide AI is not configured. Add GEMINI_API_KEY to OPAS-SmartGuide/.env.local and restart.' });
            }
            try {
              const ai = new GoogleGenAI({ apiKey, vertexai: false });
              const result = await runPrefillTurn(async (prompt, systemInstruction) => {
                const response = await withTimeout(ai.models.generateContent({
                  model: GEMINI_MODEL,
                  contents: prompt,
                  config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.2 },
                }), AI_TIMEOUT_MS);
                return response.text || '';
              }, parsed.messages, parsed.draft);
              return sendJson(res, 200, { success: true, ...result });
            } catch (error) {
              console.error('[SmartGuide AI filler] chat turn failed:', error);
              return sendJson(res, 502, { success: false, error: 'SmartGuide could not reach the AI service. Please try again.' });
            }
          }

          if (!sendLimiter(clientKey)) {
            return sendJson(res, 429, { success: false, error: 'Too many forms sent. Please wait a few minutes and try again.' });
          }
          try {
            const base = resolveSimulatedOpasBase(process.env.SIMULATED_OPAS_API_BASE_URL);
            const draft = sanitizePrefillDraft((body as any)?.draft);
            const receipt = await sendPrefillDraftToOpas(base, process.env.OPAS_INTEGRATION_SECRET, draft);
            const publicBase = (process.env.SIMULATED_OPAS_PUBLIC_URL || base).trim().replace(/\/+$/, '');
            // Log only the code and field count, never personal data.
            console.log(`[SmartGuide AI filler] draft sent to Simulated OPAS: claim code ${receipt.claimCode}, ${receipt.filledFieldCount} fields`);
            return sendJson(res, 200, {
              success: true,
              ...receipt,
              claimUrl: `${publicBase}/?smartguidePrefill=${encodeURIComponent(receipt.claimCode)}`,
            });
          } catch (error) {
            console.error('[SmartGuide AI filler] send to OPAS failed:', error);
            const message = error instanceof Error ? error.message : 'Could not send the form to Simulated OPAS.';
            return sendJson(res, 502, { success: false, error: message });
          }
        })();
      });
    },
  };
}
