export interface FAQItem {
  id: string;
  category: 'Requirements' | 'Photos & Documents' | 'Fees & Payment' | 'Reverted Cases' | 'Collection & Biometrics';
  question: string;
  answer: string;
  tags: string[];
}

export const APPROVED_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Requirements',
    question: 'What documents are required for a first-time adult passport applicant?',
    answer: 'First-time adult applicants (age 16 and above) must provide:\n1. Original Green National Registration Card (NRC) and a certified photocopy.\n2. Certified copy of your official Birth Certificate from the Registrar General.\n3. Prescribed Guarantor Section signed and stamped by an authorized professional (e.g., Magistrate, Lawyer, Minister of Religion, Senior Civil Servant).\n4. Two (2) recent compliant passport photographs (45mm x 35mm).\n5. Proof of payment receipt from the Government Payment Gateway or authorized bank.',
    tags: ['first-time', 'adult', 'documents', 'nrc', 'birth certificate'],
  },
  {
    id: 'faq-2',
    category: 'Photos & Documents',
    question: 'What are the exact passport photo specifications required by MoHAIS?',
    answer: 'Passport photos must strictly comply with ICAO standard specifications:\n• Dimensions: 45mm high by 35mm wide (or standard 2x2 inches).\n• Background: Uniform, plain off-white or light grey. Absolutely no shadows, patterns, or furniture.\n• Lighting: Even lighting on both sides of the face with no flash reflections or harsh glare.\n• Pose: Direct frontal view with eyes open, mouth closed, and neutral expression.\n• Headwear: Only religious or medical head coverings are allowed, and full facial contour (forehead to chin and both cheek edges) must remain visible.\n• Spectacles: Strongly recommended to remove glasses to eliminate flash reflection or frame shadow over eyes.',
    tags: ['photo', 'specifications', 'size', 'background', 'glasses'],
  },
  {
    id: 'faq-3',
    category: 'Fees & Payment',
    question: 'How much does a passport cost and how do I pay?',
    answer: 'Official statutory passport fees under the Ministry of Home Affairs:\n• 32-Page Ordinary Passport: ZMW 500\n• 48-Page Frequent Traveler / Business Passport: ZMW 1,000\n• Express Expedited Fast-Track Service: Additional ZMW 500\n\nPayment can be made directly via Mobile Money (Airtel/MTN/Zamtel) or Debit Card through the Government Payment Gateway (GPG), or via over-the-counter deposit at approved partner commercial banks.',
    tags: ['fees', 'cost', 'payment', '32-page', '48-page', 'express'],
  },
  {
    id: 'faq-4',
    category: 'Reverted Cases',
    question: 'Why was my application reverted and do I have to pay the fee again?',
    answer: 'NO, you NEVER need to pay the application fee again for a reverted case!\nAn application is reverted when an inspecting officer flags a fixable discrepancy (such as an unclear photo, missing guarantor stamp, or name mismatch between NRC and birth certificate).\n\nTo resolve it: log into your OPAS account, review the officer\'s specific guidance note on your Message Board, and upload the corrected item. Your application will immediately resume in the processing queue without losing your priority!',
    tags: ['revert', 'reverted', 'fees', 'correction', 'photo', 'guarantor'],
  },
  {
    id: 'faq-5',
    category: 'Fees & Payment',
    question: 'I paid the passport fee, why has my application not been processed?',
    answer: 'This is a common issue known as "Paid-but-Unsubmitted". Paying the fee alone does not automatically submit your application. You must click "Complete & Submit Application" and book your biometric capture date. Once submitted, an officer can begin vetting your dossier.',
    tags: ['paid', 'unsubmitted', 'payment', 'biometrics'],
  },
  {
    id: 'faq-6',
    category: 'Collection & Biometrics',
    question: 'Where can I capture biometrics and collect my completed passport?',
    answer: 'Biometrics capture and booklet collection are available at all MoHAIS Passport Offices nationwide, including:\n• Lusaka Central Passport Office (Makishi Road)\n• Ndola Regional Passport Office (President Avenue)\n• Livingstone Regional Passport Office\n• Kitwe Provincial Office\n• Chipata, Kasama, Choma, Solwezi, Mansa, and Mongu Provincial Centers.\n\nYou must present your original physical Green NRC when appearing for biometrics and booklet collection.',
    tags: ['collection', 'biometrics', 'offices', 'locations', 'lusaka', 'ndola'],
  },
];
