// Runtime validation coverage for applicant identity and contact validation.
import { describe, expect, it } from 'vitest';
import { detectApplicationFormIssues, validateEmail, validateNRC } from './validation';

describe('applicant validation', () => {
  it('accepts a correctly formatted Zambian NRC', () => {
    expect(validateNRC('294812/11/1')).toEqual({ isValid: true });
  });

  it('rejects an incorrectly formatted NRC', () => {
    expect(validateNRC('294812111').isValid).toBe(false);
  });

  it('warns about a common email-domain typo', () => {
    expect(validateEmail('applicant@gamil.com')).toMatchObject({
      isValid: true,
      warning: 'Did you mean @gmail.com instead of @gamil.com?',
    });
  });

  it('detects missing application details and required documents', () => {
    const issues = detectApplicationFormIssues({
      fullName: '',
      nrcNumber: '',
      dateOfBirth: '',
      applicantType: 'Adult (16+ years)',
      filingOnBehalf: 'No (Self-Application)',
      serviceType: 'New Ordinary Passport (32 Pages)',
      phone: '',
      phoneCountryCode: '+260',
      email: '',
      residentialCountry: 'Zambia',
      residentialProvince: 'Lusaka Province',
      residentialDistrict: 'Lusaka',
      residentialAreaVillage: 'Woodlands',
      residentialPlotStreet: '',
      sameAsResidential: true,
      postalCountry: 'Zambia',
      postalProvince: 'Lusaka Province',
      postalDistrict: 'Lusaka',
      postalAreaVillage: 'Woodlands',
      postalPoBox: '',
      photoUploaded: false,
      nrcDocUploaded: false,
      serviceDocs: [],
      guarantorName: '',
      guarantorNrc: '',
    });

    expect(issues.map(({ field }) => field)).toEqual(expect.arrayContaining([
      'Full legal name', 'Green NRC number', 'Date of birth', 'Phone number',
      'Email address', 'Residential plot or street', 'Passport-size photo',
      'NRC copy', 'Guarantor name', 'Guarantor NRC',
    ]));
    expect(issues.every(({ severity }) => severity === 'error')).toBe(true);
  });

  it('flags rejected documents and age mismatches as blocking issues', () => {
    const issues = detectApplicationFormIssues({
      fullName: 'Test Applicant',
      nrcNumber: '294812/11/1',
      dateOfBirth: '2015-01-01',
      applicantType: 'Adult (16+ years)',
      filingOnBehalf: 'No (Self-Application)',
      serviceType: 'New Ordinary Passport (32 Pages)',
      phone: '+260977451290',
      phoneCountryCode: '+260',
      email: 'test@example.com',
      residentialCountry: 'Zambia',
      residentialProvince: 'Lusaka Province',
      residentialDistrict: 'Lusaka',
      residentialAreaVillage: 'Woodlands',
      residentialPlotStreet: 'Plot 10',
      sameAsResidential: true,
      postalCountry: 'Zambia',
      postalProvince: 'Lusaka Province',
      postalDistrict: 'Lusaka',
      postalAreaVillage: 'Woodlands',
      postalPoBox: '',
      photoUploaded: true,
      nrcDocUploaded: true,
      serviceDocs: [{ type: 'Birth certificate', uploaded: true, status: 'REJECTED' }],
      guarantorName: 'Test Guarantor',
      guarantorNrc: '102948/11/1',
    });

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'Applicant classification', severity: 'error' }),
      expect.objectContaining({ field: 'Birth certificate', severity: 'error' }),
    ]));
  });
});
