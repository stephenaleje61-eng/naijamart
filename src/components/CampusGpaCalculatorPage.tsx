import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  CheckCircle2,
  Cloud,
  Download,
  GraduationCap,
  Info,
  Plus,
  Printer,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  TrendingUp
} from 'lucide-react';
import {
  GpaCourseEntry,
  GpaSemesterRecord,
  GradingScaleGrade,
  Institution,
  InstitutionGradingConfig,
  UserSettingsDocument
} from '../types.js';
import {
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  getInstitutionById
} from '../constants/institutions.js';
import { useAuth } from '../context/AuthContext.js';
import {
  GPA_MANDATORY_DISCLAIMER,
  STANDARD_NIGERIAN_4_0_GRADES,
  STANDARD_NIGERIAN_5_0_GRADES,
  STANDARD_NIGERIAN_7_0_GRADES,
  calculateCumulativeMetrics,
  calculateSemesterMetrics,
  computeTargetGpaPrediction,
  exportGpaSummaryCsv,
  fetchInstitutionGradingConfig,
  getDegreeClassification,
  loadGuestAcademicRecord,
  loadUserAcademicRecord,
  resolveLetterFromScore,
  saveGuestAcademicRecord,
  saveUserAcademicRecord
} from '../services/gpaService.js';

interface CampusGpaCalculatorPageProps {
  selectedInstitutionId?: string;
  institutions?: Institution[];
  userSettings?: UserSettingsDocument;
  onBackToHome: () => void;
  onOpenAuth?: () => void;
}

function createEmptyCourse(): GpaCourseEntry {
  return {
    id: `crs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    courseCode: '',
    courseTitle: '',
    creditUnits: 3,
    grade: 'A'
  };
}

function createEmptySemester(index: number): GpaSemesterRecord {
  return {
    id: `sem_${Date.now()}_${index}`,
    session: '2025/2026',
    semester: index % 2 === 0 ? 'First Semester' : 'Second Semester',
    courses: [createEmptyCourse(), createEmptyCourse(), createEmptyCourse()]
  };
}

export const CampusGpaCalculatorPage: React.FC<CampusGpaCalculatorPageProps> = ({
  selectedInstitutionId = DEFAULT_INSTITUTION_ID,
  institutions = VERIFIED_NIGERIAN_INSTITUTIONS,
  userSettings,
  onBackToHome,
  onOpenAuth
}) => {
  const { user, firebaseUser } = useAuth();
  const effectiveUid = firebaseUser?.uid || user?.id;

  const preferredScaleModeFromSettings = (
    scale?: string
  ): 'standard_5' | 'standard_4' | 'standard_7' | 'custom' => {
    if (scale === '4.0') return 'standard_4';
    if (scale === '7.0') return 'standard_7';
    if (scale === 'custom') return 'custom';
    return 'standard_5';
  };

  const [institutionId, setInstitutionId] = useState<string>(
    user?.institutionId ||
      (selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId)
  );
  const [scaleMode, setScaleMode] = useState<
    'standard_5' | 'standard_4' | 'standard_7' | 'custom' | 'institution'
  >(() => preferredScaleModeFromSettings(userSettings?.academic?.defaultGpaScale));
  const [institutionConfig, setInstitutionConfig] = useState<InstitutionGradingConfig | null>(null);
  const [customGrades, setCustomGrades] = useState<GradingScaleGrade[]>(STANDARD_NIGERIAN_5_0_GRADES);
  const [customScaleMax, setCustomScaleMax] = useState<7 | 5 | 4>(5);
  const [semesters, setSemesters] = useState<GpaSemesterRecord[]>(() => {
    const guest = loadGuestAcademicRecord();
    if (guest && Array.isArray(guest.semesters) && guest.semesters.length > 0) {
      return guest.semesters;
    }
    return [createEmptySemester(0)];
  });

  // Target CGPA predictor controls (synced from Academic Preferences when available)
  const [targetCgpa, setTargetCgpa] = useState<number>(
    () => userSettings?.academic?.targetCgpa || 4.5
  );
  const [upcomingUnits, setUpcomingUnits] = useState<number>(21);

  const [savingCloud, setSavingCloud] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [showCustomScaleEditor, setShowCustomScaleEditor] = useState(false);

  const selectedInstitution = useMemo(
    () => getInstitutionById(institutionId, institutions),
    [institutionId, institutions]
  );

  // Apply updated Academic Preferences defaults when userSettings changes
  useEffect(() => {
    if (!userSettings?.academic) return;
    if (userSettings.academic.targetCgpa > 0) {
      setTargetCgpa(userSettings.academic.targetCgpa);
    }
    if (scaleMode !== 'institution') {
      setScaleMode(preferredScaleModeFromSettings(userSettings.academic.defaultGpaScale));
    }
  }, [userSettings?.academic?.defaultGpaScale, userSettings?.academic?.targetCgpa]);

  // Load saved cloud record when signed in
  useEffect(() => {
    let active = true;
    if (!effectiveUid) return;
    loadUserAcademicRecord(effectiveUid)
      .then((rec) => {
        if (!active || !rec) return;
        if (Array.isArray(rec.semesters) && rec.semesters.length > 0) {
          setSemesters(rec.semesters);
        }
        if (rec.institutionId) setInstitutionId(rec.institutionId);
        if (Array.isArray(rec.customGrades) && rec.customGrades.length > 0) {
          setCustomGrades(rec.customGrades);
          setCustomScaleMax(rec.scaleMax === 4 ? 4 : rec.scaleMax === 7 ? 7 : 5);
        } else if (rec.scaleMax === 4) {
          setScaleMode('standard_4');
        } else if (rec.scaleMax === 7) {
          setScaleMode('standard_7');
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [effectiveUid]);

  // Check if selected institution has an admin-configured grading scale
  useEffect(() => {
    let active = true;
    fetchInstitutionGradingConfig(institutionId)
      .then((cfg) => {
        if (!active) return;
        setInstitutionConfig(cfg);
        if (cfg && cfg.grades.length > 0) {
          setScaleMode('institution');
        } else if (scaleMode === 'institution') {
          setScaleMode(preferredScaleModeFromSettings(userSettings?.academic?.defaultGpaScale));
        }
      })
      .catch(() => {
        if (active) setInstitutionConfig(null);
      });
    return () => {
      active = false;
    };
  }, [institutionId]);

  const activeScaleMax: 7 | 5 | 4 = useMemo(() => {
    if (scaleMode === 'standard_4') return 4;
    if (scaleMode === 'standard_7') return 7;
    if (scaleMode === 'institution' && institutionConfig) return institutionConfig.scaleMax;
    if (scaleMode === 'custom') return customScaleMax;
    return 5;
  }, [scaleMode, institutionConfig, customScaleMax]);

  const activeGrades: GradingScaleGrade[] = useMemo(() => {
    if (scaleMode === 'standard_4') return STANDARD_NIGERIAN_4_0_GRADES;
    if (scaleMode === 'standard_7') return STANDARD_NIGERIAN_7_0_GRADES;
    if (scaleMode === 'institution' && institutionConfig && institutionConfig.grades.length > 0) {
      return institutionConfig.grades;
    }
    if (scaleMode === 'custom') return customGrades;
    return STANDARD_NIGERIAN_5_0_GRADES;
  }, [scaleMode, institutionConfig, customGrades]);

  // Keep guest localStorage up to date automatically (works 100% free without login)
  useEffect(() => {
    saveGuestAcademicRecord({
      id: effectiveUid || 'guest',
      userId: effectiveUid || 'guest',
      institutionId,
      scaleMax: activeScaleMax,
      customGrades: scaleMode === 'custom' ? customGrades : undefined,
      semesters,
      updatedAt: new Date().toISOString()
    });
  }, [semesters, institutionId, activeScaleMax, scaleMode, customGrades, effectiveUid]);

  const cumulative = useMemo(
    () => calculateCumulativeMetrics(semesters, activeGrades),
    [semesters, activeGrades]
  );

  const degreeClass = useMemo(
    () => getDegreeClassification(cumulative.cgpa, activeScaleMax),
    [cumulative.cgpa, activeScaleMax]
  );

  const prediction = useMemo(
    () =>
      computeTargetGpaPrediction({
        currentUnits: cumulative.totalUnits,
        currentPoints: cumulative.totalQualityPoints,
        targetCgpa,
        upcomingUnits,
        scaleMax: activeScaleMax
      }),
    [cumulative.totalUnits, cumulative.totalQualityPoints, targetCgpa, upcomingUnits, activeScaleMax]
  );

  const handleSaveToCloud = async () => {
    if (!effectiveUid) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    setSavingCloud(true);
    setSaveFeedback(null);
    try {
      await saveUserAcademicRecord(effectiveUid, {
        id: effectiveUid,
        userId: effectiveUid,
        institutionId,
        scaleMax: activeScaleMax,
        customGrades: scaleMode === 'custom' ? customGrades : undefined,
        semesters,
        updatedAt: new Date().toISOString()
      });
      setSaveFeedback('Saved to your NIGERIA CAMPUS MARKET account for cross-device sync.');
    } catch (err: any) {
      setSaveFeedback(err?.message || 'Saved locally. Cloud sync will retry when online.');
    } finally {
      setSavingCloud(false);
    }
  };

  const handleAddSemester = () => {
    setSemesters((prev) => [...prev, createEmptySemester(prev.length)]);
  };

  const handleRemoveSemester = (semId: string) => {
    setSemesters((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== semId)));
  };

  const handleUpdateSemesterMeta = (
    semId: string,
    field: 'session' | 'semester',
    value: string
  ) => {
    setSemesters((prev) =>
      prev.map((s) => (s.id === semId ? { ...s, [field]: value } : s))
    );
  };

  const handleAddCourse = (semId: string) => {
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId ? { ...s, courses: [...s.courses, createEmptyCourse()] } : s
      )
    );
  };

  const handleRemoveCourse = (semId: string, courseId: string) => {
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? {
              ...s,
              courses: s.courses.length <= 1 ? s.courses : s.courses.filter((c) => c.id !== courseId)
            }
          : s
      )
    );
  };

  const handleUpdateCourse = (
    semId: string,
    courseId: string,
    patch: Partial<GpaCourseEntry>
  ) => {
    setSemesters((prev) =>
      prev.map((s) => {
        if (s.id !== semId) return s;
        return {
          ...s,
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            const next = { ...c, ...patch };
            if (typeof patch.numericScore === 'number' && !Number.isNaN(patch.numericScore)) {
              next.grade = resolveLetterFromScore(patch.numericScore, activeGrades);
            }
            return next;
          })
        };
      })
    );
  };

  const handleExportCsv = () => {
    const csv = exportGpaSummaryCsv(
      semesters,
      activeGrades,
      selectedInstitution.name,
      activeScaleMax
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nigeria-Campus-Market-CGPA-${selectedInstitution.shortName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = {
      institution: selectedInstitution.name,
      scaleMax: activeScaleMax,
      estimatedCgpa: cumulative.cgpa,
      totalUnits: cumulative.totalUnits,
      totalQualityPoints: cumulative.totalQualityPoints,
      classificationEstimate: degreeClass,
      disclaimer: GPA_MANDATORY_DISCLAIMER,
      semesters
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nigeria-Campus-Market-CGPA-${selectedInstitution.shortName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSemesters([createEmptySemester(0)]);
    setSaveFeedback('Calculator reset cleanly.');
  };

  const totalCoursesCount = semesters.reduce((sum, s) => sum + s.courses.length, 0);

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#10251D] pb-16">
      {/* Header Banner */}
      <div className="bg-[#087443] border-b-4 border-[#D4A62A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90 hover:text-[#D4A62A] mb-3 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#D4A62A] text-xs font-black uppercase tracking-wider mb-1">
                <GraduationCap className="w-4 h-4" />
                <span>National Academic Companion • Free No-Login Access</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                National Student GPA &amp; CGPA Calculator
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-2xl">
                Calculate semester GPA and multi-semester CGPA on Nigerian 5.0, 4.0, or custom institution grading scales. Sign in anytime to sync across devices.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2.5 bg-[#10251D] hover:bg-black text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4 text-[#D4A62A]" />
                <span>Print / PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3.5 py-2.5 bg-white text-[#10251D] hover:bg-[#F4F8F5] text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4 text-[#087443]" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3.5 py-2.5 bg-white text-[#10251D] hover:bg-[#F4F8F5] text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4 text-[#087443]" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                onClick={handleSaveToCloud}
                disabled={savingCloud}
                className="px-4 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl inline-flex items-center gap-1.5 transition shadow"
              >
                <Cloud className="w-4 h-4" />
                <span>
                  {effectiveUid
                    ? savingCloud
                      ? 'Saving...'
                      : 'Cloud Save & Sync'
                    : 'Sign In to Cloud Sync'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {saveFeedback && (
          <div className="p-3 bg-white border-2 border-[#087443] rounded-2xl text-xs font-bold text-[#087443] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Academic Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#087443] text-white rounded-2xl p-5 border-b-4 border-[#D4A62A] shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              Estimated Cumulative CGPA
            </div>
            <div className="mt-1 flex items-baseline gap-2 tabular-nums">
              <span className="text-4xl font-black text-[#D4A62A]">
                {cumulative.cgpa.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-white/80">/ {activeScaleMax}.00</span>
            </div>
            <div className="mt-2 text-xs font-bold text-white/95">{degreeClass}</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#D8E5DD] shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#556B60]">
              Total Credit Units
            </div>
            <div className="mt-1 text-3xl font-black text-[#10251D] tabular-nums">
              {cumulative.totalUnits}
            </div>
            <div className="mt-2 text-xs text-[#556B60]">
              Across {semesters.length} semester(s) &bull; {totalCoursesCount} course(s)
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#D8E5DD] shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#556B60]">
              Total Quality Points
            </div>
            <div className="mt-1 text-3xl font-black text-[#10251D] tabular-nums">
              {cumulative.totalQualityPoints.toFixed(1)}
            </div>
            <div className="mt-2 text-xs text-[#556B60]">
              Sum of (Credit Units &times; Grade Point)
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#D8E5DD] shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#556B60]">
              Active Grading System
            </div>
            <div className="mt-1 text-base font-black text-[#087443] truncate">
              {scaleMode === 'institution' && institutionConfig
                ? institutionConfig.scaleLabel
                : scaleMode === 'standard_4'
                ? 'Nigerian 4.0 Scale'
                : scaleMode === 'standard_7'
                ? 'Nigerian 7.0 Scale'
                : scaleMode === 'custom'
                ? `Custom ${customScaleMax}.0 Scale`
                : 'Nigerian 5.0 Standard'}
            </div>
            <div className="mt-2 text-[11px] text-[#556B60]">
              {scaleMode === 'institution' && institutionConfig?.isVerifiedOfficial
                ? 'Admin-verified scale configuration'
                : 'Select 5.0, 4.0, 7.0, or Custom Scale below'}
            </div>
          </div>
        </div>

        {/* Institution & Grading Scale Selector */}
        <div className="bg-white rounded-2xl p-5 border border-[#D8E5DD] shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#556B60] mb-1.5">
                University / Polytechnic
              </label>
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] focus:border-[#087443] rounded-xl text-xs font-bold text-[#10251D] outline-none"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#556B60] mb-1.5">
                Grading Scale
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setScaleMode('standard_5')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    scaleMode === 'standard_5'
                      ? 'bg-[#087443] text-white border-[#087443]'
                      : 'bg-[#F4F8F5] text-[#10251D] border-[#D8E5DD]'
                  }`}
                >
                  5.0 Scale
                </button>
                <button
                  type="button"
                  onClick={() => setScaleMode('standard_4')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    scaleMode === 'standard_4'
                      ? 'bg-[#087443] text-white border-[#087443]'
                      : 'bg-[#F4F8F5] text-[#10251D] border-[#D8E5DD]'
                  }`}
                >
                  4.0 Scale
                </button>
                <button
                  type="button"
                  onClick={() => setScaleMode('standard_7')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    scaleMode === 'standard_7'
                      ? 'bg-[#087443] text-white border-[#087443]'
                      : 'bg-[#F4F8F5] text-[#10251D] border-[#D8E5DD]'
                  }`}
                >
                  7.0 Scale
                </button>
                {institutionConfig && (
                  <button
                    type="button"
                    onClick={() => setScaleMode('institution')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                      scaleMode === 'institution'
                        ? 'bg-[#087443] text-white border-[#087443]'
                        : 'bg-[#F4F8F5] text-[#10251D] border-[#D8E5DD]'
                    }`}
                  >
                    {selectedInstitution.shortName} Scale
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setScaleMode('custom');
                    setShowCustomScaleEditor(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1 transition ${
                    scaleMode === 'custom'
                      ? 'bg-[#D4A62A] text-[#10251D] border-[#D4A62A]'
                      : 'bg-[#F4F8F5] text-[#10251D] border-[#D8E5DD]'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Custom Scale</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-[#F4F8F5] hover:bg-[#E7EFE9] border border-[#D8E5DD] text-xs font-bold text-[#10251D] rounded-xl inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={handleAddSemester}
                className="px-4 py-2 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-[#D4A62A]" />
                <span>Add Semester</span>
              </button>
            </div>
          </div>

          {!institutionConfig && (
            <div className="p-3 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl flex items-start gap-2 text-xs text-[#374B41]">
              <Info className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
              <span>
                No institution-specific official grading scale has been published for{' '}
                <strong>{selectedInstitution.name}</strong> yet. Use the Nigerian 5.0 Standard, 4.0 Scale, or customize your department&apos;s exact points with <strong>Custom Scale</strong>.
              </span>
            </div>
          )}

          {/* Custom Scale Editor */}
          {scaleMode === 'custom' && showCustomScaleEditor && (
            <div className="p-4 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-[#10251D]">
                  Custom Grading Scale Configuration
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold">Max Scale:</span>
                  <button
                    type="button"
                    onClick={() => setCustomScaleMax(5)}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      customScaleMax === 5 ? 'bg-[#087443] text-white' : 'bg-white border border-[#D8E5DD]'
                    }`}
                  >
                    5.0
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomScaleMax(4)}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      customScaleMax === 4 ? 'bg-[#087443] text-white' : 'bg-white border border-[#D8E5DD]'
                    }`}
                  >
                    4.0
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {customGrades.map((g, idx) => (
                  <div key={idx} className="bg-white border border-[#D8E5DD] rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#087443]">Grade</span>
                      <input
                        type="text"
                        value={g.letter}
                        maxLength={3}
                        onChange={(e) =>
                          setCustomGrades((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, letter: e.target.value.toUpperCase() } : item
                            )
                          )
                        }
                        className="w-12 text-center font-black text-xs p-1 border border-[#D8E5DD] rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Point</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={customScaleMax}
                        value={g.point}
                        onChange={(e) =>
                          setCustomGrades((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, point: Number(e.target.value) || 0 } : item
                            )
                          )
                        }
                        className="w-14 text-right font-bold text-xs p-1 border border-[#D8E5DD] rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Workspace Grid: Semesters Left, Visual Dashboard & Predictor Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Semesters & Course Rows */}
          <div className="lg:col-span-8 space-y-5">
            {semesters.map((sem, sIdx) => {
              const semMetrics = calculateSemesterMetrics(sem.courses, activeGrades);
              return (
                <div
                  key={sem.id}
                  className="bg-white rounded-2xl border border-[#D8E5DD] shadow-sm overflow-hidden"
                >
                  <div className="bg-[#10251D] text-white px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#D4A62A]" />
                      <input
                        type="text"
                        value={sem.session}
                        onChange={(e) => handleUpdateSemesterMeta(sem.id, 'session', e.target.value)}
                        aria-label="Academic Session"
                        className="w-28 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none focus:border-[#D4A62A]"
                        placeholder="2025/2026"
                      />
                      <select
                        value={sem.semester}
                        onChange={(e) => handleUpdateSemesterMeta(sem.id, 'semester', e.target.value)}
                        aria-label="Semester"
                        className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none focus:border-[#D4A62A]"
                      >
                        <option value="First Semester" className="text-[#10251D]">First Semester</option>
                        <option value="Second Semester" className="text-[#10251D]">Second Semester</option>
                        <option value="Harmattan Semester" className="text-[#10251D]">Harmattan Semester</option>
                        <option value="Rain Semester" className="text-[#10251D]">Rain Semester</option>
                        <option value="Summer / Carryover" className="text-[#10251D]">Summer / Carryover</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs font-bold tabular-nums">
                        Semester GPA:{' '}
                        <span className="px-2.5 py-1 rounded-lg bg-[#087443] text-[#D4A62A] font-black">
                          {semMetrics.gpa.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[11px] text-white/80 tabular-nums">
                        ({semMetrics.totalUnits} units)
                      </span>
                      {semesters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSemester(sem.id)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-red-600 text-white transition"
                          title={`Remove Semester ${sIdx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] font-black uppercase tracking-wider text-[#556B60] px-1">
                      <div className="col-span-2">Course Code</div>
                      <div className="col-span-4">Course Title</div>
                      <div className="col-span-2">Credit Units</div>
                      <div className="col-span-2">Score (Opt)</div>
                      <div className="col-span-2">Grade</div>
                    </div>

                    {sem.courses.map((course) => (
                      <div
                        key={course.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl p-2.5"
                      >
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={course.courseCode}
                            onChange={(e) =>
                              handleUpdateCourse(sem.id, course.id, {
                                courseCode: e.target.value.toUpperCase()
                              })
                            }
                            placeholder="CSC 201"
                            className="w-full p-2 bg-white border border-[#D8E5DD] focus:border-[#087443] rounded-lg text-xs font-bold uppercase text-[#10251D] outline-none"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            value={course.courseTitle}
                            onChange={(e) =>
                              handleUpdateCourse(sem.id, course.id, { courseTitle: e.target.value })
                            }
                            placeholder="Course Title (optional)"
                            className="w-full p-2 bg-white border border-[#D8E5DD] focus:border-[#087443] rounded-lg text-xs text-[#10251D] outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min={0}
                            max={24}
                            value={course.creditUnits}
                            onChange={(e) =>
                              handleUpdateCourse(sem.id, course.id, {
                                creditUnits: Math.max(0, Number(e.target.value) || 0)
                              })
                            }
                            aria-label="Credit Units"
                            className="w-full p-2 bg-white border border-[#D8E5DD] focus:border-[#087443] rounded-lg text-xs font-bold text-[#10251D] tabular-nums outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={course.numericScore ?? ''}
                            onChange={(e) =>
                              handleUpdateCourse(sem.id, course.id, {
                                numericScore:
                                  e.target.value === ''
                                    ? undefined
                                    : Math.max(0, Math.min(100, Number(e.target.value)))
                              })
                            }
                            placeholder="Score"
                            className="w-full p-2 bg-white border border-[#D8E5DD] focus:border-[#087443] rounded-lg text-xs text-[#10251D] tabular-nums outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-1.5">
                          <select
                            value={course.grade}
                            onChange={(e) =>
                              handleUpdateCourse(sem.id, course.id, {
                                grade: e.target.value,
                                numericScore: undefined
                              })
                            }
                            className="flex-1 p-2 bg-white border border-[#D8E5DD] focus:border-[#087443] rounded-lg text-xs font-black text-[#087443] outline-none"
                          >
                            {activeGrades.map((g) => (
                              <option key={g.letter} value={g.letter}>
                                {g.letter} ({g.point})
                              </option>
                            ))}
                          </select>
                          {sem.courses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCourse(sem.id, course.id)}
                              className="p-2 text-[#556B60] hover:text-red-600 rounded-lg"
                              title="Remove course"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="pt-1 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => handleAddCourse(sem.id)}
                        className="px-3.5 py-2 bg-[#F4F8F5] hover:bg-[#087443] text-[#087443] hover:text-white border border-[#087443]/30 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Course</span>
                      </button>

                      <span className="text-[11px] font-bold text-[#556B60] tabular-nums">
                        Quality Points: {semMetrics.totalQualityPoints.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Target Predictor & Visual Analytics */}
          <div className="lg:col-span-4 space-y-5">
            {/* Target CGPA Predictor */}
            <div className="bg-white rounded-2xl border border-[#D8E5DD] p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#087443]" />
                <h2 className="font-display text-base font-black text-[#10251D]">
                  Target CGPA Predictor
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#556B60] mb-1">
                    Desired CGPA (/{activeScaleMax}.0)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min={0}
                    max={activeScaleMax}
                    value={targetCgpa}
                    onChange={(e) =>
                      setTargetCgpa(Math.max(0, Math.min(activeScaleMax, Number(e.target.value) || 0)))
                    }
                    className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl text-xs font-black text-[#10251D] tabular-nums outline-none focus:border-[#087443]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#556B60] mb-1">
                    Next Semester Units
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={upcomingUnits}
                    onChange={(e) => setUpcomingUnits(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl text-xs font-black text-[#10251D] tabular-nums outline-none focus:border-[#087443]"
                  />
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                  prediction.achievable
                    ? 'bg-[#F4F8F5] border-[#087443] text-[#10251D]'
                    : 'bg-[#FFF8DB] border-[#D4A62A] text-[#10251D]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-[#087443]">Required Next GPA</span>
                  <span className="px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A] font-black tabular-nums">
                    {prediction.requiredGpa.toFixed(2)}
                  </span>
                </div>
                <p>{prediction.message}</p>
              </div>
            </div>

            {/* Visual Grade Distribution & Semester Trend */}
            <div className="bg-white rounded-2xl border border-[#D8E5DD] p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#087443]" />
                <h2 className="font-display text-base font-black text-[#10251D]">
                  Academic Performance Dashboard
                </h2>
              </div>

              {/* Semester GPA Bar Visual */}
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#556B60]">
                  Semester GPA Trend
                </div>
                {cumulative.semesterTrend.map((pt, i) => {
                  const pct = Math.min(100, Math.round((pt.gpa / activeScaleMax) * 100));
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="truncate">{pt.label}</span>
                        <span className="text-[#087443] tabular-nums">{pt.gpa.toFixed(2)}</span>
                      </div>
                      <div className="h-2.5 w-full bg-[#F4F8F5] rounded-full overflow-hidden border border-[#D8E5DD]">
                        <div
                          className="h-full bg-[#087443] rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grade Distribution */}
              <div className="space-y-2 pt-2 border-t border-[#D8E5DD]">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#556B60]">
                  Grade Distribution
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {activeGrades.map((g) => (
                    <div
                      key={g.letter}
                      className="bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl p-2 text-center"
                    >
                      <div className="text-xs font-black text-[#087443]">{g.letter}</div>
                      <div className="text-base font-black text-[#10251D] tabular-nums">
                        {cumulative.gradeDistribution[g.letter] || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reference Scale Table */}
            <div className="bg-white rounded-2xl border border-[#D8E5DD] p-5 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#556B60]">
                <Calculator className="w-4 h-4 text-[#087443]" />
                <span>Selected Scale Breakdown</span>
              </div>
              <div className="divide-y divide-[#D8E5DD] text-xs">
                {activeGrades.map((g) => (
                  <div key={g.letter} className="py-1.5 flex items-center justify-between tabular-nums">
                    <span className="font-black text-[#10251D]">Grade {g.letter}</span>
                    <span className="text-[#556B60]">
                      {g.minScore}% – {g.maxScore}%
                    </span>
                    <span className="font-black text-[#087443]">{g.point.toFixed(1)} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mandatory Academic Estimate Disclaimer */}
        <div className="bg-white border-2 border-[#D4A62A] rounded-2xl p-4 flex items-start gap-3 text-xs text-[#10251D]">
          <Sparkles className="w-5 h-5 text-[#D4A62A] shrink-0 mt-0.5" />
          <div>
            <div className="font-black uppercase tracking-wider text-[#087443] mb-0.5">
              Academic Estimate Disclaimer
            </div>
            <p className="leading-relaxed font-medium">{GPA_MANDATORY_DISCLAIMER}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
