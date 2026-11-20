import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MapPin,
  Search
} from 'lucide-react';
import {
  AccountGraduationStatus,
  Institution,
  InstitutionType,
  User,
  UserSettingsDocument
} from '../../types.js';
import {
  INSTITUTION_STATES,
  INSTITUTION_TYPE_OPTIONS,
  NIGERIAN_UNIVERSITY_FACULTIES,
  findInstitutionById
} from '../../constants/institutions.js';
import { saveAccountProfileUpdate, saveUserSettings } from '../../services/settings.js';

interface UniversitySettingsPanelProps {
  user: User;
  institutions: Institution[];
  settings: UserSettingsDocument;
  onUserUpdated: (updated: User) => void;
  onSettingsSaved: (next: UserSettingsDocument) => void;
  onInstitutionActivated?: (institutionId: string, campus: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const ACADEMIC_LEVEL_OPTIONS = [
  '100 Level',
  '200 Level',
  '300 Level',
  '400 Level',
  '500 Level',
  '600 Level',
  'ND 1',
  'ND 2',
  'HND 1',
  'HND 2',
  'NCE 1',
  'NCE 2',
  'NCE 3',
  'Postgraduate / MSc / PhD',
  'Graduate / NYSC',
  'Lecturer / Staff'
];

const GRADUATION_STATUS_OPTIONS: { value: AccountGraduationStatus; label: string }[] = [
  { value: 'undergraduate', label: 'Current Undergraduate' },
  { value: 'finalist', label: 'Final Year Student' },
  { value: 'nysc', label: 'Graduate / NYSC Corps Member' },
  { value: 'alumni', label: 'University Alumni' },
  { value: 'postgraduate', label: 'Postgraduate Student' },
  { value: 'lecturer_staff', label: 'Lecturer / University Staff' }
];

const ACADEMIC_SESSIONS = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];

export const UniversitySettingsPanel: React.FC<UniversitySettingsPanelProps> = ({
  user,
  institutions,
  settings,
  onUserUpdated,
  onSettingsSaved,
  onInstitutionActivated,
  onShowToast
}) => {
  const existingInstitution = findInstitutionById(user.institutionId, institutions);

  const [institutionTypeFilter, setInstitutionTypeFilter] = useState<InstitutionType | 'all'>(
    user.institutionType || existingInstitution?.type || settings.academic.institutionTypeFilter || 'all'
  );
  const [stateFilter, setStateFilter] = useState<string>(
    existingInstitution?.state || user.state || ''
  );
  const [instSearch, setInstSearch] = useState('');
  const [institutionId, setInstitutionId] = useState<string>(user.institutionId || '');
  const [campus, setCampus] = useState<string>(user.campus || existingInstitution?.campus || '');
  const [faculty, setFaculty] = useState<string>(user.faculty || settings.academic.faculty || '');
  const [department, setDepartment] = useState<string>(user.department || settings.academic.department || '');
  const [academicLevel, setAcademicLevel] = useState<string>(
    user.levelOfStudy || settings.academic.academicLevel || '100 Level'
  );
  const [matricNumber, setMatricNumber] = useState<string>(
    user.matricNumber || settings.academic.matricNumber || ''
  );
  const [graduationStatus, setGraduationStatus] = useState<AccountGraduationStatus>(
    user.graduationStatus || settings.academic.graduationStatus || 'undergraduate'
  );
  const [academicSession, setAcademicSession] = useState<string>(
    user.academicSession || settings.academic.academicSession || '2025/2026'
  );
  const [applyToMarketplaceFeed, setApplyToMarketplaceFeed] = useState<boolean>(true);
  const [confirmTransferAck, setConfirmTransferAck] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const selectedInstitution = useMemo(
    () => findInstitutionById(institutionId, institutions),
    [institutionId, institutions]
  );

  const filteredInstitutions = useMemo(() => {
    const q = instSearch.trim().toLowerCase();
    return institutions.filter((inst) => {
      if (institutionTypeFilter !== 'all' && inst.type !== institutionTypeFilter) return false;
      if (stateFilter && inst.state !== stateFilter) return false;
      if (
        q &&
        !inst.name.toLowerCase().includes(q) &&
        !inst.shortName.toLowerCase().includes(q) &&
        !inst.state.toLowerCase().includes(q) &&
        !inst.location.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [institutions, institutionTypeFilter, stateFilter, instSearch]);

  const isSwitchingInstitution = Boolean(
    user.institutionId &&
      institutionId &&
      user.institutionId !== institutionId
  );

  useEffect(() => {
    if (!isSwitchingInstitution) {
      setConfirmTransferAck(false);
    }
  }, [isSwitchingInstitution]);

  const handleSelectInstitution = (nextId: string) => {
    setInstitutionId(nextId);
    const matched = findInstitutionById(nextId, institutions);
    if (matched) {
      setCampus(matched.campus || matched.campuses[0] || '');
      if (!stateFilter) setStateFilter(matched.state);
    } else {
      setCampus('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId) {
      onShowToast('Please select your university, polytechnic, or college of education.', 'error');
      return;
    }
    if (isSwitchingInstitution && !confirmTransferAck) {
      onShowToast('Please confirm your institution change before saving.', 'error');
      return;
    }

    const instObj = findInstitutionById(institutionId, institutions);
    const resolvedCampus = campus || instObj?.campus || 'Main Campus';
    const resolvedState = instObj?.state || stateFilter || user.state || '';
    const resolvedCity = instObj?.location || user.city || '';

    setSaving(true);
    try {
      const { user: updatedUser } = await saveAccountProfileUpdate(
        user.id,
        {
          institutionId,
          institutionType: instObj?.type || (institutionTypeFilter !== 'all' ? institutionTypeFilter : undefined),
          campus: resolvedCampus,
          state: resolvedState,
          city: resolvedCity,
          faculty: faculty.trim(),
          department: department.trim(),
          levelOfStudy: academicLevel,
          matricNumber: matricNumber.trim(),
          graduationStatus,
          academicSession
        },
        user
      );

      const nextSettings = await saveUserSettings(
        user.id,
        {
          academic: {
            ...settings.academic,
            faculty: faculty.trim(),
            department: department.trim(),
            academicLevel,
            matricNumber: matricNumber.trim(),
            graduationStatus,
            academicSession,
            institutionTypeFilter: instObj?.type || institutionTypeFilter
          },
          languageRegion: {
            ...settings.languageRegion,
            state: resolvedState || settings.languageRegion.state,
            city: resolvedCity || settings.languageRegion.city
          }
        },
        updatedUser
      );

      onUserUpdated(updatedUser);
      onSettingsSaved(nextSettings);
      if (applyToMarketplaceFeed && onInstitutionActivated) {
        onInstitutionActivated(institutionId, resolvedCampus);
      }
      setConfirmTransferAck(false);
      onShowToast(
        `University profile updated to ${instObj?.shortName || instObj?.name || 'selected institution'}.`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to update university profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Current Institution Banner */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#E8F5EE] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-[#16834A]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#16834A]">
              Active University Profile
            </p>
            <h3 className="text-base font-bold text-[#202938] dark:text-white mt-0.5">
              {selectedInstitution
                ? `${selectedInstitution.name} (${selectedInstitution.shortName})`
                : 'No University Selected Yet'}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#16834A]" />
              {selectedInstitution
                ? `${selectedInstitution.type} • ${selectedInstitution.state} State • ${campus || selectedInstitution.campus}`
                : 'Select from Federal, State, Private Universities, Polytechnics & Colleges across Nigeria.'}
            </p>
          </div>
        </div>
        {user.studentVerificationStatus === 'verified' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] dark:bg-emerald-950/60 text-[#16834A] shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Student
          </span>
        )}
      </div>

      {/* Institution Selection */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <h4 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#16834A]" />
          Nationwide Institution Directory
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
              Institution Type
            </label>
            <select
              value={institutionTypeFilter}
              onChange={(e) => setInstitutionTypeFilter(e.target.value as InstitutionType | 'all')}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              {INSTITUTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
              Filter by State
            </label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="">All Nigerian States ({INSTITUTION_STATES.length})</option>
              {INSTITUTION_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
              Search Institution
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={instSearch}
                onChange={(e) => setInstSearch(e.target.value)}
                placeholder="Name, acronym or city..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              University / Polytechnic / College ({filteredInstitutions.length} found)
            </label>
            <select
              value={institutionId}
              onChange={(e) => handleSelectInstitution(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="">-- Select your institution --</option>
              {filteredInstitutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.shortName}) — {inst.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Campus Location
            </label>
            {selectedInstitution && selectedInstitution.campuses.length > 0 ? (
              <select
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
              >
                {selectedInstitution.campuses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                placeholder="e.g. Main Campus"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
              />
            )}
          </div>
        </div>

        {/* Academic Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Faculty / School
            </label>
            <input
              type="text"
              list="ng-faculties-list"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              placeholder="Select or type faculty"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            />
            <datalist id="ng-faculties-list">
              {NIGERIAN_UNIVERSITY_FACULTIES.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science, Mass Comm..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Academic Level
            </label>
            <select
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              {ACADEMIC_LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Matriculation Number <span className="font-normal text-[#64748B]">(Optional)</span>
            </label>
            <input
              type="text"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
              placeholder="e.g. URU/2023/CSC/042"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Graduation Status
            </label>
            <select
              value={graduationStatus}
              onChange={(e) => setGraduationStatus(e.target.value as AccountGraduationStatus)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              {GRADUATION_STATUS_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Academic Session
            </label>
            <select
              value={academicSession}
              onChange={(e) => setAcademicSession(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              {ACADEMIC_SESSIONS.map((ses) => (
                <option key={ses} value={ses}>
                  {ses}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Verification Confirmation when switching universities */}
        {isSwitchingInstitution && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
            <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold">Institution Transfer Confirmation</p>
                <p className="mt-0.5">
                  You are changing your institution from{' '}
                  <strong>{findInstitutionById(user.institutionId, institutions)?.shortName || user.institutionId}</strong>{' '}
                  to <strong>{selectedInstitution?.shortName || institutionId}</strong>.
                  Your university profile badge and campus discovery feed will update immediately.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={confirmTransferAck}
                onChange={(e) => setConfirmTransferAck(e.target.checked)}
                className="w-4 h-4 accent-[#16834A] rounded"
              />
              I confirm that I am enrolled at or affiliated with the newly selected institution.
            </label>
          </div>
        )}

        <label className="flex items-center gap-2.5 text-xs text-[#64748B] dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={applyToMarketplaceFeed}
            onChange={(e) => setApplyToMarketplaceFeed(e.target.checked)}
            className="w-4 h-4 accent-[#16834A] rounded"
          />
          Switch my active marketplace campus feed to this university after saving
        </label>

        <div className="pt-3 border-t border-[#F1F5F9] dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-sm font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving University Info...' : 'Save University Information'}
          </button>
        </div>
      </div>
    </form>
  );
};
