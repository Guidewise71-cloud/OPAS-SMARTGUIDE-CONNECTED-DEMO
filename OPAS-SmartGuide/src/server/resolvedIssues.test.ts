import { describe, expect, it } from 'vitest';
import { runApplicationErrorDetection, type OpasApplicationPayload } from './applicationErrorEngine.ts';
import { compareValidationResults } from './applicationValidationRoute.ts';

const NOW = new Date('2026-11-09T10:00:00.000Z');
const base = (): OpasApplicationPayload => ({
  referenceNumber: 'ZM-PAS-2026-RES1', applicationType: 'NEW', bookletType: '32_PAGE', processingSpeed: 'STANDARD',
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

describe('resolved issue comparison', () => {
  it('reports corrected errors as resolved', async () => {
    const bad = base();
    (bad.personalDetails as any).email = 'bad@@x';
    (bad.personalDetails as any).mobilePhone = '123';
    const first = await runApplicationErrorDetection(bad, { now: NOW });
    const second = await runApplicationErrorDetection(base(), { now: NOW });
    const c = compareValidationResults(first, second);
    expect(c.resolvedIssues.map(i => i.field)).toEqual(expect.arrayContaining(['personalDetails.email', 'personalDetails.mobilePhone']));
    expect(c.newIssues).toHaveLength(0);
    expect(c.remainingIssues).toHaveLength(0);
  });
  it('keeps unfixed errors as remaining and flags new ones', async () => {
    const a = base(); (a.personalDetails as any).email = 'bad@@x';
    const b = base(); (b.personalDetails as any).email = 'still@@bad'; (b.personalDetails as any).mobilePhone = '1';
    const c = compareValidationResults(await runApplicationErrorDetection(a, { now: NOW }), await runApplicationErrorDetection(b, { now: NOW }));
    expect(c.remainingIssues.some(i => i.field === 'personalDetails.email')).toBe(true);
    expect(c.newIssues.some(i => i.field === 'personalDetails.mobilePhone')).toBe(true);
  });
  it('returns empty comparison on first submission', async () => {
    const r = await runApplicationErrorDetection(base(), { now: NOW });
    expect(compareValidationResults(undefined, r).resolvedIssues).toEqual([]);
  });
});
