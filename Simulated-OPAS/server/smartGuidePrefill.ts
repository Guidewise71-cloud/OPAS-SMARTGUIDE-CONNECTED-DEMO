import type { Plugin } from 'vite';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * SmartGuide -> Simulated OPAS pre-fill bridge (local demonstration only).
 *
 * POST /api/integration/smartguide/prefill-drafts   (server-to-server, HMAC signed)
 *   Headers: X-OPAS-Timestamp, X-OPAS-Signature = HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
 *   Body:    { source, draft: { ...form fields }, createdAt }
 *   Returns: { success, claimCode, expiresAt, filledFieldCount }
 *
 * POST /api/smartguide-prefill/claim                 (browser, OPAS citizen dashboard)
 *   Body:    { code }
 *   Returns: { success, draft, filledFieldCount }    (single use; code is deleted on claim)
 *
 * The AI runs in OPAS SmartGuide. OPAS only receives the finished draft, re-validates it
 * against the same allow-list, and lets the applicant load it into a new application that
 * they must review before the declaration and payment.
 */

const PROVINCES = [
  'Lusaka', 'Copperbelt', 'Central', 'Southern', 'Eastern',
  'Western', 'Northern', 'Luapula', 'Muchinga', 'North-Western',
] as const;

const ENUM_FIELDS: Record<string, readonly string[]> = {
  applicationType: ['NEW', 'RENEWAL', 'REPLACEMENT_LOST'],
  bookletType: ['STANDARD_32', 'FREQUENT_48'],
  processingSpeed: ['STANDARD', 'EXPRESS', 'URGENT_24H'],
  gender: ['MALE', 'FEMALE'],
  maritalStatus: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
  citizenshipAcquiredBy: ['BIRTH', 'DESCENT', 'NATURALIZATION', 'REGISTRATION'],
  eyeColor: ['BROWN', 'BLACK', 'HAZEL', 'OTHER'],
  hairColor: ['BLACK', 'BROWN', 'GREY'],
  placeOfBirthProvince: [...PROVINCES, 'Abroad'],
  province: PROVINCES,
};

const TEXT_FIELDS = [
  'surname', 'givenNames', 'maidenName', 'placeOfBirthTown', 'placeOfBirthDistrict',
  'nationality', 'nrcNumber', 'village', 'chief', 'districtOfOrigin', 'fatherFullName',
  'fatherNrc', 'motherFullName', 'motherNrc', 'occupation', 'visibleMarks',
  'residentialAddress', 'townCity', 'mobilePhone', 'email', 'emergencyName',
  'emergencyRelation', 'emergencyPhone', 'emergencyAddress', 'previousPassportNumber',
  'lossReason', 'policeReportRef',
] as const;

const DATE_FIELDS = ['dateOfBirth', 'previousPassportIssueDate', 'previousPassportExpiryDate'] as const;
const NRC_FIELDS = new Set<string>(['nrcNumber', 'fatherNrc', 'motherNrc']);

export type PrefillDraft = Record<string, string | number | boolean>;

function normaliseNrc(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 9) return `${digits.slice(0, 6)}/${digits.slice(6, 8)}/${digits.slice(8)}`;
  return value;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Same allow-list as SmartGuide: OPAS never trusts the incoming draft blindly. */
export function sanitizePrefillDraft(input: unknown): PrefillDraft {
  const out: PrefillDraft = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  const src = input as Record<string, unknown>;
  for (const key of TEXT_FIELDS) {
    const raw = src[key];
    if (typeof raw !== 'string' && typeof raw !== 'number') continue;
    let value = String(raw).replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!value) continue;
    if (NRC_FIELDS.has(key)) value = normaliseNrc(value);
    out[key] = value;
  }
  for (const key of DATE_FIELDS) {
    const raw = src[key];
    if (typeof raw === 'string' && isValidIsoDate(raw.trim())) out[key] = raw.trim();
  }
  for (const [key, allowed] of Object.entries(ENUM_FIELDS)) {
    const raw = src[key];
    if (typeof raw !== 'string') continue;
    const match = allowed.find((option) => option.toLowerCase() === raw.trim().toLowerCase());
    if (match) out[key] = match;
  }
  const height = Number(src.heightCm);
  if (src.heightCm !== undefined && src.heightCm !== null && src.heightCm !== '' && Number.isFinite(height) && height >= 50 && height <= 250) {
    out.heightCm = Math.round(height);
  }
  if (typeof src.hasPreviousPassport === 'boolean') out.hasPreviousPassport = src.hasPreviousPassport;
  return out;
}

export function verifySmartGuideSignature(
  secret: string,
  rawBody: string,
  timestampHeader: string | undefined,
  signatureHeader: string | undefined,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  if (!secret || secret.length < 32) return { ok: false, reason: 'OPAS_INTEGRATION_SECRET is not configured on Simulated OPAS.' };
  if (!rawBody || !timestampHeader || !signatureHeader) return { ok: false, reason: 'Missing signature headers or body.' };
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: 'Invalid timestamp.' };
  if (Math.abs(Math.floor(now.getTime() / 1000) - timestamp) > 300) return { ok: false, reason: 'Request timestamp is outside the 5-minute window.' };
  const expected = createHmac('sha256', secret).update(`${timestampHeader}.${rawBody}`).digest('hex');
  const given = String(signatureHeader).trim().toLowerCase();
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return { ok: false, reason: 'Invalid signature.' };
  }
  return { ok: true };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export function generateClaimCode(): string {
  let code = '';
  for (let i = 0; i < 8; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normaliseClaimCode(value: unknown): string {
  const raw = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : '';
}

type StoredDraft = { claimCode: string; draft: PrefillDraft; source: string; createdAt: string; expiresAt: string };

export class PrefillDraftStore {
  private drafts = new Map<string, StoredDraft>();

  constructor(private readonly filePath?: string) {
    if (filePath && existsSync(filePath)) {
      try {
        const rows = JSON.parse(readFileSync(filePath, 'utf8')) as StoredDraft[];
        for (const row of Array.isArray(rows) ? rows : []) this.drafts.set(row.claimCode, row);
      } catch {
        /* corrupt local file: start empty */
      }
    }
  }

  private persist() {
    if (!this.filePath) return;
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify([...this.drafts.values()], null, 2));
  }

  private purgeExpired(now: number) {
    for (const [code, row] of this.drafts) if (Date.parse(row.expiresAt) <= now) this.drafts.delete(code);
  }

  add(draft: PrefillDraft, source: string, now = new Date()): StoredDraft {
    this.purgeExpired(now.getTime());
    let claimCode = generateClaimCode();
    while (this.drafts.has(claimCode)) claimCode = generateClaimCode();
    const row: StoredDraft = {
      claimCode,
      draft,
      source: source.slice(0, 60),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + DRAFT_TTL_MS).toISOString(),
    };
    this.drafts.set(claimCode, row);
    this.persist();
    return row;
  }

  /** Single use: returns the draft and deletes it. */
  claim(code: string, now = new Date()): StoredDraft | null {
    this.purgeExpired(now.getTime());
    const row = this.drafts.get(code) || null;
    if (row) {
      this.drafts.delete(code);
      this.persist();
    }
    return row;
  }
}

function sendJson(res: any, status: number, payload: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

function readBody(req: any, limit: number): Promise<string | null> {
  return new Promise((resolve) => {
    let body = '';
    let tooLarge = false;
    req.on('data', (chunk: Buffer) => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > limit) tooLarge = true;
    });
    req.on('end', () => resolve(tooLarge ? null : body));
    req.on('error', () => resolve(null));
  });
}

export function smartGuidePrefillPlugin(integrationSecret: string, dataDir: string): Plugin {
  const store = new PrefillDraftStore(path.join(dataDir, 'smartguide-prefill-drafts.json'));
  const claimAttempts = new Map<string, number[]>();

  const allowClaimAttempt = (key: string) => {
    const now = Date.now();
    const recent = (claimAttempts.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (recent.length >= 10) {
      claimAttempts.set(key, recent);
      return false;
    }
    recent.push(now);
    claimAttempts.set(key, recent);
    return true;
  };

  return {
    name: 'opas-smartguide-prefill',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];

        if (url === '/api/integration/smartguide/prefill-drafts') {
          if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method not allowed.' });
          void (async () => {
            const rawBody = await readBody(req, 50_000);
            if (rawBody === null) return sendJson(res, 413, { success: false, error: 'Draft is too large.' });
            const check = verifySmartGuideSignature(
              integrationSecret,
              rawBody,
              req.headers['x-opas-timestamp'] as string | undefined,
              req.headers['x-opas-signature'] as string | undefined,
            );
            if (!check.ok) return sendJson(res, 401, { success: false, error: check.reason });
            let payload: any;
            try {
              payload = JSON.parse(rawBody);
            } catch {
              return sendJson(res, 400, { success: false, error: 'Body must be valid JSON.' });
            }
            const draft = sanitizePrefillDraft(payload?.draft);
            if (!draft.surname && !draft.givenNames) {
              return sendJson(res, 400, { success: false, error: 'The draft must contain at least the applicant name.' });
            }
            const row = store.add(draft, typeof payload?.source === 'string' ? payload.source : 'OPAS SmartGuide');
            console.log(`[SmartGuide prefill] draft received, claim code ${row.claimCode}, ${Object.keys(draft).length} fields`);
            return sendJson(res, 201, {
              success: true,
              claimCode: row.claimCode,
              expiresAt: row.expiresAt,
              filledFieldCount: Object.keys(draft).length,
            });
          })();
          return;
        }

        if (url === '/api/smartguide-prefill/claim') {
          if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method not allowed.' });
          void (async () => {
            const ip = req.socket?.remoteAddress || 'unknown';
            if (!allowClaimAttempt(ip)) {
              return sendJson(res, 429, { success: false, error: 'Too many attempts. Please wait a few minutes and try again.' });
            }
            const rawBody = await readBody(req, 2_000);
            let code = '';
            try {
              code = normaliseClaimCode(JSON.parse(rawBody || '{}')?.code);
            } catch {
              /* handled below */
            }
            if (!code) return sendJson(res, 400, { success: false, error: 'Enter the 8-character code from SmartGuide (e.g. ABCD-2345).' });
            const row = store.claim(code);
            if (!row) {
              return sendJson(res, 404, { success: false, error: 'This code is not valid, was already used, or has expired. Ask SmartGuide to send your form again.' });
            }
            return sendJson(res, 200, {
              success: true,
              draft: row.draft,
              source: row.source,
              filledFieldCount: Object.keys(row.draft).length,
            });
          })();
          return;
        }

        next();
      });
    },
  };
}
