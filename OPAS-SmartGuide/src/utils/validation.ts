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
    } else if (new Date().getFullYear() - birthDate.getFullYear() > 120) {
      add('Date of birth', 1, 'The date of birth gives an age over 120 years; check the year you entered.');
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
  const nrcRegex = /^(\d{6})\/(\d{2})\/(\d{1})$/;
  const match = clean.match(nrcRegex);
  if (!match) {
    return {
      isValid: false,
      message: 'Format must be 6 digits / 2 digits / 1 digit (e.g., 294812/11/1).',
    };
  }
  // Plausibility: placeholder values such as 000000/00/0 are never issued.
  if (match[1] === '000000') {
    return { isValid: false, message: 'The first 6 digits of the NRC cannot all be zero; copy the number exactly as printed on the card.' };
  }
  if (match[2] === '00') {
    return { isValid: false, message: 'The middle 2-digit code of the NRC cannot be 00; copy the number exactly as printed on the card.' };
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
  // local@domain.tld — TLD of at least 2 letters, no consecutive dots, no leading/trailing dot.
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
  if (!emailRegex.test(clean) || clean.includes('..') || clean.startsWith('.') || clean.split('@')[0].endsWith('.')) {
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

  const clean = phone.replace(/[\s\-\(\)\.]/g, '');
  const code = (countryCode || '+260').trim();

  if (!/^\+\d{1,3}$/.test(code)) {
    return { isValid: false, formatted: clean, error: `Country code "${code}" is not valid. Use the format +260.` };
  }
  if (!/^\+?\d+$/.test(clean)) {
    return { isValid: false, formatted: clean, error: 'Phone number may contain only digits, spaces, dashes, brackets and a leading +.' };
  }

  let e164: string;
  let warning: string | undefined;
  if (clean.startsWith('+')) {
    e164 = clean;
  } else if (clean.startsWith('00')) {
    e164 = `+${clean.substring(2)}`;
    warning = `International prefix 00 converted to +: ${e164}`;
  } else if (clean.startsWith('0')) {
    e164 = `${code}${clean.substring(1)}`;
    warning = `Entered local format (0...). Converted to standard international format: ${e164}`;
  } else {
    e164 = `${code}${clean}`;
    warning = `Country code ${code} auto-prepended: ${e164}`;
  }

  if (e164.startsWith('+260')) {
    const national = e164.substring(4);
    if (!/^\d{9}$/.test(national)) {
      return {
        isValid: false,
        formatted: e164,
        error: `Zambian numbers need exactly 9 digits after +260 (you entered ${national.length}). Example: +260 97 1234567 or 097 1234567.`,
      };
    }
    if (!/^(9[5-7]|7[5-7])/.test(national)) {
      const note = 'This is not a recognised Zambian mobile prefix (95, 96, 97, 75, 76, 77); SMS updates may not be delivered.';
      warning = warning ? `${warning}. ${note}` : note;
    }
    return { isValid: true, formatted: e164, warning };
  }

  const digitCount = e164.length - 1;
  if (digitCount < 8 || digitCount > 15) {
    return { isValid: false, formatted: e164, error: 'International phone numbers must have between 8 and 15 digits including the country code.' };
  }
  return { isValid: true, formatted: e164, warning };
}

// ---------------------------------------------------------------------------
// Document file validation (type, extension, real content, size, basic quality)
// ---------------------------------------------------------------------------

export const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MIN_IMAGE_BYTES_FOR_QUALITY = 30 * 1024;

export type DocumentFileIssueCode =
  | 'MISSING_FILE'
  | 'UNSUPPORTED_TYPE'
  | 'EXTENSION_MISMATCH'
  | 'CONTENT_MISMATCH'
  | 'EMPTY_FILE'
  | 'TOO_LARGE'
  | 'PHOTO_MUST_BE_IMAGE'
  | 'LOW_QUALITY';

export interface DocumentFileInput {
  documentType: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** data:<mime>;base64,<data> — when present, the real file content is inspected. */
  dataUrl?: string;
}

export interface DocumentFileIssue {
  code: DocumentFileIssueCode;
  severity: 'error' | 'warning';
  message: string;
}

const EXTENSION_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

/** Detect the real file type from the first bytes (magic numbers) of base64 data. */
export function sniffMimeFromBase64(base64: string): string | undefined {
  const head = base64.replace(/\s/g, '').substring(0, 16);
  if (head.startsWith('JVBER')) return 'application/pdf'; // %PDF
  if (head.startsWith('/9j/')) return 'image/jpeg'; // FF D8 FF
  if (head.startsWith('iVBORw0KGgo')) return 'image/png'; // 89 50 4E 47
  return undefined;
}

export function validateDocumentFile(input: DocumentFileInput): DocumentFileIssue[] {
  const issues: DocumentFileIssue[] = [];
  const add = (code: DocumentFileIssueCode, message: string, severity: 'error' | 'warning' = 'error') =>
    issues.push({ code, severity, message });
  const label = input.documentType || 'Document';

  let mimeType = input.mimeType?.toLowerCase();
  let sizeBytes = input.sizeBytes;
  let sniffed: string | undefined;

  if (input.dataUrl) {
    const match = input.dataUrl.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.*)$/s);
    if (!match) {
      add('CONTENT_MISMATCH', `${label}: the uploaded file could not be read. Upload it again as PDF, JPG or PNG.`);
      return issues;
    }
    mimeType = mimeType || match[1]?.toLowerCase();
    const base64 = match[2].replace(/\s/g, '');
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    sizeBytes = sizeBytes ?? Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
    sniffed = base64.length ? sniffMimeFromBase64(base64) : undefined;
  }

  if (!input.dataUrl && !input.fileName && !mimeType) {
    add('MISSING_FILE', `${label} has not been uploaded.`);
    return issues;
  }

  if (sizeBytes !== undefined) {
    if (sizeBytes === 0) add('EMPTY_FILE', `${label} is an empty file. Scan or photograph the document again and re-upload.`);
    else if (sizeBytes > MAX_DOCUMENT_BYTES) add('TOO_LARGE', `${label} is larger than 10 MB. Reduce the scan resolution or compress the file and re-upload.`);
  }

  if (mimeType && !(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
    add('UNSUPPORTED_TYPE', `${label} is a ${mimeType} file, which is not accepted. Upload a PDF, JPG or PNG.`);
  }

  const ext = input.fileName?.split('.').pop()?.toLowerCase();
  if (input.fileName) {
    if (!ext || !EXTENSION_MIME[ext]) {
      add('UNSUPPORTED_TYPE', `${label} ("${input.fileName}") has an unsupported file extension. Upload a .pdf, .jpg or .png file.`);
    } else if (mimeType && EXTENSION_MIME[ext] !== mimeType && (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
      add('EXTENSION_MISMATCH', `${label}: the file name ends in .${ext} but the file is ${mimeType}. Save the file in the correct format and re-upload.`);
    }
  }

  if (input.dataUrl && sizeBytes && !sniffed) {
    add('CONTENT_MISMATCH', `${label}: the file content is not a real PDF, JPG or PNG (it may be renamed or corrupted). Export the scan again and re-upload.`);
  } else if (sniffed && mimeType && sniffed !== mimeType) {
    add('CONTENT_MISMATCH', `${label}: the file claims to be ${mimeType} but its content is ${sniffed}. Save the file in the correct format and re-upload.`);
  }

  const effectiveType = sniffed || mimeType || (ext ? EXTENSION_MIME[ext] : undefined);
  const isPhoto = /photo/i.test(label) && !/damage/i.test(label);
  if (isPhoto && effectiveType && !effectiveType.startsWith('image/')) {
    add('PHOTO_MUST_BE_IMAGE', `${label} must be a JPG or PNG image, not a PDF.`);
  }

  if (effectiveType?.startsWith('image/') && sizeBytes && sizeBytes > 0 && sizeBytes < MIN_IMAGE_BYTES_FOR_QUALITY) {
    add('LOW_QUALITY', `${label} is a very small image (${Math.round(sizeBytes / 1024)} KB) and may be too low-resolution to read. Upload a clearer, higher-resolution scan.`, 'warning');
  }

  return issues;
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
