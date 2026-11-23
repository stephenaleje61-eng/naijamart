import { PrivacySettings, RegisteredUser, User } from '../types.js';

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profileVisibility: 'everyone',
  postVisibility: 'everyone',
  whoCanMessage: 'everyone',
  showUniversityInfo: true,
  appearInSearch: true,
  showOnlineStatus: true,
  showPhoneNumber: false
};

export function sanitizePrivacySettings(raw?: Partial<PrivacySettings> | null): PrivacySettings {
  if (!raw) return { ...DEFAULT_PRIVACY_SETTINGS };
  return {
    profileVisibility:
      raw.profileVisibility === 'same_university' ||
      raw.profileVisibility === 'connections_only' ||
      raw.profileVisibility === 'only_me'
        ? raw.profileVisibility
        : 'everyone',
    postVisibility:
      raw.postVisibility === 'same_university' || raw.postVisibility === 'connections_only'
        ? raw.postVisibility
        : 'everyone',
    whoCanMessage:
      raw.whoCanMessage === 'same_university' || raw.whoCanMessage === 'connections_only'
        ? raw.whoCanMessage
        : 'everyone',
    showUniversityInfo: raw.showUniversityInfo !== false,
    appearInSearch: raw.appearInSearch !== false,
    showOnlineStatus: raw.showOnlineStatus !== false,
    showPhoneNumber: raw.showPhoneNumber === true
  };
}

type PrivacySubject = Pick<User | RegisteredUser, 'id' | 'institutionId' | 'privacy'>;

export function canViewUserProfile(
  target: PrivacySubject | null | undefined,
  viewer: Pick<User, 'id' | 'institutionId' | 'role' | 'email'> | null | undefined,
  isConnected = false
): boolean {
  if (!target) return false;
  if (viewer && (viewer.id === target.id || viewer.role === 'admin')) return true;
  const p = sanitizePrivacySettings(target.privacy);
  if (p.profileVisibility === 'only_me') return false;
  if (p.profileVisibility === 'connections_only') return isConnected;
  if (p.profileVisibility === 'same_university') {
    return Boolean(
      viewer?.institutionId &&
        target.institutionId &&
        viewer.institutionId.toLowerCase() === target.institutionId.toLowerCase()
    );
  }
  return true;
}

export function canMessageTargetUser(
  target: PrivacySubject | null | undefined,
  viewer: Pick<User, 'id' | 'institutionId' | 'role'> | null | undefined,
  isConnected = false
): { allowed: boolean; reason?: string } {
  if (!target) return { allowed: true };
  if (viewer && (viewer.id === target.id || viewer.role === 'admin')) {
    return { allowed: true };
  }
  const p = sanitizePrivacySettings(target.privacy);
  if (p.whoCanMessage === 'connections_only' && !isConnected) {
    return {
      allowed: false,
      reason: 'Only campus connections/friends can message this user directly.'
    };
  }
  if (p.whoCanMessage === 'same_university') {
    const sameSchool = Boolean(
      viewer?.institutionId &&
        target.institutionId &&
        viewer.institutionId.toLowerCase() === target.institutionId.toLowerCase()
    );
    if (!sameSchool) {
      return {
        allowed: false,
        reason: 'This user only accepts direct messages from students at their institution.'
      };
    }
  }
  return { allowed: true };
}

export function shouldShowTargetUniversity(
  target: PrivacySubject | null | undefined,
  viewerId?: string | null
): boolean {
  if (!target) return false;
  if (viewerId && viewerId === target.id) return true;
  const p = sanitizePrivacySettings(target.privacy);
  return p.showUniversityInfo;
}

export function shouldShowTargetPhone(
  target: PrivacySubject | null | undefined,
  viewerId?: string | null
): boolean {
  if (!target) return false;
  if (viewerId && viewerId === target.id) return true;
  const p = sanitizePrivacySettings(target.privacy);
  return p.showPhoneNumber;
}

export function shouldShowTargetOnlineStatus(
  target: PrivacySubject | null | undefined,
  viewerId?: string | null
): boolean {
  if (!target) return false;
  if (viewerId && viewerId === target.id) return true;
  const p = sanitizePrivacySettings(target.privacy);
  return p.showOnlineStatus;
}

export function shouldIncludeInPeopleSearch(
  target: PrivacySubject | null | undefined,
  viewerId?: string | null
): boolean {
  if (!target) return false;
  if (viewerId && viewerId === target.id) return true;
  const p = sanitizePrivacySettings(target.privacy);
  return p.appearInSearch;
}
