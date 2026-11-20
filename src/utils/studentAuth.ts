/**
 * Campus student session helper for NIGERIA CAMPUS MARKET nationwide network.
 * Allows frictionless campus student profile setup while aligning UIDs with Firebase Auth.
 */
import {
  auth,
  ensureGuestAuth,
  ensureMessagingAuthSession,
  saveCampusUserProfile
} from '../services/firebase.js';
import { RegisteredUser } from '../types.js';

const STORAGE_KEY = 'fuwukari_student_session';

export const GUEST_MODE_KEY = 'fu_market_guest_mode';
export const GUEST_ID_KEY = 'fu_market_guest_id';

export function getLocalStudentSession(): RegisteredUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RegisteredUser;
    const fbUid = auth.currentUser?.uid;
    if (fbUid && parsed && parsed.id !== fbUid && (parsed.id.startsWith('guest_') || parsed.id.startsWith('fuw_'))) {
      return { ...parsed, id: fbUid };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalStudentSession(user: RegisteredUser, syncToFirestore = true): void {
  try {
    const activeFbUid = auth.currentUser?.uid;
    const alignedUser: RegisteredUser =
      activeFbUid && (!user.id || user.id.startsWith('guest_') || user.id.startsWith('fuw_'))
        ? { ...user, id: activeFbUid }
        : user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alignedUser));
    if (syncToFirestore) {
      saveCampusUserProfile(alignedUser).catch((err) => {
        console.warn('[saveCampusUserProfile background warn]:', err);
      });
    }
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
  const fbUid = auth.currentUser?.uid;
  if (fbUid) return fbUid;
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
    ensureGuestAuth()
      .then((uid) => {
        if (uid && uid !== existingStudent.id) {
          saveLocalStudentSession({ ...existingStudent, id: uid }, true);
        }
      })
      .catch(() => {});
    return { guestId: existingStudent.id, studentSession: existingStudent };
  }

  const guestSession: RegisteredUser = {
    id: guestId,
    name: `Campus Guest (${guestId.slice(-4).toUpperCase()})`,
    matricNumber: 'GUEST',
    isOnline: true,
    lastSeen: Date.now()
  };

  if (auth.currentUser?.uid) {
    saveLocalStudentSession({ ...guestSession, id: auth.currentUser.uid }, true);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guestSession));
    ensureGuestAuth()
      .then((uid) => {
        if (uid) {
          try {
            localStorage.setItem(GUEST_ID_KEY, uid);
          } catch {}
          saveLocalStudentSession(
            {
              ...guestSession,
              id: uid,
              name: `Campus Guest (${uid.slice(-4).toUpperCase()})`
            },
            true
          );
        }
      })
      .catch(() => {});
  }
  return { guestId, studentSession: guestSession };
}

export async function activateGuestModeAsync(): Promise<{
  guestId: string;
  studentSession: RegisteredUser;
}> {
  const uid = await ensureMessagingAuthSession();
  try {
    localStorage.setItem(GUEST_MODE_KEY, '1');
    localStorage.setItem(GUEST_ID_KEY, uid);
  } catch {}

  const existingStudent = getLocalStudentSession();
  const baseSession: RegisteredUser = existingStudent
    ? { ...existingStudent, id: uid }
    : {
        id: uid,
        name: `Campus Guest (${uid.slice(-4).toUpperCase()})`,
        matricNumber: 'GUEST',
        isOnline: true,
        lastSeen: Date.now()
      };

  saveLocalStudentSession(baseSession, true);
  return { guestId: uid, studentSession: baseSession };
}

export function clearGuestMode(): void {
  try {
    localStorage.removeItem(GUEST_MODE_KEY);
    localStorage.removeItem(GUEST_ID_KEY);
  } catch {}
}

export function generateStudentId(matricNumber?: string): string {
  const fbUid = auth.currentUser?.uid;
  if (fbUid) return fbUid;
  if (matricNumber && matricNumber.trim().length > 3) {
    const sanitized = matricNumber.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `std_${sanitized}`;
  }
  return `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

