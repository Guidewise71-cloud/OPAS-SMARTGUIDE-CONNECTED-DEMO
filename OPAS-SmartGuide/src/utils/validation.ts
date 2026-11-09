import { ContactInfo, ValidationResult } from '../types/passport';

export interface ApplicationFormCheckInput {
  fullName: string;
  nrcNumber: string;
  dateOfBirth: string;
  applicantType: string;
  filingOnBehalf: string;
  serviceType: string;
  phone: string;
  phoneCountryCode: string;
  email: string;
  residentialCountry: string;
  residentialProvince: string;
  residentialDistrict: string;
  residentialAreaVillage: string;
  residentialPlotStreet: string;
  sameAsResidential: boolean;
  postalCountry: string;
  postalProvince: string;
  postalDistrict: string;
  postalAreaVillage: string;
  postalPoBox: string;
  photoUploaded: boolean;
  nrcDocUploaded: boolean;
  serviceDocs: { type: string; uploaded: boolean; status?: 'APPROVED' | 'WARNING' | 'REJECTED' }[];
  guarantorName: string;
  guarantorNrc: string;
}

export interface ApplicationFormIssue {
  field: string;
  step: number;
  severity: 'error' | 'warning';
  message: string;
}

export function detectApplicationFormIssues(input: ApplicationFormCheckInput): ApplicationFormIssue[] {
  const issues: ApplicationFormIssue[] = [];
  const add = (field: string, step: number, message: string, severity: 'error' | 'warning' = 'error') => {
    issues.push({ field, step, severity, message });
  };

  if (input.fullName.trim().length < 3) add('Full legal name', 1, 'Enter the applicant’s full legal name.');
  if (!validateNRC(input.nrcNumber).isValid) add('Green NRC number', 1, validateNRC(input.nrcNumber).message || 'Enter a valid NRC number.');
  if (!input.dateOfBirth) {
    add('Date of birth', 1, 'Enter the applicant’s date of birth.');
  } else {
    const birthDate = new Date(`${input.dateOfBirth}T00:00:00`);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
      add('Date of birth', 1, 'Enter a valid date that is not in the future.');
    } else {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const beforeBirthday = today.getMonth() < birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
      if (beforeBirthday) age -= 1;
      if ((age < 16) !== (input.applicantType === 'Minor (Under 16 years)')) {
        add('Applicant classification', 1, `The date of birth indicates an ${age < 16 ? 'applicant under 16' : 'applicant aged 16 or older'}; correct the selected classification.`);
      }
    }
  }
  if (input.filingOnBehalf === 'Yes (Minor child under 16)' && input.applicantType !== 'Minor (Under 16 years)') {
    add('Filing category', 1, 'The filing category says this is for a minor, but the applicant classification is not set to minor.');
  }

  const phone = validatePhoneNumber(input.phone, input.phoneCountryCode);
  if (!phone.isValid) add('Phone number', 2, phone.error || 'Enter a valid phone number.');
  else if (phone.warning) add('Phone number', 2, phone.warning, 'warning');
  const email = validateEmail(input.email);
  if (email.error) add('Email address', 2, email.error);
  else if (email.warning) add('Email address', 2, email.warning, 'warning');
  if (input.residentialCountry.trim().length < 2) add('Residential country', 2, 'Select a residential country.');
  if (input.residentialProvince.trim().length < 2) add('Residential province', 2, 'Select a residential province.');
  if (input.residentialDistrict.trim().length < 2) add('Residential district', 2, 'Select a residential district.');
  if (input.residentialAreaVillage.trim().length < 2) add('Residential area or village', 2, 'Enter a residential area or village.');
  if (input.residentialPlotStreet.trim().length < 3) add('Residential plot or street', 2, 'Enter a complete residential plot or street address.');
  if (!input.sameAsResidential) {
    if (input.postalCountry.trim().length < 2) add('Postal country', 2, 'Select a postal country.');
    if (input.postalProvince.trim().length < 2) add('Postal province', 2, 'Select a postal province.');
    if (input.postalDistrict.trim().length < 2) add('Postal district', 2, 'Select a postal district.');
    if (input.postalAreaVillage.trim().length < 2 && input.postalPoBox.trim().length < 2) {
      add('Postal address', 2, 'Enter a postal area or village, or a P.O. Box.');
    }
  }

  if (!input.photoUploaded) add('Passport-size photo', 3, 'Upload the required passport-size photo.');
  if (!input.nrcDocUploaded) add('NRC copy', 3, 'Upload a copy of the applicant’s NRC.');
  if (input.guarantorName.trim().length < 3) add('Guarantor name', 3, 'Enter the guarantor’s full name.');
  if (!validateNRC(input.guarantorNrc).isValid) add('Guarantor NRC', 3, 'Enter a guarantor NRC in the required format.');
  const uploadedServiceDocs = input.serviceDocs.filter((doc) => doc.uploaded).map((doc) => doc.type.toLowerCase());
  const requireServiceDoc = (label: string, match: (doc: string) => boolean) => {
    if (!uploadedServiceDocs.some(match)) add(label, 3, `Add the ${label.toLowerCase()} required for this service type.`);
  };
  if (input.serviceType.includes('Lost/Stolen')) {
    requireServiceDoc('Zambia Police Report', (doc) => doc.includes('police report'));
    requireServiceDoc('GRZ Receipt for the Police Report', (doc) => doc.includes('grz receipt'));
  }
  if (input.serviceType.includes('Renewal')) {
    requireServiceDoc('Previous passport data page', (doc) => doc.includes('passport data page'));
  }
  if (input.applicantType === 'Minor (Under 16 years)') {
    requireServiceDoc('Birth certificate', (doc) => doc.includes('birth certificate') || doc.includes('shortened birth certificate'));
    requireServiceDoc('Parents’ NRC copies or passports', (doc) => doc.includes('parents nrc'));
  }

  for (const doc of input.serviceDocs.filter((item) => item.uploaded)) {
    if (doc.status === 'REJECTED') add(doc.type, 3, `${doc.type} was rejected; review its document feedback and replace it.`);
    else if (doc.status === 'WARNING') add(doc.type, 3, `${doc.type} has a warning; review the document feedback.`, 'warning');
  }

  return issues;
}

/**
 * Validates Zambian National Registration Card (NRC) format
 * Format: 6 digits / 2 digits / 1 digit (e.g. 294812/11/1)
 */
export function validateNRC(nrc: string): { isValid: boolean; message?: string } {
  if (!nrc || nrc.trim() === '') {
    return { isValid: false, message: 'NRC number is required.' };
  }
  const clean = nrc.trim();
  const nrcRegex = /^\d{6}\/\d{2}\/\d{1}$/;
  if (!nrcRegex.test(clean)) {
    return {
      isValid: false,
      message: 'Format must be 6 digits / 2 digits / 1 digit (e.g., 294812/11/1).',
    };
  }
  return { isValid: true };
}

/**
 * Common typo domains for email validation
 */
const COMMON_EMAIL_TYPOS: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
};

/**
 * Validates Email Address with typo detection
 */
export function validateEmail(email: string): { isValid: boolean; warning?: string; error?: string } {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email address is required for official status updates.' };
  }
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return { isValid: false, error: 'Please enter a valid email format (e.g., name@domain.com).' };
  }

  const parts = clean.split('@');
  const domain = parts[1];
  if (COMMON_EMAIL_TYPOS[domain]) {
    return {
      isValid: true,
      warning: `Did you mean @${COMMON_EMAIL_TYPOS[domain]} instead of @${domain}?`,
    };
  }

  return { isValid: true };
}

/**
 * Validates Phone number with country code and E.164 rules
 * Standard Zambian numbers: +260 97X XXXXXX, +260 96X XXXXXX, +260 95X XXXXXX, +260 76X XXXXXX, +260 77X XXXXXX
 */
export function validatePhoneNumber(phone: string, countryCode: string = '+260'): {
  isValid: boolean;
  formatted: string;
  error?: string;
  warning?: string;
} {
  if (!phone || phone.trim() === '') {
    return { isValid: false, formatted: phone, error: 'Phone number is required for SMS delivery updates.' };
  }

  let clean = phone.replace(/[\s\-\(\)]/g, '');

  // Detect national format starting with 0
  if (clean.startsWith('0')) {
    // Strip leading 0 and prepend country code
    const withoutZero = clean.substring(1);
    const corrected = `${countryCode}${withoutZero}`;
    return {
      isValid: true,
      formatted: corrected,
      warning: `Entered local format (0...). Converted to standard international format: ${corrected}`,
    };
  }

  // If already starts with +
  if (clean.startsWith('+')) {
    if (clean.length < 10 || clean.length > 15) {
      return { isValid: false, formatted: clean, error: 'International phone numbers must be between 10 and 15 digits.' };
    }
    return { isValid: true, formatted: clean };
  }

  // If no prefix, assume country code
  const formattedWithCode = `${countryCode}${clean}`;
  return {
    isValid: true,
    formatted: formattedWithCode,
    warning: `Country code ${countryCode} auto-prepended: ${formattedWithCode}`,
  };
}

/**
 * Comprehensive Contact Information Validator
 */
export function validateContactInfo(contact: ContactInfo): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const suggestions: Record<string, string> = {};

  const emailRes = validateEmail(contact.email);
  if (emailRes.error) errors.email = emailRes.error;
  if (emailRes.warning) warnings.email = emailRes.warning;

  const phoneRes = validatePhoneNumber(contact.phone, contact.phoneCountryCode || '+260');
  if (phoneRes.error) errors.phone = phoneRes.error;
  if (phoneRes.warning) warnings.phone = phoneRes.warning;

  if (!contact.residentialAddress || contact.residentialAddress.trim().length < 5) {
    errors.residentialAddress = 'Please enter a complete residential address including street or plot number.';
  }

  if (!contact.district || contact.district.trim() === '') {
    errors.district = 'District is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    suggestions,
  };
}
