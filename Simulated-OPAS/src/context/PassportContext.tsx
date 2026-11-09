import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ApplicantUser,
  PassportApplication,
  ApplicationType,
  ApplicationStatus,
  PersonalDetails,
  FeeBreakdown,
  BiometricAppointment,
  PaymentDetails,
  ZambianPaymentMethod,
  GovernmentPaymentConfirmation,
  OpasPaymentApiRecord,
  OpasPaymentApiResponse,
} from '../types/passport';
import {
  INITIAL_DEMO_USERS,
  INITIAL_SAMPLE_APPLICATIONS,
  calculatePassportFees,
  ZAMBIAN_PASSPORT_OFFICES,
} from '../data/mockData';
import {
  simulateGovernmentPaymentGateway,
  postPaymentToOpasApi,
  getStoredLedger,
  resetOpasLedger,
  syncOpasApplicationStatuses,
} from '../services/opasPaymentApi';

interface PassportContextType {
  currentUser: ApplicantUser | null;
  applications: PassportApplication[];
  currentApp: PassportApplication | null;
  setCurrentAppId: (id: string | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'LOGIN' | 'REGISTER';
  setAuthModalMode: (mode: 'LOGIN' | 'REGISTER') => void;
  authPageMode: 'LOGIN' | 'REGISTER';
  setAuthPageMode: (mode: 'LOGIN' | 'REGISTER') => void;
  latestConfirmation: GovernmentPaymentConfirmation | null;
  latestApiRecord: OpasPaymentApiRecord | null;
  storedLedgerRecords: OpasPaymentApiRecord[];
  registerUser: (data: {
    fullName: string;
    email: string;
    phone: string;
    nrcNumber: string;
    dateOfBirth: string;
    password: string;
  }) => ApplicantUser;
  loginUser: (identifier: string) => boolean;
  logoutUser: () => void;
  switchUser: (userId: string) => void;
  startNewApplication: (type?: ApplicationType, userOverride?: ApplicantUser) => PassportApplication;
  updateCurrentApplication: (updates: Partial<PassportApplication>) => void;
  submitPayment: (
    paymentMethod: ZambianPaymentMethod,
    paymentMeta?: {
      amount?: number;
      mobileNumber?: string;
      cardNumber?: string;
      cardHolder?: string;
      last4?: string;
    }
  ) => Promise<{ success: boolean; confirmation?: GovernmentPaymentConfirmation; apiResponse?: OpasPaymentApiResponse }>;
  testOpasPaymentApiDirectly: (amount?: number) => Promise<OpasPaymentApiResponse>;
  confirmAppointment: (officeId: string, date: string, timeSlot: string) => void;
  resetAllData: () => void;
}


const STORAGE_KEY_APPS = 'opas_zambia_applications_v3';
const STORAGE_KEY_USER = 'opas_zambia_user_v3';
const STORAGE_KEY_USERS_LIST = 'opas_zambia_users_list_v3';

const defaultPersonalDetails: PersonalDetails = {
  surname: '',
  givenNames: '',
  maidenName: '',
  gender: 'MALE',
  maritalStatus: 'SINGLE',
  dateOfBirth: '',
  placeOfBirthTown: '',
  placeOfBirthDistrict: 'Lusaka',
  placeOfBirthProvince: 'Lusaka',
  nationality: 'Zambian',
  citizenshipAcquiredBy: 'BIRTH',
  nrcNumber: '',
  village: '',
  chief: '',
  districtOfOrigin: 'Lusaka',
  fatherFullName: '',
  fatherNrc: '',
  motherFullName: '',
  motherNrc: '',
  occupation: '',
  heightCm: 175,
  eyeColor: 'BROWN',
  hairColor: 'BLACK',
  visibleMarks: '',
  residentialAddress: '',
  townCity: 'Lusaka',
  province: 'Lusaka',
  mobilePhone: '',
  email: '',
  emergencyName: '',
  emergencyRelation: '',
  emergencyPhone: '',
  emergencyAddress: '',
};

const PassportContext = createContext<PassportContextType | undefined>(undefined);

export const PassportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<ApplicantUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS_LIST);
    return saved ? JSON.parse(saved) : INITIAL_DEMO_USERS;
  });

  const [currentUser, setCurrentUser] = useState<ApplicantUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [applications, setApplications] = useState<PassportApplication[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_APPS);
    return saved ? JSON.parse(saved) : INITIAL_SAMPLE_APPLICATIONS;
  });

  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authPageMode, setAuthPageMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Simulated Government Gateway & OPAS Payment API State
  const [latestConfirmation, setLatestConfirmation] = useState<GovernmentPaymentConfirmation | null>(null);
  const [latestApiRecord, setLatestApiRecord] = useState<OpasPaymentApiRecord | null>(null);
  const [storedLedgerRecords, setStoredLedgerRecords] = useState<OpasPaymentApiRecord[]>(() => getStoredLedger());

  useEffect(() => {
    const handleLedgerUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<OpasPaymentApiRecord[]>;
      if (customEvent.detail) {
        setStoredLedgerRecords(customEvent.detail);
      } else {
        setStoredLedgerRecords(getStoredLedger());
      }
    };
    window.addEventListener('opas_payment_ledger_updated', handleLedgerUpdate);
    return () => {
      window.removeEventListener('opas_payment_ledger_updated', handleLedgerUpdate);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(applications));
    // Simulated OPAS exposes current application status through its API.
    void syncOpasApplicationStatuses(applications.map(app => ({
      applicationReference: app.referenceNumber,
      applicantId: app.userId,
      applicationStatus: app.status,
      paymentStatus: app.payment.status,
      applicantName: `${app.personalDetails.givenNames} ${app.personalDetails.surname}`.trim(),
      email: app.personalDetails.email,
      phone: app.personalDetails.mobilePhone,
      nrcNumber: app.personalDetails.nrcNumber,
      amount: app.payment.amount || 500,
    })));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS_LIST, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [currentUser]);

  const currentApp = applications.find(a => a.id === currentAppId) || null;

  const registerUser = (data: {
    fullName: string;
    email: string;
    phone: string;
    nrcNumber: string;
    dateOfBirth: string;
    password: string;
  }): ApplicantUser => {
    const newUser: ApplicantUser = {
      id: `USR-ZM-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      nrcNumber: data.nrcNumber,
      dateOfBirth: data.dateOfBirth,
      createdAt: new Date().toISOString(),
    };

    // Register the same applicant identity with the local OPAS identity API so
    // SmartGuide can authenticate this account in a separate browser origin.
    void fetch('/api/identity/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newUser, password: data.password }),
    }).then(async response => {
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        console.error('Simulated OPAS identity registration failed:', result.error || response.statusText);
      }
    }).catch(error => console.error('Simulated OPAS identity API unavailable:', error));
    setUsers(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    setIsAuthModalOpen(false);
    return newUser;
  };

  const loginUser = (identifier: string): boolean => {
    const clean = identifier.trim().toLowerCase();
    const digitsOnly = clean.replace(/[^0-9]/g, '');

    const matched = users.find(u => {
      if (u.email.toLowerCase() === clean) return true;
      if (digitsOnly && u.nrcNumber.replace(/[^0-9]/g, '') === digitsOnly) return true;
      if (digitsOnly && u.phone.replace(/[^0-9]/g, '') === digitsOnly) return true;
      return false;
    });

    if (matched) {
      setCurrentUser(matched);
      setIsAuthModalOpen(false);
      return true;
    }
    return false;
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setCurrentAppId(null);
  };

  const switchUser = (userId: string) => {
    const matched = users.find(u => u.id === userId);
    if (matched) {
      setCurrentUser(matched);
      setCurrentAppId(null);
    }
  };

  const startNewApplication = (
    type: ApplicationType = 'NEW',
    userOverride?: ApplicantUser
  ): PassportApplication => {
    const activeUser = userOverride || currentUser;
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newRef = `ZM-PAS-2026-${randomSuffix}`;
    const newId = `APP-ZM-${Math.floor(1000 + Math.random() * 9000)}`;

    const names = (activeUser?.fullName || '').split(' ');
    const surname = names.length > 1 ? names[names.length - 1] : '';
    const givenNames = names.length > 1 ? names.slice(0, -1).join(' ') : activeUser?.fullName || '';

    const initialFees = calculatePassportFees('STANDARD_32', 'STANDARD');

    const newApp: PassportApplication = {
      id: newId,
      referenceNumber: newRef,
      userId: activeUser?.id || 'GUEST',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'DRAFT',
      currentStep: 1,
      applicationType: type,
      bookletType: 'STANDARD_32',
      processingSpeed: 'STANDARD',
      personalDetails: {
        ...defaultPersonalDetails,
        surname,
        givenNames,
        email: activeUser?.email || '',
        mobilePhone: activeUser?.phone || '',
        nrcNumber: activeUser?.nrcNumber || '',
        dateOfBirth: activeUser?.dateOfBirth || '',
      },
      previousPassportDetails: {
        hasPreviousPassport: type === 'RENEWAL' || type === 'REPLACEMENT_LOST',
      },
      documents: {},
      declaration: {
        agreed: false,
        digitalSignature: '',
      },
      payment: {
        status: 'UNPAID',
        amount: initialFees.total,
        breakdown: initialFees,
      },
      statusHistory: [
        {
          status: 'DRAFT',
          timestamp: new Date().toISOString(),
          note: 'Online Zambian passport application initiated by applicant',
          updatedBy: currentUser?.fullName || 'Applicant',
        },
      ],
    };

    setApplications(prev => [newApp, ...prev]);
    setCurrentAppId(newId);
    return newApp;
  };

  const updateCurrentApplication = (updates: Partial<PassportApplication>) => {
    if (!currentAppId) return;

    setApplications(prev =>
      prev.map(app => {
        if (app.id !== currentAppId) return app;

        const newBooklet = updates.bookletType || app.bookletType;
        const newSpeed = updates.processingSpeed || app.processingSpeed;
        const hasFeeImpact = updates.bookletType || updates.processingSpeed;

        let paymentUpdates = updates.payment ? { ...app.payment, ...updates.payment } : app.payment;
        if (hasFeeImpact && app.payment.status === 'UNPAID') {
          const fees = calculatePassportFees(newBooklet, newSpeed);
          paymentUpdates = {
            ...paymentUpdates,
            amount: fees.total,
            breakdown: fees,
          };
        }

        return {
          ...app,
          ...updates,
          payment: paymentUpdates,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const submitPayment = async (
    paymentMethod: ZambianPaymentMethod,
    paymentMeta?: {
      amount?: number;
      mobileNumber?: string;
      cardNumber?: string;
      cardHolder?: string;
      last4?: string;
    }
  ): Promise<{ success: boolean; confirmation?: GovernmentPaymentConfirmation; apiResponse?: OpasPaymentApiResponse }> => {
    if (!currentApp) {
      return { success: false };
    }

    const payableAmount = paymentMeta?.amount !== undefined ? paymentMeta.amount : (currentApp.payment.amount || 500);

    // 1. Invoke Simulated Government Payment Gateway
    // Generates test transaction reference and payment confirmation
    const confirmation = await simulateGovernmentPaymentGateway({
      amount: payableAmount,
      currency: 'ZMW',
      applicationReference: currentApp.referenceNumber,
      payerName: `${currentApp.personalDetails.givenNames} ${currentApp.personalDetails.surname}`.trim() || currentUser?.fullName || 'Applicant',
      payerNrc: currentApp.personalDetails.nrcNumber || currentUser?.nrcNumber || '381920/11/1',
      payerPhone: paymentMeta?.mobileNumber || currentApp.personalDetails.mobilePhone || currentUser?.phone || '+260 97 0000000',
      paymentChannel: paymentMethod,
    });

    setLatestConfirmation(confirmation);

    // 2. Invoke Simulated OPAS Payment API
    // Receives and stores: transactionReference, applicationReference, paymentStatus, and timestamp
    const apiResponse = await postPaymentToOpasApi({
      transactionReference: confirmation.transactionReference,
      applicationReference: currentApp.referenceNumber,
      paymentStatus: 'PAID',
      timestamp: confirmation.timestamp,
      amount: payableAmount,
      currency: 'ZMW',
      payerName: confirmation.payerName,
      payerNrc: confirmation.payerNrc,
      paymentMethod,
      gatewayConfirmation: confirmation,
    });

    setLatestApiRecord(apiResponse.record);

    const updatedPayment: PaymentDetails = {
      ...currentApp.payment,
      status: 'PAID',
      amount: payableAmount,
      paymentMethod,
      transactionId: confirmation.transactionReference,
      receiptNumber: confirmation.paymentRegistrationNumber,
      paidAt: confirmation.timestamp,
      mobileMoneyNumber: paymentMeta?.mobileNumber,
      cardLast4: paymentMeta?.last4 || '5192',
      cardBrand: paymentMethod === 'CREDIT_DEBIT_CARD' ? 'Bank Card (Visa/Mastercard)' : paymentMethod,
    };

    setApplications(prev =>
      prev.map(app => {
        if (app.id !== currentApp.id) return app;
        return {
          ...app,
          status: 'PAYMENT_COMPLETED',
          currentStep: 7, // Advance to Appointment & Slip
          payment: updatedPayment,
          updatedAt: new Date().toISOString(),
          statusHistory: [
            ...app.statusHistory,
            {
              status: 'PAYMENT_COMPLETED',
              timestamp: confirmation.timestamp,
              note: `Government statutory fee of K${payableAmount.toFixed(2)} ZMW cleared via ${paymentMethod}. Gateway Txn: ${confirmation.transactionReference}. Stored in OPAS API Ledger.`,
              updatedBy: 'ZamPay Government Gateway',
            },
          ],
        };
      })
    );

    return {
      success: true,
      confirmation,
      apiResponse,
    };
  };

  const testOpasPaymentApiDirectly = async (amount: number = 500): Promise<OpasPaymentApiResponse> => {
    const randomTxn = `TXN-GRZ-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const randomAppRef = currentApp ? currentApp.referenceNumber : `ZM-PAS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const timestamp = new Date().toISOString();

    const response = await postPaymentToOpasApi({
      transactionReference: randomTxn,
      applicationReference: randomAppRef,
      paymentStatus: 'PAID',
      timestamp,
      amount,
      currency: 'ZMW',
      payerName: currentUser?.fullName || 'Demo Applicant',
      payerNrc: currentUser?.nrcNumber || '381920/11/1',
      paymentMethod: 'AIRTEL_MONEY',
    });

    setLatestApiRecord(response.record);
    return response;
  };

  const confirmAppointment = (officeId: string, date: string, timeSlot: string) => {
    if (!currentApp) return;

    const office = ZAMBIAN_PASSPORT_OFFICES.find(o => o.id === officeId) || ZAMBIAN_PASSPORT_OFFICES[0];
    const code = `ZM-BIO-${office.town.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newAppointment: BiometricAppointment = {
      officeId: office.id,
      officeName: office.name,
      province: office.province,
      address: office.address,
      appointmentDate: date,
      appointmentTimeSlot: timeSlot,
      confirmationCode: code,
      bookedAt: new Date().toISOString(),
    };

    setApplications(prev =>
      prev.map(app => {
        if (app.id !== currentApp.id) return app;
        return {
          ...app,
          status: 'BIOMETRICS_SCHEDULED',
          appointment: newAppointment,
          updatedAt: new Date().toISOString(),
          statusHistory: [
            ...app.statusHistory,
            {
              status: 'BIOMETRICS_SCHEDULED',
              timestamp: new Date().toISOString(),
              note: `Biometrics appointment confirmed at ${office.name} on ${date} at ${timeSlot}`,
              updatedBy: 'OPAS Appointment Dispatcher',
            },
          ],
        };
      })
    );
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY_APPS);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_USERS_LIST);
    resetOpasLedger();
    setLatestConfirmation(null);
    setLatestApiRecord(null);
    setUsers(INITIAL_DEMO_USERS);
    setCurrentUser(null);
    setApplications(INITIAL_SAMPLE_APPLICATIONS);
    setCurrentAppId(null);
  };

  return (
    <PassportContext.Provider
      value={{
        currentUser,
        applications,
        currentApp,
        setCurrentAppId,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        authPageMode,
        setAuthPageMode,
        latestConfirmation,
        latestApiRecord,
        storedLedgerRecords,
        registerUser,
        loginUser,
        logoutUser,
        switchUser,
        startNewApplication,
        updateCurrentApplication,
        submitPayment,
        testOpasPaymentApiDirectly,
        confirmAppointment,
        resetAllData,
      }}
    >
      {children}
    </PassportContext.Provider>
  );
};

export const usePassport = () => {
  const context = useContext(PassportContext);
  if (!context) {
    throw new Error('usePassport must be used within a PassportProvider');
  }
  return context;
};
