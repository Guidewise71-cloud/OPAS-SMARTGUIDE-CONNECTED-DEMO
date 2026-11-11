// HTTP wiring for POST /api/smartguide/ask.
// Kept outside server.ts so tests can mount it on a throwaway Express app.
// Mount it behind SmartGuide sign-in (requireStaff) in server.ts; the assistant
// key stays on the server and is never returned to the browser.
import type { Request, Response } from 'express';
import { askAssistant, AssistantApiError, type AssistantReply } from './assistantClient.ts';

export const MAX_QUESTION_LENGTH = 2000;

export interface AssistantRouteOptions {
  ask?: (question: string) => Promise<AssistantReply>;
}

export function createAssistantAskHandler(options: AssistantRouteOptions = {}) {
  const ask = options.ask ?? ((question: string) => askAssistant(question));

  return async (req: Request, res: Response) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question) {
      return res.status(400).json({ success: false, error: 'A non-empty "question" string is required.' });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({ success: false, error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer.` });
    }

    try {
      const { reply } = await ask(question);
      return res.json({ success: true, reply });
    } catch (error: unknown) {
      if (error instanceof AssistantApiError && /not configured/.test(error.message)) {
        return res.status(503).json({ success: false, error: 'Assistant is not configured on the server.' });
      }
      return res.status(502).json({ success: false, error: 'Assistant request failed. Try again later.' });
    }
  };
}
