// Proves the Application Error Detection Engine detects errors and returns correction feedback,
// and that the signed HTTP route used by Simulated OPAS returns those results.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import {
  buildAiSummary,
  detectApplicationErrors,
  runApplicationErrorDetection,
  validateApplicationValidationRequest,
  type OpasApplicationPayload,
} from './applicationErrorEngine.ts';
import { createApplicationValidationHandler, latestValidationResults } from './applicationValidationRoute.ts';
import { signOpasRequest } from './opasPaymentIntegration.ts';

const NOW = new Date('2026-11-09T10:00:00.000Z');
const SECRET = 'local-test-integration-secret-with-more-than-32-characters';

/** A complete, correct adult NEW application: the engine must report nothing. */
const validApplication = (): OpasApplicationPayload => ({
  referenceNumber: 'ZM-PAS-2026-TEST01',
  applicationType: 'NEW',
  bookletType: '32_PAGE',
  processingSpeed: 'STANDARD',
  personalDetails: {
    surname: 'Banda', givenNames: 'Mwila Grace', gender: 'FEMALE', maritalStatus: 'SINGLE',
    dateOfBirth: '1995-04-12', placeOfBirthTown: 'Kabwe', placeOfBirthDistrict: 'Kabwe',
    placeOfBirthProvince: 'Central', nationality: 'Zambian', nrcNumber: '294812/11/1',
    village: 'Mwanachingwala', chief: 'Chief Mungule', districtOfOrigin: 'Chibombo',
    fatherFullName: 'Joseph Banda', motherFullName: 'Ruth Banda',
    residentialAddress: 'Plot 10, Independence Avenue', townCity: 'Lusaka', province: 'Lusaka',
    mobilePhone: '+260971234567', email: 'mwila.banda@example.com',
    emergencyName: 'Joseph Banda', emergencyPhone: '+260961234567', heightCm: 165,
  },
  documents: {
    nrcFrontBack: { name: 'nrc.pdf', type: 'application/pdf', sizeKb: 400 },
    birthCertificate: { name: 'birth.pdf', type: 'application/pdf', sizeKb: 400 },
    passportPhoto: { name: 'photo.jpg', type: 'image/jpeg', sizeKb: 300 },
  },
  declaration: { agreed: true, digitalSignature: 'Mwila Grace Banda' },
});

const codes = (app: OpasApplicationPayload) => detectApplicationErrors(app, NOW).map(i => i.code);

describe('Application Error Detection Engine: rules', () => {
  it('passes a complete, correct application with no issues', async () => {
    const result = await runApplicationErrorDetection(validApplication(), { now: NOW });
    expect(result.issues).toEqual([]);
    expect(result).toMatchObject({ status: 'PASSED', canProceed: true, errorCount: 0, firstErrorStep: null });
  });

  it('detects missing information and points to the exact field with a correction', () => {
    const app = validApplication();
    (app.personalDetails as any).surname = '';
    const issue = detectApplicationErrors(app, NOW).find(i => i.field === 'personalDetails.surname');
    expect(issue).toMatchObject({ category: 'MISSING_INFORMATION', severity: 'error', step: 2, stepName: 'Personal Details' });
    expect(issue?.correction).toMatch(/surname/i);
  });

  it('detects an invalid NRC, email and phone number', () => {
    const app = validApplication();
    Object.assign(app.personalDetails!, { nrcNumber: '294812111', email: 'not-an-email', mobilePhone: '12345' });
    expect(codes(app)).toEqual(expect.arrayContaining(['NRC_INVALID', 'EMAIL_INVALID', 'PHONE_INVALID']));
  });

  it('detects incomplete sections (category, declaration, signature)', () => {
    const app = validApplication();
    app.applicationType = undefined;
    app.declaration = { agreed: false, digitalSignature: '' };
    expect(codes(app)).toEqual(expect.arrayContaining(['CATEGORY_MISSING', 'DECLARATION_NOT_ACCEPTED', 'SIGNATURE_MISSING']));
  });

  it('detects date inconsistencies', () => {
    const future = validApplication();
    (future.personalDetails as any).dateOfBirth = '2030-01-01';
    expect(codes(future)).toContain('DOB_FUTURE');

    const fake = validApplication();
    (fake.personalDetails as any).dateOfBirth = '1995-02-30';
    expect(codes(fake)).toContain('DOB_INVALID');

    const renewal = validApplication();
    renewal.applicationType = 'RENEWAL';
    renewal.previousPassportDetails = { passportNumber: 'ZN123456', issueDate: '2020-05-01', expiryDate: '2019-05-01' };
    expect(codes(renewal)).toContain('EXPIRY_BEFORE_ISSUE');
  });

  it('flags suspicious data: parent NRC equal to applicant, signature mismatch, account mismatch', () => {
    const app = validApplication();
    (app.personalDetails as any).fatherNrc = '294812/11/1';
    app.declaration = { agreed: true, digitalSignature: 'Someone Else' };
    app.accountProfile = { nrcNumber: '111111/11/1', dateOfBirth: '1990-01-01' };
    expect(codes(app)).toEqual(expect.arrayContaining([
      'PARENT_NRC_SAME_AS_APPLICANT', 'SIGNATURE_NAME_MISMATCH', 'NRC_ACCOUNT_MISMATCH', 'DOB_ACCOUNT_MISMATCH',
    ]));
  });

  it('requires the police report for a lost passport', () => {
    const app = validApplication();
    app.applicationType = 'REPLACEMENT_LOST';
    app.previousPassportDetails = { passportNumber: 'ZN123456', issueDate: '2018-01-01', expiryDate: '2028-01-01' };
    expect(codes(app)).toEqual(expect.arrayContaining(['POLICE_REPORT_MISSING', 'LOSS_REASON_MISSING']));
  });
});

describe('Application Error Detection Engine: document validation', () => {
  it('reports missing required documents, including renewal and minor extras', () => {
    const app = validApplication();
    app.applicationType = 'RENEWAL';
    app.previousPassportDetails = { passportNumber: 'ZN123456', issueDate: '2016-01-01', expiryDate: '2026-01-01' };
    delete app.documents!.passportPhoto;
    const missing = detectApplicationErrors(app, NOW).filter(i => i.code === 'DOCUMENT_REQUIRED').map(i => i.field);
    expect(missing).toEqual(expect.arrayContaining(['documents.passportPhoto', 'documents.previousPassportScan']));

    const minor = validApplication();
    (minor.personalDetails as any).dateOfBirth = '2015-01-01';
    (minor.personalDetails as any).nrcNumber = '';
    const minorMissing = detectApplicationErrors(minor, NOW).filter(i => i.code === 'DOCUMENT_REQUIRED').map(i => i.field);
    expect(minorMissing).toContain('documents.parentsNrcOrAffidavit');
  });

  it('rejects wrong file types, PDF photos and renamed files', () => {
    const app = validApplication();
    app.documents!.nrcFrontBack = { name: 'nrc.docx', type: 'application/msword', sizeKb: 200 };
    app.documents!.passportPhoto = { name: 'photo.pdf', type: 'application/pdf', sizeKb: 200 };
    // Claims to be a PNG but the content is PDF bytes (%PDF -> JVBER).
    app.documents!.birthCertificate = { name: 'birth.png', type: 'image/png', dataUrl: 'data:image/png;base64,JVBERi0xLjQKJcfsj6IKMSAwIG9iago=' };
    expect(codes(app)).toEqual(expect.arrayContaining(['DOC_UNSUPPORTED_TYPE', 'DOC_PHOTO_MUST_BE_IMAGE', 'DOC_CONTENT_MISMATCH']));
  });

  it('warns about low-quality images and demo sample documents without blocking', () => {
    const app = validApplication();
    app.documents!.passportPhoto = { name: 'photo.jpg', type: 'image/jpeg', sizeKb: 5 };
    app.documents!.birthCertificate = { name: 'sample.svg', type: 'image/svg+xml', dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' };
    const issues = detectApplicationErrors(app, NOW).filter(i => i.step === 4);
    expect(issues.map(i => i.code)).toEqual(expect.arrayContaining(['DOC_LOW_QUALITY', 'DEMO_SAMPLE_DOCUMENT']));
    expect(issues.every(i => i.severity === 'warning')).toBe(true);
  });
});

describe('Application Error Detection Engine: result and AI-assisted checks', () => {
  it('fails the application, blocks payment and reports the first step to fix', async () => {
    const app = validApplication();
    (app.personalDetails as any).email = 'bad';
    app.declaration = { agreed: false, digitalSignature: 'Mwila Grace Banda' };
    const result = await runApplicationErrorDetection(app, { now: NOW });
    expect(result).toMatchObject({ status: 'FAILED', canProceed: false, firstErrorStep: 2 });
    expect(result.errorCount).toBeGreaterThanOrEqual(2);
    expect(result.issues.every(i => i.message && i.correction)).toBe(true);
    // Sorted by wizard step so the applicant fixes them in order.
    expect(result.issues.map(i => i.step)).toEqual([...result.issues.map(i => i.step)].sort((a, b) => a - b));
  });

  it('adds AI findings as non-blocking warnings', async () => {
    const result = await runApplicationErrorDetection(validApplication(), {
      now: NOW,
      aiChecker: async () => [{ field: 'personalDetails.placeOfBirthTown', step: 2, message: 'Kabwe is not in the stated district.', correction: 'Check the town and district.' }],
    });
    expect(result).toMatchObject({ status: 'PASSED_WITH_WARNINGS', canProceed: true, aiCheck: { performed: true, issuesFound: 1 } });
    expect(result.issues[0]).toMatchObject({ source: 'ai', severity: 'warning', code: 'AI_INCONSISTENCY' });
  });

  it('keeps working when the AI check fails or times out', async () => {
    const failing = await runApplicationErrorDetection(validApplication(), { now: NOW, aiChecker: async () => { throw new Error('quota'); } });
    expect(failing).toMatchObject({ status: 'PASSED', aiCheck: { performed: false } });
    const slow = await runApplicationErrorDetection(validApplication(), {
      now: NOW, aiTimeoutMs: 20, aiChecker: () => new Promise(resolve => setTimeout(() => resolve([]), 500)),
    });
    expect(slow.aiCheck.reason).toMatch(/timed out/);
  });

  it('never sends NRC numbers, contact details or document contents to the AI', () => {
    const summary = JSON.stringify(buildAiSummary(validApplication()));
    expect(summary).not.toContain('294812/11/1');
    expect(summary).not.toContain('+260971234567');
    expect(summary).not.toContain('example.com');
  });

  it('validates the request envelope', () => {
    expect(validateApplicationValidationRequest({}).ok).toBe(false);
    expect(validateApplicationValidationRequest({ application: { referenceNumber: '' } }).ok).toBe(false);
    expect(validateApplicationValidationRequest({ application: validApplication() }).ok).toBe(true);
  });
});

describe('POST /api/integration/opas/validate-application (Simulated OPAS -> engine)', () => {
  let server: Server;
  let baseUrl = '';

  beforeAll(async () => {
    const app = express();
    app.use(express.json({ limit: '10mb', verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
    app.post('/api/integration/opas/validate-application', createApplicationValidationHandler({
      getSecret: () => SECRET,
      now: () => NOW,
    }));
    await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', () => resolve()); });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

  const post = (body: unknown, secret = SECRET) => {
    const raw = JSON.stringify(body);
    const timestamp = String(Math.floor(NOW.getTime() / 1000));
    return fetch(`${baseUrl}/api/integration/opas/validate-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OPAS-Timestamp': timestamp, 'X-OPAS-Signature': signOpasRequest(secret, timestamp, raw) },
      body: raw,
    });
  };

  it('returns detected errors with correction feedback for a signed request', async () => {
    const application = validApplication();
    (application.personalDetails as any).mobilePhone = '12345';
    const res = await post({ application });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.result).toMatchObject({ applicationReference: 'ZM-PAS-2026-TEST01', status: 'FAILED', canProceed: false });
    expect(json.result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PHONE_INVALID', field: 'personalDetails.mobilePhone', step: 2, correction: expect.any(String) }),
    ]));
    expect(latestValidationResults.get('ZM-PAS-2026-TEST01')?.status).toBe('FAILED');
  });

  it('returns PASSED for a correct application', async () => {
    const json = await (await post({ application: validApplication() })).json();
    expect(json.result).toMatchObject({ status: 'PASSED', canProceed: true });
  });

  it('rejects unsigned or wrongly signed requests', async () => {
    const res = await post({ application: validApplication() }, 'a-different-secret-that-is-also-long-enough');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed request', async () => {
    const res = await post({ application: null });
    expect(res.status).toBe(400);
  });
});
