import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  AnnouncementAudienceScope,
  Institution,
  NationalCampusAnnouncement,
  StudentPost,
  StudentPostCategory,
  StudentPostComment,
  StudentPostReport,
  StudentVerificationRequest,
  UniversityCommunityMembership
} from '../types.js';
import { auth, db, stripUndefined, toIsoString } from './firebase.js';
import { createNotification } from './notifications.js';

// ============================================================================
// 1. STUDENT SOCIAL FEED (Posts, Likes, Nested Comments, Follows, Reports)
// ============================================================================

export function subscribeToStudentPosts(
  onData: (posts: StudentPost[]) => void,
  institutionId?: string
): () => void {
  try {
    const q = institutionId
      ? query(
          collection(db, 'studentPosts'),
          where('institutionId', '==', institutionId),
          limit(100)
        )
      : query(collection(db, 'studentPosts'), orderBy('createdAt', 'desc'), limit(120));

    return onSnapshot(
      q,
      (snap) => {
        const items: StudentPost[] = [];
        snap.forEach((d) => {
          const data = d.data() || {};
          if (data.status === 'removed') return;
          items.push({
            id: String(data.id || d.id),
            authorId: String(data.authorId || ''),
            authorName: String(data.authorName || 'Student Member'),
            authorAvatar: data.authorAvatar,
            authorInstitutionId: data.authorInstitutionId,
            authorInstitutionName: data.authorInstitutionName,
            authorDepartment: data.authorDepartment,
            authorLevel: data.authorLevel,
            authorVerified: Boolean(data.authorVerified),
            institutionId: String(data.institutionId || ''),
            state: data.state,
            category: (data.category || 'campus_update') as StudentPostCategory,
            content: String(data.content || ''),
            imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
            likesCount: Number(data.likesCount || 0),
            commentsCount: Number(data.commentsCount || 0),
            sharesCount: Number(data.sharesCount || 0),
            status: data.status || 'published',
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt)
          });
        });
        items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        onData(items);
      },
      (err) => {
        console.warn('[subscribeToStudentPosts]:', err?.message || err);
        onData([]);
      }
    );
  } catch {
    return () => {};
  }
}

export async function createStudentPost(params: {
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorInstitutionId?: string;
  authorInstitutionName?: string;
  authorDepartment?: string;
  authorLevel?: string;
  authorVerified?: boolean;
  institutionId: string;
  state?: string;
  category: StudentPostCategory;
  content: string;
  imageUrls?: string[];
}): Promise<StudentPost> {
  const cleanContent = params.content.trim();
  if (!cleanContent) {
    throw new Error('Please write something to share with the campus community.');
  }
  const id = `spost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const post: StudentPost = stripUndefined({
    id,
    authorId: params.authorId,
    authorName: params.authorName.trim() || 'University Student',
    ...(params.authorAvatar ? { authorAvatar: params.authorAvatar } : {}),
    ...(params.authorInstitutionId ? { authorInstitutionId: params.authorInstitutionId } : {}),
    ...(params.authorInstitutionName ? { authorInstitutionName: params.authorInstitutionName } : {}),
    ...(params.authorDepartment ? { authorDepartment: params.authorDepartment } : {}),
    ...(params.authorLevel ? { authorLevel: params.authorLevel } : {}),
    authorVerified: Boolean(params.authorVerified),
    institutionId: params.institutionId,
    ...(params.state ? { state: params.state } : {}),
    category: params.category,
    content: cleanContent.slice(0, 4000),
    imageUrls: Array.isArray(params.imageUrls) ? params.imageUrls.slice(0, 4) : [],
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    status: 'published',
    createdAt: now,
    updatedAt: now
  });

  await setDoc(doc(db, 'studentPosts', id), post);
  return post;
}

export async function deleteStudentPost(postId: string): Promise<void> {
  if (!postId) return;
  await deleteDoc(doc(db, 'studentPosts', postId));
}

export function subscribeToMyLikedPostIds(
  userId: string | undefined,
  onData: (likedPostIds: Set<string>) => void
): () => void {
  if (!userId) {
    onData(new Set());
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'studentPostLikes'),
      where('userId', '==', userId),
      limit(200)
    );
    return onSnapshot(
      q,
      (snap) => {
        const set = new Set<string>();
        snap.forEach((d) => {
          const pid = d.data()?.postId;
          if (pid) set.add(String(pid));
        });
        onData(set);
      },
      () => onData(new Set())
    );
  } catch {
    return () => {};
  }
}

export async function toggleStudentPostLike(params: {
  post: StudentPost;
  userId: string;
  userName: string;
  isCurrentlyLiked: boolean;
}): Promise<void> {
  const likeId = `${params.post.id}__${params.userId}`.slice(0, 128);
  const likeRef = doc(db, 'studentPostLikes', likeId);
  const postRef = doc(db, 'studentPosts', params.post.id);

  if (params.isCurrentlyLiked) {
    await deleteDoc(likeRef);
    await updateDoc(postRef, {
      likesCount: Math.max(0, (params.post.likesCount || 1) - 1),
      updatedAt: new Date().toISOString()
    }).catch(() => {});
  } else {
    await setDoc(likeRef, {
      id: likeId,
      postId: params.post.id,
      userId: params.userId,
      createdAt: new Date().toISOString()
    });
    await updateDoc(postRef, {
      likesCount: increment(1),
      updatedAt: new Date().toISOString()
    }).catch(() => {});

    if (params.post.authorId && params.post.authorId !== params.userId) {
      createNotification({
        userId: params.post.authorId,
        type: 'like',
        title: `${params.userName} liked your campus post`,
        body: params.post.content.slice(0, 100),
        targetType: 'social_post',
        targetId: params.post.id
      }).catch(() => {});
    }
  }
}

export function subscribeToPostComments(
  postId: string,
  onData: (comments: StudentPostComment[]) => void
): () => void {
  if (!postId) {
    onData([]);
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'studentPostComments'),
      where('postId', '==', postId),
      limit(120)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list: StudentPostComment[] = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: String(data.id || d.id),
            postId: String(data.postId || postId),
            parentCommentId: data.parentCommentId,
            authorId: String(data.authorId || ''),
            authorName: String(data.authorName || 'Student'),
            authorAvatar: data.authorAvatar,
            authorInstitutionId: data.authorInstitutionId,
            authorVerified: Boolean(data.authorVerified),
            text: String(data.text || ''),
            createdAt: toIsoString(data.createdAt)
          };
        });
        list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        onData(list);
      },
      () => onData([])
    );
  } catch {
    return () => {};
  }
}

export async function addPostComment(params: {
  post: StudentPost;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorInstitutionId?: string;
  authorVerified?: boolean;
  text: string;
  parentCommentId?: string;
}): Promise<StudentPostComment> {
  const cleanText = params.text.trim();
  if (!cleanText) throw new Error('Comment cannot be empty.');
  const id = `spc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const comment: StudentPostComment = stripUndefined({
    id,
    postId: params.post.id,
    ...(params.parentCommentId ? { parentCommentId: params.parentCommentId } : {}),
    authorId: params.authorId,
    authorName: params.authorName.trim() || 'Student',
    ...(params.authorAvatar ? { authorAvatar: params.authorAvatar } : {}),
    ...(params.authorInstitutionId ? { authorInstitutionId: params.authorInstitutionId } : {}),
    authorVerified: Boolean(params.authorVerified),
    text: cleanText.slice(0, 2000),
    createdAt: now
  });

  await setDoc(doc(db, 'studentPostComments', id), comment);
  await updateDoc(doc(db, 'studentPosts', params.post.id), {
    commentsCount: increment(1),
    updatedAt: now
  }).catch(() => {});

  if (params.post.authorId && params.post.authorId !== params.authorId) {
    createNotification({
      userId: params.post.authorId,
      type: 'comment',
      title: `${params.authorName} commented on your post`,
      body: cleanText.slice(0, 120),
      targetType: 'social_post',
      targetId: params.post.id
    }).catch(() => {});
  }

  return comment;
}

export async function shareStudentPost(postId: string): Promise<void> {
  if (!postId) return;
  await updateDoc(doc(db, 'studentPosts', postId), {
    sharesCount: increment(1),
    updatedAt: new Date().toISOString()
  }).catch(() => {});
}

export function subscribeToFollowedDiscussionIds(
  userId: string | undefined,
  onData: (followedIds: Set<string>) => void
): () => void {
  if (!userId) {
    onData(new Set());
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'followedDiscussions'),
      where('userId', '==', userId),
      limit(150)
    );
    return onSnapshot(
      q,
      (snap) => {
        const set = new Set<string>();
        snap.forEach((d) => {
          const pid = d.data()?.postId;
          if (pid) set.add(String(pid));
        });
        onData(set);
      },
      () => onData(new Set())
    );
  } catch {
    return () => {};
  }
}

export async function toggleFollowDiscussion(params: {
  postId: string;
  userId: string;
  isFollowing: boolean;
}): Promise<void> {
  const docId = `${params.userId}__${params.postId}`.slice(0, 128);
  const refDoc = doc(db, 'followedDiscussions', docId);
  if (params.isFollowing) {
    await deleteDoc(refDoc);
  } else {
    await setDoc(refDoc, {
      id: docId,
      userId: params.userId,
      postId: params.postId,
      createdAt: new Date().toISOString()
    });
  }
}

export async function reportStudentPost(params: {
  postId: string;
  postAuthorId: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  details: string;
}): Promise<void> {
  const id = `postrep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const report: StudentPostReport = {
    id,
    postId: params.postId,
    postAuthorId: params.postAuthorId,
    reporterId: params.reporterId,
    reporterName: params.reporterName || 'Campus Member',
    reason: params.reason.trim().slice(0, 140),
    details: params.details.trim().slice(0, 1200),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'studentPostReports', id), stripUndefined(report));
}

export function subscribeToStudentPostReports(
  onData: (reports: StudentPostReport[]) => void
): () => void {
  try {
    const q = query(collection(db, 'studentPostReports'), orderBy('createdAt', 'desc'), limit(120));
    return onSnapshot(
      q,
      (snap) => {
        const list: StudentPostReport[] = snap.docs.map((d) => ({
          ...(d.data() as StudentPostReport),
          id: d.id,
          createdAt: toIsoString(d.data()?.createdAt)
        }));
        onData(list);
      },
      () => onData([])
    );
  } catch {
    return () => {};
  }
}

// ============================================================================
// 2. UNIVERSITY COMMUNITY MEMBERSHIPS
// ============================================================================

export function subscribeToCommunityMemberships(
  userId: string | undefined,
  onData: (memberships: UniversityCommunityMembership[]) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'communityMemberships'),
      where('userId', '==', userId),
      limit(60)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list: UniversityCommunityMembership[] = snap.docs.map((d) => ({
          ...(d.data() as UniversityCommunityMembership),
          id: d.id,
          joinedAt: toIsoString(d.data()?.joinedAt)
        }));
        onData(list);
      },
      () => onData([])
    );
  } catch {
    return () => {};
  }
}

export function subscribeToAllCommunityMemberCounts(
  onData: (countsByInst: Record<string, number>) => void
): () => void {
  try {
    const q = query(collection(db, 'communityMemberships'), limit(500));
    return onSnapshot(
      q,
      (snap) => {
        const counts: Record<string, number> = {};
        snap.forEach((d) => {
          const instId = String(d.data()?.institutionId || '').trim();
          if (instId) counts[instId] = (counts[instId] || 0) + 1;
        });
        onData(counts);
      },
      () => onData({})
    );
  } catch {
    return () => {};
  }
}

export async function joinUniversityCommunity(params: {
  userId: string;
  userName: string;
  institutionId: string;
  campus?: string;
  department?: string;
  levelOfStudy?: string;
}): Promise<UniversityCommunityMembership> {
  const id = `${params.userId}__${params.institutionId}`.slice(0, 128);
  const record: UniversityCommunityMembership = stripUndefined({
    id,
    userId: params.userId,
    userName: params.userName,
    institutionId: params.institutionId,
    ...(params.campus ? { campus: params.campus } : {}),
    ...(params.department ? { department: params.department } : {}),
    ...(params.levelOfStudy ? { levelOfStudy: params.levelOfStudy } : {}),
    joinedAt: new Date().toISOString()
  });
  await setDoc(doc(db, 'communityMemberships', id), record);
  return record;
}

export async function leaveUniversityCommunity(userId: string, institutionId: string): Promise<void> {
  const id = `${userId}__${institutionId}`.slice(0, 128);
  await deleteDoc(doc(db, 'communityMemberships', id));
}

// ============================================================================
// 3. STUDENT VERIFICATION REQUESTS
// ============================================================================

export async function submitStudentVerificationRequest(params: {
  userId: string;
  userName: string;
  email: string;
  institutionalEmail?: string;
  phone: string;
  institutionId: string;
  institutionName?: string;
  campus?: string;
  department: string;
  levelOfStudy: string;
  matricNumber?: string;
  verificationMethod: 'edu_email' | 'student_id';
  studentIdDocumentUrl?: string;
}): Promise<StudentVerificationRequest> {
  const id = `sver_${params.userId}_${Date.now()}`.slice(0, 120);
  const now = new Date().toISOString();
  const reqDoc: StudentVerificationRequest = stripUndefined({
    id,
    userId: params.userId,
    userName: params.userName.trim(),
    email: params.email.trim().toLowerCase(),
    ...(params.institutionalEmail ? { institutionalEmail: params.institutionalEmail.trim().toLowerCase() } : {}),
    phone: params.phone.trim(),
    institutionId: params.institutionId,
    ...(params.institutionName ? { institutionName: params.institutionName } : {}),
    ...(params.campus ? { campus: params.campus } : {}),
    department: params.department.trim(),
    levelOfStudy: params.levelOfStudy.trim(),
    ...(params.matricNumber ? { matricNumber: params.matricNumber.trim() } : {}),
    verificationMethod: params.verificationMethod,
    ...(params.studentIdDocumentUrl ? { studentIdDocumentUrl: params.studentIdDocumentUrl } : {}),
    status: 'pending',
    createdAt: now,
    updatedAt: now
  });

  await setDoc(doc(db, 'studentVerifications', id), reqDoc);
  return reqDoc;
}

export function subscribeToMyVerificationRequests(
  userId: string | undefined,
  onData: (items: StudentVerificationRequest[]) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'studentVerifications'),
      where('userId', '==', userId),
      limit(15)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list: StudentVerificationRequest[] = snap.docs.map((d) => ({
          ...(d.data() as StudentVerificationRequest),
          id: d.id,
          createdAt: toIsoString(d.data()?.createdAt),
          updatedAt: toIsoString(d.data()?.updatedAt)
        }));
        list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        onData(list);
      },
      () => onData([])
    );
  } catch {
    return () => {};
  }
}

export function subscribeToAllVerificationRequests(
  onData: (items: StudentVerificationRequest[]) => void
): () => void {
  try {
    const q = query(collection(db, 'studentVerifications'), orderBy('createdAt', 'desc'), limit(150));
    return onSnapshot(
      q,
      (snap) => {
        const list: StudentVerificationRequest[] = snap.docs.map((d) => ({
          ...(d.data() as StudentVerificationRequest),
          id: d.id,
          createdAt: toIsoString(d.data()?.createdAt),
          updatedAt: toIsoString(d.data()?.updatedAt)
        }));
        onData(list);
      },
      () => onData([])
    );
  } catch {
    return () => {};
  }
}

export async function reviewStudentVerificationRequest(params: {
  requestId: string;
  decision: 'approved' | 'rejected';
  targetUserId: string;
  userName?: string;
  institutionId?: string;
  verificationMethod?: string;
  reviewNotes?: string;
  ceoSessionToken?: string;
}): Promise<void> {
  const fbToken = await auth.currentUser?.getIdToken().catch(() => undefined);
  if (!fbToken) throw new Error('CEO authentication required.');
  const res = await fetch(
    `/api/network/verifications/review/${encodeURIComponent(params.requestId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-firebase-id-token': fbToken,
        ...(params.ceoSessionToken ? { 'x-ceo-session': params.ceoSessionToken } : {})
      },
      body: JSON.stringify(params)
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Could not process student verification.');
}

// ============================================================================
// 4. TARGETED NATIONAL & CAMPUS ANNOUNCEMENTS
// ============================================================================

export function doesAnnouncementMatchInstitution(
  ann: NationalCampusAnnouncement,
  institution?: Institution
): boolean {
  if (ann.status === 'archived') return false;
  if (ann.audienceScope === 'all_universities') {
    return !institution || institution.type.toLowerCase().includes('university');
  }
  if (ann.audienceScope === 'all_polytechnics') {
    return (
      !institution ||
      institution.type.toLowerCase().includes('polytechnic') ||
      institution.type.toLowerCase().includes('college')
    );
  }
  if (ann.audienceScope === 'single_institution') {
    return Boolean(institution && ann.singleInstitutionId === institution.id);
  }
  if (ann.audienceScope === 'selected_institutions') {
    return Boolean(
      institution &&
        Array.isArray(ann.targetInstitutionIds) &&
        ann.targetInstitutionIds.includes(institution.id)
    );
  }
  if (ann.audienceScope === 'selected_states') {
    return Boolean(
      institution &&
        Array.isArray(ann.targetStates) &&
        ann.targetStates.some((s) => s.toLowerCase() === institution.state.toLowerCase())
    );
  }
  return true;
}

export function subscribeToNationalAnnouncements(
  onData: (items: NationalCampusAnnouncement[]) => void
): () => void {
  let fsItems: NationalCampusAnnouncement[] = [];
  let serverItems: NationalCampusAnnouncement[] = [];

  const emit = () => {
    const byId = new Map<string, NationalCampusAnnouncement>();
    for (const s of serverItems) byId.set(s.id, s);
    for (const f of fsItems) byId.set(f.id, f);
    const merged = Array.from(byId.values())
      .filter((a) => a.status !== 'archived')
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
    onData(merged);
  };

  fetch('/api/network/announcements')
    .then((r) => (r.ok ? r.json() : { announcements: [] }))
    .then((data) => {
      if (Array.isArray(data?.announcements)) {
        serverItems = data.announcements;
        emit();
      }
    })
    .catch(() => {});

  try {
    const q = query(
      collection(db, 'nationalAnnouncements'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    return onSnapshot(
      q,
      (snap) => {
        fsItems = snap.docs.map((d) => ({
          ...(d.data() as NationalCampusAnnouncement),
          id: d.id,
          createdAt: toIsoString(d.data()?.createdAt),
          updatedAt: toIsoString(d.data()?.updatedAt)
        }));
        emit();
      },
      () => emit()
    );
  } catch {
    return () => {};
  }
}

export async function publishNationalAnnouncement(params: {
  title: string;
  body: string;
  category: NationalCampusAnnouncement['category'];
  audienceScope: AnnouncementAudienceScope;
  targetInstitutionIds?: string[];
  targetStates?: string[];
  singleInstitutionId?: string;
  isPinned?: boolean;
  isUrgent?: boolean;
  imageUrl?: string;
  ceoSessionToken?: string;
}): Promise<NationalCampusAnnouncement> {
  const fbToken = await auth.currentUser?.getIdToken().catch(() => undefined);
  if (!fbToken) {
    throw new Error('Authentication required to publish official announcements.');
  }
  const res = await fetch('/api/network/announcements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-firebase-id-token': fbToken,
      ...(params.ceoSessionToken ? { 'x-ceo-session': params.ceoSessionToken } : {})
    },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Could not publish announcement.');
  }
  return data.announcement as NationalCampusAnnouncement;
}

export async function deleteNationalAnnouncement(
  id: string,
  ceoSessionToken?: string
): Promise<void> {
  const fbToken = await auth.currentUser?.getIdToken().catch(() => undefined);
  if (!fbToken) throw new Error('Authentication required.');
  const res = await fetch(`/api/network/announcements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'x-firebase-id-token': fbToken,
      ...(ceoSessionToken ? { 'x-ceo-session': ceoSessionToken } : {})
    }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Could not delete announcement.');
  }
}

export async function resolveStudentPostReport(params: {
  reportId: string;
  decision: 'removed' | 'dismissed';
  postId?: string;
}): Promise<void> {
  if (params.decision === 'removed' && params.postId) {
    await updateDoc(doc(db, 'studentPosts', params.postId), {
      status: 'removed',
      updatedAt: new Date().toISOString()
    }).catch(() => {});
  }
  await updateDoc(doc(db, 'studentPostReports', params.reportId), {
    status: params.decision,
    reviewedByEmail: auth.currentUser?.email || 'admin'
  });
}
