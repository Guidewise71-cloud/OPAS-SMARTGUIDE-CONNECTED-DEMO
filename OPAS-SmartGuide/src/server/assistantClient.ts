// Server-side client for the external assistant API (POST /api/assistant).
// This module reads ASSISTANT_API_KEY from the environment and must never be
// imported by React/browser code, or the key would be exposed to users.
//
// Configure in OPAS-SmartGuide/.env (git-ignored, never committed):
//   ASSISTANT_API_URL=https://<your-app-address>
//   ASSISTANT_API_KEY=<value from the dashboard Secrets page>

export interface AssistantReply {
  reply: string;
}

export interface AssistantClientOptions {
  apiUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class AssistantApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'AssistantApiError';
  }
}

export async function askAssistant(
  question: string,
  options: AssistantClientOptions = {},
): Promise<AssistantReply> {
  const apiUrl = options.apiUrl ?? process.env.ASSISTANT_API_URL;
  const apiKey = options.apiKey ?? process.env.ASSISTANT_API_KEY;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!apiUrl) {
    throw new AssistantApiError('ASSISTANT_API_URL is not configured.');
  }
  if (!apiKey) {
    throw new AssistantApiError('ASSISTANT_API_KEY is not configured.');
  }
  const trimmed = question?.trim();
  if (!trimmed) {
    throw new AssistantApiError('Question must not be empty.');
  }

  const response = await fetchImpl(`${apiUrl.replace(/\/$/, '')}/api/assistant`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ question: trimmed }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
  });

  const body = (await response.json().catch(() => null)) as Partial<AssistantReply> | null;

  if (!response.ok) {
    throw new AssistantApiError(`Assistant API request failed with status ${response.status}.`, response.status);
  }
  if (!body || typeof body.reply !== 'string') {
    throw new AssistantApiError('Assistant API returned an unexpected response.', response.status);
  }
  return { reply: body.reply };
}
