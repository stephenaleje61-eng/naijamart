/**
 * Campus student session helper for FUWukari Single Hub, Friends & Hux Hub.
 * Allows instant, frictionless login with Full Name + Matric Number,
 * syncing with Firebase Firestore "users" collection.
 */
import { saveCampusUserProfile } from '../services/firebase.js';
import { RegisteredUser } from '../types.js';

const STORAGE_KEY = 'fuwukari_student_session';

export const GUEST_MODE_KEY = 'fu_market_guest_mode';
export const GUEST_ID_KEY = 'fu_market_guest_id';

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

export function isGuestModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(GUEST_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return `guest_${Date.now()}`;
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY);
    if (existing && existing.trim()) return existing.trim();
    const created = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem(GUEST_ID_KEY, created);
    return created;
  } catch {
    return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }
}

export function activateGuestMode(): { guestId: string; studentSession: RegisteredUser } {
  const guestId = getOrCreateGuestId();
  try {
    localStorage.setItem(GUEST_MODE_KEY, '1');
  } catch {}

  const existingStudent = getLocalStudentSession();
  if (existingStudent) {
    return { guestId, studentSession: existingStudent };
  }

  const guestSession: RegisteredUser = {
    id: guestId,
    name: `Guest (${guestId.slice(-4).toUpperCase()})`,
    matricNumber: 'GUEST',
    isOnline: true,
    lastSeen: Date.now()
  };
  saveLocalStudentSession(guestSession);
  return { guestId, studentSession: guestSession };
}

export function clearGuestMode(): void {
  try {
    localStorage.removeItem(GUEST_MODE_KEY);
  } catch {}
}

export function generateStudentId(matricNumber?: string): string {
  if (matricNumber && matricNumber.trim().length > 3) {
    const sanitized = matricNumber.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `fuw_${sanitized}`;
  }
  return `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}
