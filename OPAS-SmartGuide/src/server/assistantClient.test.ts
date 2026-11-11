import { describe, expect, it } from 'vitest';
import type { Request, Response } from 'express';
import { askAssistant, AssistantApiError } from './assistantClient.ts';
import { createAssistantAskHandler } from './assistantRoute.ts';

const TEST_KEY = 'test-only-assistant-key';

describe('askAssistant', () => {
  it('posts the question with the x-api-key header and returns the reply', async () => {
    let captured: { url: string; init?: RequestInit } | undefined;
    const fakeFetch: typeof fetch = async (input, init) => {
      captured = { url: String(input), init };
      return new Response(JSON.stringify({ reply: 'Use the format +260XXXXXXXXX.' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    };

    const result = await askAssistant('  What phone format do you need?  ', {
      apiUrl: 'https://assistant.example.test/',
      apiKey: TEST_KEY,
      fetchImpl: fakeFetch,
    });

    expect(captured?.url).toBe('https://assistant.example.test/api/assistant');
    expect(captured?.init?.method).toBe('POST');
    const headers = new Headers(captured?.init?.headers);
    expect(headers.get('x-api-key')).toBe(TEST_KEY);
    expect(headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(String(captured?.init?.body))).toEqual({ question: 'What phone format do you need?' });
    expect(result).toEqual({ reply: 'Use the format +260XXXXXXXXX.' });
  });

  it('fails before making a request when the key or URL is missing', async () => {
    let called = false;
    const fakeFetch: typeof fetch = async () => {
      called = true;
      return new Response('{}', { status: 200 });
    };
    await expect(askAssistant('hi', { apiUrl: 'https://a.test', apiKey: '', fetchImpl: fakeFetch }))
      .rejects.toThrow('ASSISTANT_API_KEY is not configured');
    await expect(askAssistant('hi', { apiUrl: '', apiKey: TEST_KEY, fetchImpl: fakeFetch }))
      .rejects.toThrow('ASSISTANT_API_URL is not configured');
    expect(called).toBe(false);
  });

  it('throws AssistantApiError with the status on a non-2xx response', async () => {
    const fakeFetch: typeof fetch = async () => new Response('{"error":"bad key"}', { status: 401 });
    await expect(askAssistant('hi', { apiUrl: 'https://a.test', apiKey: TEST_KEY, fetchImpl: fakeFetch }))
      .rejects.toMatchObject({ name: 'AssistantApiError', status: 401 });
  });
});

function mockRes() {
  const res: { statusCode: number; body: unknown; status: (c: number) => any; json: (b: unknown) => any } = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return res;
}

describe('POST /api/smartguide/ask handler', () => {
  it('returns the assistant reply', async () => {
    const handler = createAssistantAskHandler({ ask: async (q) => ({ reply: `echo: ${q}` }) });
    const res = mockRes();
    await handler({ body: { question: 'hello' } } as Request, res as unknown as Response);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, reply: 'echo: hello' });
  });

  it('rejects an empty question with 400', async () => {
    const handler = createAssistantAskHandler({ ask: async () => ({ reply: 'x' }) });
    const res = mockRes();
    await handler({ body: { question: '   ' } } as Request, res as unknown as Response);
    expect(res.statusCode).toBe(400);
  });

  it('returns 503 when the assistant is not configured, without leaking details', async () => {
    const handler = createAssistantAskHandler({
      ask: async () => { throw new AssistantApiError('ASSISTANT_API_KEY is not configured.'); },
    });
    const res = mockRes();
    await handler({ body: { question: 'hi' } } as Request, res as unknown as Response);
    expect(res.statusCode).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('ASSISTANT_API_KEY');
  });

  it('returns 502 when the upstream call fails', async () => {
    const handler = createAssistantAskHandler({
      ask: async () => { throw new AssistantApiError('Assistant API request failed with status 500.', 500); },
    });
    const res = mockRes();
    await handler({ body: { question: 'hi' } } as Request, res as unknown as Response);
    expect(res.statusCode).toBe(502);
  });
});
