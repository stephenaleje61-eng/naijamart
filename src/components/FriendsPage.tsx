import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  Flag,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  RefreshCw,
  Reply,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Square,
  Trash2,
  UserMinus,
  UserPlus,
  X
} from 'lucide-react';
import { UploadTask } from 'firebase/storage';
import {
  BlockedUserRecord,
  ChatAttachmentType,
  ChatMetadata,
  Friend,
  FriendRequest,
  PrivateMessage,
  PrivateMessageReplyRef,
  RegisteredUser
} from '../types.js';
import {
  auth,
  cancelFriendRequest,
  deletePrivateMessage,
  ensureMessagingAuthSession,
  getPrivateChatId,
  loadOlderPrivateMessages,
  markPrivateMessagesSeen,
  openOrCreateDirectChat,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
  sendPrivateMessage,
  setChatTypingStatus,
  subscribeToChatMetadata,
  subscribeToFriendRequests,
  subscribeToFriends,
  subscribeToMyPrivateChats,
  subscribeToPrivateMessages,
  subscribeToRegisteredUsers
} from '../services/firebase.js';
import { uploadChatAttachment } from '../services/imageStorage.js';
import {
  activateGuestModeAsync,
  getLocalStudentSession,
  isGuestModeActive
} from '../utils/studentAuth.js';
import { StudentLoginModal } from './StudentLoginModal.js';
import { useAuth } from '../context/AuthContext.js';
import {
  blockUserInChat,
  reportPrivateConversation,
  subscribeToBlockedUsers,
  unblockUserInChat
} from '../services/messagingSafety.js';
import {
  canMessageTargetUser,
  shouldIncludeInPeopleSearch,
  shouldShowTargetOnlineStatus,
  shouldShowTargetUniversity
} from '../utils/privacy.js';
import {
  NIGERIAN_STATES_AND_FCT,
  VERIFIED_NIGERIAN_INSTITUTIONS
} from '../constants/institutions.js';

export interface DirectChatTarget {
  id: string;
  name: string;
  matricNumber?: string;
}

interface FriendsPageProps {
  onBackToHome: () => void;
  onNavigateToHub: () => void;
  initialChatTarget?: DirectChatTarget | null;
  onClearChatTarget?: () => void;
}

const COMMON_EMOJIS = ['😂', '🔥', '🧡', '👍', '🙏', '🎓', '⚡', '💯', '📦', '₦', '👏', '🥳', '📚'];

function toFriendlyChatError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw =
    typeof err === 'string'
      ? err
      : (err as any)?.message || (err as any)?.code || '';

  let parsedError = raw;
  if (raw.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(raw);
      if (obj?.error) parsedError = String(obj.error);
    } catch {
      // Ignore JSON parse errors
    }
  }

  const lower = parsedError.toLowerCase();
  if (
    lower.includes('missing or insufficient permissions') ||
    lower.includes('permission-denied') ||
    lower.includes('permission denied')
  ) {
    return 'Securing your campus messaging session. Please sign in or tap Refresh to continue.';
  }
  if (lower.includes('unauthenticated') || lower.includes('auth')) {
    return 'Please sign in with your campus account to access private messages.';
  }
  if (lower.includes('unavailable') || lower.includes('network') || lower.includes('offline')) {
    return 'Network connection looks unstable. Check your internet connection and retry.';
  }
  if (lower.includes('failed-precondition') || lower.includes('index')) {
    return 'Conversation sync is updating. Please wait a moment and retry.';
  }
  if (!parsedError.trim()) return fallback;
  return parsedError;
}

function formatDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({
  onBackToHome,
  onNavigateToHub,
  initialChatTarget,
  onClearChatTarget
}) => {
  const { user: authUser } = useAuth();
  const [student, setStudent] = useState<RegisteredUser | null>(() => {
    const existing = getLocalStudentSession();
    const fbUid = auth.currentUser?.uid;
    if (existing && (!fbUid || existing.id === fbUid)) return existing;
    return null;
  });
  const [authSyncReady, setAuthSyncReady] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'requests' | 'discover'>('chats');
  const [activePeer, setActivePeer] = useState<{
    userId: string;
    name: string;
    matricNumber?: string;
    chatId: string;
    isOnline?: boolean;
  } | null>(null);

  const [allUsers, setAllUsers] = useState<RegisteredUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [directChats, setDirectChats] = useState<ChatMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [institutionFilter, setInstitutionFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRemoveFriendId, setConfirmRemoveFriendId] = useState<string | null>(null);

  const [liveMessages, setLiveMessages] = useState<PrivateMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<PrivateMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean>(false);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);
  const [chatLoading, setChatLoading] = useState(false);

  const [chatInputText, setChatInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<PrivateMessageReplyRef | null>(null);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const [pendingAttachment, setPendingAttachment] = useState<{
    fileOrBlob: File | Blob;
    kind: ChatAttachmentType;
    fileName: string;
    fileSize: number;
    previewUrl?: string;
    audioDurationSec?: number;
  } | null>(null);
  const [chatUploadProgress, setChatUploadProgress] = useState(0);
  const [chatIsUploading, setChatIsUploading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatMetadata, setChatMetadata] = useState<ChatMetadata | null>(null);
  const [showChatEmoji, setShowChatEmoji] = useState(false);
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRecord[]>([]);
  const [blockBusy, setBlockBusy] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Scam / Suspicious Payment Demand');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [safetyFeedback, setSafetyFeedback] = useState<string | null>(null);

  // Voice recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartMsRef = useRef<number>(0);

  const activeTaskRef = useRef<UploadTask | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = 'Student Messaging & Friends | NIGERIA CAMPUS MARKET';
  }, []);

  // Synchronize Firebase Auth UID with student state so Firestore rules always align
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (authUser) {
          const activeUid = await ensureMessagingAuthSession().catch(() => authUser.id);
          if (!cancelled) {
            setStudent({
              id: activeUid || authUser.id,
              name: authUser.name,
              matricNumber: authUser.matricNumber || '',
              institutionId: authUser.institutionId,
              phone: authUser.phone || authUser.whatsappNumber,
              whatsappNumber: authUser.whatsappNumber,
              isOnline: true,
              lastSeen: Date.now()
            });
          }
        } else if (isGuestModeActive() || initialChatTarget) {
          const { studentSession } = await activateGuestModeAsync();
          if (!cancelled) setStudent(studentSession);
        } else {
          const existing = getLocalStudentSession();
          if (existing) {
            const activeUid = await ensureMessagingAuthSession().catch(() => null);
            if (!cancelled && activeUid) {
              setStudent({ ...existing, id: activeUid });
            }
          }
        }
      } catch {
        // Non-fatal: student can still trigger sign-in modal
      } finally {
        if (!cancelled) setAuthSyncReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, initialChatTarget?.id]);

  // Open deep-linked direct conversation target once auth UID & student profile match
  useEffect(() => {
    if (!initialChatTarget || !authSyncReady) return;
    let cancelled = false;

    (async () => {
      try {
        let activeStudent = student;
        if (!activeStudent) {
          const { studentSession } = await activateGuestModeAsync();
          activeStudent = studentSession;
          if (!cancelled) setStudent(studentSession);
        }
        const chatId = await openOrCreateDirectChat(
          {
            id: activeStudent.id,
            name: activeStudent.name,
            matricNumber: activeStudent.matricNumber,
            institutionId: activeStudent.institutionId
          },
          initialChatTarget
        );
        if (!cancelled) {
          setActivePeer({
            userId: initialChatTarget.id,
            name: initialChatTarget.name,
            matricNumber: initialChatTarget.matricNumber,
            chatId
          });
          setActiveTab('chats');
          if (onClearChatTarget) onClearChatTarget();
        }
      } catch (err) {
        if (!cancelled) {
          setActionError(toFriendlyChatError(err, 'Could not open direct chat right now.'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialChatTarget?.id, student?.id, authSyncReady]);

  // Subscribe to users, friend requests, friends, private chats, blocked users
  useEffect(() => {
    if (!student || !authSyncReady) {
      setLoading(false);
      return;
    }
    const activeFbUid = auth.currentUser?.uid;
    if (!activeFbUid || activeFbUid !== student.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubUsers = subscribeToRegisteredUsers(student.id, (users) => {
      setAllUsers(users);
      setLoading(false);
    });
    const unsubRequests = subscribeToFriendRequests(student.id, (requests) => {
      setFriendRequests(requests);
    });
    const unsubFriends = subscribeToFriends(student.id, (myFriends) => {
      setFriends(myFriends);
    });
    const unsubChats = subscribeToMyPrivateChats(student.id, (chats) => {
      setDirectChats(chats);
    });
    const unsubBlocked = subscribeToBlockedUsers(student.id, (records) => {
      setBlockedUsers(records);
    });

    return () => {
      unsubUsers();
      unsubRequests();
      unsubFriends();
      unsubChats();
      unsubBlocked();
    };
  }, [student?.id, authSyncReady]);

  // Subscribe to active conversation messages + metadata
  useEffect(() => {
    if (!student || !activePeer) {
      setLiveMessages([]);
      setOlderMessages([]);
      setHasMoreOlder(false);
      return;
    }

    setChatLoading(true);
    setChatError(null);
    setOlderMessages([]);
    setHasMoreOlder(false);
    setReplyTarget(null);
    setConfirmDeleteMsgId(null);

    const chatId = activePeer.chatId || getPrivateChatId(student.id, activePeer.userId);

    const unsubMessages = subscribeToPrivateMessages(
      chatId,
      (msgs) => {
        setLiveMessages(msgs);
        setHasMoreOlder((prev) => prev || msgs.length >= 50);
        setChatLoading(false);
        markPrivateMessagesSeen(chatId, student.id).catch(() => {});
      },
      (errMessage) => {
        setChatLoading(false);
        setChatError(toFriendlyChatError(errMessage, 'Could not load messages for this chat.'));
      },
      50
    );

    const unsubMeta = subscribeToChatMetadata(chatId, (meta) => {
      setChatMetadata(meta);
    });

    return () => {
      unsubMessages();
      unsubMeta();
    };
  }, [student?.id, activePeer?.userId, activePeer?.chatId]);

  // Merge paginated older messages + live newest messages without duplicates
  const chatMessages = useMemo(() => {
    const map = new Map<string, PrivateMessage>();
    for (const m of olderMessages) map.set(m.id, m);
    for (const m of liveMessages) map.set(m.id, m);
    return Array.from(map.values()).sort(
      (a, b) => Date.parse(a.createdAt || '') - Date.parse(b.createdAt || '')
    );
  }, [olderMessages, liveMessages]);

  useEffect(() => {
    if (!loadingOlder) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveMessages.length, pendingAttachment?.previewUrl, loadingOlder]);

  // Cleanup recorder timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const handleLoadOlderMessages = async () => {
    if (!activePeer || loadingOlder || chatMessages.length === 0) return;
    const oldest = chatMessages[0];
    if (!oldest?.createdAt) return;
    setLoadingOlder(true);
    try {
      const chatId = activePeer.chatId || getPrivateChatId(student?.id || '', activePeer.userId);
      const res = await loadOlderPrivateMessages(chatId, oldest.createdAt, 40);
      setOlderMessages((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...res.messages.filter((m) => !seen.has(m.id)), ...prev];
        return merged;
      });
      setHasMoreOlder(res.hasMore);
    } catch (err) {
      setChatError(toFriendlyChatError(err, 'Could not load older messages.'));
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleInputChange = (text: string) => {
    setChatInputText(text);
    if (!student || !activePeer) return;
    const chatId = activePeer.chatId || getPrivateChatId(student.id, activePeer.userId);
    setChatTypingStatus(chatId, student.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setChatTypingStatus(chatId, student.id, false);
    }, 2500);
  };

  const handleOpenDirectConversation = async (target: DirectChatTarget) => {
    setActionError(null);
    try {
      let activeStudent = student;
      if (!activeStudent) {
        const { studentSession } = await activateGuestModeAsync();
        activeStudent = studentSession;
        setStudent(studentSession);
      }

      const targetUser = allUsers.find((u) => u.id === target.id);
      if (targetUser) {
        const viewer = authUser || {
          id: activeStudent.id,
          institutionId: activeStudent.institutionId,
          role: 'buyer' as const
        };
        const isConnected = friends.some((f) => f.userId === target.id);
        const msgCheck = canMessageTargetUser(targetUser, viewer, isConnected);
        if (!msgCheck.allowed) {
          setActionError(msgCheck.reason || 'This user has restricted who can message them.');
          return;
        }
      }

      const chatId = await openOrCreateDirectChat(
        {
          id: activeStudent.id,
          name: activeStudent.name,
          matricNumber: activeStudent.matricNumber,
          institutionId: activeStudent.institutionId
        },
        target
      );
      setActivePeer({
        userId: target.id,
        name: target.name,
        matricNumber: target.matricNumber,
        chatId
      });
    } catch (err) {
      setActionError(toFriendlyChatError(err, 'Could not open direct conversation.'));
    }
  };

  const handleSendFriendRequest = async (targetUser: RegisteredUser) => {
    if (!student) {
      setShowLoginModal(true);
      return;
    }
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, [targetUser.id]: true }));
    try {
      await ensureMessagingAuthSession();
      await sendFriendRequest(
        {
          id: student.id,
          name: student.name,
          matricNumber: student.matricNumber,
          avatarUrl: student.avatarUrl
        },
        { id: targetUser.id, name: targetUser.name }
      );
    } catch (err) {
      setActionError(toFriendlyChatError(err, 'Could not send friend request.'));
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const handleCancelFriendRequest = async (req: FriendRequest) => {
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, [req.id]: true }));
    try {
      await cancelFriendRequest(req.id);
    } catch (err) {
      setActionError(toFriendlyChatError(err, 'Could not cancel friend request.'));
    } finally {
      setActionLoading((prev) => ({ ...prev, [req.id]: false }));
    }
  };

  const handleRespondRequest = async (request: FriendRequest, action: 'accepted' | 'rejected') => {
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, [request.id]: true }));
    try {
      await respondToFriendRequest(request, action);
    } catch (err) {
      setActionError(toFriendlyChatError(err, 'Could not update friend request.'));
    } finally {
      setActionLoading((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  const handleRemoveFriend = async (friend: Friend) => {
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, [friend.id]: true }));
    try {
      await removeFriend(friend.id);
      setConfirmRemoveFriendId(null);
    } catch (err) {
      setActionError(toFriendlyChatError(err, 'Could not remove friend connection.'));
    } finally {
      setActionLoading((prev) => ({ ...prev, [friend.id]: false }));
    }
  };

  const clearPendingAttachment = () => {
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch {}
      activeTaskRef.current = null;
    }
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
    setChatUploadProgress(0);
    setChatError(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleSelectImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setChatError('Only JPG, JPEG, PNG, and WebP images are supported.');
      return;
    }
    clearPendingAttachment();
    setPendingAttachment({
      fileOrBlob: file,
      kind: 'image',
      fileName: file.name,
      fileSize: file.size,
      previewUrl: URL.createObjectURL(file)
    });
  };

  const handleSelectDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['pdf', 'doc', 'docx', 'txt'];
    if (!allowedExts.includes(ext)) {
      setChatError('Only PDF, DOC, DOCX, or TXT files can be sent in chat.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setChatError('Document must be 10MB or smaller.');
      return;
    }
    clearPendingAttachment();
    setPendingAttachment({
      fileOrBlob: file,
      kind: 'document',
      fileName: file.name,
      fileSize: file.size
    });
  };

  const handleStartVoiceNote = async () => {
    if (isRecordingAudio) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setChatError('Voice note recording is not supported in this browser.');
      return;
    }
    try {
      setChatError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recordingStartMsRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecordingAudio(true);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        const durationSec = Math.max(1, Math.round((Date.now() - recordingStartMsRef.current) / 1000));
        setIsRecordingAudio(false);
        if (audioChunksRef.current.length === 0) return;
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const previewUrl = URL.createObjectURL(blob);
        clearPendingAttachment();
        setPendingAttachment({
          fileOrBlob: blob,
          kind: 'audio',
          fileName: `voice-note-${durationSec}s.${ext}`,
          fileSize: blob.size,
          previewUrl,
          audioDurationSec: durationSec
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setIsRecordingAudio(false);
      setChatError('Microphone access is needed to record a campus voice note.');
    }
  };

  const handleStopVoiceNote = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelChatUpload = () => {
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch {}
      activeTaskRef.current = null;
    }
    setChatIsUploading(false);
    setIsSendingMsg(false);
    setChatError('Upload cancelled. Tap Send to retry or clear the attachment.');
  };

  const isActivePeerBlocked = Boolean(
    activePeer && blockedUsers.some((b) => b.blockedUserId === activePeer.userId)
  );

  const handleToggleBlockPeer = async () => {
    if (!student || !activePeer || blockBusy) return;
    setBlockBusy(true);
    setChatError(null);
    setSafetyFeedback(null);
    try {
      if (isActivePeerBlocked) {
        await unblockUserInChat(student.id, activePeer.userId);
        setSafetyFeedback(`${activePeer.name} has been unblocked.`);
      } else {
        await blockUserInChat({
          blockerId: student.id,
          blockedUserId: activePeer.userId,
          blockedUserName: activePeer.name,
          reason: 'Blocked via direct campus messaging'
        });
        setSafetyFeedback(`${activePeer.name} has been blocked. You can unblock anytime.`);
      }
    } catch (err) {
      setChatError(toFriendlyChatError(err, 'Could not update block status.'));
    } finally {
      setBlockBusy(false);
    }
  };

  const handleSubmitConversationReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !activePeer || reportSubmitting) return;
    setReportSubmitting(true);
    setChatError(null);
    try {
      const chatId = activePeer.chatId || getPrivateChatId(student.id, activePeer.userId);
      await reportPrivateConversation({
        chatId,
        reporterId: student.id,
        reporterName: student.name,
        reportedUserId: activePeer.userId,
        reportedUserName: activePeer.name,
        reason: reportReason,
        details: reportDetails
      });
      setShowReportModal(false);
      setReportDetails('');
      setSafetyFeedback('Conversation reported to NIGERIA CAMPUS MARKET safety team.');
    } catch (err) {
      setChatError(toFriendlyChatError(err, 'Could not submit conversation report.'));
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!student || !activePeer || deletingMsgId) return;
    setDeletingMsgId(msgId);
    setChatError(null);
    try {
      const chatId = activePeer.chatId || getPrivateChatId(student.id, activePeer.userId);
      await deletePrivateMessage(chatId, msgId, student.id);
      setConfirmDeleteMsgId(null);
    } catch (err) {
      setChatError(toFriendlyChatError(err, 'Could not delete this message.'));
    } finally {
      setDeletingMsgId(null);
    }
  };

  const handleSendPrivateMsg = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!student || !activePeer) return;
    if (isActivePeerBlocked) {
      setChatError(`You blocked ${activePeer.name}. Unblock them first to send a message.`);
      return;
    }

    const text = chatInputText.trim();
    if (!text && !pendingAttachment) return;

    const chatId = activePeer.chatId || getPrivateChatId(student.id, activePeer.userId);
    setIsSendingMsg(true);
    setChatError(null);

    let uploadedUrl: string | undefined = undefined;
    let attachmentKind: ChatAttachmentType | undefined = undefined;

    try {
      if (pendingAttachment) {
        setChatIsUploading(true);
        const result = await uploadChatAttachment(pendingAttachment.fileOrBlob, {
          kind: pendingAttachment.kind,
          fileName: pendingAttachment.fileName,
          ownerId: student.id,
          onProgress: (pct) => setChatUploadProgress(pct),
          onTaskCreated: (task) => {
            activeTaskRef.current = task;
          }
        });
        activeTaskRef.current = null;
        uploadedUrl = result.downloadUrl;
        attachmentKind = pendingAttachment.kind;
        setChatIsUploading(false);
      }

      await sendPrivateMessage(chatId, {
        senderId: student.id,
        senderName: student.name,
        text: text || undefined,
        imageUrl: attachmentKind === 'image' ? uploadedUrl : undefined,
        attachmentUrl: uploadedUrl,
        attachmentType: attachmentKind,
        attachmentName: pendingAttachment?.fileName,
        attachmentSize: pendingAttachment?.fileSize,
        audioDurationSec: pendingAttachment?.audioDurationSec,
        replyTo: replyTarget || undefined,
        participants: [student.id, activePeer.userId].sort()
      });

      setChatInputText('');
      setReplyTarget(null);
      clearPendingAttachment();
      setShowChatEmoji(false);
      setChatTypingStatus(chatId, student.id, false);
    } catch (err) {
      activeTaskRef.current = null;
      setChatError(toFriendlyChatError(err, 'Failed to send message. Please retry.'));
    } finally {
      setIsSendingMsg(false);
      setChatIsUploading(false);
    }
  };

  const pendingIncoming = useMemo(
    () => friendRequests.filter((r) => r.toId === student?.id && r.status === 'pending'),
    [friendRequests, student?.id]
  );
  const pendingOutgoing = useMemo(
    () => friendRequests.filter((r) => r.fromId === student?.id && r.status === 'pending'),
    [friendRequests, student?.id]
  );
  const pendingOutgoingIds = useMemo(() => pendingOutgoing.map((r) => r.toId), [pendingOutgoing]);
  const friendIds = useMemo(() => friends.map((f) => f.userId), [friends]);

  const institutionStateMap = useMemo(() => {
    const map = new Map<string, { state: string; shortName: string; name: string }>();
    for (const inst of VERIFIED_NIGERIAN_INSTITUTIONS) {
      map.set(inst.id, { state: inst.state, shortName: inst.shortName, name: inst.name });
    }
    return map;
  }, []);

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return directChats;
    return directChats.filter((chat) => {
      const peerId = chat.participants.find((p) => p !== student?.id) || chat.participants[0];
      const peerName = (chat.participantNames?.[peerId] || '').toLowerCase();
      const peerMatric = (chat.participantMatrics?.[peerId] || '').toLowerCase();
      const preview = (chat.lastMessageText || '').toLowerCase();
      return peerName.includes(q) || peerMatric.includes(q) || preview.includes(q);
    });
  }, [directChats, searchQuery, student?.id]);

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.matricNumber && f.matricNumber.toLowerCase().includes(q)) ||
        (f.department && f.department.toLowerCase().includes(q))
    );
  }, [friends, searchQuery]);

  const filteredDiscoverUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (friendIds.includes(u.id)) return false;
      if (!shouldIncludeInPeopleSearch(u, student?.id)) return false;

      const canShowUni = shouldShowTargetUniversity(u, student?.id);
      const instMeta = u.institutionId ? institutionStateMap.get(u.institutionId) : undefined;
      const resolvedState = u.state || instMeta?.state || '';

      if (stateFilter !== 'All') {
        if (!canShowUni || resolvedState.toLowerCase() !== stateFilter.toLowerCase()) {
          return false;
        }
      }
      if (institutionFilter !== 'All') {
        if (!canShowUni || u.institutionId !== institutionFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (canShowUni && u.matricNumber && u.matricNumber.toLowerCase().includes(q)) ||
        (canShowUni && u.department && u.department.toLowerCase().includes(q)) ||
        (canShowUni && instMeta && instMeta.shortName.toLowerCase().includes(q))
      );
    });
  }, [allUsers, friendIds, student?.id, searchQuery, stateFilter, institutionFilter, institutionStateMap]);

  const isPeerTyping =
    activePeer &&
    chatMetadata?.typing &&
    chatMetadata.typing[activePeer.userId] &&
    Date.now() - chatMetadata.typing[activePeer.userId] < 3500;

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#303030] flex flex-col font-sans pb-20 sm:pb-0">
      {/* Top Marketplace Header */}
      <div className="bg-[#FFFFFF] border-b border-[#EEEEEE] px-3 sm:px-5 py-2.5 sticky top-0 z-30 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          {activePeer ? (
            <button
              type="button"
              onClick={() => {
                setActivePeer(null);
                setSafetyFeedback(null);
              }}
              className="md:hidden p-2 rounded-xl bg-[#F7F7F7] border border-[#EEEEEE] hover:bg-[#FF6A00] hover:text-white text-[#222222] transition shrink-0"
              title="Back to Conversations"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBackToHome}
            className={`${activePeer ? 'hidden md:flex' : 'flex'} items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#F7F7F7] border border-[#EEEEEE] hover:border-[#F68B1F] text-[#222222] text-xs font-bold transition shrink-0 whitespace-nowrap`}
            title="Back to NIGERIA CAMPUS MARKET"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Marketplace</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-[#222222] truncate">
                Student Messaging &amp; Friends
              </h1>
              {pendingIncoming.length > 0 && (
                <span className="bg-[#FF6A00] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap">
                  {pendingIncoming.length} req
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#303030]/75 truncate">
              Direct buyer-seller chat &amp; verified campus peer messaging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateToHub}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F7] border border-[#EEEEEE] hover:border-[#F68B1F] text-xs font-bold text-[#222222] rounded-xl transition whitespace-nowrap shrink-0"
          >
            <span>Group Hub</span>
          </button>
          {student ? (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="bg-[#FFF4EB] border border-[#F68B1F]/40 text-[#222222] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline max-w-[110px] truncate">{student.name}</span>
              <span className="font-mono text-[10px] text-[#FF6A00] font-extrabold">
                {student.matricNumber || 'CAMPUS'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="bg-[#FF6A00] hover:bg-[#F68B1F] text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Main Responsive Split-Pane Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto md:p-4 flex flex-col">
        {actionError && (
          <div className="mx-3 mt-3 md:mx-0 md:mt-0 mb-3 p-3 bg-[#FFF4EB] border border-[#F68B1F]/40 text-[#222222] text-xs rounded-xl flex items-center justify-between gap-2 font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FF6A00] shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="font-bold text-[#FF6A00] underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex-1 bg-[#FFFFFF] md:rounded-2xl md:border md:border-[#EEEEEE] md:shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-[360px_1fr] min-h-[calc(100vh-120px)]">
          {/* LEFT SIDEBAR: Tabs, Search, Lists */}
          <aside
            className={`border-r border-[#EEEEEE] flex flex-col bg-[#FFFFFF] ${
              activePeer ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Navigation Tabs */}
            <div className="p-2.5 border-b border-[#EEEEEE] bg-[#F7F7F7]">
              <div className="grid grid-cols-4 gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#EEEEEE]">
                <button
                  type="button"
                  onClick={() => setActiveTab('chats')}
                  className={`py-2 px-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                    activeTab === 'chats'
                      ? 'bg-[#FF6A00] text-white font-extrabold'
                      : 'text-[#303030] hover:bg-[#F7F7F7]'
                  }`}
                >
                  Chats ({directChats.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('friends')}
                  className={`py-2 px-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                    activeTab === 'friends'
                      ? 'bg-[#FF6A00] text-white font-extrabold'
                      : 'text-[#303030] hover:bg-[#F7F7F7]'
                  }`}
                >
                  Friends ({friends.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('requests')}
                  className={`py-2 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 whitespace-nowrap ${
                    activeTab === 'requests'
                      ? 'bg-[#FF6A00] text-white font-extrabold'
                      : 'text-[#303030] hover:bg-[#F7F7F7]'
                  }`}
                >
                  <span>Requests</span>
                  {pendingIncoming.length > 0 && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 rounded-full ${
                        activeTab === 'requests'
                          ? 'bg-white text-[#FF6A00]'
                          : 'bg-[#FF6A00] text-white'
                      }`}
                    >
                      {pendingIncoming.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('discover')}
                  className={`py-2 px-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                    activeTab === 'discover'
                      ? 'bg-[#FF6A00] text-white font-extrabold'
                      : 'text-[#303030] hover:bg-[#F7F7F7]'
                  }`}
                >
                  Discover
                </button>
              </div>

              {/* Quick Filter Search */}
              <div className="relative mt-2.5">
                <Search className="w-4 h-4 text-[#303030]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'discover'
                      ? 'Search name, matric, school, dept...'
                      : 'Filter conversations or contacts...'
                  }
                  className="w-full pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#EEEEEE] focus:border-[#F68B1F] rounded-xl text-xs font-medium text-[#222222] placeholder-[#303030]/50 outline-none"
                />
              </div>

              {activeTab === 'discover' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <select
                    value={stateFilter}
                    onChange={(e) => {
                      setStateFilter(e.target.value);
                      setInstitutionFilter('All');
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl text-[11px] font-semibold text-[#222222] outline-none focus:border-[#F68B1F]"
                  >
                    <option value="All">All States (Nigeria)</option>
                    {NIGERIAN_STATES_AND_FCT.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <select
                    value={institutionFilter}
                    onChange={(e) => setInstitutionFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl text-[11px] font-semibold text-[#222222] outline-none focus:border-[#F68B1F]"
                  >
                    <option value="All">All Institutions</option>
                    {VERIFIED_NIGERIAN_INSTITUTIONS.filter(
                      (i) => stateFilter === 'All' || i.state.toLowerCase() === stateFilter.toLowerCase()
                    ).map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.shortName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Sidebar List Body */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {!student ? (
                <div className="p-6 text-center bg-[#F7F7F7] rounded-2xl border border-[#EEEEEE] my-4">
                  <GraduationCap className="w-10 h-10 text-[#F68B1F] mx-auto mb-2" />
                  <h3 className="text-sm font-extrabold text-[#222222]">
                    Sign in to message students &amp; sellers
                  </h3>
                  <p className="text-xs text-[#303030]/75 mt-1 mb-4">
                    Keep your chats, friend requests, and product inquiries synced safely.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(true)}
                    className="px-4 py-2 bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-xs font-extrabold rounded-xl transition"
                  >
                    Sign In with Campus ID
                  </button>
                </div>
              ) : activeTab === 'chats' ? (
                filteredChats.length === 0 ? (
                  <div className="p-6 text-center bg-[#F7F7F7] rounded-2xl border border-[#EEEEEE] my-4">
                    <MessageCircle className="w-10 h-10 text-[#F68B1F] mx-auto mb-2" />
                    <h3 className="text-sm font-extrabold text-[#222222]">No direct chats yet</h3>
                    <p className="text-xs text-[#303030]/75 mt-1 mb-4">
                      Tap &quot;Chat&quot; on any product, hostel, or student profile to start messaging.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('discover')}
                      className="px-4 py-2 bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-xs font-extrabold rounded-xl transition"
                    >
                      Find Students
                    </button>
                  </div>
                ) : (
                  filteredChats.map((chat) => {
                    const peerId = chat.participants.find((p) => p !== student.id) || chat.participants[0];
                    const peerName = chat.participantNames?.[peerId] || 'Campus Peer';
                    const peerMatric = chat.participantMatrics?.[peerId];
                    const unread = chat.unreadCounts?.[student.id] || 0;
                    const isSelected = activePeer?.chatId === chat.chatId;
                    return (
                      <div
                        key={chat.chatId}
                        onClick={() =>
                          setActivePeer({
                            userId: peerId,
                            name: peerName,
                            matricNumber: peerMatric,
                            chatId: chat.chatId
                          })
                        }
                        className={`rounded-xl p-3 cursor-pointer flex items-center justify-between gap-2.5 border transition ${
                          isSelected
                            ? 'bg-[#FFF4EB] border-[#FF6A00]'
                            : 'bg-[#FFFFFF] border-[#EEEEEE] hover:border-[#F68B1F]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#FF6A00] text-white font-extrabold flex items-center justify-center uppercase shrink-0 text-sm">
                            {peerName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs sm:text-sm font-extrabold text-[#222222] truncate">
                                {peerName}
                              </h4>
                              {peerMatric && (
                                <span className="text-[10px] font-mono text-[#303030]/75 bg-[#F7F7F7] border border-[#EEEEEE] px-1.5 rounded shrink-0">
                                  {peerMatric}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#303030]/75 truncate mt-0.5">
                              {chat.lastMessageText || 'Tap to continue conversation'}
                            </p>
                          </div>
                        </div>
                        {unread > 0 && (
                          <span className="px-2 py-0.5 bg-[#FF6A00] text-white text-[10px] font-extrabold rounded-full shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                    );
                  })
                )
              ) : activeTab === 'friends' ? (
                filteredFriends.length === 0 ? (
                  <div className="p-6 text-center bg-[#F7F7F7] rounded-2xl border border-[#EEEEEE] my-4">
                    <h3 className="text-sm font-extrabold text-[#222222]">No friends connected yet</h3>
                    <p className="text-xs text-[#303030]/75 mt-1 mb-4">
                      Discover fellow students across Nigerian campuses or message sellers directly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('discover')}
                      className="px-4 py-2 bg-[#FF6A00] text-white text-xs font-extrabold rounded-xl"
                    >
                      Find Students
                    </button>
                  </div>
                ) : (
                  filteredFriends.map((f) => {
                    const peerRecord = allUsers.find((u) => u.id === f.userId);
                    const canShowOnline = peerRecord
                      ? shouldShowTargetOnlineStatus(peerRecord, student?.id)
                      : true;
                    const canShowUni = peerRecord
                      ? shouldShowTargetUniversity(peerRecord, student?.id)
                      : true;
                    return (
                      <div
                        key={f.id}
                        className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EEEEEE] hover:border-[#F68B1F] flex items-center justify-between gap-2 transition"
                      >
                        <div
                          onClick={() =>
                            setActivePeer({
                              userId: f.userId,
                              name: f.name,
                              matricNumber: canShowUni ? f.matricNumber : undefined,
                              chatId: f.chatId,
                              isOnline: canShowOnline ? f.isOnline : undefined
                            })
                          }
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                        >
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-[#FFF4EB] border border-[#F68B1F]/40 text-[#FF6A00] font-extrabold flex items-center justify-center uppercase text-sm">
                              {f.name.charAt(0)}
                            </div>
                            {canShowOnline && (
                              <span
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#FFFFFF] rounded-full ${
                                  f.isOnline ? 'bg-emerald-500' : 'bg-[#303030]/35'
                                }`}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-extrabold text-[#222222] truncate">
                              {f.name}
                            </h4>
                            <p className="text-[11px] text-[#303030]/70 truncate">
                              {canShowOnline ? (f.isOnline ? 'Online' : 'Offline') : 'Campus Friend'}
                              {canShowUni && f.matricNumber ? ` · ${f.matricNumber}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setActivePeer({
                                userId: f.userId,
                                name: f.name,
                                matricNumber: canShowUni ? f.matricNumber : undefined,
                                chatId: f.chatId,
                                isOnline: canShowOnline ? f.isOnline : undefined
                              })
                            }
                            className="px-2.5 py-1.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-[11px] font-extrabold rounded-lg"
                          >
                            Chat
                          </button>
                          {confirmRemoveFriendId === f.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleRemoveFriend(f)}
                                disabled={actionLoading[f.id]}
                                className="px-2 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-lg"
                              >
                                Remove
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveFriendId(null)}
                                className="p-1.5 bg-[#F7F7F7] border border-[#EEEEEE] text-[#222222] rounded-lg"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveFriendId(f.id)}
                              title="Remove friend"
                              className="p-1.5 bg-[#F7F7F7] border border-[#EEEEEE] hover:border-red-300 text-[#303030]/75 hover:text-red-600 rounded-lg"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              ) : activeTab === 'requests' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-extrabold uppercase text-[#303030]/70 tracking-wider px-1">
                      Incoming ({pendingIncoming.length})
                    </h3>
                    {pendingIncoming.length === 0 ? (
                      <div className="bg-[#F7F7F7] rounded-xl p-4 text-center border border-[#EEEEEE] text-xs text-[#303030]/70">
                        No pending incoming friend requests.
                      </div>
                    ) : (
                      pendingIncoming.map((req) => (
                        <div
                          key={req.id}
                          className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EEEEEE] flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[#FF6A00] text-white font-extrabold flex items-center justify-center uppercase text-xs shrink-0">
                              {req.fromName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-[#222222] truncate">
                                {req.fromName}
                              </h4>
                              {req.fromMatric && (
                                <span className="text-[10px] text-[#303030]/70 font-mono">
                                  {req.fromMatric}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRespondRequest(req, 'accepted')}
                              disabled={actionLoading[req.id]}
                              className="px-2.5 py-1.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespondRequest(req, 'rejected')}
                              disabled={actionLoading[req.id]}
                              className="p-1.5 bg-[#F7F7F7] border border-[#EEEEEE] text-[#222222] rounded-lg"
                              title="Decline"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[11px] font-extrabold uppercase text-[#303030]/70 tracking-wider px-1">
                      Sent Requests ({pendingOutgoing.length})
                    </h3>
                    {pendingOutgoing.length === 0 ? (
                      <div className="bg-[#F7F7F7] rounded-xl p-4 text-center border border-[#EEEEEE] text-xs text-[#303030]/70">
                        No outgoing pending requests.
                      </div>
                    ) : (
                      pendingOutgoing.map((req) => (
                        <div
                          key={req.id}
                          className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EEEEEE] flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[#FFF4EB] border border-[#F68B1F]/40 text-[#FF6A00] font-extrabold flex items-center justify-center uppercase text-xs shrink-0">
                              {req.toName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-[#222222] truncate">
                                {req.toName}
                              </h4>
                              <span className="text-[10px] text-[#303030]/70 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#F68B1F]" /> Pending approval
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancelFriendRequest(req)}
                            disabled={actionLoading[req.id]}
                            className="px-2.5 py-1.5 bg-[#F7F7F7] border border-[#EEEEEE] hover:border-red-300 hover:text-red-600 text-[#222222] text-[11px] font-bold rounded-lg shrink-0"
                          >
                            Cancel
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : loading ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-7 h-7 text-[#FF6A00] animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#303030]/75">Loading campus students...</p>
                </div>
              ) : filteredDiscoverUsers.length === 0 ? (
                <div className="bg-[#F7F7F7] rounded-2xl p-6 text-center border border-[#EEEEEE] my-4">
                  <GraduationCap className="w-10 h-10 text-[#F68B1F] mx-auto mb-2" />
                  <h4 className="text-sm font-extrabold text-[#222222]">No matching students found</h4>
                  <p className="text-xs text-[#303030]/75 mt-1">
                    Try adjusting your state, institution, or search query.
                  </p>
                </div>
              ) : (
                filteredDiscoverUsers.map((target) => {
                  const isPending = pendingOutgoingIds.includes(target.id);
                  const canShowOnline = shouldShowTargetOnlineStatus(target, student?.id);
                  const canShowUni = shouldShowTargetUniversity(target, student?.id);
                  const instMeta = target.institutionId
                    ? institutionStateMap.get(target.institutionId)
                    : undefined;
                  return (
                    <div
                      key={target.id}
                      className="bg-[#FFFFFF] rounded-xl p-3 border border-[#EEEEEE] hover:border-[#F68B1F] flex items-center justify-between gap-2 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-[#FFF4EB] border border-[#F68B1F]/40 text-[#FF6A00] font-extrabold flex items-center justify-center uppercase text-sm">
                            {target.name.charAt(0)}
                          </div>
                          {canShowOnline && (
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#FFFFFF] ${
                                target.isOnline ? 'bg-emerald-500' : 'bg-[#303030]/35'
                              }`}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-[#222222] truncate">{target.name}</h4>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[10px] text-[#303030]/75">
                            {canShowUni && instMeta?.shortName && (
                              <span className="font-bold text-[#FF6A00]">{instMeta.shortName}</span>
                            )}
                            {canShowUni && target.matricNumber && (
                              <span className="font-mono">{target.matricNumber}</span>
                            )}
                            {canShowUni && target.department && (
                              <span className="truncate max-w-[110px]">{target.department}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenDirectConversation({
                              id: target.id,
                              name: target.name,
                              matricNumber: canShowUni ? target.matricNumber : undefined
                            })
                          }
                          className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#303030] text-white text-[11px] font-bold rounded-lg"
                        >
                          Chat
                        </button>
                        {isPending ? (
                          <span className="text-[10px] font-bold text-[#FF6A00] bg-[#FFF4EB] px-2 py-1.5 rounded-lg border border-[#F68B1F]/40">
                            Sent
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendFriendRequest(target)}
                            disabled={actionLoading[target.id]}
                            className="px-2 py-1.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT PANE: Active Conversation Thread */}
          <main
            className={`flex flex-col bg-[#F7F7F7] min-h-[70vh] ${
              !activePeer ? 'hidden md:flex' : 'flex'
            }`}
          >
            {!activePeer ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#FFFFFF] border border-[#EEEEEE] flex items-center justify-center mb-4 shadow-xs">
                  <MessageCircle className="w-8 h-8 text-[#FF6A00]" />
                </div>
                <h2 className="text-base font-extrabold text-[#222222]">
                  Select a Conversation to Start Chatting
                </h2>
                <p className="text-xs text-[#303030]/75 max-w-sm mt-1.5 leading-relaxed">
                  Message sellers, hostel agents, and fellow students across Nigerian campuses with photos, documents, voice notes, and read receipts.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="px-4 py-2 bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-xs font-extrabold rounded-xl transition"
                  >
                    Find Campus Students
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToHub}
                    className="px-4 py-2 bg-[#FFFFFF] border border-[#EEEEEE] hover:border-[#F68B1F] text-[#222222] text-xs font-bold rounded-xl transition"
                  >
                    Open Campus Group Hub
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="bg-[#FFFFFF] border-b border-[#EEEEEE] px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#FF6A00] text-white font-extrabold flex items-center justify-center text-sm uppercase shrink-0">
                      {activePeer.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-extrabold text-[#222222] truncate">
                        {activePeer.name}
                      </h2>
                      <p className="text-[11px] text-[#303030]/75 truncate">
                        {isActivePeerBlocked ? (
                          <span className="text-red-600 font-bold">Blocked user</span>
                        ) : isPeerTyping ? (
                          <span className="text-[#FF6A00] font-bold">Typing a message...</span>
                        ) : (
                          <span>{activePeer.matricNumber || 'Campus Peer / Seller'}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {student && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleToggleBlockPeer}
                        disabled={blockBusy}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition whitespace-nowrap cursor-pointer ${
                          isActivePeerBlocked
                            ? 'bg-[#FFF4EB] border-[#FF6A00] text-[#FF6A00]'
                            : 'bg-[#F7F7F7] hover:bg-red-50 border-[#EEEEEE] text-[#222222] hover:text-red-600'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {isActivePeerBlocked ? 'Unblock' : 'Block'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReportModal(true)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#F7F7F7] hover:bg-[#FFF4EB] border border-[#EEEEEE] text-[#222222] flex items-center gap-1 transition whitespace-nowrap cursor-pointer"
                      >
                        <Flag className="w-3.5 h-3.5 text-[#FF6A00]" />
                        <span className="hidden sm:inline">Report</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages Scroll Thread */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
                  {safetyFeedback && (
                    <div className="p-2.5 bg-[#FFFFFF] border border-[#F68B1F]/40 text-[#222222] text-xs font-semibold rounded-xl flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#FF6A00] shrink-0" />
                        {safetyFeedback}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSafetyFeedback(null)}
                        className="text-[#FF6A00] font-bold underline text-[11px]"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {isActivePeerBlocked && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center justify-between gap-2">
                      <span>You blocked {activePeer.name}. Unblock to resume messaging.</span>
                      <button
                        type="button"
                        onClick={handleToggleBlockPeer}
                        disabled={blockBusy}
                        className="px-3 py-1 rounded-lg bg-[#FF6A00] text-white text-[11px] font-extrabold shrink-0"
                      >
                        Unblock
                      </button>
                    </div>
                  )}

                  {hasMoreOlder && !chatLoading && (
                    <div className="text-center pb-2">
                      <button
                        type="button"
                        onClick={handleLoadOlderMessages}
                        disabled={loadingOlder}
                        className="px-3.5 py-1.5 bg-[#FFFFFF] border border-[#EEEEEE] hover:border-[#F68B1F] text-[#222222] text-[11px] font-bold rounded-full inline-flex items-center gap-1.5 shadow-xs"
                      >
                        {loadingOlder ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF6A00]" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 text-[#FF6A00]" />
                        )}
                        <span>{loadingOlder ? 'Loading...' : 'Load earlier messages'}</span>
                      </button>
                    </div>
                  )}

                  {chatLoading ? (
                    <div className="py-16 text-center">
                      <Loader2 className="w-8 h-8 text-[#FF6A00] animate-spin mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#303030]/75">Loading conversation...</p>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="py-14 text-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFFFFF] border border-[#EEEEEE] flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="w-6 h-6 text-[#FF6A00]" />
                      </div>
                      <h4 className="text-sm font-extrabold text-[#222222]">
                        Direct Chat with {activePeer.name}
                      </h4>
                      <p className="text-xs text-[#303030]/75 mt-1 mb-4">
                        Send a message about marketplace items, hostel viewing, or campus updates.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setChatInputText('Hello! I am reaching out from NIGERIA CAMPUS MARKET.')
                        }
                        className="px-4 py-2 bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-xs font-extrabold rounded-xl"
                      >
                        Say Hello
                      </button>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isOwn = Boolean(student && msg.senderId === student.id);
                      const effectiveType: ChatAttachmentType | undefined =
                        msg.attachmentType || (msg.imageUrl ? 'image' : undefined);
                      const mediaUrl = msg.attachmentUrl || msg.imageUrl;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`group max-w-[85%] sm:max-w-md rounded-2xl p-3 border shadow-xs ${
                              isOwn
                                ? 'bg-[#FF6A00] border-[#F68B1F] text-white rounded-br-xs'
                                : 'bg-[#FFFFFF] border-[#EEEEEE] text-[#222222] rounded-bl-xs'
                            }`}
                          >
                            {/* Quoted Reply Preview */}
                            {msg.replyTo && !msg.isDeleted && (
                              <div
                                className={`mb-2 p-2 rounded-xl text-[11px] border-l-2 ${
                                  isOwn
                                    ? 'bg-black/15 border-white/80 text-white/95'
                                    : 'bg-[#F7F7F7] border-[#F68B1F] text-[#303030]'
                                }`}
                              >
                                <p className="font-extrabold truncate">{msg.replyTo.senderName}</p>
                                <p className="truncate opacity-85">
                                  {msg.replyTo.text ||
                                    (msg.replyTo.attachmentType === 'image'
                                      ? 'Photo'
                                      : msg.replyTo.attachmentType === 'audio'
                                      ? 'Voice note'
                                      : msg.replyTo.attachmentName || 'Attachment')}
                                </p>
                              </div>
                            )}

                            {/* Media / Attachment */}
                            {!msg.isDeleted && mediaUrl && effectiveType === 'image' && (
                              <div className="rounded-xl overflow-hidden mb-2 bg-[#F7F7F7] max-h-72 border border-black/10">
                                <img
                                  src={mediaUrl}
                                  alt="Chat attachment"
                                  className="w-full h-auto object-cover max-h-72 cursor-pointer"
                                  onClick={() => setLightboxImage(mediaUrl)}
                                />
                              </div>
                            )}

                            {!msg.isDeleted && mediaUrl && effectiveType === 'document' && (
                              <a
                                href={mediaUrl}
                                download={msg.attachmentName || 'document'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl mb-1.5 border ${
                                  isOwn
                                    ? 'bg-black/15 border-white/25 text-white'
                                    : 'bg-[#F7F7F7] border-[#EEEEEE] text-[#222222]'
                                }`}
                              >
                                <FileText className="w-5 h-5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate">
                                    {msg.attachmentName || 'Campus Document'}
                                  </p>
                                  {msg.attachmentSize ? (
                                    <p className="text-[10px] opacity-80">
                                      {Math.max(1, Math.round(msg.attachmentSize / 1024))} KB
                                    </p>
                                  ) : null}
                                </div>
                                <Download className="w-4 h-4 shrink-0" />
                              </a>
                            )}

                            {!msg.isDeleted && mediaUrl && effectiveType === 'audio' && (
                              <div className="mb-1.5 space-y-1">
                                <audio controls src={mediaUrl} className="max-w-[230px] h-9" />
                                {msg.audioDurationSec ? (
                                  <p className="text-[10px] opacity-80">
                                    Voice note · {formatDuration(msg.audioDurationSec)}
                                  </p>
                                ) : null}
                              </div>
                            )}

                            {/* Text */}
                            {msg.text && (
                              <p
                                className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                  msg.isDeleted ? 'italic opacity-75' : 'font-medium'
                                }`}
                              >
                                {msg.text}
                              </p>
                            )}

                            {/* Footer Metadata + Quick Actions */}
                            <div
                              className={`flex items-center justify-between gap-3 mt-1.5 text-[10px] ${
                                isOwn ? 'text-white/85' : 'text-[#303030]/65'
                              }`}
                            >
                              {!msg.isDeleted ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplyTarget({
                                        id: msg.id,
                                        senderId: msg.senderId,
                                        senderName: msg.senderName,
                                        text: msg.text || undefined,
                                        attachmentType: effectiveType,
                                        attachmentName: msg.attachmentName
                                      })
                                    }
                                    className="inline-flex items-center gap-0.5 hover:underline cursor-pointer"
                                    title="Reply"
                                  >
                                    <Reply className="w-3 h-3" />
                                    <span>Reply</span>
                                  </button>
                                  {isOwn &&
                                    (confirmDeleteMsgId === msg.id ? (
                                      <span className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMessage(msg.id)}
                                          disabled={deletingMsgId === msg.id}
                                          className="underline font-bold"
                                        >
                                          {deletingMsgId === msg.id ? 'Deleting...' : 'Confirm'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteMsgId(null)}
                                          className="opacity-80"
                                        >
                                          Cancel
                                        </button>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteMsgId(msg.id)}
                                        className="inline-flex items-center gap-0.5 hover:underline cursor-pointer"
                                        title="Delete message"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete</span>
                                      </button>
                                    ))}
                                </div>
                              ) : (
                                <span />
                              )}

                              <div className="flex items-center gap-1">
                                <span>
                                  {msg.createdAt
                                    ? new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : ''}
                                </span>
                                {isOwn && !msg.isDeleted && (
                                  <CheckCheck
                                    className={`w-3.5 h-3.5 ${
                                      msg.seen ? 'text-white' : 'text-white/60'
                                    }`}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Composer Bar */}
                <div className="bg-[#FFFFFF] border-t border-[#EEEEEE] p-2.5 sm:p-3 sticky bottom-14 sm:bottom-0 z-20">
                  {replyTarget && (
                    <div className="mb-2 p-2 bg-[#FFF4EB] border border-[#F68B1F]/40 rounded-xl flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-extrabold text-[#FF6A00] block">
                          Replying to {replyTarget.senderName}
                        </span>
                        <span className="text-[#303030] truncate block">
                          {replyTarget.text ||
                            (replyTarget.attachmentType === 'image'
                              ? 'Photo'
                              : replyTarget.attachmentType === 'audio'
                              ? 'Voice note'
                              : replyTarget.attachmentName || 'Attachment')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyTarget(null)}
                        className="p-1 text-[#222222] hover:text-[#FF6A00]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {pendingAttachment && (
                    <div className="relative mb-2 p-2.5 bg-[#F7F7F7] border border-[#EEEEEE] rounded-xl flex items-center gap-3">
                      {pendingAttachment.kind === 'image' && pendingAttachment.previewUrl ? (
                        <img
                          src={pendingAttachment.previewUrl}
                          alt="Attachment preview"
                          className="w-12 h-12 object-cover rounded-lg border border-[#EEEEEE]"
                        />
                      ) : pendingAttachment.kind === 'audio' && pendingAttachment.previewUrl ? (
                        <audio controls src={pendingAttachment.previewUrl} className="h-9 max-w-[210px]" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#FFF4EB] text-[#FF6A00] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#222222] truncate">
                          {pendingAttachment.fileName}
                        </p>
                        {chatIsUploading ? (
                          <div className="mt-1 space-y-1">
                            <div className="w-full bg-[#EEEEEE] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#FF6A00] h-1.5 transition-all duration-200"
                                style={{ width: `${chatUploadProgress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-[#FF6A00]">
                                Uploading {chatUploadProgress}%
                              </span>
                              <button
                                type="button"
                                onClick={handleCancelChatUpload}
                                className="text-[#222222] underline font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#303030]/75">Ready to send</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={clearPendingAttachment}
                        className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#EEEEEE] text-[#303030] hover:text-[#222222] flex items-center justify-center shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {chatError && (
                    <div className="mb-2 p-2.5 bg-[#FFF4EB] border border-[#F68B1F]/50 text-[#222222] text-xs rounded-xl flex items-center justify-between gap-2 font-semibold">
                      <span>{chatError}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {pendingAttachment && (
                          <button
                            type="button"
                            onClick={() => handleSendPrivateMsg()}
                            className="px-2 py-0.5 bg-[#FF6A00] text-white font-bold rounded flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setChatError(null)}
                          className="font-bold text-[#FF6A00] underline"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {showChatEmoji && (
                    <div className="p-2 mb-2 bg-[#F7F7F7] border border-[#EEEEEE] rounded-xl flex items-center gap-1.5 overflow-x-auto">
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setChatInputText((prev) => prev + emoji)}
                          className="text-lg p-1.5 hover:bg-[#FFFFFF] rounded-lg shrink-0"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendPrivateMsg} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowChatEmoji((v) => !v)}
                      className="p-2 text-[#303030] hover:text-[#FF6A00] hover:bg-[#F7F7F7] rounded-full shrink-0"
                      title="Emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={handleSelectImageFile}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="p-2 text-[#303030] hover:text-[#FF6A00] hover:bg-[#F7F7F7] rounded-full shrink-0"
                      title="Send Photo"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>

                    <input
                      type="file"
                      ref={docInputRef}
                      onChange={handleSelectDocFile}
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="p-2 text-[#303030] hover:text-[#FF6A00] hover:bg-[#F7F7F7] rounded-full shrink-0"
                      title="Send PDF or Document"
                    >
                      <FileText className="w-5 h-5" />
                    </button>

                    {isRecordingAudio ? (
                      <button
                        type="button"
                        onClick={handleStopVoiceNote}
                        className="px-2.5 py-1.5 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center gap-1 shrink-0"
                        title="Stop Voice Recording"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>{formatDuration(recordingSeconds)}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartVoiceNote}
                        className="p-2 text-[#303030] hover:text-[#FF6A00] hover:bg-[#F7F7F7] rounded-full shrink-0"
                        title="Record Voice Note"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    )}

                    <input
                      type="text"
                      value={chatInputText}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder={`Message ${activePeer.name}...`}
                      className="flex-1 min-w-0 py-2.5 px-3.5 bg-[#F7F7F7] border border-[#EEEEEE] focus:border-[#F68B1F] focus:bg-[#FFFFFF] rounded-full text-xs sm:text-sm font-medium text-[#222222] placeholder-[#303030]/55 outline-none"
                    />

                    <button
                      type="submit"
                      disabled={isSendingMsg || (!chatInputText.trim() && !pendingAttachment)}
                      className="w-10 h-10 rounded-full bg-[#FF6A00] hover:bg-[#F68B1F] disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition"
                      title="Send message"
                    >
                      {isSendingMsg ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#FF6A00] text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Full attachment"
            className="max-w-full max-h-[85vh] rounded-2xl border border-white/20"
          />
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && activePeer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md border border-[#EEEEEE] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#222222] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#FF6A00]">
              <div>
                <h3 className="font-extrabold text-sm text-white">Report Conversation</h3>
                <p className="text-[11px] text-white/80">Reporting chat with {activePeer.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitConversationReport} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#222222] mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] bg-[#F7F7F7] text-[#222222] font-semibold outline-none focus:border-[#F68B1F]"
                >
                  <option value="Scam / Suspicious Payment Demand">
                    Scam / Suspicious Payment Demand
                  </option>
                  <option value="Harassment or Abusive Language">
                    Harassment or Abusive Language
                  </option>
                  <option value="Fake Listing / Impersonation">Fake Listing / Impersonation</option>
                  <option value="Spam or Prohibited Item">Spam or Prohibited Item</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#222222] mb-1">Details</label>
                <textarea
                  rows={3}
                  required
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe what happened so our moderation team can investigate..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] bg-white text-[#222222] outline-none focus:border-[#F68B1F]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#EEEEEE] font-bold text-[#222222] hover:bg-[#F7F7F7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold disabled:opacity-50"
                >
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StudentLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(loggedStudent) => setStudent(loggedStudent)}
        initialData={student}
        title="Connect on NIGERIA CAMPUS MARKET"
        subtitle="Set your name and matric number to message sellers, agents, and fellow campus students."
      />
    </div>
  );
};
