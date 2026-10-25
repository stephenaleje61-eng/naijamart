/**
 * Campus student session helper for FUWukari Single Hub, Friends & Hux Hub.
 * Allows instant, frictionless login with Full Name + Matric Number,
 * syncing with Firebase Firestore "users" collection.
 */
import { saveCampusUserProfile } from '../services/firebase.js';
import { RegisteredUser } from '../types.js';

const STORAGE_KEY = 'fuwukari_student_session';

export function getLocalStudentSession(): RegisteredUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RegisteredUser;
  } catch {
    return null;
  }
}

export function saveLocalStudentSession(user: RegisteredUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    // Asynchronously push to Firebase Firestore users collection
    saveCampusUserProfile(user).catch(err => {
      console.warn('[saveCampusUserProfile background warn]:', err);
    });
  } catch (err) {
    console.error('Failed to save student session:', err);
  }
}

export function clearStudentSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function generateStudentId(matricNumber?: string): string {
  if (matricNumber && matricNumber.trim().length > 3) {
    const sanitized = matricNumber.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `fuw_${sanitized}`;
  }
  return `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}
