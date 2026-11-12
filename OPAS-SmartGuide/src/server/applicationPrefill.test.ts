import { describe, expect, it, vi } from 'vitest';
import {
  computeMissingPrefillFields,
  createRateLimiter,
  OPAS_PREFILL_PATH,
  parsePrefillTurnRequest,
  runPrefillTurn,
  sanitizePrefillDraft,
  sendPrefillDraftToOpas,
} from './applicationPrefill.ts';
import { signOpasRequest } from './opasPaymentIntegration.ts';

const SECRET = 'opas-smartguide-local-demo-shared-secret-change-before-production-2026';

describe('sanitizePrefillDraft', () => {
  it('keeps allow-listed fields, normalises NRC and enums, drops unknown and invalid values', () => {
    const draft = sanitizePrefillDraft({
      surname: '  Banda ',
      nrcNumber: '123456781',
      gender: 'female',
      dateOfBirth: '1996-02-30',
      heightCm: '172.4',
      province: 'Atlantis',
      isAdmin: true,
      hasPreviousPassport: false,
    });
    expect(draft).toEqual({ surname: 'Banda', nrcNumber: '123456/78/1', gender: 'FEMALE', heightCm: 172, hasPreviousPassport: false });
  });

  it('returns an empty draft for non-objects', () => {
    expect(sanitizePrefillDraft(null)).toEqual({});
    expect(sanitizePrefillDraft(['x'])).toEqual({});
  });
});

describe('computeMissingPrefillFields', () => {
  it('flags a malformed NRC as missing', () => {
    const missing = computeMissingPrefillFields({ surname: 'Banda', nrcNumber: '12345' }).map((f) => f.key);
    expect(missing).toContain('nrcNumber');
    expect(missing).not.toContain('surname');
  });
});

describe('parsePrefillTurnRequest', () => {
  it('requires an applicant message', () => {
    expect(parsePrefillTurnRequest({ messages: [{ role: 'assistant', text: 'hi' }] }).ok).toBe(false);
  });
  it('rejects overlong applicant messages', () => {
    expect(parsePrefillTurnRequest({ messages: [{ role: 'applicant', text: 'x'.repeat(1001) }] }).ok).toBe(false);
  });
});

describe('runPrefillTurn', () => {
  it('merges only sanitised model updates and reports changed fields', async () => {
    const generate = vi.fn().mockResolvedValue('```json\n{"updates":{"givenNames":"Chanda","bookletType":"standard_32","ssn":"x"},"reply":"Thanks Chanda."}\n```');
    const result = await runPrefillTurn(generate, [{ role: 'applicant', text: 'I am Chanda Banda' }], { surname: 'Banda' });
    expect(result.draft).toEqual({ surname: 'Banda', givenNames: 'Chanda', bookletType: 'STANDARD_32' });
    expect(result.updatedFields).toEqual(['givenNames', 'bookletType']);
    expect(result.reply).toBe('Thanks Chanda.');
    expect(generate.mock.calls[0][0]).toContain('Applicant: I am Chanda Banda');
  });

  it('falls back to a deterministic reply when the model output is not JSON', async () => {
    const result = await runPrefillTurn(async () => 'not json', [{ role: 'applicant', text: 'hello' }], {});
    expect(result.draft).toEqual({});
    expect(result.reply).toMatch(/surname and given names/);
  });
});

describe('sendPrefillDraftToOpas', () => {
  it('posts a correctly signed request and returns the claim code', async () => {
    const now = new Date('2026-11-12T08:00:00Z');
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, claimCode: 'ABCD-2345', expiresAt: '2026-11-13T08:00:00Z', filledFieldCount: 2 }), { status: 201 }));
    const receipt = await sendPrefillDraftToOpas('http://127.0.0.1:3000/', SECRET, { surname: 'Banda', evil: 'x' } as any, fetchImpl as any, now);
    expect(receipt.claimCode).toBe('ABCD-2345');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`http://127.0.0.1:3000${OPAS_PREFILL_PATH}`);
    const body = JSON.parse(init.body);
    expect(body.draft).toEqual({ surname: 'Banda' });
    const ts = init.headers['X-OPAS-Timestamp'];
    expect(init.headers['X-OPAS-Signature']).toBe(signOpasRequest(SECRET, ts, init.body));
  });

  it('refuses a short secret and an empty draft', async () => {
    await expect(sendPrefillDraftToOpas('http://127.0.0.1:3000', 'short', { surname: 'Banda' })).rejects.toThrow(/32 characters/);
    await expect(sendPrefillDraftToOpas('http://127.0.0.1:3000', SECRET, {})).rejects.toThrow(/name/);
  });

  it('surfaces the OPAS error message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Invalid signature.' }), { status: 401 }));
    await expect(sendPrefillDraftToOpas('http://127.0.0.1:3000', SECRET, { surname: 'Banda' }, fetchImpl as any)).rejects.toThrow(/Invalid signature/);
  });
});

describe('createRateLimiter', () => {
  it('blocks after the limit inside the window', () => {
    const allow = createRateLimiter(2, 1000);
    expect(allow('ip', 0)).toBe(true);
    expect(allow('ip', 10)).toBe(true);
    expect(allow('ip', 20)).toBe(false);
    expect(allow('ip', 1500)).toBe(true);
  });
});
