import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
  User,
  Phone,
  Mail,
  Camera,
  CreditCard,
  Building,
  Check,
  Send,
  Bot,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Clock,
  Compass,
  AlertCircle,
  HelpCircle,
  CheckCheck,
  Zap,
  Info,
  Calendar,
  MapPin,
  Lock,
  Layers,
  ChevronRight,
  RefreshCw,
  X,
  FileCheck,
  Building2,
  Briefcase,
  FolderOpen,
  Plus,
  Trash2,
  BadgeCheck,
  Home,
  Globe,
} from 'lucide-react';
import {
  PassportApplication,
  PassportType,
  ServiceSpeed,
  UploadedDocument,
  STANDARD_REQUIREMENTS,
  SERVICE_SPECIFIC_REQUIREMENTS,
} from '../../types/passport';
import {
  detectApplicationFormIssues,
  validateNRC,
  validatePhoneNumber,
  validateEmail,
} from '../../utils/validation';

interface ApplicationFormProps {
  onSubmitSuccess: (newApp: PassportApplication) => void;
  onCancel: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  fieldTrigger?: string;
}

// MoHAIS Official Field Guidance Dictionary for Live Focus Synchronization
const FIELD_CONTEXT_TIPS: Record<
  string,
  { label: string; tip: string; quickQuestion: string }
> = {
  // Case Details Fields
  filingOnBehalf: {
    label: 'Case Filing Category (Self vs Behalf)',
    tip: 'State whether you are submitting for yourself as an adult citizen or on behalf of a minor child under 16 or legal ward. Minor applications require certified birth extract and notarized parental consent.',
    quickQuestion: 'Can I apply on behalf of my minor child or relative?',
  },
  applicantType: {
    label: 'Applicant Classification',
    tip: 'Adult applicants (16+) require Green NRC and an authorized guarantor. Minor applicants require certified birth certificate and both parents\' NRC copies.',
    quickQuestion: 'What documents are required for a minor child under 16?',
  },
  serviceType: {
    label: 'OPAS Service Classification',
    tip: 'Select whether this is a First-Time Application, Renewal of Expired Booklet, Replacement of Lost/Damaged Passport, or Name Change.',
    quickQuestion: 'What is the procedure for replacing a lost or stolen passport?',
  },
  collectionOffice: {
    label: 'Designated Biometrics Center & Office',
    tip: 'Select your preferred passport facility for counter interview, live biometrics capture (fingerprints & photo), and booklet pickup.',
    quickQuestion: 'Which passport office processing times are fastest?',
  },
  // Personal Identification Fields
  fullName: {
    label: 'Full Legal Name',
    tip: 'Enter your names in the exact sequence registered on your Green NRC. Avoid abbreviations, aliases, or nicknames.',
    quickQuestion: 'Does my name need to match my Green NRC exactly?',
  },
  nrcNumber: {
    label: 'Green NRC Number',
    tip: 'Zambian NRC format is strictly 6 digits / 2 digits / 1 digit (e.g., 294812/11/1). The middle two digits represent your registration district code.',
    quickQuestion: 'How is a Zambian Green NRC number formatted?',
  },
  dateOfBirth: {
    label: 'Date of Birth',
    tip: 'Must match your certified Birth Certificate or Registrar General extract. Applicants under 16 require notarized parental consent.',
    quickQuestion: 'What are the rules for minor applicants under 16?',
  },
  gender: {
    label: 'Gender',
    tip: 'Select your sex as officially recorded on your National Registration Card and Birth Certificate.',
    quickQuestion: 'Can passport gender differ from Green NRC?',
  },
  placeOfBirth: {
    label: 'Place of Birth',
    tip: 'Enter the Zambian district or town where you were born (or foreign country if born abroad to Zambian citizens).',
    quickQuestion: 'What if I was born outside Zambia?',
  },
  maritalStatus: {
    label: 'Marital Status',
    tip: 'If married and taking spouse surname, a certified marriage certificate must be uploaded in Step 3.',
    quickQuestion: 'Do I need a marriage certificate for surname change?',
  },
  // Contact Fields
  phone: {
    label: 'Mobile Phone Number',
    tip: 'Must include the Zambian +260 country code followed by 9 digits (e.g. +260 97X XXX XXX). Official SMS reminders for biometrics & collection will be dispatched here.',
    quickQuestion: 'Why is the +260 country code required for OPAS?',
  },
  email: {
    label: 'Email Address',
    tip: 'Ensure your email is active. Your official PDF application slip, GPG receipt, and interview booking pass will be delivered here. Check for common typos like @gamil.com.',
    quickQuestion: 'How will I receive my passport appointment slip?',
  },
  // Residential Address Fields
  residentialCountry: {
    label: 'Residential Country',
    tip: 'State your country of primary physical residence. Zambian residents select Zambia; diaspora citizens select country of current foreign residency.',
    quickQuestion: 'Can Zambians living in the diaspora apply from abroad?',
  },
  residentialProvince: {
    label: 'Residential Province / State',
    tip: 'Select your administrative province (e.g., Lusaka, Copperbelt, Southern, Eastern, Central, etc.) or foreign state.',
    quickQuestion: 'Does my province affect my passport collection office?',
  },
  residentialDistrict: {
    label: 'Residential District / City',
    tip: 'Specify your local administrative district or municipal city (e.g., Lusaka, Ndola, Kitwe, Livingstone, Kabwe, Chipata, Solwezi).',
    quickQuestion: 'What if my district is newly established?',
  },
  residentialAreaVillage: {
    label: 'Residential Area / Village',
    tip: 'Provide your residential neighborhood, township, compound, or ancestral village (e.g. Woodlands, Riverside, Kabulonga, Matero).',
    quickQuestion: 'Can I enter my traditional village as residential area?',
  },
  residentialPlotStreet: {
    label: 'Residential Plot, Street',
    tip: 'Enter your physical plot number, house/stand number, and street name (e.g., Plot 418, Independence Avenue). P.O. Boxes are not permitted here.',
    quickQuestion: 'Can I use a P.O. Box for physical residential address?',
  },
  residentialPostalCode: {
    label: 'Residential Postal / ZIP Code',
    tip: 'Enter your area postal routing code (standard Zambian central post code is 10101, or 00000 if unassigned).',
    quickQuestion: 'What is the standard postal code for Zambia?',
  },
  residentialAddress: {
    label: 'Physical Residential Address',
    tip: 'Provide your full physical residential plot/house number, street name, and area. Postal P.O. Box addresses are not accepted for residence.',
    quickQuestion: 'Can I use a P.O. Box for residential address?',
  },
  province: {
    label: 'Province of Residence',
    tip: 'Select your current province of residence. This assists in routing your file to the nearest regional passport facility.',
    quickQuestion: 'Can I collect my passport in a different province?',
  },
  district: {
    label: 'District',
    tip: 'Select your administrative district. Must be consistent with your physical address.',
    quickQuestion: 'What if my district is missing from the list?',
  },

  // Postal Address Fields
  postalSameCheck: {
    label: 'Postal Address is the Same as Residential Address',
    tip: 'When checked, your official postal dispatch destination will automatically synchronize with your residential address.',
    quickQuestion: 'Can postal address be the same as residential address?',
  },
  postalCountry: {
    label: 'Postal Country',
    tip: 'Country where official postal correspondence and notifications should be dispatched.',
    quickQuestion: 'Can postal address be in a different country?',
  },
  postalProvince: {
    label: 'Postal Province / State',
    tip: 'Province or region of your registered post office or mailing address.',
    quickQuestion: 'Which province should I choose for postal box?',
  },
  postalDistrict: {
    label: 'Postal District / City',
    tip: 'City or municipal district where your post office box or postal collection facility is located.',
    quickQuestion: 'Can I use a postal box in a different city?',
  },
  postalAreaVillage: {
    label: 'Postal Area / Village',
    tip: 'Township or postal agency location where your mailbox is serviced.',
    quickQuestion: 'Is postal area village required?',
  },
  postalPoBox: {
    label: 'Postal P. O. Box',
    tip: 'Your official Post Office Box (e.g., P. O. Box 50062) or Private Bag number for physical mail delivery.',
    quickQuestion: 'How should I format my P. O. Box number?',
  },
  postalPostalCode: {
    label: 'Postal / ZIP Code',
    tip: 'Post Office routing or branch code (e.g., 10101 for Ridgeway/Lusaka Main).',
    quickQuestion: 'What is my local post office zip code?',
  },
  // Document Fields
  standardRequirements: {
    label: 'Standard Requirements for Applicant',
    tip: 'Mandatory civil records for all applicants: Copy of Green NRC (both front & back, format 123456/78/1) and Recent Passport-Size Photo (ICAO 45×35mm).',
    quickQuestion: 'What are the standard requirements for all applicants?',
  },
  serviceSpecificDocs: {
    label: 'Service Specific Requirements',
    tip: 'Statutory records required for your application classification: renewals (data page & stamped page), lost passports (Police Report & GRZ receipt), minors (parent NRCs & consent), or civil status (marriage, adoption, naturalization, bestowal).',
    quickQuestion: 'Which service-specific requirements apply to my case?',
  },
  passportPhoto: {
    label: 'Recent Passport-Size Photo (ICAO 45x35mm)',
    tip: 'Dimensions must be exactly 45mm x 35mm with plain off-white/light-grey background. Neutral expression with mouth closed. Remove glasses to prevent flash glare.',
    quickQuestion: 'What are the strict photo background and glare specifications?',
  },
  nrcScan: {
    label: 'Copy of Applicant’s National Registration Card (NRC)',
    tip: 'Upload a clear, full-color scan of both front and back sides of your original Green National Registration Card.',
    quickQuestion: 'Do I need certified copies of my Green NRC?',
  },
  birthCert: {
    label: 'Applicant’s Birth Certificate / Shortened Birth Certificate',
    tip: 'Official Birth Certificate or certified extract issued by the Registrar General. Laminated copies must be certified by an authorized Commissioner for Oaths.',
    quickQuestion: 'Can I apply with an affidavit if I lost my birth certificate?',
  },
  // Guarantor Fields
  guarantorName: {
    label: 'Guarantor Full Legal Name',
    tip: 'Your guarantor must be an authorized professional (e.g. Magistrate, Lawyer, Clergy, Senior Civil Servant, School Head) who has known you for at least 2 years.',
    quickQuestion: 'Who is eligible to act as a passport guarantor?',
  },
  guarantorNrc: {
    label: 'Guarantor Green NRC',
    tip: 'The guarantor must be an adult Zambian citizen holding a valid Green NRC in format 123456/78/1.',
    quickQuestion: 'Can a close relative be my guarantor?',
  },
  guarantorProfession: {
    label: 'Guarantor Profession',
    tip: 'Select the official statutory profession of your guarantor. They will need to stamp and sign the physical declaration during counter verification.',
    quickQuestion: 'What official stamp is required from my guarantor?',
  },
  // Category & Payment Fields
  passportType: {
    label: 'Passport Booklet Category',
    tip: 'Choose 32-Page Ordinary (ZMW 500) for standard personal/holiday travel, or 48-Page Frequent Traveler (ZMW 1,000) for regular regional trade and business trips.',
    quickQuestion: 'Should I choose 32 pages (ZMW 500) or 48 pages (ZMW 1,000)?',
  },
  serviceSpeed: {
    label: 'Processing Speed',
    tip: 'Standard takes 14–21 working days. Express Fast-Track adds a ZMW 500 statutory fee for 3–5 working day turnaround upon biometric verification.',
    quickQuestion: 'How fast is Express Fast-Track processing?',
  },
  paymentMethod: {
    label: 'Government Payment Gateway (GPG)',
    tip: 'Official payment is integrated via Government Payment Gateway. Select Mobile Money (Airtel, MTN, Zamtel) or Debit Card. Payment is recorded instantly with zero repayment in case of revisions.',
    quickQuestion: 'Is payment via Mobile Money instant on OPAS?',
  },
  formN: {
    label: "Form 'N' (Affidavit of Birth)",
    tip: "Sworn affidavit of birth before a Commissioner for Oaths. Requires applicant ancestral origin (Chief, Tribe, Village, District), Schools Attended record (Primary, Secondary, Tertiary), and Father/Mother lineage.",
    quickQuestion: "What details are required in Form 'N' (Affidavit of Birth)?",
  },
  formA: {
    label: "Form 'A' (Application for Zambian Passport 16+)",
    tip: "Official application schedule for adults 16+. Recommender must endorse photo reverse: 'I certify that this is a true likeness of the applicant Mr./Mrs./Miss...'",
    quickQuestion: "What is the recommender endorsement clause in Form 'A'?",
  },
};

const QUICK_QUESTION_PILLS = [
  'Form N Affidavit of Birth',
  'Form A Recommender Rule',
  'Case Filing Rules',
  'NRC Format & Rules',
  'Photo Specs (45x35mm)',
  'Eligible Guarantors',
  '32 vs 48 Pages Fees',
  'Express 3-5d Service',
  'Minor Consent Form',
  'Interview Office Locations',
  'How to fix email typos',
];

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  onSubmitSuccess,
  onCancel,
}) => {
  // Wizard Step State (1: Case Details & Identity, 2: Contact, 3: Documents, 4: Category & Payment)
  const [step, setStep] = useState<number>(1);

  // Live Focus Context Synchronization State
  const [focusedField, setFocusedField] = useState<string | null>('caseDetails');
  const [lastSyncField, setLastSyncField] = useState<string>('');

  // =========================================================================
  // MOVED FROM VALIDATION: OFFICIAL CASE DETAILS INTAKE STATE
  // =========================================================================
  const [caseNumber] = useState(`ZAM-OPAS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [filingOnBehalf, setFilingOnBehalf] = useState('No (Self-Application)');
  const [applicantType, setApplicantType] = useState('Adult (16+ years)');
  const [serviceType, setServiceType] = useState('New Ordinary Passport (32 Pages)');
  const [serviceCategory] = useState('Passport Services (OPAS)');
  const [caseAgency] = useState('Ministry of Home Affairs & Internal Security');

  // Form Field State: Step 1 - Personal Identity
  const [fullName, setFullName] = useState('');
  const [nrcNumber, setNrcNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [placeOfBirth, setPlaceOfBirth] = useState('Lusaka');
  const [maritalStatus, setMaritalStatus] = useState<
    'Single' | 'Married' | 'Divorced' | 'Widowed'
  >('Single');

  // Form Field State: Step 2 - Contact, Residential & Postal Address
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+260');
  const [email, setEmail] = useState('');
  const [collectionOffice, setCollectionOffice] = useState(
    'Lusaka Central Passport Office (Makishi Road)'
  );

  // Residential Address State
  const [residentialCountry, setResidentialCountry] = useState('Zambia');
  const [residentialProvince, setResidentialProvince] = useState('Lusaka Province');
  const [residentialDistrict, setResidentialDistrict] = useState('Lusaka');
  const [residentialAreaVillage, setResidentialAreaVillage] = useState('Woodlands');
  const [residentialPlotStreet, setResidentialPlotStreet] = useState('');
  const [residentialPostalCode, setResidentialPostalCode] = useState('10101');

  // Postal Address State
  const [sameAsResidential, setSameAsResidential] = useState(true);
  const [postalCountry, setPostalCountry] = useState('Zambia');
  const [postalProvince, setPostalProvince] = useState('Lusaka Province');
  const [postalDistrict, setPostalDistrict] = useState('Lusaka');
  const [postalAreaVillage, setPostalAreaVillage] = useState('Woodlands');
  const [postalPoBox, setPostalPoBox] = useState('');
  const [postalPostalCode, setPostalPostalCode] = useState('10101');

  // Legacy compatibility state
  const [residentialAddress, setResidentialAddress] = useState('');
  const [province, setProvince] = useState('Lusaka Province');
  const [district, setDistrict] = useState('Lusaka');

  // Address Synchronization Handler
  const handleToggleSameAsResidential = (checked: boolean) => {
    setSameAsResidential(checked);
    if (checked) {
      setPostalCountry(residentialCountry);
      setPostalProvince(residentialProvince);
      setPostalDistrict(residentialDistrict);
      setPostalAreaVillage(residentialAreaVillage);
      setPostalPoBox(residentialPlotStreet ? `Plot/Street: ${residentialPlotStreet}` : (postalPoBox || 'P. O. Box 50062'));
      setPostalPostalCode(residentialPostalCode);
    }
  };

  const handleResidentialCountryChange = (val: string) => {
    setResidentialCountry(val);
    if (sameAsResidential) setPostalCountry(val);
  };
  const handleResidentialProvinceChange = (val: string) => {
    setResidentialProvince(val);
    setProvince(val);
    if (sameAsResidential) setPostalProvince(val);
  };
  const handleResidentialDistrictChange = (val: string) => {
    setResidentialDistrict(val);
    setDistrict(val);
    if (sameAsResidential) setPostalDistrict(val);
  };
  const handleResidentialAreaVillageChange = (val: string) => {
    setResidentialAreaVillage(val);
    if (sameAsResidential) setPostalAreaVillage(val);
  };
  const handleResidentialPlotStreetChange = (val: string) => {
    setResidentialPlotStreet(val);
    setResidentialAddress(val);
    if (sameAsResidential) {
      setPostalPoBox(val ? `Plot/Street: ${val}` : '');
    }
  };
  const handleResidentialPostalCodeChange = (val: string) => {
    setResidentialPostalCode(val);
    if (sameAsResidential) setPostalPostalCode(val);
  };

  // Form Field State: Step 3 - Documents & Guarantor
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoAiScore, setPhotoAiScore] = useState<number | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const [photoValidating, setPhotoValidating] = useState(false);

  // Standard Requirement: Copy of Applicant’s National Registration Card (NRC)
  const [nrcDocUploaded, setNrcDocUploaded] = useState(false);
  const [nrcAiScore, setNrcAiScore] = useState<number | null>(null);
  const [nrcFeedback, setNrcFeedback] = useState<string | null>(null);
  const [nrcValidating, setNrcValidating] = useState(false);

  // Service Specific Requirements State
  const [serviceDocs, setServiceDocs] = useState<{
    id: string;
    type: string;
    filename: string;
    uploaded: boolean;
    validating: boolean;
    score?: number;
    status?: 'APPROVED' | 'WARNING' | 'REJECTED';
    summary?: string;
    recommendations?: string[];
  }[]>([
    {
      id: 'doc-birth-cert',
      type: "Applicant's Birth Certificate",
      filename: 'applicant_birth_certificate_extract.pdf',
      uploaded: true,
      validating: false,
      score: 97,
      status: 'APPROVED',
      summary: 'Official Registrar General long-form birth certificate copy detected.',
      recommendations: ['Present original physical document at biometrics counter.'],
    },
  ]);
  const [selectedServiceReqToAdd, setSelectedServiceReqToAdd] = useState<string>('');

  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorNrc, setGuarantorNrc] = useState('');
  const [guarantorProfession, setGuarantorProfession] = useState(
    'Senior Civil Servant'
  );
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorOrg, setGuarantorOrg] = useState('Government of Zambia');

  // Form Field State: Step 4 - Category & Payment
  const [passportType, setPassportType] =
    useState<PassportType>('32-Page Ordinary');
  const [serviceSpeed, setServiceSpeed] = useState<ServiceSpeed>(
    'Standard (14-21 days)'
  );
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'card'>('momo');
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'airtel' | 'zamtel'>(
    'mtn'
  );
  const [termsAgreed, setTermsAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Validation States
  const nrcValidation = validateNRC(nrcNumber);
  const phoneValidation = validatePhoneNumber(phone, phoneCountryCode);
  const emailValidation = validateEmail(email);
  const guarantorNrcValidation = validateNRC(guarantorNrc);
  const formIssues = detectApplicationFormIssues({
    fullName,
    nrcNumber,
    dateOfBirth,
    applicantType,
    filingOnBehalf,
    serviceType,
    phone,
    phoneCountryCode,
    email,
    residentialCountry,
    residentialProvince,
    residentialDistrict,
    residentialAreaVillage,
    residentialPlotStreet,
    sameAsResidential,
    postalCountry,
    postalProvince,
    postalDistrict,
    postalAreaVillage,
    postalPoBox,
    photoUploaded,
    nrcDocUploaded,
    serviceDocs,
    guarantorName,
    guarantorNrc,
  });
  const blockingFormIssues = formIssues.filter((issue) => issue.severity === 'error');

  // Conversational Assistant State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Greetings! I am your 24/7 MoHAIS Virtual Assistant. As you fill in your passport application on the right, I will automatically synchronize and guide you through Case Details, Green NRC formatting, photo pre-flight inspection, and fee rules.',
      timestamp: 'Just now',
    },
    {
      id: 'msg-init-tip',
      sender: 'assistant',
      text: `📋 Official Case Dossier #${caseNumber} initialized. Beginning Step 1 with Case Details and Personal Identity. Focus on any field on the right to receive statutory guidance.`,
      timestamp: 'Just now',
      fieldTrigger: 'caseDetails',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(
    null
  );

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Calculate Fee Structure
  const baseFee = passportType === '32-Page Ordinary' ? 500 : 1000;
  const speedFee = serviceSpeed.includes('Express') ? 500 : 0;
  const totalFee = baseFee + speedFee;

  // Real-time Field Focus Context Synchronization
  const handleFieldFocus = (fieldKey: string) => {
    setFocusedField(fieldKey);

    // If context changed, push an intelligent prompt message to the assistant feed
    if (fieldKey !== lastSyncField && FIELD_CONTEXT_TIPS[fieldKey]) {
      setLastSyncField(fieldKey);
      const info = FIELD_CONTEXT_TIPS[fieldKey];
      const newMsg: ChatMessage = {
        id: `field-${fieldKey}-${Date.now()}`,
        sender: 'assistant',
        text: `🎯 Active Field Guidance: ${info.label}\n${info.tip}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        fieldTrigger: fieldKey,
      };
      setChatMessages((prev) => [...prev, newMsg]);

      if (autoVoice && 'speechSynthesis' in window) {
        speakText(info.tip);
      }
    }
  };

  // Scroll chat feed on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, aiLoading]);

  // Audio Text-to-Speech handler
  const speakText = (text: string, msgId?: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (msgId && currentlySpeakingId === msgId) {
      setCurrentlySpeakingId(null);
      return;
    }
    const clean = text.replace(/[*_#•🎯💡]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);
    if (msgId) setCurrentlySpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Microphone Voice Input
  const handleToggleMic = () => {
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert(
        'Speech recognition is not supported in this browser. Please type your message.'
      );
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      setIsListening(true);

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setChatInput(transcript);
        setIsListening(false);
        handleSendChat(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Send message to AI Assistant
  const handleSendChat = async (userText?: string) => {
    const query = (userText || chatInput).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setAiLoading(true);

    try {
      // Call backend AI proxy
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: chatMessages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
          contextData: {
            currentSection: `New Passport Application - Step ${step} of 4 (Case Details & Intake)`,
            activeField: focusedField,
            formIssues: formIssues.map(({ field, step: issueStep, severity, message }) => ({ field, step: issueStep, severity, message })),
            applicantName: fullName || 'New Applicant',
            nrcNumber: nrcNumber || 'Not specified',
            caseNumber,
            filingOnBehalf,
            applicantType,
            serviceType,
            collectionOffice,
            passportType,
            serviceSpeed,
          },
        }),
      });

      const data = await res.json();
      const aiReply =
        data.reply ||
        'I am here to guide your passport application. Please check your Green NRC format and ensure photo meets the 45mm x 35mm plain background standard.';

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setChatMessages((prev) => [...prev, botMsg]);

      if (autoVoice) {
        speakText(aiReply, botMsg.id);
      }
    } catch (err) {
      // Graceful offline fallback
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: 'MoHAIS Notice: For Zambian passport applications, ensure your Green NRC format is 123456/78/1, photos have a plain off-white background, and fees are paid via Government Payment Gateway.',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  // Standard Requirement: Photo Pre-Check with ML Engine
  const handleSimulatePhotoUpload = async () => {
    setPhotoValidating(true);
    try {
      const res = await fetch('/api/validate/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'Recent Passport-Size Photo',
          fileName: 'applicant_passport_photo_icao.jpg',
        }),
      });
      const data = await res.json();
      setPhotoUploaded(true);
      setPhotoAiScore(data.score || 98);
      setPhotoFeedback(
        data.summary ||
          '✓ Passed AI Pre-Flight Inspection: Uniform light-grey background, neutral facial expression, centered iris alignment, zero spectacle glare.'
      );

      const botMsg: ChatMessage = {
        id: `photo-verify-${Date.now()}`,
        sender: 'assistant',
        text: `🎉 Excellent! Your passport photo passed the AI Pre-Flight Inspection with a ${data.score || 98}% quality score. Compliant with ICAO Doc 9303 standards.`,
        timestamp: 'Just now',
        fieldTrigger: 'passportPhoto',
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } catch {
      setPhotoUploaded(true);
      setPhotoAiScore(98);
      setPhotoFeedback('✓ Passed AI Pre-Flight Inspection: Uniform light-grey background, neutral facial expression.');
    } finally {
      setPhotoValidating(false);
    }
  };

  // Standard Requirement: Green NRC Scan with ML Engine
  const handleValidateStandardNrc = async () => {
    setNrcValidating(true);
    try {
      const res = await fetch('/api/validate/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'Copy of Applicant’s National Registration Card (NRC)',
          fileName: 'applicant_green_nrc.pdf',
        }),
      });
      const data = await res.json();
      setNrcDocUploaded(true);
      setNrcAiScore(data.score || 96);
      setNrcFeedback(data.summary || 'Zambian Green NRC format 123456/78/1 verified with high legibility.');

      const botMsg: ChatMessage = {
        id: `nrc-verify-${Date.now()}`,
        sender: 'assistant',
        text: `✓ Standard Requirement Verified: Copy of Green NRC validated against statutory register (Score: ${data.score || 96}%).`,
        timestamp: 'Just now',
        fieldTrigger: 'nrcScan',
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } catch {
      setNrcDocUploaded(true);
      setNrcAiScore(95);
      setNrcFeedback('Green NRC scan format 123456/78/1 verified with high legibility.');
    } finally {
      setNrcValidating(false);
    }
  };

  // Service Specific Requirements Handlers
  const handleAddServiceDoc = (docType: string) => {
    if (!docType || serviceDocs.some((d) => d.type === docType)) return;
    const newDoc = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: docType,
      filename: `${docType.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
      uploaded: false,
      validating: false,
    };
    setServiceDocs((prev) => [...prev, newDoc]);
    setSelectedServiceReqToAdd('');

    const botMsg: ChatMessage = {
      id: `doc-add-${Date.now()}`,
      sender: 'assistant',
      text: `📌 Added Service Requirement: "${docType}". Click 'Run ML Inspection' to verify this civil record against official GRZ statutory rules.`,
      timestamp: 'Just now',
      fieldTrigger: 'serviceSpecificDocs',
    };
    setChatMessages((prev) => [...prev, botMsg]);
  };

  const handleRemoveServiceDoc = (id: string) => {
    setServiceDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleValidateServiceDoc = async (id: string, docType: string) => {
    setServiceDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, validating: true } : d))
    );

    try {
      const res = await fetch('/api/validate/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          fileName: `${docType.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        }),
      });
      const data = await res.json();
      setServiceDocs((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                uploaded: true,
                validating: false,
                status: data.status || 'APPROVED',
                score: data.score || 95,
                summary: data.summary || `${docType} verified against GRZ standards.`,
                recommendations: data.recommendations || ['Bring physical document to biometrics appointment.'],
              }
            : d
        )
      );

      const botMsg: ChatMessage = {
        id: `doc-verify-${Date.now()}`,
        sender: 'assistant',
        text: `✓ Service Requirement Verified: "${docType}" scored ${data.score || 95}% in ML pre-flight evaluation. ${data.summary || ''}`,
        timestamp: 'Just now',
        fieldTrigger: 'serviceSpecificDocs',
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } catch {
      setServiceDocs((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                uploaded: true,
                validating: false,
                status: 'APPROVED',
                score: 95,
                summary: `${docType} verified against GRZ statutory standards.`,
                recommendations: ['Bring physical document to biometrics appointment.'],
              }
            : d
        )
      );
    }
  };

  const handleBatchAddPreset = (preset: 'lost' | 'renewal' | 'minor' | 'formN' | 'formA') => {
    let presetsToAdd: string[] = [];
    if (preset === 'lost') {
      presetsToAdd = ['Zambia Police Report', 'GRZ Receipt for the Police Report', 'Proof of Passport Damage (e.g., upload Photos of Damaged Passport)'];
    } else if (preset === 'renewal') {
      presetsToAdd = ['Expired Passport Data Page', 'Full Passport Last Stamped Page', 'Full Passport Data Page'];
    } else if (preset === 'minor') {
      presetsToAdd = ['Letter of Consent from Guardian (if 18 years and below)', 'Parents NRC copies / Passports (for applicants under 16 years)', 'Shortened Birth Certificate'];
    } else if (preset === 'formN') {
      presetsToAdd = ["Form 'N' (Affidavit of Birth before Commissioner for Oaths)"];
    } else if (preset === 'formA') {
      presetsToAdd = ["Form 'A' (Application for Zambian Passport 16+ Schedule)"];
    }

    presetsToAdd.forEach((docType) => {
      if (!serviceDocs.some((d) => d.type === docType)) {
        setServiceDocs((prev) => [
          ...prev,
          {
            id: `doc-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            type: docType,
            filename: `${docType.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
            uploaded: false,
            validating: false,
          },
        ]);
      }
    });

    const botMsg: ChatMessage = {
      id: `preset-${Date.now()}`,
      sender: 'assistant',
      text: `📋 Loaded ${presetsToAdd.length} service-specific requirement templates for ${preset} case. Click 'Run ML Inspection' on each item to test compliance.`,
      timestamp: 'Just now',
      fieldTrigger: 'serviceSpecificDocs',
    };
    setChatMessages((prev) => [...prev, botMsg]);
  };

  // Quick 1-Click Typo Fixer
  const handleAutoFixEmail = () => {
    const clean = email
      .replace('@gamil.com', '@gmail.com')
      .replace('@outlok.com', '@outlook.com')
      .replace('@yaho.com', '@yahoo.com');
    setEmail(clean);
  };

  // Validation Checks for Step Transitions
  const isStep1Valid = Boolean(
    fullName.trim().length >= 3 &&
      nrcValidation.isValid &&
      dateOfBirth &&
      placeOfBirth &&
      collectionOffice
  );

  const isStep2Valid = Boolean(
    phoneValidation.isValid &&
      emailValidation.isValid &&
      residentialCountry.trim().length >= 2 &&
      residentialProvince.trim().length >= 2 &&
      residentialDistrict.trim().length >= 2 &&
      residentialPlotStreet.trim().length >= 3 &&
      (sameAsResidential ||
        (postalCountry.trim().length >= 2 &&
          postalProvince.trim().length >= 2 &&
          postalDistrict.trim().length >= 2))
  );

  const isStep3Valid = Boolean(
    photoUploaded &&
      nrcDocUploaded &&
      guarantorName.trim().length >= 3 &&
      guarantorNrcValidation.isValid
  );

  // Final Application Submission & GPG Payment Simulation
  const handleFinalSubmit = () => {
    if (blockingFormIssues.length) {
      setStep(blockingFormIssues[0].step);
      return;
    }
    if (!termsAgreed) return;

    setSubmitting(true);

    const trackingNum = caseNumber;

    const newApplication: PassportApplication = {
      id: `app-${Date.now()}`,
      trackingNumber: trackingNum,
      nrcNumber: nrcNumber || '294812/11/1',
      fullName: fullName || 'Chileshe Mulenga',
      dateOfBirth: dateOfBirth || '1998-04-12',
      gender,
      placeOfBirth,
      passportType,
      serviceSpeed,
      feeAmount: totalFee,
      feePaid: true,
      paymentReference: `GPG-ZMW-${Math.floor(100000 + Math.random() * 900000)}`,
      paidAt: new Date().toISOString(),
      status: 'Submitted - Under Review',
      daysInStatus: 0,
      contact: {
        phone: phoneValidation.formatted || phone,
        phoneCountryCode,
        email,
        residentialAddress: residentialPlotStreet
          ? `${residentialPlotStreet}, ${residentialAreaVillage ? residentialAreaVillage + ', ' : ''}${residentialDistrict}`
          : residentialAddress || 'Plot 418, Woodlands Extension',
        district: residentialDistrict || district || 'Lusaka',
        province: residentialProvince || province || 'Lusaka Province',

        // Structured Residential Address
        residentialCountry,
        residentialProvince,
        residentialDistrict,
        residentialAreaVillage,
        residentialPlotStreet,
        residentialPostalCode,

        // Postal Address
        sameAsResidential,
        postalCountry: sameAsResidential ? residentialCountry : postalCountry,
        postalProvince: sameAsResidential ? residentialProvince : postalProvince,
        postalDistrict: sameAsResidential ? residentialDistrict : postalDistrict,
        postalAreaVillage: sameAsResidential ? residentialAreaVillage : postalAreaVillage,
        postalPoBox: sameAsResidential
          ? (postalPoBox || (residentialPlotStreet ? `Plot/Street: ${residentialPlotStreet}` : 'P. O. Box 50062'))
          : postalPoBox,
        postalPostalCode: sameAsResidential ? residentialPostalCode : postalPostalCode,
      },
      guarantor: {
        fullName: guarantorName || 'Rev. Clement Mwila',
        nrcNumber: guarantorNrc || '102948/11/1',
        profession: guarantorProfession,
        phoneNumber: guarantorPhone || '+260977223344',
        organization: guarantorOrg,
        verified: true,
      },
      documents: [
        {
          id: `doc-${Date.now()}-photo`,
          name: 'passport_photo.jpg',
          type: 'Recent Passport-Size Photo',
          status: 'APPROVED',
          uploadedAt: new Date().toISOString(),
          aiScore: photoAiScore || 98,
          feedback: photoFeedback || 'Passed ICAO Doc 9303 ML optical pre-flight checks.',
        },
        {
          id: `doc-${Date.now()}-nrc`,
          name: 'applicant_green_nrc.pdf',
          type: 'Copy of Applicant’s National Registration Card (NRC)',
          status: 'APPROVED',
          uploadedAt: new Date().toISOString(),
          aiScore: nrcAiScore || 96,
          feedback: nrcFeedback || 'Zambian Green NRC format 123456/78/1 verified.',
        },
        ...serviceDocs
          .filter((d) => d.uploaded)
          .map((d) => ({
            id: d.id,
            name: d.filename,
            type: d.type,
            status: (d.status || 'APPROVED') as any,
            uploadedAt: new Date().toISOString(),
            aiScore: d.score || 95,
            feedback: d.summary || `${d.type} verified against GRZ eligibility criteria.`,
          })),
      ],
      notifications: [
        {
          id: `notif-${Date.now()}-1`,
          timestamp: new Date().toISOString(),
          channel: 'SMS',
          subject: 'MoHAIS OPAS Submission & Payment Confirmed',
          content: `MoHAIS OPAS: Dear ${fullName}, statutory fee payment of ZMW ${totalFee} received for Case #${trackingNum}. Application submitted to ${collectionOffice}. Biometrics appointment required within 14 days.`,
          deliveryStatus: 'Delivered',
        },
        {
          id: `notif-${Date.now()}-2`,
          timestamp: new Date().toISOString(),
          channel: 'Email',
          subject: `OPAS Dossier #${trackingNum} Official Receipt`,
          content: `Your e-passport dossier has been officially queued for officer review at ${collectionOffice}.`,
          deliveryStatus: 'Delivered',
        },
      ],
      officerNotes: `Submitted via AI-assisted Interactive Prototype with verified Case Details: Filing=${filingOnBehalf}, Type=${applicantType}, Service=${serviceType}, Center=${collectionOffice}.`,
      lastUpdated: new Date().toISOString(),
      collectionOffice,
      isUrgent: serviceSpeed.includes('Express'),
    };

    setTimeout(() => {
      setSubmitting(false);
      onSubmitSuccess(newApplication);
    }, 1100);
  };

  return (
    <div className="space-y-4">
      {/* =========================================================================
          TOP BANNER: HIGH-TRUST MOHAIS GOVERNMENT PORTAL BRANDING
         ========================================================================= */}
      <div className="bg-[#0F2942] text-white rounded-2xl p-4 sm:p-5 shadow-md border-b-4 border-emerald-600">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-700/90 border border-emerald-500/50 flex items-center justify-center text-white shadow-xs shrink-0">
              <Shield className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded uppercase tracking-wider">
                  Republic of Zambia &bull; MoHAIS OPAS
                </span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded font-mono hidden sm:inline">
                  Interactive Prototype
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                New e-Passport Application &amp; Case Intake
              </h1>
              <p className="text-xs text-slate-300">
                With integrated MoHAIS Case Details, live conversational AI synchronization &amp; optical document pre-flight checks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 block font-mono">Official Registry</span>
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1 justify-end font-mono">
                <FolderOpen className="w-3.5 h-3.5" /> Case #{caseNumber}
              </span>
            </div>
            <button
              onClick={onCancel}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN INTERACTIVE PROTOTYPE GRID
          Left: Conversational Assistant with Live Context Sync
          Right: 4-Step Passport Application Wizard (with integrated Case Details)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* =======================================================================
            LEFT PANEL: CONVERSATIONAL ASSISTANT & LIVE CONTEXT RADAR (5 Cols)
           ======================================================================= */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[780px] sticky top-28">
          {/* Assistant Header */}
          <div className="bg-[#0F2942] text-white p-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0F2942]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">MoHAIS Assistant</h3>
                    <span className="text-[10px] font-mono bg-emerald-900/60 text-emerald-300 px-1.5 py-0.2 rounded font-bold border border-emerald-500/30">
                      LIVE AI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Always listening &amp; synchronizing with active case form focus
                  </p>
                </div>
              </div>

              {/* Speech & Audio Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAutoVoice(!autoVoice)}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    autoVoice
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title={autoVoice ? 'Voice synthesis enabled' : 'Enable voice readouts'}
                >
                  {autoVoice ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatMessages([
                      {
                        id: `reset-${Date.now()}`,
                        sender: 'assistant',
                        text: `Case #${caseNumber} synchronized. I am ready to guide your case details, Green NRC input, and document vetting.`,
                        timestamp: 'Just now',
                      },
                    ]);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Clear conversation"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Context Synchronization Bar */}
            <div className="mt-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-2.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="text-[11px] leading-tight text-emerald-100 flex-1 truncate">
                <span className="text-emerald-300 font-bold">Live Context Sync:</span>{' '}
                <span className="font-semibold text-white">
                  {focusedField && FIELD_CONTEXT_TIPS[focusedField]
                    ? FIELD_CONTEXT_TIPS[focusedField].label
                    : 'Awaiting field selection...'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick-Question Pills Carousel */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Ask:
              </span>
              {QUICK_QUESTION_PILLS.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => handleSendChat(pill)}
                  className="text-[11px] font-semibold bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-300 hover:border-emerald-300 px-2.5 py-1 rounded-full transition-colors cursor-pointer shadow-2xs"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Message Feed */}
          <div
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fafc] text-xs"
          >
            {chatMessages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${
                    isAssistant ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {isAssistant && (
                    <div className="w-6 h-6 rounded-full bg-[#0F2942] text-white flex items-center justify-center shrink-0 mt-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 shadow-2xs leading-relaxed ${
                      isAssistant
                        ? msg.fieldTrigger
                          ? 'bg-emerald-50/90 text-emerald-950 border border-emerald-300/80 rounded-tl-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                        : 'bg-[#0F2942] text-white rounded-tr-xs'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>

                    <div
                      className={`flex items-center justify-between gap-2 mt-1.5 pt-1 text-[10px] ${
                        isAssistant ? 'text-slate-400' : 'text-slate-300'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isAssistant && (
                        <button
                          type="button"
                          onClick={() => speakText(msg.text, msg.id)}
                          className={`hover:text-emerald-700 transition-colors p-0.5 cursor-pointer ${
                            currentlySpeakingId === msg.id
                              ? 'text-emerald-600 font-bold'
                              : ''
                          }`}
                          title="Listen to this explanation"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!isAssistant && (
                    <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {aiLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-full bg-[#0F2942] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-2xs flex items-center gap-1.5 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                  <span className="text-[11px] ml-1 font-semibold text-slate-600">
                    Querying MoHAIS policy rules...
                  </span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Interactive Chat Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={handleToggleMic}
                className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                  isListening
                    ? 'bg-red-500 text-white border-red-600 animate-pulse'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                }`}
                title={isListening ? 'Listening...' : 'Voice Input (Microphone)'}
              >
                {isListening ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask assistant about case details, requirements..."
                className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />

              <button
                type="submit"
                disabled={!chatInput.trim() || aiLoading}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-colors cursor-pointer shadow-xs"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* =======================================================================
            RIGHT PANEL: PASSPORT APPLICATION WIZARD (7 Cols)
            Features 4 Steps with INTEGRATED CASE DETAILS in Step 1
           ======================================================================= */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Step Progress Tabs Bar */}
          <div className="bg-slate-100 border-b border-slate-200 p-2 sm:p-3">
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {[
                { num: 1, label: 'Case & Identity', icon: FolderOpen },
                { num: 2, label: 'Person & Address', icon: Home },
                { num: 3, label: 'Documents', icon: Camera },
                { num: 4, label: 'Payment', icon: CreditCard },
              ].map((s) => {
                const Icon = s.icon;
                const isActive = step === s.num;
                const isPassed = step > s.num;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setStep(s.num)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#0F2942] text-white shadow-xs'
                        : isPassed
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPassed ? <Check className="w-3 h-3" /> : s.num}
                    </div>
                    <span className="truncate hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {formIssues.length > 0 && (
            <section className="border-b border-amber-200 bg-amber-50/70 px-4 py-3 sm:px-6" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Application check: {blockingFormIssues.length} item{blockingFormIssues.length === 1 ? '' : 's'} to fix
                    {formIssues.some((issue) => issue.severity === 'warning') && ` · ${formIssues.filter((issue) => issue.severity === 'warning').length} review suggestion${formIssues.filter((issue) => issue.severity === 'warning').length === 1 ? '' : 's'}`}
                  </p>
                  <p className="text-[11px] text-amber-800">Rules-based checks of the information entered here; suggestions need your review.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendChat('Review the issues currently detected in my application form and explain how I can fix them.')}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-950 hover:bg-amber-100"
                >
                  Ask assistant to explain
                </button>
              </div>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {formIssues.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`} className="flex items-start gap-2 text-[11px] text-amber-950">
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${issue.severity === 'error' ? 'bg-red-600' : 'bg-amber-500'}`} />
                    <span className="min-w-0 flex-1"><strong>{issue.field}:</strong> {issue.message}</span>
                    <button type="button" onClick={() => setStep(issue.step)} className="shrink-0 font-semibold underline underline-offset-2">Step {issue.step}</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Form Body Container */}
          <div className="p-5 sm:p-7">
            {/* ===================================================================
                STEP 1: CASE DETAILS & PERSONAL IDENTITY (INTEGRATED)
               =================================================================== */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded uppercase">
                      Step 1 of 4 &bull; Integrated Case Intake
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Official Dossier Setup
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    MoHAIS Case Details &amp; Personal Identification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Establishes your official immigration filing parameters and cross-references your civil identity with the Registrar General.
                  </p>
                </div>

                {/* ===============================================================
                    MOVED FROM VALIDATION: OFFICIAL CASE DETAILS CARD
                   =============================================================== */}
                <div className="bg-slate-50 border-2 border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0F2942] text-white flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Official MoHAIS Case Details
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          {caseAgency}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 shadow-2xs">
                      Ref: {caseNumber}
                    </span>
                  </div>

                  {/* Case Details Grid 1: Service Category & Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Service Category
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={serviceCategory}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Service Type / Classification *
                      </label>
                      <select
                        value={serviceType}
                        onFocus={() => handleFieldFocus('serviceType')}
                        onChange={(e) => setServiceType(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      >
                        <option value="New Ordinary Passport (32 Pages)">New Ordinary Passport (32 Pages)</option>
                        <option value="Frequent Traveler Passport (48 Pages)">Frequent Traveler Passport (48 Pages)</option>
                        <option value="Replacement of Lost/Stolen Passport">Replacement of Lost/Stolen Passport</option>
                        <option value="Renewal of Expired Passport">Renewal of Expired Passport</option>
                        <option value="Express Fast-Track Passport Service">Express Fast-Track Passport Service</option>
                      </select>
                    </div>
                  </div>

                  {/* Case Details Grid 2: Filing On Behalf & Applicant Classification */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Filing on Behalf of Another Person? *
                      </label>
                      <select
                        value={filingOnBehalf}
                        onFocus={() => handleFieldFocus('filingOnBehalf')}
                        onChange={(e) => setFilingOnBehalf(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      >
                        <option value="No (Self-Application)">No (Self-Application)</option>
                        <option value="Yes (Minor child under 16)">Yes (Minor child under 16)</option>
                        <option value="Yes (Legal Guardian/Ward)">Yes (Legal Guardian/Ward)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Applicant Classification *
                      </label>
                      <select
                        value={applicantType}
                        onFocus={() => handleFieldFocus('applicantType')}
                        onChange={(e) => setApplicantType(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      >
                        <option value="Adult (16+ years)">Adult (16+ years)</option>
                        <option value="Minor (Under 16 years)">Minor (Under 16 years)</option>
                      </select>
                    </div>
                  </div>

                  {/* Case Details: Designated Passport Office */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Designated Biometrics Center &amp; Interview Office *
                    </label>
                    <select
                      value={collectionOffice}
                      onFocus={() => handleFieldFocus('collectionOffice')}
                      onChange={(e) => setCollectionOffice(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="Lusaka Central Passport Office (Makishi Road)">Lusaka Central Passport Office (Makishi Road)</option>
                      <option value="Ndola Regional Passport Office (President Avenue)">Ndola Regional Passport Office (President Avenue)</option>
                      <option value="Livingstone Regional Passport Office">Livingstone Regional Passport Office</option>
                      <option value="Kitwe Provincial Passport Office">Kitwe Provincial Passport Office</option>
                      <option value="Chipata Provincial Center">Chipata Provincial Center</option>
                      <option value="Solwezi Provincial Passport Center">Solwezi Provincial Passport Center</option>
                      <option value="Kasama Provincial Center">Kasama Provincial Center</option>
                      <option value="Choma Provincial Passport Center">Choma Provincial Passport Center</option>
                    </select>
                  </div>
                </div>

                {/* ===============================================================
                    CIVIL IDENTITY & GREEN NRC SECTION
                   =============================================================== */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    Applicant Civil Identity
                  </h4>

                  {/* Full Legal Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Full Legal Name (As on Green NRC) *
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Surname, First Name, Middle Names
                      </span>
                    </div>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={fullName}
                        onFocus={() => handleFieldFocus('fullName')}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Chileshe Mulenga Banda"
                        className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  {/* Green NRC Number with Real-time Regex Syntax Check */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Green NRC Number (Format: 123456/78/1) *
                      </label>
                      {nrcNumber && nrcValidation.isValid && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Valid NRC Syntax
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <FileCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={nrcNumber}
                        onFocus={() => handleFieldFocus('nrcNumber')}
                        onChange={(e) => setNrcNumber(e.target.value)}
                        placeholder="e.g. 294812/11/1"
                        className={`w-full text-xs pl-9 pr-3 py-2.5 border rounded-xl font-mono focus:ring-2 focus:outline-hidden bg-white ${
                          nrcNumber && !nrcValidation.isValid
                            ? 'border-amber-400 bg-amber-50/20 text-amber-900 focus:ring-amber-500'
                            : 'border-slate-300 focus:ring-emerald-500 text-slate-900'
                        }`}
                      />
                    </div>
                    {nrcNumber && !nrcValidation.isValid ? (
                      <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{nrcValidation.message}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Standard Zambian format: 6 identity digits / 2 district code digits / 1 status digit.
                      </p>
                    )}
                  </div>

                  {/* Date of Birth & Gender Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                        Date of Birth *
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="date"
                          value={dateOfBirth}
                          onFocus={() => handleFieldFocus('dateOfBirth')}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                        Gender *
                      </label>
                      <select
                        value={gender}
                        onFocus={() => handleFieldFocus('gender')}
                        onChange={(e) =>
                          setGender(e.target.value as 'Male' | 'Female')
                        }
                        className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>

                  {/* Place of Birth & Marital Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                        Place of Birth (District) *
                      </label>
                      <input
                        type="text"
                        value={placeOfBirth}
                        onFocus={() => handleFieldFocus('placeOfBirth')}
                        onChange={(e) => setPlaceOfBirth(e.target.value)}
                        placeholder="e.g. Lusaka, Ndola, Kitwe"
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                        Marital Status *
                      </label>
                      <select
                        value={maritalStatus}
                        onFocus={() => handleFieldFocus('maritalStatus')}
                        onChange={(e) =>
                          setMaritalStatus(e.target.value as any)
                        }
                        className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Focus on any field to trigger conversational assistance.
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Proceed to Contact &amp; Location</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================================
                STEP 2: PERSON DETAILS - CONTACT, RESIDENTIAL & POSTAL ADDRESS
               =================================================================== */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded uppercase">
                      Step 2 of 4 &bull; Person Details
                    </span>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      Statutory Address Verification
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    Person Details: Residential &amp; Postal Address
                  </h3>
                  <p className="text-xs text-slate-500">
                    Provide your verified contact numbers, physical residential location, and official postal mailing address in accordance with Republic of Zambia Passport Regulations.
                  </p>
                </div>

                {/* Section A: Contact Communication */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Contact Communication
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Official SMS reminders, payment receipts &amp; collection notices
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mobile Phone */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Mobile Phone (Zambia +260) *
                        </label>
                        {phone && phoneValidation.isValid && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Valid E.164
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="px-2.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs font-mono font-bold text-slate-800"
                        >
                          <option value="+260">🇿🇲 +260 (Zambia)</option>
                          <option value="+27">🇿🇦 +27 (South Africa)</option>
                          <option value="+44">🇬🇧 +44 (UK)</option>
                          <option value="+1">🇺🇸 +1 (USA)</option>
                        </select>
                        <div className="relative flex-1">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            value={phone}
                            onFocus={() => handleFieldFocus('phone')}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 0977 123456 or 977123456"
                            className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                          />
                        </div>
                      </div>
                      {phoneValidation.warning && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-1.5 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{phoneValidation.warning}</span>
                        </p>
                      )}
                      {phoneValidation.error && phone && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{phoneValidation.error}</span>
                        </p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Email Address *
                        </label>
                        {email && emailValidation.isValid && !emailValidation.warning && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Valid Domain
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onFocus={() => handleFieldFocus('email')}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. chileshe.mulenga@gmail.com"
                          className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                        />
                      </div>
                      {emailValidation.warning && (
                        <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2 text-[11px] text-amber-900">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{emailValidation.warning}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAutoFixEmail}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[10px] cursor-pointer"
                          >
                            Auto-Fix
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section B: Residential Address */}
                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Home className="w-4 h-4 text-emerald-300" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">
                          Residential Address
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Physical domicile of applicant (P.O. Boxes not accepted for residence)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                      Civil Domicile
                    </span>
                  </div>

                  {/* Row 1: Country & Province / State */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                        Country *
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={residentialCountry}
                          onFocus={() => handleFieldFocus('residentialCountry')}
                          onChange={(e) => handleResidentialCountryChange(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                        >
                          <option value="Zambia">🇿🇲 Zambia</option>
                          <option value="South Africa">🇿🇦 South Africa</option>
                          <option value="United Kingdom">🇬🇧 United Kingdom</option>
                          <option value="United States">🇺🇸 United States</option>
                          <option value="Botswana">🇧🇼 Botswana</option>
                          <option value="Zimbabwe">🇿🇼 Zimbabwe</option>
                          <option value="Namibia">🇳🇦 Namibia</option>
                          <option value="Kenya">🇰🇪 Kenya</option>
                          <option value="Tanzania">🇹🇿 Tanzania</option>
                          <option value="Other Country">🌐 Other Country (Diaspora)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                        Province / State *
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={residentialProvince}
                          onFocus={() => handleFieldFocus('residentialProvince')}
                          onChange={(e) => handleResidentialProvinceChange(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                        >
                          <option value="Lusaka Province">Lusaka Province</option>
                          <option value="Copperbelt Province">Copperbelt Province</option>
                          <option value="Central Province">Central Province</option>
                          <option value="Southern Province">Southern Province</option>
                          <option value="Eastern Province">Eastern Province</option>
                          <option value="Northern Province">Northern Province</option>
                          <option value="North-Western Province">North-Western Province</option>
                          <option value="Western Province">Western Province</option>
                          <option value="Luapula Province">Luapula Province</option>
                          <option value="Muchinga Province">Muchinga Province</option>
                          <option value="Diaspora / Foreign State">Diaspora / Foreign State</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: District / City & Area / Village */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                        District / City *
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          list="residential-districts-list"
                          value={residentialDistrict}
                          onFocus={() => handleFieldFocus('residentialDistrict')}
                          onChange={(e) => handleResidentialDistrictChange(e.target.value)}
                          placeholder="e.g. Lusaka, Ndola, Kitwe, Livingstone"
                          className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                        />
                        <datalist id="residential-districts-list">
                          <option value="Lusaka" />
                          <option value="Ndola" />
                          <option value="Kitwe" />
                          <option value="Livingstone" />
                          <option value="Kabwe" />
                          <option value="Chipata" />
                          <option value="Solwezi" />
                          <option value="Kasama" />
                          <option value="Mansa" />
                          <option value="Mongu" />
                          <option value="Choma" />
                          <option value="Mazabuka" />
                          <option value="Chilanga" />
                          <option value="Kafue" />
                          <option value="Chongwe" />
                          <option value="Luanshya" />
                          <option value="Mufulira" />
                          <option value="Chingola" />
                          <option value="Kalulushi" />
                        </datalist>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                        Area / Village *
                      </label>
                      <input
                        type="text"
                        value={residentialAreaVillage}
                        onFocus={() => handleFieldFocus('residentialAreaVillage')}
                        onChange={(e) => handleResidentialAreaVillageChange(e.target.value)}
                        placeholder="e.g. Woodlands, Riverside, or Chief Nondo Village"
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  {/* Row 3: Plot, Street & Postal / ZIP Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Plot, Street *
                        </label>
                        <span className="text-[10px] text-slate-400">House / Stand &amp; Street</span>
                      </div>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={residentialPlotStreet}
                          onFocus={() => handleFieldFocus('residentialPlotStreet')}
                          onChange={(e) => handleResidentialPlotStreetChange(e.target.value)}
                          placeholder="e.g. Plot 418, Independence Avenue or House 14, Riverside Drive"
                          className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                        Postal / ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={residentialPostalCode}
                        onFocus={() => handleFieldFocus('residentialPostalCode')}
                        onChange={(e) => handleResidentialPostalCodeChange(e.target.value)}
                        placeholder="e.g. 10101"
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Postal Address */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0F2942] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Mail className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">
                          Postal Address
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Official mailing destination for written statutory notices &amp; slips
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded">
                      Dispatch Route
                    </span>
                  </div>

                  {/* Postal Address is the Same as Residential Address Checkbox */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sameAsResidential}
                        onFocus={() => handleFieldFocus('postalSameCheck')}
                        onChange={(e) => handleToggleSameAsResidential(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Postal Address is the Same as Residential Address
                      </span>
                    </label>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {sameAsResidential ? 'Auto-Synchronized' : 'Separate Postal Box'}
                    </span>
                  </div>

                  {/* Auto-Sync Confirmation Banner */}
                  {sameAsResidential ? (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Postal mail linked to Residential Address</span>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-5 leading-relaxed">
                        Mailing Address: <strong>{residentialPlotStreet || 'Plot/Street specified above'}</strong>
                        {residentialAreaVillage ? `, ${residentialAreaVillage}` : ''}, {residentialDistrict}, {residentialProvince}, {residentialCountry} (Postal Code: {residentialPostalCode}).
                      </p>
                      <div className="pt-2 border-t border-emerald-200/60 pl-5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                          P. O. Box (Optional if you have a physical Post Box)
                        </label>
                        <input
                          type="text"
                          value={postalPoBox}
                          onFocus={() => handleFieldFocus('postalPoBox')}
                          onChange={(e) => setPostalPoBox(e.target.value)}
                          placeholder="e.g. P. O. Box 50062 or Private Bag 1 (or leave blank to use street)"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                        />
                      </div>
                    </div>
                  ) : (
                    /* When NOT Same as Residential: Full Postal Address Form */
                    <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                      {/* Row 1: Country & Province / State */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                            Country *
                          </label>
                          <div className="relative">
                            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select
                              value={postalCountry}
                              onFocus={() => handleFieldFocus('postalCountry')}
                              onChange={(e) => setPostalCountry(e.target.value)}
                              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                            >
                              <option value="Zambia">🇿🇲 Zambia</option>
                              <option value="South Africa">🇿🇦 South Africa</option>
                              <option value="United Kingdom">🇬🇧 United Kingdom</option>
                              <option value="United States">🇺🇸 United States</option>
                              <option value="Botswana">🇧🇼 Botswana</option>
                              <option value="Zimbabwe">🇿🇼 Zimbabwe</option>
                              <option value="Namibia">🇳🇦 Namibia</option>
                              <option value="Kenya">🇰🇪 Kenya</option>
                              <option value="Tanzania">🇹🇿 Tanzania</option>
                              <option value="Other Country">🌐 Other Country</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                            Province / State *
                          </label>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select
                              value={postalProvince}
                              onFocus={() => handleFieldFocus('postalProvince')}
                              onChange={(e) => setPostalProvince(e.target.value)}
                              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                            >
                              <option value="Lusaka Province">Lusaka Province</option>
                              <option value="Copperbelt Province">Copperbelt Province</option>
                              <option value="Central Province">Central Province</option>
                              <option value="Southern Province">Southern Province</option>
                              <option value="Eastern Province">Eastern Province</option>
                              <option value="Northern Province">Northern Province</option>
                              <option value="North-Western Province">North-Western Province</option>
                              <option value="Western Province">Western Province</option>
                              <option value="Luapula Province">Luapula Province</option>
                              <option value="Muchinga Province">Muchinga Province</option>
                              <option value="Foreign / Other State">Foreign / Other State</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: District / City & Area / Village */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                            District / City *
                          </label>
                          <div className="relative">
                            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              list="postal-districts-list"
                              value={postalDistrict}
                              onFocus={() => handleFieldFocus('postalDistrict')}
                              onChange={(e) => setPostalDistrict(e.target.value)}
                              placeholder="e.g. Lusaka, Ndola, Kitwe, Livingstone"
                              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                            />
                            <datalist id="postal-districts-list">
                              <option value="Lusaka" />
                              <option value="Ndola" />
                              <option value="Kitwe" />
                              <option value="Livingstone" />
                              <option value="Kabwe" />
                              <option value="Chipata" />
                              <option value="Solwezi" />
                              <option value="Kasama" />
                              <option value="Mansa" />
                              <option value="Mongu" />
                            </datalist>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                            Area / Village
                          </label>
                          <input
                            type="text"
                            value={postalAreaVillage}
                            onFocus={() => handleFieldFocus('postalAreaVillage')}
                            onChange={(e) => setPostalAreaVillage(e.target.value)}
                            placeholder="e.g. Central Post Agency or Main Post Office"
                            className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      {/* Row 3: P. O. Box & Postal / ZIP Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                            P. O. Box *
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={postalPoBox}
                              onFocus={() => handleFieldFocus('postalPoBox')}
                              onChange={(e) => setPostalPoBox(e.target.value)}
                              placeholder="e.g. P. O. Box 50062, Ridgeway"
                              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                            Postal / ZIP Code *
                          </label>
                          <input
                            type="text"
                            value={postalPostalCode}
                            onFocus={() => handleFieldFocus('postalPostalCode')}
                            onChange={(e) => setPostalPostalCode(e.target.value)}
                            placeholder="e.g. 10101"
                            className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-slate-900 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step Navigation Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!isStep2Valid}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Proceed to Documents &amp; Guarantor</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================================
                STEP 3: DOCUMENT ATTACHMENTS & ELIGIBILITY REQUIREMENTS
               =================================================================== */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded uppercase">
                      Step 3 of 4 &bull; ML Document Intelligence
                    </span>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      GRZ Statutory Standards
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    Statutory Eligibility Requirements &amp; Verification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify standard applicant credentials and attach case-specific documents. Our trained ML engine inspects each civil record against official GRZ statutory rules.
                  </p>
                </div>

                {/* Official Statutory Document Resource Card: Form 'A' & Form 'N' */}
                <div className="p-4 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl shadow-sm border border-emerald-600/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black tracking-tight text-white">
                            Official GRZ Form 'A' &amp; Form 'N' Statutory Template
                          </h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded">
                            Trained ML Grounding
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Republic of Zambia &bull; Ministry of Home Affairs &bull; Department of National Registration, Passport and Citizenship
                        </p>
                      </div>
                    </div>

                    <a
                      href="/assets/aistudio/FORM_A.cdr_-_PASSPORT-FORM-A-WITH-FORM-N_e231ef28.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>View Official PDF (5 Pages)</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-xs">
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                      <span className="font-bold text-emerald-300 block mb-0.5">Form 'A' (16+ Adult Application):</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Sections 1–10. Note 4(d) mandates Recommender endorse photo reverse: <em className="text-amber-200 font-semibold">"I certify that this is a true likeness of the applicant Mr./Mrs./Miss... [Signature &amp; Stamp]"</em>. Relatives strictly barred. Minors under 16 must use Form 'B'.
                      </p>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                      <span className="font-bold text-emerald-300 block mb-0.5">Form 'N' (Affidavit of Birth):</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Sworn before Commissioner for Oaths or Magistrate. Requires ancestral origin (Village, Chief, Tribe, District) &amp; Schools Attended Table (Primary, Secondary, Tertiary) with parents' lineages.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ===============================================================
                    1. STANDARD REQUIREMENTS FOR APPLICANT (MANDATORY)
                   =============================================================== */}
                <div
                  onFocus={() => handleFieldFocus('standardRequirements')}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Standard Requirements for Applicant
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Mandatory for all Zambian citizen passport applicants
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                      2 of 2 Required
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Standard Requirement 1: Copy of Applicant's NRC */}
                    <div
                      onFocus={() => handleFieldFocus('nrcScan')}
                      className={`p-4 rounded-xl border transition-all ${
                        nrcDocUploaded
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">
                              Copy of Applicant’s National Registration Card (NRC)
                            </h5>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Format: 6/2/1 Digits &bull; Both Sides
                            </span>
                          </div>
                        </div>
                        {nrcDocUploaded && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {nrcAiScore}%
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 mb-3">
                        Full-color scan of both front and back sides of your Green NRC showing registration district code and portrait.
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {nrcDocUploaded ? 'applicant_green_nrc.pdf' : 'No document attached'}
                        </span>
                        <button
                          type="button"
                          onClick={handleValidateStandardNrc}
                          disabled={nrcValidating}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          {nrcValidating ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Scanning...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>{nrcDocUploaded ? 'Re-inspect NRC' : 'Upload & ML Inspect'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {nrcDocUploaded && nrcFeedback && (
                        <div className="mt-2.5 p-2 bg-emerald-100/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-950 flex items-start gap-1.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span>{nrcFeedback}</span>
                        </div>
                      )}
                    </div>

                    {/* Standard Requirement 2: Recent Passport-Size Photo */}
                    <div
                      onFocus={() => handleFieldFocus('passportPhoto')}
                      className={`p-4 rounded-xl border transition-all ${
                        photoUploaded
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">
                              Recent Passport-Size Photo
                            </h5>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ICAO Doc 9303 &bull; 45mm &times; 35mm
                            </span>
                          </div>
                        </div>
                        {photoUploaded && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {photoAiScore}%
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 mb-3">
                        Plain uniform off-white/light-grey background, neutral expression, zero spectacle glare or shadows.
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {photoUploaded ? 'passport_photo_compliant.jpg' : 'No photo uploaded'}
                        </span>
                        <button
                          type="button"
                          onClick={handleSimulatePhotoUpload}
                          disabled={photoValidating}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          {photoValidating ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Inspecting...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>{photoUploaded ? 'Re-inspect Photo' : 'Upload & ML Inspect'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {photoUploaded && photoFeedback && (
                        <div className="mt-2.5 p-2 bg-emerald-100/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-950 flex items-start gap-1.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span>{photoFeedback}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ===============================================================
                    2. SERVICE SPECIFIC REQUIREMENTS
                   =============================================================== */}
                <div
                  onFocus={() => handleFieldFocus('serviceSpecificDocs')}
                  className="space-y-3 pt-3 border-t border-slate-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Service specific Requirements
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Attach and train the ML inspector on civil records relevant to your passport application type
                      </p>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">1-Click Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleBatchAddPreset('lost')}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        + Lost Passport
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchAddPreset('renewal')}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        + Renewal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchAddPreset('minor')}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        + Minor / Youth
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchAddPreset('formN')}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        + Form 'N' (Affidavit)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchAddPreset('formA')}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        + Form 'A' (16+)
                      </button>
                    </div>
                  </div>

                  {/* Add Document Selector */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={selectedServiceReqToAdd}
                      onChange={(e) => setSelectedServiceReqToAdd(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="">Select Service-Specific Requirement to Add ({SERVICE_SPECIFIC_REQUIREMENTS.length} official categories)...</option>
                      {SERVICE_SPECIFIC_REQUIREMENTS.map((req) => (
                        <option
                          key={req}
                          value={req}
                          disabled={serviceDocs.some((d) => d.type === req)}
                        >
                          {req} {serviceDocs.some((d) => d.type === req) ? '(Already Added)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedServiceReqToAdd}
                      onClick={() => handleAddServiceDoc(selectedServiceReqToAdd)}
                      className="px-4 py-2 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Requirement</span>
                    </button>
                  </div>

                  {/* List of Active Service-Specific Requirements */}
                  {serviceDocs.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                      No service-specific items added yet. Select a requirement above or choose a 1-click preset.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {serviceDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            doc.uploaded
                              ? 'bg-blue-50/40 border-blue-200'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <FileCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{doc.type}</span>
                                  {doc.uploaded && (
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-900 rounded">
                                      Score: {doc.score || 95}%
                                    </span>
                                  )}
                                </h5>
                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  Attachment: {doc.filename}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => handleValidateServiceDoc(doc.id, doc.type)}
                                disabled={doc.validating}
                                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                {doc.validating ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Verifying...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3" />
                                    <span>{doc.uploaded ? 'Re-inspect' : 'Run ML Inspection'}</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveServiceDoc(doc.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove requirement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {doc.uploaded && doc.summary && (
                            <div className="mt-2.5 p-2 bg-blue-100/60 border border-blue-200 rounded-lg text-[11px] text-blue-950 flex items-start gap-1.5">
                              <BadgeCheck className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p>{doc.summary}</p>
                                {doc.recommendations && doc.recommendations.length > 0 && (
                                  <p className="text-[10px] text-blue-800 font-medium mt-0.5">
                                    MoHAIS Protocol: {doc.recommendations[0]}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Guarantor Section */}
                <div className="border border-slate-200 rounded-2xl p-4 space-y-3.5 bg-white">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-700" />
                      Guarantor Declaration (Prescribed Form)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      An authorized Zambian professional who has personally known you for at least 2 years.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Guarantor Full Legal Name *
                      </label>
                      <input
                        type="text"
                        value={guarantorName}
                        onFocus={() => handleFieldFocus('guarantorName')}
                        onChange={(e) => setGuarantorName(e.target.value)}
                        placeholder="e.g. Rev. Clement Mwila"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Guarantor Green NRC (123456/78/1) *
                      </label>
                      <input
                        type="text"
                        value={guarantorNrc}
                        onFocus={() => handleFieldFocus('guarantorNrc')}
                        onChange={(e) => setGuarantorNrc(e.target.value)}
                        placeholder="102948/11/1"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Authorized Profession *
                      </label>
                      <select
                        value={guarantorProfession}
                        onFocus={() => handleFieldFocus('guarantorProfession')}
                        onChange={(e) => setGuarantorProfession(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Senior Civil Servant">Senior Civil Servant</option>
                        <option value="Legal Practitioner / Lawyer">Legal Practitioner / Lawyer</option>
                        <option value="Magistrate">Magistrate</option>
                        <option value="Minister of Religion / Clergy">Minister of Religion / Clergy</option>
                        <option value="Head Teacher / Principal">Head Teacher / Principal</option>
                        <option value="Medical Doctor">Medical Doctor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Guarantor Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={guarantorPhone}
                        onFocus={() => handleFieldFocus('guarantorPhone')}
                        onChange={(e) => setGuarantorPhone(e.target.value)}
                        placeholder="+260 977 223344"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  {/* Form 'A' Section 7 & Note 4(d) Prescribed Recommender Attestation Callout */}
                  <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-1.5 text-xs text-amber-950">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                      <span>Form 'A' Note 4(d) &amp; Section 7 Statutory Endorsement Mandate:</span>
                    </div>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      Your recommender MUST endorse the reverse of one photograph with the exact statutory clause:
                      <span className="block mt-1 font-mono font-semibold bg-amber-100/80 p-1.5 rounded border border-amber-300/80 text-[10px] text-amber-950">
                        “I certify that this is a true likeness of the applicant {fullName || 'Mr./Mrs./Miss...'} [Signature, Date &amp; Official Rubber Stamp]”
                      </span>
                    </p>
                    <p className="text-[10px] text-amber-800">
                      &bull; <strong>Strict Statutory Rule:</strong> Relatives of the applicant are strictly prohibited from acting as recommender. Must have known the applicant personally for at least 2 years.
                    </p>
                  </div>
                </div>

                {/* Step Navigation Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={!isStep3Valid}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Proceed to Category &amp; Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================================
                STEP 4: PASSPORT CATEGORY, REVIEW & FEE PAYMENT
               =================================================================== */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded uppercase">
                      Step 4 of 4
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Government Payment Gateway (GPG)
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    Booklet Category, Case Dossier Review &amp; Statutory Payment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify statutory fee. Reverted cases never require fee repayment under OPAS rules.
                  </p>
                </div>

                {/* Passport Booklet Category Choice */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Select Passport Category *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => {
                        setPassportType('32-Page Ordinary');
                        handleFieldFocus('passportType');
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        passportType === '32-Page Ordinary'
                          ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          32-Page Ordinary
                        </span>
                        <span className="text-sm font-black font-mono text-emerald-900">
                          ZMW 500
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        10-year validity. Standard tourism &amp; personal travel.
                      </p>
                    </div>

                    <div
                      onClick={() => {
                        setPassportType('48-Page Frequent Traveler');
                        handleFieldFocus('passportType');
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        passportType === '48-Page Frequent Traveler'
                          ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          48-Page Frequent Traveler
                        </span>
                        <span className="text-sm font-black font-mono text-emerald-900">
                          ZMW 1,000
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        48 heavy-duty pages for regular regional trade &amp; business travel.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service Speed Option */}
                <div
                  onFocus={() => handleFieldFocus('serviceSpeed')}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Express Expedited Service (3–5 working days)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fast-track biometric vetting and central booklet personalization.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceSpeed.includes('Express')}
                      onChange={(e) =>
                        setServiceSpeed(
                          e.target.checked
                            ? 'Express Expedited (3-5 days)'
                            : 'Standard (14-21 days)'
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* ===============================================================
                    COMPREHENSIVE CASE DETAILS & DOSSIER REVIEW SUMMARY
                   =============================================================== */}
                <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Verified MoHAIS Case Details &amp; Application Dossier
                      </h4>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Case #{caseNumber}
                    </span>
                  </div>

                  {/* Case filing parameters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl text-[11px] border border-slate-200/80">
                    <div>
                      <span className="text-slate-400 block font-medium">Service Type:</span>
                      <span className="font-bold text-slate-900 block truncate">{serviceType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Filing Entity:</span>
                      <span className="font-bold text-slate-900 block truncate">{filingOnBehalf}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Classification:</span>
                      <span className="font-bold text-slate-900 block truncate">{applicantType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Interview Office:</span>
                      <span className="font-bold text-slate-900 block truncate">{collectionOffice}</span>
                    </div>
                  </div>

                  {/* Applicant Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-medium">Applicant:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {fullName || 'Chileshe Mulenga'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Green NRC:</span>
                      <span className="font-mono font-bold text-slate-900 block">
                        {nrcNumber || '294812/11/1'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Phone (SMS Updates):</span>
                      <span className="font-mono font-bold text-slate-900 block truncate">
                        {phoneValidation.formatted || phone}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Guarantor:</span>
                      <span className="font-bold text-slate-900 block truncate">
                        {guarantorName || 'Rev. Clement Mwila'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Government Payment Gateway (GPG) Fee Breakdown */}
                <div
                  onFocus={() => handleFieldFocus('paymentMethod')}
                  className="bg-[#0F2942] text-white p-4 sm:p-5 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-emerald-800 pb-2.5">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-bold">
                        Government Payment Gateway (GPG)
                      </span>
                      <span className="text-sm font-bold text-white">
                        Statutory Passport Fee
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-400 block font-mono">Total Payable</span>
                      <span className="text-2xl font-black text-emerald-300 font-mono">
                        ZMW {totalFee.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-200/80 space-y-1">
                    <div className="flex justify-between">
                      <span>{passportType} statutory fee:</span>
                      <span className="font-mono font-bold">ZMW {baseFee}</span>
                    </div>
                    {speedFee > 0 && (
                      <div className="flex justify-between text-amber-300">
                        <span>Express processing surcharge:</span>
                        <span className="font-mono font-bold">+ZMW {speedFee}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selector */}
                  <div className="pt-2 border-t border-slate-700">
                    <label className="block text-[11px] font-bold text-emerald-200 mb-1.5 uppercase tracking-wider">
                      Select Payment Channel:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('momo');
                          setMomoProvider('mtn');
                        }}
                        className={`p-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                          paymentMethod === 'momo' && momoProvider === 'mtn'
                            ? 'bg-amber-400 text-slate-950 border-white shadow-xs'
                            : 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60 hover:bg-emerald-900'
                        }`}
                      >
                        MTN MoMo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('momo');
                          setMomoProvider('airtel');
                        }}
                        className={`p-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                          paymentMethod === 'momo' && momoProvider === 'airtel'
                            ? 'bg-red-500 text-white border-white shadow-xs'
                            : 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60 hover:bg-emerald-900'
                        }`}
                      >
                        Airtel Money
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                          paymentMethod === 'card'
                            ? 'bg-blue-600 text-white border-white shadow-xs'
                            : 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60 hover:bg-emerald-900'
                        }`}
                      >
                        Debit / Visa
                      </button>
                    </div>
                  </div>
                </div>

                {/* Statutory Terms Consent */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms-check"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  <label
                    htmlFor="terms-check"
                    className="text-[11px] text-slate-600 leading-relaxed cursor-pointer"
                  >
                    I certify that all Case Details and personal data submitted are accurate and match my Green NRC. I understand that submitting fraudulent information is punishable under the Passports Act of the Laws of Zambia.
                  </label>
                </div>

                {/* Final Submit Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submitting || !termsAgreed || blockingFormIssues.length > 0}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-md hover:scale-102"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing GPG Payment &amp; Filing Case...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>{blockingFormIssues.length ? `Resolve ${blockingFormIssues.length} form issue${blockingFormIssues.length === 1 ? '' : 's'} to continue` : `Authorize ZMW ${totalFee} &amp; Submit Application →`}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
