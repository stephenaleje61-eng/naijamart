import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  MessageCircle,
  Search,
  Check,
  X,
  ArrowLeft,
  Send,
  Smile,
  Image as ImageIcon,
  Loader2,
  CheckCheck,
  RefreshCw,
  GraduationCap,
  AlertCircle,
  Ban,
  Flag,
  ShieldCheck
} from 'lucide-react';
import { UploadTask } from 'firebase/storage';
import {
  RegisteredUser,
  FriendRequest,
  Friend,
  PrivateMessage,
  ChatMetadata,
  BlockedUserRecord
} from '../types.js';
import {
  subscribeToRegisteredUsers,
  sendFriendRequest,
  subscribeToFriendRequests,
  respondToFriendRequest,
  subscribeToFriends,
  getPrivateChatId,
  openOrCreateDirectChat,
  subscribeToMyPrivateChats,
  subscribeToPrivateMessages,
  sendPrivateMessage,
  setChatTypingStatus,
  subscribeToChatMetadata,
  markPrivateMessagesSeen
} from '../services/firebase.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { isValidImageFormat } from '../utils/imagePersistence.js';
import { getLocalStudentSession, isGuestModeActive, activateGuestMode } from '../utils/studentAuth.js';
import { StudentLoginModal } from './StudentLoginModal.js';
import { useAuth } from '../context/AuthContext.js';
import {
  subscribeToBlockedUsers,
  blockUserInChat,
  unblockUserInChat,
  reportPrivateConversation
} from '../services/messagingSafety.js';
import {
  canMessageTargetUser,
  shouldIncludeInPeopleSearch,
  shouldShowTargetOnlineStatus,
  shouldShowTargetUniversity
} from '../utils/privacy.js';

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

const COMMON_EMOJIS = ['😂', '🔥', '💚', '👍', '🙏', '🎓', '⚡', '💯', '🏍️', '₦', '👏', '🥳', '📚'];

export const FriendsPage: React.FC<FriendsPageProps> = ({
  onBackToHome,
  onNavigateToHub,
  initialChatTarget,
  onClearChatTarget
}) => {
  const { user: authUser } = useAuth();
  const [student, setStudent] = useState<RegisteredUser | null>(() => {
    const existing = getLocalStudentSession();
    if (existing) return existing;
    if (isGuestModeActive()) return activateGuestMode().studentSession;
    return null;
  });
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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<PrivateMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [chatSelectedFile, setChatSelectedFile] = useState<File | null>(null);
  const [chatFilePreview, setChatFilePreview] = useState<string | null>(null);
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

  const activeTaskRef = useRef<UploadTask | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.title = 'Student Messaging & Friends | NIGERIA CAMPUS MARKET';
  }, []);

  useEffect(() => {
    if (authUser && (!student || student.id !== authUser.id)) {
      setStudent({
        id: authUser.id,
        name: authUser.name,
        matricNumber: authUser.matricNumber || student?.matricNumber || '',
        institutionId: authUser.institutionId,
        phone: authUser.phone || authUser.whatsappNumber,
        whatsappNumber: authUser.whatsappNumber,
        isOnline: true,
        lastSeen: Date.now()
      });
    }
  }, [authUser]);

  useEffect(() => {
    if (!initialChatTarget) return;
    if (!student) {
      const { studentSession } = activateGuestMode();
      setStudent(studentSession);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const chatId = await openOrCreateDirectChat(
          { id: student.id, name: student.name, matricNumber: student.matricNumber },
          initialChatTarget
        );
        if (!cancelled) {
          setActivePeer({
            userId: initialChatTarget.id,
            name: initialChatTarget.name,
            matricNumber: initialChatTarget.matricNumber,
            chatId
          });
          if (onClearChatTarget) onClearChatTarget();
        }
      } catch (err: any) {
        setActionError(err?.message || 'Could not open direct chat.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialChatTarget?.id, student?.id]);

  useEffect(() => {
    if (!student) {
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
  }, [student?.id]);

  useEffect(() => {
    if (!student || !activePeer) {
      setChatMessages([]);
      return;
    }

    setChatLoading(true);
    const chatId = activePeer.chatId || getPrivateChatId(student.id, activePeer.userId);

    const unsubMessages = subscribeToPrivateMessages(chatId, (msgs) => {
      setChatMessages(msgs);
      setChatLoading(false);
      markPrivateMessagesSeen(chatId, student.id);
    });
    const unsubMeta = subscribeToChatMetadata(chatId, (meta) => {
      setChatMetadata(meta);
    });

    return () => {
      unsubMessages();
      unsubMeta();
    };
  }, [student?.id, activePeer?.userId, activePeer?.chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, chatFilePreview]);

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
    if (!student) {
      setShowLoginModal(true);
      return;
    }
    setActionError(null);
    const targetUser = allUsers.find((u) => u.id === target.id);
    if (targetUser) {
      const viewer = authUser || {
        id: student.id,
        institutionId: student.institutionId,
        role: 'buyer' as const
      };
      const isConnected = friends.some((f) => f.userId === target.id);
      const msgCheck = canMessageTargetUser(targetUser, viewer, isConnected);
      if (!msgCheck.allowed) {
        setActionError(msgCheck.reason || 'This user has restricted who can message them.');
        return;
      }
    }
    try {
      const chatId = await openOrCreateDirectChat(
        { id: student.id, name: student.name, matricNumber: student.matricNumber },
        target
      );
      setActivePeer({
        userId: target.id,
        name: target.name,
        matricNumber: target.matricNumber,
        chatId
      });
    } catch (err: any) {
      setActionError(err?.message || 'Could not open conversation.');
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
      await sendFriendRequest(
        {
          id: student.id,
          name: student.name,
          matricNumber: student.matricNumber,
          avatarUrl: student.avatarUrl
        },
        { id: targetUser.id, name: targetUser.name }
      );
    } catch (err: any) {
      setActionError(err?.message || 'Could not send friend request.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const handleRespondRequest = async (request: FriendRequest, action: 'accepted' | 'rejected') => {
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, [request.id]: true }));
    try {
      await respondToFriendRequest(request, action);
    } catch (err: any) {
      setActionError(err?.message || 'Could not update request.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  const handleSelectChatFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidImageFormat(file)) {
      setChatError('Only JPG, JPEG, PNG, and WebP images are allowed.');
      return;
    }
    setChatError(null);
    setChatSelectedFile(file);
    setChatUploadProgress(0);
    setChatFilePreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    setChatError('Upload cancelled. Click Send to retry or remove the photo.');
  };

  const removeChatFile = () => {
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch {}
      activeTaskRef.current = null;
    }
    setChatSelectedFile(null);
    if (chatFilePreview) {
      URL.revokeObjectURL(chatFilePreview);
      setChatFilePreview(null);
    }
    setChatUploadProgress(0);
    setChatError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    } catch (err: any) {
      setChatError(err?.message || 'Could not update block status.');
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
      setSafetyFeedback('Conversation reported to NIGERIA CAMPUS MARKET moderation desk.');
    } catch (err: any) {
      setChatError(err?.message || 'Could not submit conversation report.');
    } finally {
      setReportSubmitting(false);
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
    if (!text && !chatSelectedFile) return;

    const chatId = activePeer.chatId || getPrivateChatId(student.id, activePeer.userId);
    setIsSendingMsg(true);
    setChatError(null);

    let uploadedImageUrl: string | undefined = undefined;

    try {
      if (chatSelectedFile) {
        setChatIsUploading(true);
        const result = await uploadImageToFirebaseStorage(chatSelectedFile, {
          folder: 'hub_chats',
          ownerId: student.id,
          timeoutMs: 30000,
          onProgress: (pct) => setChatUploadProgress(pct),
          onTaskCreated: (task) => {
            activeTaskRef.current = task;
          },
          allowPersistentFallback: true
        });
        activeTaskRef.current = null;
        uploadedImageUrl = result.downloadUrl;
        setChatIsUploading(false);
      }

      await sendPrivateMessage(chatId, {
        senderId: student.id,
        senderName: student.name,
        text: text || undefined,
        imageUrl: uploadedImageUrl,
        participants: [student.id, activePeer.userId].sort()
      });

      setChatInputText('');
      removeChatFile();
      setShowChatEmoji(false);
      setChatTypingStatus(chatId, student.id, false);
    } catch (err: any) {
      activeTaskRef.current = null;
      setChatError(err?.message || 'Failed to send message. Please retry.');
    } finally {
      setIsSendingMsg(false);
      setChatIsUploading(false);
    }
  };

  const pendingIncoming = friendRequests.filter(
    (r) => r.toId === student?.id && r.status === 'pending'
  );
  const pendingOutgoingIds = friendRequests
    .filter((r) => r.fromId === student?.id && r.status === 'pending')
    .map((r) => r.toId);
  const friendIds = friends.map((f) => f.userId);

  const filteredDiscoverUsers = allUsers.filter((u) => {
    if (friendIds.includes(u.id)) return false;
    if (!shouldIncludeInPeopleSearch(u, student?.id)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const canShowUni = shouldShowTargetUniversity(u, student?.id);
    return (
      u.name.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (canShowUni && u.matricNumber && u.matricNumber.toLowerCase().includes(q)) ||
      (canShowUni && u.department && u.department.toLowerCase().includes(q))
    );
  });

  const isPeerTyping =
    activePeer &&
    chatMetadata?.typing &&
    chatMetadata.typing[activePeer.userId] &&
    Date.now() - chatMetadata.typing[activePeer.userId] < 3500;

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#10251D] flex flex-col font-sans pb-20 sm:pb-0">
      {/* Header */}
      <div className="bg-[#10251D] border-b-2 border-[#D4A62A] px-3 sm:px-4 py-2.5 sticky top-0 z-30 flex items-center justify-between text-white gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {activePeer ? (
            <button
              onClick={() => {
                setActivePeer(null);
                setSafetyFeedback(null);
              }}
              className="p-2 rounded-xl bg-[#087443] border border-white/20 hover:bg-[#D4A62A] hover:text-[#10251D] text-white transition shrink-0"
              title="Back to Conversations"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-[#087443] border border-white/20 hover:bg-[#D4A62A] hover:text-[#10251D] text-white transition shrink-0"
              title="Back to NIGERIA CAMPUS MARKET"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {activePeer ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#D4A62A] text-[#10251D] font-black flex items-center justify-center text-sm uppercase shrink-0">
                {activePeer.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-black text-[#D4A62A] line-clamp-1">
                  {activePeer.name}
                </h2>
                <p className="text-[11px] text-white/85 flex items-center gap-1.5">
                  {isActivePeerBlocked ? (
                    <span className="text-red-300 font-bold">Blocked</span>
                  ) : isPeerTyping ? (
                    <span className="text-[#D4A62A] font-bold animate-pulse">Typing...</span>
                  ) : (
                    <span>{activePeer.matricNumber || 'Campus Peer / Seller'}</span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-[#D4A62A]">
                  Student Messaging &amp; Friends
                </h1>
                {pendingIncoming.length > 0 && (
                  <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-2 py-0.5 rounded-full">
                    {pendingIncoming.length} req
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/85">
                Direct buyer-seller chat &amp; 1-on-1 campus messaging
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {activePeer && student && (
            <>
              <button
                type="button"
                onClick={handleToggleBlockPeer}
                disabled={blockBusy}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isActivePeerBlocked
                    ? 'bg-[#087443] border-[#D4A62A] text-[#D4A62A]'
                    : 'bg-white/10 hover:bg-red-600/80 border-white/20 text-white'
                }`}
                title={isActivePeerBlocked ? 'Unblock user' : 'Block user'}
              >
                <Ban className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isActivePeerBlocked ? 'Unblock' : 'Block'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white/10 hover:bg-[#D4A62A] hover:text-[#10251D] border border-white/20 text-white flex items-center gap-1 transition whitespace-nowrap shrink-0 cursor-pointer"
                title="Report conversation"
              >
                <Flag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Report</span>
              </button>
            </>
          )}
          {!activePeer && (
            <button
              type="button"
              onClick={onNavigateToHub}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-[#087443] border border-white/20 hover:bg-[#D4A62A] hover:text-[#10251D] text-xs font-bold text-white rounded-xl transition whitespace-nowrap shrink-0"
            >
              <span>Open Group Hub</span>
            </button>
          )}
          {student ? (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-[#087443] border border-white/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline max-w-[100px] truncate">{student.name}</span>
              <span className="font-mono text-[10px] text-[#D4A62A]">{student.matricNumber}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {activePeer ? (
        <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
            {safetyFeedback && (
              <div className="p-2.5 bg-emerald-50 border border-[#087443]/30 text-[#087443] text-xs font-bold rounded-xl flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  {safetyFeedback}
                </span>
                <button type="button" onClick={() => setSafetyFeedback(null)} className="underline text-[11px]">
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
                  className="px-3 py-1 rounded-lg bg-[#087443] text-white text-[11px] font-black shrink-0"
                >
                  Unblock
                </button>
              </div>
            )}
            {chatLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 text-[#087443] animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-[#555555]">Loading conversation...</p>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="py-16 text-center max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#FFFFFF] border border-[#E5E7EB] text-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                  🤝
                </div>
                <h4 className="text-sm font-black text-[#10251D]">
                  Direct Chat with {activePeer.name}
                </h4>
                <p className="text-xs text-[#555555] mt-1 mb-4 leading-relaxed">
                  Send a real message about products, campus requests, or accommodation.
                </p>
                <button
                  onClick={() => setChatInputText('Hello, I am reaching out from NIGERIA CAMPUS MARKET!')}
                  className="px-4 py-2 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl shadow-sm"
                >
                  Say Hello
                </button>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isOwn = student && msg.senderId === student.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 border shadow-xs ${
                        isOwn
                          ? 'bg-[#087443] border-[#065D36] text-white rounded-br-xs'
                          : 'bg-[#FFFFFF] border-[#E5E7EB] text-[#10251D] rounded-bl-xs'
                      }`}
                    >
                      {msg.imageUrl && (
                        <div className="rounded-xl overflow-hidden mb-2 bg-[#F4F8F5] max-h-72 border border-[#E5E7EB]">
                          <img
                            src={msg.imageUrl}
                            alt="Chat attachment"
                            className="w-full h-auto object-cover max-h-72 cursor-pointer"
                            onClick={() => setLightboxImage(msg.imageUrl!)}
                          />
                        </div>
                      )}

                      {msg.text && (
                        <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}

                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                          isOwn ? 'text-white/75' : 'text-[#6B7280]'
                        }`}
                      >
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : ''}
                        </span>
                        {isOwn && (
                          <span className={msg.seen ? 'text-[#D4A62A]' : 'text-white/75'}>
                            <CheckCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isPeerTyping && (
              <div className="flex items-center gap-2 p-2 max-w-[120px] bg-[#FFFFFF] rounded-xl border border-[#E5E7EB] text-xs text-[#087443] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#087443] animate-ping" />
                <span>Typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 1-on-1 Chat Input */}
          <div className="bg-[#FFFFFF] border-t border-[#E5E7EB] p-2.5 sm:p-3 sticky bottom-14 sm:bottom-0 z-20">
            <div className="max-w-3xl mx-auto">
              {chatFilePreview && (
                <div className="relative mb-2.5 p-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-2xl flex items-center gap-3">
                  <img
                    src={chatFilePreview}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-xl border border-[#E5E7EB]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#10251D] truncate">
                      {chatSelectedFile?.name || 'Attachment'}
                    </p>
                    {chatIsUploading ? (
                      <div className="mt-1 space-y-1">
                        <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#087443] h-1.5 transition-all duration-200"
                            style={{ width: `${chatUploadProgress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-[#087443]">Uploading {chatUploadProgress}%</span>
                          <button
                            type="button"
                            onClick={handleCancelChatUpload}
                            className="text-[#10251D] underline font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#555555]">Ready to send</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={removeChatFile}
                    className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#E5E7EB] text-[#555555] hover:text-[#10251D] flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {chatError && (
                <div className="mb-2 p-2.5 bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] text-xs rounded-xl flex items-center justify-between gap-2 font-semibold">
                  <span>{chatError}</span>
                  <div className="flex items-center gap-2">
                    {chatSelectedFile && (
                      <button
                        type="button"
                        onClick={() => handleSendPrivateMsg()}
                        className="px-2 py-0.5 bg-[#087443] text-white font-black rounded flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}
                    <button type="button" onClick={() => setChatError(null)} className="font-bold underline">
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {showChatEmoji && (
                <div className="p-2 mb-2 bg-[#F4F8F5] border border-[#E5E7EB] rounded-2xl flex items-center gap-2 overflow-x-auto">
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

              <form onSubmit={handleSendPrivateMsg} className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setShowChatEmoji(!showChatEmoji)}
                  className="p-2 text-[#555555] hover:text-[#087443] hover:bg-[#F4F8F5] rounded-full shrink-0"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleSelectChatFile}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-[#555555] hover:text-[#087443] hover:bg-[#F4F8F5] rounded-full shrink-0"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={`Message ${activePeer.name}...`}
                  className="flex-1 py-2.5 px-4 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-full text-xs sm:text-sm font-medium text-[#10251D] placeholder-[#6B7280] outline-none"
                />

                <button
                  type="submit"
                  disabled={isSendingMsg || (!chatInputText.trim() && !chatSelectedFile)}
                  className="w-10 h-10 rounded-full bg-[#087443] hover:bg-[#065D36] disabled:opacity-40 text-[#D4A62A] flex items-center justify-center shrink-0 transition"
                >
                  {isSendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5">
          {actionError && (
            <div className="mb-4 p-3 bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] text-xs rounded-xl flex items-center justify-between gap-2 font-semibold">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#10251D] shrink-0" />
                <span>{actionError}</span>
              </div>
              <button onClick={() => setActionError(null)} className="font-bold underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Sub Tabs */}
          <div className="bg-[#FFFFFF] rounded-2xl p-1 border border-[#E5E7EB] grid grid-cols-4 gap-1 mb-4 shadow-xs">
            <button
              onClick={() => setActiveTab('chats')}
              className={`py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'chats' ? 'bg-[#087443] text-white font-black' : 'text-[#555555] hover:text-[#10251D]'
              }`}
            >
              Direct Chats ({directChats.length})
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'friends' ? 'bg-[#087443] text-white font-black' : 'text-[#555555] hover:text-[#10251D]'
              }`}
            >
              Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                activeTab === 'requests' ? 'bg-[#087443] text-white font-black' : 'text-[#555555] hover:text-[#10251D]'
              }`}
            >
              <span>Requests</span>
              {pendingIncoming.length > 0 && (
                <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-1.5 rounded-full">
                  {pendingIncoming.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'discover' ? 'bg-[#087443] text-white font-black' : 'text-[#555555] hover:text-[#10251D]'
              }`}
            >
              Find Students
            </button>
          </div>

          {!student ? (
            <div className="bg-[#FFFFFF] rounded-3xl p-10 text-center border border-[#E5E7EB] max-w-md mx-auto my-6 shadow-sm">
              <GraduationCap className="w-12 h-12 text-[#087443] mx-auto mb-3" />
              <h3 className="text-base font-black text-[#10251D]">Sign in to message students &amp; sellers</h3>
              <p className="text-xs text-[#555555] mt-1 mb-5">
                Enter your campus name and details to view your direct chats, friend requests, and campus peers.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-5 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl"
              >
                Sign In with Campus ID
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'chats' && (
                <div>
                  {directChats.length === 0 ? (
                    <div className="bg-[#FFFFFF] rounded-3xl p-10 text-center border border-[#E5E7EB] max-w-md mx-auto my-6 shadow-sm">
                      <MessageCircle className="w-12 h-12 text-[#087443] mx-auto mb-3" />
                      <h3 className="text-base font-black text-[#10251D]">No direct chats yet</h3>
                      <p className="text-xs text-[#555555] mt-1 mb-5">
                        Tap &quot;Chat&quot; on any product, housing listing, student request, or campus peer to start a private conversation.
                      </p>
                      <button
                        onClick={() => setActiveTab('discover')}
                        className="px-5 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl"
                      >
                        Browse Campus Students
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {directChats.map((chat) => {
                        const peerId = chat.participants.find((p) => p !== student.id) || chat.participants[0];
                        const peerName = chat.participantNames?.[peerId] || 'Campus Peer';
                        const peerMatric = chat.participantMatrics?.[peerId];
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
                            className="bg-[#FFFFFF] hover:border-[#087443] border border-[#E5E7EB] rounded-2xl p-4 cursor-pointer flex items-center justify-between gap-3 transition shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-full bg-[#087443] text-[#D4A62A] font-black flex items-center justify-center uppercase shrink-0">
                                {peerName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-black text-[#10251D] truncate">{peerName}</h4>
                                  {peerMatric && (
                                    <span className="text-[10px] font-mono text-[#555555] bg-[#F4F8F5] border border-[#E5E7EB] px-1.5 rounded">
                                      {peerMatric}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#555555] truncate mt-0.5">
                                  {chat.lastMessageText || 'Tap to continue conversation'}
                                </p>
                              </div>
                            </div>
                            <span className="px-3 py-1.5 bg-[#087443] text-[#D4A62A] text-xs font-black rounded-xl shrink-0">
                              Open
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'friends' && (
                <div>
                  {friends.length === 0 ? (
                    <div className="bg-[#FFFFFF] rounded-3xl p-10 text-center border border-[#E5E7EB] max-w-md mx-auto my-6 shadow-sm">
                      <h3 className="text-base font-black text-[#10251D]">No friends connected yet</h3>
                      <p className="text-xs text-[#555555] mt-1 mb-5">
                        Find course mates in Find Students or message sellers directly in Direct Chats.
                      </p>
                      <button
                        onClick={() => setActiveTab('discover')}
                        className="px-5 py-2.5 bg-[#D4A62A] text-[#10251D] text-xs font-black rounded-xl"
                      >
                        Find Students
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {friends.map((f) => {
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
                            onClick={() =>
                              setActivePeer({
                                userId: f.userId,
                                name: f.name,
                                matricNumber: canShowUni ? f.matricNumber : undefined,
                                chatId: f.chatId,
                                isOnline: canShowOnline ? f.isOnline : undefined
                              })
                            }
                            className="bg-[#FFFFFF] rounded-2xl p-4 border border-[#E5E7EB] hover:border-[#087443] cursor-pointer flex items-center justify-between shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative">
                                <div className="w-11 h-11 rounded-full bg-[#087443]/10 border border-[#087443] text-[#087443] font-black flex items-center justify-center uppercase">
                                  {f.name.charAt(0)}
                                </div>
                                {canShowOnline && (
                                  <span
                                    className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#FFFFFF] rounded-full ${
                                      f.isOnline ? 'bg-[#087443]' : 'bg-[#9CA3AF]'
                                    }`}
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-black text-[#10251D] truncate">{f.name}</h4>
                                <p className="text-[11px] text-[#555555]">
                                  {canShowOnline ? (f.isOnline ? 'Online' : 'Offline') : 'Campus Friend'}{' '}
                                  {canShowUni && f.matricNumber ? `• ${f.matricNumber}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="px-3 py-1.5 bg-[#D4A62A] text-[#10251D] text-xs font-black rounded-xl">
                              Chat
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-[#555555] tracking-wider">
                    Incoming Requests ({pendingIncoming.length})
                  </h3>
                  {pendingIncoming.length === 0 ? (
                    <div className="bg-[#FFFFFF] rounded-2xl p-6 text-center border border-[#E5E7EB] text-xs text-[#555555]">
                      No pending incoming friend requests.
                    </div>
                  ) : (
                    pendingIncoming.map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#FFFFFF] rounded-2xl p-4 border border-[#E5E7EB] flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#087443] text-[#D4A62A] font-black flex items-center justify-center uppercase">
                            {req.fromName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-black text-[#10251D] truncate">{req.fromName}</h4>
                            {req.fromMatric && (
                              <span className="text-[10px] text-[#555555] font-mono">{req.fromMatric}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRespondRequest(req, 'accepted')}
                            disabled={actionLoading[req.id]}
                            className="px-3 py-1.5 bg-[#087443] text-white text-xs font-black rounded-xl flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 text-[#D4A62A]" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleRespondRequest(req, 'rejected')}
                            disabled={actionLoading[req.id]}
                            className="px-2.5 py-1.5 bg-[#F4F8F5] border border-[#E5E7EB] text-[#10251D] text-xs font-bold rounded-xl"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'discover' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#555555] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search students by name, matric number, or department..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E5E7EB] focus:border-[#087443] rounded-2xl text-xs font-semibold text-[#10251D] outline-none"
                    />
                  </div>

                  {loading ? (
                    <div className="py-16 text-center">
                      <Loader2 className="w-8 h-8 text-[#087443] animate-spin mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#555555]">Loading campus students...</p>
                    </div>
                  ) : filteredDiscoverUsers.length === 0 ? (
                    <div className="bg-[#FFFFFF] rounded-3xl p-8 text-center border border-[#E5E7EB] max-w-md mx-auto my-6">
                      <GraduationCap className="w-12 h-12 text-[#087443] mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-[#10251D]">No other registered students found yet</h4>
                      <p className="text-xs text-[#555555] mt-1">
                        Invite fellow students to sign in on NIGERIA CAMPUS MARKET.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredDiscoverUsers.map((target) => {
                        const isPending = pendingOutgoingIds.includes(target.id);
                        const canShowOnline = shouldShowTargetOnlineStatus(target, student?.id);
                        const canShowUni = shouldShowTargetUniversity(target, student?.id);
                        return (
                          <div
                            key={target.id}
                            className="bg-[#FFFFFF] rounded-2xl p-4 border border-[#E5E7EB] flex items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative">
                                <div className="w-11 h-11 rounded-full bg-[#087443]/10 border border-[#087443]/30 text-[#087443] font-black flex items-center justify-center uppercase">
                                  {target.name.charAt(0)}
                                </div>
                                {canShowOnline && (
                                  <span
                                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#FFFFFF] ${
                                      target.isOnline ? 'bg-[#087443]' : 'bg-[#9CA3AF]'
                                    }`}
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-black text-[#10251D] truncate">{target.name}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {canShowUni && target.matricNumber && (
                                    <span className="text-[10px] text-[#087443] font-mono font-bold">
                                      {target.matricNumber}
                                    </span>
                                  )}
                                  {canShowUni && target.department && (
                                    <span className="text-[10px] text-[#555555] truncate max-w-[120px]">
                                      {target.department}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() =>
                                  handleOpenDirectConversation({
                                    id: target.id,
                                    name: target.name,
                                    matricNumber: canShowUni ? target.matricNumber : undefined
                                  })
                                }
                                className="px-2.5 py-1.5 bg-[#087443] text-white text-xs font-bold rounded-xl"
                              >
                                Message
                              </button>
                              {isPending ? (
                                <span className="text-[10px] font-bold text-[#10251D] bg-[#FFF8DB] px-2 py-1.5 rounded-xl border border-[#D4A62A]">
                                  Requested
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSendFriendRequest(target)}
                                  disabled={actionLoading[target.id]}
                                  className="px-2.5 py-1.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl flex items-center gap-1"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Add</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#087443] border border-[#D4A62A] text-white flex items-center justify-center"
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

      {showReportModal && activePeer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md border border-[#10251D]/20 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#10251D] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#D4A62A]">
              <div>
                <h3 className="font-black text-sm text-[#D4A62A]">Report Conversation</h3>
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
                <label className="block font-bold text-[#10251D] mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-[#F4F8F5] text-[#10251D] font-semibold outline-none focus:border-[#087443]"
                >
                  <option value="Scam / Suspicious Payment Demand">Scam / Suspicious Payment Demand</option>
                  <option value="Harassment or Abusive Language">Harassment or Abusive Language</option>
                  <option value="Fake Listing / Impersonation">Fake Listing / Impersonation</option>
                  <option value="Spam or Prohibited Item">Spam or Prohibited Item</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#10251D] mb-1">Details</label>
                <textarea
                  rows={3}
                  required
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe what happened so our moderation team can investigate..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-[#10251D] outline-none focus:border-[#087443]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-[#10251D] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black disabled:opacity-50"
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
