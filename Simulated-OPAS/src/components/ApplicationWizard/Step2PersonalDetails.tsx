import React, { useState } from 'react';
import { usePassport } from '../../context/PassportContext';
import { PersonalDetails, ZambianProvince } from '../../types/passport';
import { ArrowLeft, ArrowRight, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

interface Step2PersonalDetailsProps {
  onNext: () => void;
  onBack: () => void;
}

const PROVINCES: ZambianProvince[] = [
  'Lusaka',
  'Copperbelt',
  'Central',
  'Southern',
  'Eastern',
  'Western',
  'Northern',
  'Luapula',
  'Muchinga',
  'North-Western',
];

export const Step2PersonalDetails: React.FC<Step2PersonalDetailsProps> = ({ onNext, onBack }) => {
  const { currentApp, updateCurrentApplication } = usePassport();

  if (!currentApp) return null;

  const [formData, setFormData] = useState<PersonalDetails>(currentApp.personalDetails);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatNRC = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (raw.length <= 6) return raw;
    if (raw.length <= 8) return `${raw.slice(0, 6)}/${raw.slice(6)}`;
    return `${raw.slice(0, 6)}/${raw.slice(6, 8)}/${raw.slice(8, 9)}`;
  };

  const handleChange = (field: keyof PersonalDetails, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.surname?.trim()) newErrors.surname = 'Surname is mandatory';
    if (!formData.givenNames?.trim()) newErrors.givenNames = 'Given names are mandatory';
    if (!formData.nrcNumber?.trim() || formData.nrcNumber.length < 9) {
      newErrors.nrcNumber = 'Valid National Registration Card (NRC) is mandatory (######/##/1)';
    }
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is mandatory';
    if (!formData.placeOfBirthTown?.trim()) newErrors.placeOfBirthTown = 'Town of birth is mandatory';
    if (!formData.village?.trim()) newErrors.village = 'Village / Chiefdom is mandatory';
    if (!formData.chief?.trim()) newErrors.chief = 'Traditional Chief is mandatory';
    if (!formData.districtOfOrigin?.trim()) newErrors.districtOfOrigin = 'District of Origin is mandatory';
    if (!formData.fatherFullName?.trim()) newErrors.fatherFullName = "Father's full legal name is mandatory";
    if (!formData.motherFullName?.trim()) newErrors.motherFullName = "Mother's full legal name is mandatory";
    if (!formData.residentialAddress?.trim()) newErrors.residentialAddress = 'Residential address is mandatory';
    if (!formData.townCity?.trim()) newErrors.townCity = 'Town / City is mandatory';
    if (!formData.mobilePhone?.trim()) newErrors.mobilePhone = 'Mobile phone number is mandatory';
    if (!formData.emergencyName?.trim()) newErrors.emergencyName = 'Emergency contact name is mandatory';
    if (!formData.emergencyPhone?.trim()) newErrors.emergencyPhone = 'Emergency phone is mandatory';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextClick = () => {
    if (validateAll()) {
      updateCurrentApplication({ personalDetails: formData });
      onNext();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFillSampleZambian = () => {
    const sample: PersonalDetails = {
      surname: 'Mwape',
      givenNames: 'Chileshe Natasha',
      maidenName: 'Chilufya',
      gender: 'FEMALE',
      maritalStatus: 'MARRIED',
      dateOfBirth: '1995-07-12',
      placeOfBirthTown: 'Lusaka',
      placeOfBirthDistrict: 'Lusaka',
      placeOfBirthProvince: 'Lusaka',
      nationality: 'Zambian',
      citizenshipAcquiredBy: 'BIRTH',
      nrcNumber: '419082/11/1',
      village: 'Chilanga',
      chief: 'Mwanja',
      districtOfOrigin: 'Lusaka',
      fatherFullName: 'Patrick Bwalya Mwape',
      fatherNrc: '198421/11/1',
      motherFullName: 'Grace Mutale Mwape',
      motherNrc: '220914/11/1',
      occupation: 'Biochemical Analyst',
      heightCm: 167,
      eyeColor: 'BROWN',
      hairColor: 'BLACK',
      visibleMarks: 'None',
      residentialAddress: 'Subdivision 14, Leopards Hill Road, Woodlands',
      townCity: 'Lusaka',
      province: 'Lusaka',
      mobilePhone: '+260 97 8419022',
      email: 'chileshe.mwape@sample.gov.zm',
      emergencyName: 'Patrick Bwalya Mwape',
      emergencyRelation: 'Father',
      emergencyPhone: '+260 97 7119900',
      emergencyAddress: 'Plot 402, Leopards Hill Road, Lusaka',
    };
    setFormData(sample);
    setErrors({});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-800" />
            Mandatory Personal & Zambian Citizenship Details
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            In accordance with the Passports Act (Cap 103 of the Laws of Zambia). All fields marked with <span className="text-red-500 font-semibold">*</span> are mandatory.
          </p>
        </div>
        <button
          type="button"
          onClick={handleFillSampleZambian}
          className="self-start sm:self-auto text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Fill Complete Zambian Details
        </button>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Missing Mandatory Fields:</span>
            <p className="mt-0.5">
              Please complete the {Object.keys(errors).length} missing required field(s) highlighted below.
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Legal Name & NRC */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Section 1: Applicant Identity & National Registration Card (NRC)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Surname (Family Name) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.surname}
              onChange={e => handleChange('surname', e.target.value)}
              placeholder="e.g. Mwape"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                errors.surname ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-emerald-700'
              }`}
            />
            {errors.surname && <p className="text-[11px] text-red-600 mt-1">{errors.surname}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Given Names (First & Other) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.givenNames}
              onChange={e => handleChange('givenNames', e.target.value)}
              placeholder="e.g. Chileshe Natasha"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                errors.givenNames ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-emerald-700'
              }`}
            />
            {errors.givenNames && <p className="text-[11px] text-red-600 mt-1">{errors.givenNames}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Maiden Name (if applicable)
            </label>
            <input
              type="text"
              value={formData.maidenName || ''}
              onChange={e => handleChange('maidenName', e.target.value)}
              placeholder="Leave blank if not applicable"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              National Registration Card (NRC) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={11}
              value={formData.nrcNumber}
              onChange={e => handleChange('nrcNumber', formatNRC(e.target.value))}
              placeholder="381920/11/1"
              className={`w-full px-3 py-2 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 ${
                errors.nrcNumber ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-emerald-700'
              }`}
            />
            {errors.nrcNumber && <p className="text-[11px] text-red-600 mt-1">{errors.nrcNumber}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={e => handleChange('dateOfBirth', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                errors.dateOfBirth ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-emerald-700'
              }`}
            />
            {errors.dateOfBirth && <p className="text-[11px] text-red-600 mt-1">{errors.dateOfBirth}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.gender}
              onChange={e => handleChange('gender', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="MALE">Male (M)</option>
              <option value="FEMALE">Female (F)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Marital Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.maritalStatus}
              onChange={e => handleChange('maritalStatus', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Place / Town of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.placeOfBirthTown}
              onChange={e => handleChange('placeOfBirthTown', e.target.value)}
              placeholder="e.g. Lusaka / Ndola / UTH"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                errors.placeOfBirthTown ? 'border-red-500' : 'border-slate-300 focus:ring-emerald-700'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Birth Province in Zambia <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.placeOfBirthProvince}
              onChange={e => handleChange('placeOfBirthProvince', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {PROVINCES.map(p => (
                <option key={p} value={p}>{p} Province</option>
              ))}
              <option value="Abroad">Born Abroad</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Citizenship Acquired By <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.citizenshipAcquiredBy}
              onChange={e => handleChange('citizenshipAcquiredBy', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="BIRTH">Birth in Zambia</option>
              <option value="DESCENT">Descent (Zambian Parents)</option>
              <option value="NATURALIZATION">Naturalization</option>
              <option value="REGISTRATION">Registration / Marriage</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Traditional Heritage & Parents Details (Standard Zambian Passport Form Requirement) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Section 2: Ancestral Heritage, Chiefdom & Parents' NRC Credentials
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Village <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.village}
              onChange={e => handleChange('village', e.target.value)}
              placeholder="e.g. Chilanga / Chibombo"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                errors.village ? 'border-red-500' : 'border-slate-300 focus:ring-emerald-700'
              }`}
            />
            {errors.village && <p className="text-[11px] text-red-600 mt-1">{errors.village}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Traditional Chief <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.chief}
              onChange={e => handleChange('chief', e.target.value)}
              placeholder="e.g. Chief Mwanja / Senior Chief Mukuni"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                errors.chief ? 'border-red-500' : 'border-slate-300 focus:ring-emerald-700'
              }`}
            />
            {errors.chief && <p className="text-[11px] text-red-600 mt-1">{errors.chief}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              District of Origin <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.districtOfOrigin}
              onChange={e => handleChange('districtOfOrigin', e.target.value)}
              placeholder="e.g. Lusaka / Ndola / Petauke"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                errors.districtOfOrigin ? 'border-red-500' : 'border-slate-300 focus:ring-emerald-700'
              }`}
            />
            {errors.districtOfOrigin && <p className="text-[11px] text-red-600 mt-1">{errors.districtOfOrigin}</p>}
          </div>
        </div>

        {/* Parents' Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-800 block">Father's Details:</span>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Father's Full Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fatherFullName}
                onChange={e => handleChange('fatherFullName', e.target.value)}
                placeholder="Full name as on NRC"
                className={`w-full px-3 py-2 text-sm border rounded-md ${
                  errors.fatherFullName ? 'border-red-500' : 'border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Father's NRC Number
              </label>
              <input
                type="text"
                value={formData.fatherNrc}
                onChange={e => handleChange('fatherNrc', formatNRC(e.target.value))}
                placeholder="e.g. 198421/11/1"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-800 block">Mother's Details:</span>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mother's Full Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.motherFullName}
                onChange={e => handleChange('motherFullName', e.target.value)}
                placeholder="Full name as on NRC"
                className={`w-full px-3 py-2 text-sm border rounded-md ${
                  errors.motherFullName ? 'border-red-500' : 'border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mother's NRC Number
              </label>
              <input
                type="text"
                value={formData.motherNrc}
                onChange={e => handleChange('motherNrc', formatNRC(e.target.value))}
                placeholder="e.g. 220914/11/1"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Physical Description & Occupation */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Section 3: Physical Description & Profession
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Height (in cm) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="50"
              max="250"
              value={formData.heightCm || ''}
              onChange={e => handleChange('heightCm', Number(e.target.value))}
              placeholder="175"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Profession / Occupation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.occupation}
              onChange={e => handleChange('occupation', e.target.value)}
              placeholder="e.g. Civil Engineer / Teacher / Trader"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Eye Color
            </label>
            <select
              value={formData.eyeColor}
              onChange={e => handleChange('eyeColor', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            >
              <option value="BROWN">Brown</option>
              <option value="BLACK">Black</option>
              <option value="HAZEL">Hazel</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 4: Residential Address & Contact in Zambia */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Section 4: Residential Address & Mobile Contact (Zambia)
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Residential Address (Plot / House No. & Street / Area) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.residentialAddress}
            onChange={e => handleChange('residentialAddress', e.target.value)}
            placeholder="e.g. Plot 14208, Great East Road, Munali"
            className={`w-full px-3 py-2 text-sm border rounded-md ${
              errors.residentialAddress ? 'border-red-500' : 'border-slate-300'
            }`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Town / City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.townCity}
              onChange={e => handleChange('townCity', e.target.value)}
              placeholder="e.g. Lusaka / Ndola / Kitwe"
              className={`w-full px-3 py-2 text-sm border rounded-md ${
                errors.townCity ? 'border-red-500' : 'border-slate-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Province <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.province}
              onChange={e => handleChange('province', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            >
              {PROVINCES.map(p => (
                <option key={p} value={p}>{p} Province</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Mobile Phone (Airtel / MTN / Zamtel) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.mobilePhone}
              onChange={e => handleChange('mobilePhone', e.target.value)}
              placeholder="+260 97 0000000"
              className={`w-full px-3 py-2 text-sm border rounded-md ${
                errors.mobilePhone ? 'border-red-500' : 'border-slate-300'
              }`}
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Next of Kin / Emergency Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.emergencyName}
              onChange={e => handleChange('emergencyName', e.target.value)}
              placeholder="e.g. Patrick Bwalya Mwape"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Relationship <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.emergencyRelation}
              onChange={e => handleChange('emergencyRelation', e.target.value)}
              placeholder="e.g. Parent / Spouse / Sibling"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Emergency Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.emergencyPhone}
              onChange={e => handleChange('emergencyPhone', e.target.value)}
              placeholder="+260 97 0000000"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Category
        </button>

        <button
          type="button"
          onClick={handleNextClick}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span>Save & Proceed to Travel History</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
