import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  GpaCourseEntry,
  GpaSemesterRecord,
  GradingScaleGrade,
  InstitutionGradingConfig,
  SavedAcademicRecord
} from '../types.js';
import { db, stripUndefined } from './firebase.js';

export const GPA_MANDATORY_DISCLAIMER =
  'Your GPA and CGPA calculations are estimates based on the information entered and the grading system selected. They are not official university examination results.';

export const STANDARD_NIGERIAN_5_0_GRADES: GradingScaleGrade[] = [
  { letter: 'A', minScore: 70, maxScore: 100, point: 5.0 },
  { letter: 'B', minScore: 60, maxScore: 69, point: 4.0 },
  { letter: 'C', minScore: 50, maxScore: 59, point: 3.0 },
  { letter: 'D', minScore: 45, maxScore: 49, point: 2.0 },
  { letter: 'E', minScore: 40, maxScore: 44, point: 1.0 },
  { letter: 'F', minScore: 0, maxScore: 39, point: 0.0 }
];

export const STANDARD_NIGERIAN_4_0_GRADES: GradingScaleGrade[] = [
  { letter: 'A', minScore: 70, maxScore: 100, point: 4.0 },
  { letter: 'B', minScore: 60, maxScore: 69, point: 3.0 },
  { letter: 'C', minScore: 50, maxScore: 59, point: 2.0 },
  { letter: 'D', minScore: 45, maxScore: 49, point: 1.0 },
  { letter: 'F', minScore: 0, maxScore: 44, point: 0.0 }
];

export const STANDARD_NIGERIAN_7_0_GRADES: GradingScaleGrade[] = [
  { letter: 'A+', minScore: 70, maxScore: 100, point: 7.0 },
  { letter: 'A', minScore: 65, maxScore: 69, point: 6.0 },
  { letter: 'A-', minScore: 60, maxScore: 64, point: 5.0 },
  { letter: 'B+', minScore: 55, maxScore: 59, point: 4.0 },
  { letter: 'B', minScore: 50, maxScore: 54, point: 3.0 },
  { letter: 'C', minScore: 45, maxScore: 49, point: 2.0 },
  { letter: 'D', minScore: 40, maxScore: 44, point: 1.0 },
  { letter: 'F', minScore: 0, maxScore: 39, point: 0.0 }
];

const GUEST_GPA_STORAGE_KEY = 'ncm_guest_gpa_records_v1';

export function getGradePointForEntry(
  course: GpaCourseEntry,
  grades: GradingScaleGrade[]
): number {
  const cleanLetter = String(course.grade || '').trim().toUpperCase();
  const byLetter = grades.find((g) => g.letter.toUpperCase() === cleanLetter);
  if (byLetter) return byLetter.point;

  if (typeof course.numericScore === 'number' && Number.isFinite(course.numericScore)) {
    const score = course.numericScore;
    const byScore = grades.find((g) => score >= g.minScore && score <= g.maxScore);
    if (byScore) return byScore.point;
  }
  return 0;
}

export function resolveLetterFromScore(
  score: number,
  grades: GradingScaleGrade[]
): string {
  const matched = grades.find((g) => score >= g.minScore && score <= g.maxScore);
  return matched ? matched.letter : grades[grades.length - 1]?.letter || 'F';
}

export function calculateSemesterMetrics(
  courses: GpaCourseEntry[],
  grades: GradingScaleGrade[]
): {
  totalUnits: number;
  totalQualityPoints: number;
  gpa: number;
} {
  let totalUnits = 0;
  let totalQualityPoints = 0;

  for (const c of courses) {
    const units = Math.max(0, Number(c.creditUnits) || 0);
    if (units <= 0) continue;
    const pt = getGradePointForEntry(c, grades);
    totalUnits += units;
    totalQualityPoints += units * pt;
  }

  return {
    totalUnits,
    totalQualityPoints,
    gpa: totalUnits > 0 ? Number((totalQualityPoints / totalUnits).toFixed(2)) : 0
  };
}

export function calculateCumulativeMetrics(
  semesters: GpaSemesterRecord[],
  grades: GradingScaleGrade[]
): {
  totalUnits: number;
  totalQualityPoints: number;
  cgpa: number;
  gradeDistribution: Record<string, number>;
  semesterTrend: Array<{ label: string; gpa: number; units: number }>;
} {
  let totalUnits = 0;
  let totalQualityPoints = 0;
  const gradeDistribution: Record<string, number> = {};
  for (const g of grades) {
    gradeDistribution[g.letter] = 0;
  }

  const semesterTrend: Array<{ label: string; gpa: number; units: number }> = [];

  for (const sem of semesters) {
    const m = calculateSemesterMetrics(sem.courses, grades);
    totalUnits += m.totalUnits;
    totalQualityPoints += m.totalQualityPoints;
    semesterTrend.push({
      label: `${sem.session} ${sem.semester.replace(' Semester', ' Sem')}`.trim(),
      gpa: m.gpa,
      units: m.totalUnits
    });

    for (const c of sem.courses) {
      const letter = String(c.grade || '').trim().toUpperCase();
      if (letter) {
        gradeDistribution[letter] = (gradeDistribution[letter] || 0) + 1;
      }
    }
  }

  return {
    totalUnits,
    totalQualityPoints,
    cgpa: totalUnits > 0 ? Number((totalQualityPoints / totalUnits).toFixed(2)) : 0,
    gradeDistribution,
    semesterTrend
  };
}

export function getDegreeClassification(cgpa: number, scaleMax: 7 | 5 | 4): string {
  if (cgpa <= 0) return 'Enter courses to estimate standing';
  if (scaleMax === 7) {
    if (cgpa >= 6.0) return 'First Class Honours (7.0 Scale)';
    if (cgpa >= 4.6) return 'Second Class Upper (2:1)';
    if (cgpa >= 2.6) return 'Second Class Lower (2:2)';
    if (cgpa >= 1.6) return 'Third Class';
    if (cgpa >= 1.0) return 'Pass';
    return 'Probation / Below Pass Standing';
  }
  if (scaleMax === 5) {
    if (cgpa >= 4.5) return 'First Class Honours (1st Class)';
    if (cgpa >= 3.5) return 'Second Class Upper (2:1)';
    if (cgpa >= 2.4) return 'Second Class Lower (2:2)';
    if (cgpa >= 1.5) return 'Third Class';
    if (cgpa >= 1.0) return 'Pass';
    return 'Probation / Below Pass Standing';
  }
  // 4.0 Scale (Polytechnic / UI / 4.0 Universities)
  if (cgpa >= 3.5) return 'Distinction / First Class Standing';
  if (cgpa >= 3.0) return 'Upper Credit / Second Class Upper';
  if (cgpa >= 2.5) return 'Lower Credit / Second Class Lower';
  if (cgpa >= 2.0) return 'Merit / Pass Standing';
  return 'Below Minimum Pass Standing';
}

export function computeTargetGpaPrediction(params: {
  currentUnits: number;
  currentPoints: number;
  targetCgpa: number;
  upcomingUnits: number;
  scaleMax: 7 | 5 | 4;
}): {
  requiredGpa: number;
  achievable: boolean;
  message: string;
} {
  const { currentUnits, currentPoints, targetCgpa, upcomingUnits, scaleMax } = params;
  if (upcomingUnits <= 0) {
    return {
      requiredGpa: 0,
      achievable: false,
      message: 'Enter upcoming semester credit units (> 0) to run prediction.'
    };
  }
  const totalUnitsNeeded = currentUnits + upcomingUnits;
  const totalPointsNeeded = targetCgpa * totalUnitsNeeded;
  const neededNewPoints = totalPointsNeeded - currentPoints;
  const requiredGpa = Number((neededNewPoints / upcomingUnits).toFixed(2));

  if (requiredGpa <= 0) {
    return {
      requiredGpa: 0,
      achievable: true,
      message: `Even with minimal units, you have already surpassed ${targetCgpa.toFixed(2)}.`
    };
  }
  if (requiredGpa > scaleMax) {
    return {
      requiredGpa,
      achievable: false,
      message: `Needs ${requiredGpa.toFixed(2)} across ${upcomingUnits} units, which exceeds the ${scaleMax}.00 maximum scale. Add more upcoming units or adjust target.`
    };
  }
  return {
    requiredGpa,
    achievable: true,
    message: `Target ${targetCgpa.toFixed(2)} is achievable! Aim for at least ${requiredGpa.toFixed(2)} GPA across ${upcomingUnits} credit units.`
  };
}

export function loadGuestAcademicRecord(): SavedAcademicRecord | null {
  try {
    const raw = localStorage.getItem(GUEST_GPA_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedAcademicRecord;
  } catch {
    return null;
  }
}

export function saveGuestAcademicRecord(record: SavedAcademicRecord): void {
  try {
    localStorage.setItem(GUEST_GPA_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Non-blocking storage limit
  }
}

export async function loadUserAcademicRecord(userId: string): Promise<SavedAcademicRecord | null> {
  if (!userId) return loadGuestAcademicRecord();
  try {
    const snap = await getDoc(doc(db, 'gpaRecords', userId));
    if (snap.exists()) {
      return snap.data() as SavedAcademicRecord;
    }
  } catch {
    // Fall back gracefully to local cache
  }
  return loadGuestAcademicRecord();
}

export async function saveUserAcademicRecord(
  userId: string | undefined,
  record: SavedAcademicRecord
): Promise<SavedAcademicRecord> {
  const clean: SavedAcademicRecord = stripUndefined({
    ...record,
    id: userId || 'guest',
    userId: userId || 'guest',
    updatedAt: new Date().toISOString()
  });

  saveGuestAcademicRecord(clean);
  if (userId) {
    await setDoc(doc(db, 'gpaRecords', userId), clean, { merge: true });
  }
  return clean;
}

export async function fetchInstitutionGradingConfig(
  institutionId: string
): Promise<InstitutionGradingConfig | null> {
  const cleanId = String(institutionId || '').trim().toLowerCase();
  if (!cleanId) return null;
  try {
    const res = await fetch(`/api/ecosystem/grading-configs/${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.config) return data.config as InstitutionGradingConfig;
    }
  } catch {
    // Try Firestore directly
  }
  try {
    const snap = await getDoc(doc(db, 'institutionGradingSystems', cleanId));
    if (snap.exists()) {
      return snap.data() as InstitutionGradingConfig;
    }
  } catch {
    // None configured yet
  }
  return null;
}

export function exportGpaSummaryCsv(
  semesters: GpaSemesterRecord[],
  grades: GradingScaleGrade[],
  institutionName: string,
  scaleMax: 7 | 5 | 4
): string {
  const rows: string[] = [
    ['Institution', 'Scale', 'Session', 'Semester', 'Course Code', 'Course Title', 'Credit Units', 'Grade', 'Grade Point', 'Quality Points'].join(',')
  ];
  for (const sem of semesters) {
    for (const c of sem.courses) {
      const pt = getGradePointForEntry(c, grades);
      const qp = (Number(c.creditUnits) || 0) * pt;
      rows.push(
        [
          `"${institutionName.replace(/"/g, '""')}"`,
          `${scaleMax}.0`,
          `"${sem.session}"`,
          `"${sem.semester}"`,
          `"${(c.courseCode || '').replace(/"/g, '""')}"`,
          `"${(c.courseTitle || '').replace(/"/g, '""')}"`,
          String(c.creditUnits || 0),
          `"${c.grade}"`,
          pt.toFixed(2),
          qp.toFixed(2)
        ].join(',')
      );
    }
  }
  const cum = calculateCumulativeMetrics(semesters, grades);
  rows.push('');
  rows.push(`Total Credit Units,${cum.totalUnits}`);
  rows.push(`Total Quality Points,${cum.totalQualityPoints.toFixed(2)}`);
  rows.push(`Estimated CGPA,${cum.cgpa.toFixed(2)} / ${scaleMax}.00`);
  rows.push(`"Disclaimer","${GPA_MANDATORY_DISCLAIMER}"`);
  return rows.join('\n');
}
