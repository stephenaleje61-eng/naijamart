import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { BlockedUserRecord, ConversationReportRecord } from '../types.js';
import { db, stripUndefined, toIsoString } from './firebase.js';

export function makeBlockDocId(blockerId: string, blockedUserId: string): string {
  const a = String(blockerId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const b = String(blockedUserId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${a}__${b}`.slice(0, 128);
}

export function subscribeToBlockedUsers(
  blockerId: string | undefined,
  onData: (blocked: BlockedUserRecord[]) => void
): () => void {
  if (!blockerId) {
    onData([]);
    return () => {};
  }
  try {
    const q = query(collection(db, 'blockedUsers'), where('blockerId', '==', blockerId));
    return onSnapshot(
      q,
      (snap) => {
        const list: BlockedUserRecord[] = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            blockerId: String(data.blockerId || blockerId),
            blockedUserId: String(data.blockedUserId || ''),
            blockedUserName: data.blockedUserName ? String(data.blockedUserName) : undefined,
            reason: data.reason ? String(data.reason) : undefined,
            createdAt: data.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
          };
        });
        onData(list);
      },
      (err) => {
        console.warn('[subscribeToBlockedUsers]:', err?.message || err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function blockUserInChat(params: {
  blockerId: string;
  blockedUserId: string;
  blockedUserName?: string;
  reason?: string;
}): Promise<BlockedUserRecord> {
  if (!params.blockerId || !params.blockedUserId) {
    throw new Error('User ID is required to block.');
  }
  if (params.blockerId === params.blockedUserId) {
    throw new Error('You cannot block yourself.');
  }
  const id = makeBlockDocId(params.blockerId, params.blockedUserId);
  const record: BlockedUserRecord = stripUndefined({
    id,
    blockerId: params.blockerId,
    blockedUserId: params.blockedUserId,
    ...(params.blockedUserName ? { blockedUserName: params.blockedUserName.trim().slice(0, 120) } : {}),
    ...(params.reason ? { reason: params.reason.trim().slice(0, 300) } : {}),
    createdAt: new Date().toISOString()
  });

  await setDoc(doc(db, 'blockedUsers', id), record);
  return record;
}

export async function unblockUserInChat(blockerId: string, blockedUserId: string): Promise<void> {
  if (!blockerId || !blockedUserId) return;
  const id = makeBlockDocId(blockerId, blockedUserId);
  await deleteDoc(doc(db, 'blockedUsers', id));
}

export async function reportPrivateConversation(params: {
  chatId: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details: string;
}): Promise<ConversationReportRecord> {
  if (!params.chatId || !params.reporterId || !params.reportedUserId) {
    throw new Error('Missing conversation participant details.');
  }
  if (!params.reason.trim()) {
    throw new Error('Please select a report reason.');
  }

  const id = `convrep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: ConversationReportRecord = {
    id,
    chatId: params.chatId.slice(0, 128),
    reporterId: params.reporterId.slice(0, 128),
    reporterName: (params.reporterName || 'Campus User').trim().slice(0, 120),
    reportedUserId: params.reportedUserId.slice(0, 128),
    reportedUserName: (params.reportedUserName || 'Campus User').trim().slice(0, 120),
    reason: params.reason.trim().slice(0, 140),
    details: params.details.trim().slice(0, 1200),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'conversationReports', id), stripUndefined(record));
  return record;
}
