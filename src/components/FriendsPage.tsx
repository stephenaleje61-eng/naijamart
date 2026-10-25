import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  MessageCircle,
  Search,
  Check,
  X,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Send,
  Smile,
  Image as ImageIcon,
  Loader2,
  CheckCheck,
  Sparkles,
  Phone,
  GraduationCap
} from 'lucide-react';
import {
  RegisteredUser,
  FriendRequest,
  Friend,
  PrivateMessage,
  ChatMetadata
} from '../types.js';
import {
  subscribeToRegisteredUsers,
  sendFriendRequest,
  subscribeToFriendRequests,
  respondToFriendRequest,
  subscribeToFriends,
  getPrivateChatId,
  subscribeToPrivateMessages,
  sendPrivateMessage,
  setChatTypingStatus,
  subscribeToChatMetadata,
  markPrivateMessagesSeen
} from '../services/firebase.js';
import { uploadHubChatPhoto } from '../services/imageStorage.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';
import { StudentLoginModal } from './StudentLoginModal.js';
import { useAuth } from '../context/AuthContext.js';

interface FriendsPageProps {
  onBackToHome: () => void;
  onNavigateToHub: () => void;
  onNavigateToHux: () => void;
}

const COMMON_EMOJIS = ['😂', '🔥', '❤️', '👍', '🙏', '🎓', '⚡', '💯', '🏍️', '₦', '👏', '🥳', '📚'];

export const FriendsPage: React.FC<FriendsPageProps> = ({
  onBackToHome,
  onNavigateToHub,
  onNavigateToHux
}) => {
  const { user: authUser } = useAuth();
  const [student, setStudent] = useState<RegisteredUser | null>(() => getLocalStudentSession());
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Active view: 'directory' | 'chat'
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'discover'>('friends');
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);

  // Data states
  const [allUsers, setAllUsers] = useState<RegisteredUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // 1-on-1 Chat States
  const [chatMessages, setChatMessages] = useState<PrivateMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [chatSelectedFile, setChatSelectedFile] = useState<File | null>(null);
  const [chatFilePreview, setChatFilePreview] = useState<string | null>(null);
  const [chatUploadProgress, setChatUploadProgress] = useState(0);
  const [chatIsUploading, setChatIsUploading] = useState(false);
  const [chatMetadata, setChatMetadata] = useState<ChatMetadata | null>(null);
  const [showChatEmoji, setShowChatEmoji] = useState(false);
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync auth context
  useEffect(() => {
    if (authUser && (!student || student.name !== authUser.name)) {
      const updated: RegisteredUser = {
        id: authUser.id,
        name: authUser.name,
        matricNumber: student?.matricNumber || 'FUW-STUDENT',
        phone: authUser.phone || authUser.whatsappNumber,
        whatsappNumber: authUser.whatsappNumber,
        isOnline: true,
        lastSeen: Date.now()
      };
      setStudent(updated);
    }
  }, [authUser]);

  // Subscriptions when student is available
  useEffect(() => {
    if (!student) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Subscribe to all registered campus users
    const unsubUsers = subscribeToRegisteredUsers(student.id, (users) => {
      setAllUsers(users);
      setLoading(false);
    });

    // 2. Subscribe to friend requests (incoming & outgoing)
    const unsubRequests = subscribeToFriendRequests(student.id, (requests) => {
      setFriendRequests(requests);
    });

    // 3. Subscribe to accepted friends
    const unsubFriends = subscribeToFriends(student.id, (myFriends) => {
      setFriends(myFriends);
    });

    return () => {
      unsubUsers();
      unsubRequests();
      unsubFriends();
    };
  }, [student?.id]);

  // Active 1-on-1 Chat Subscriptions
  useEffect(() => {
    if (!student || !activeFriend) {
      setChatMessages([]);
      return;
    }

    setChatLoading(true);
    const chatId = activeFriend.chatId || getPrivateChatId(student.id, activeFriend.userId);

    // Subscribe to messages in privateChats/{chatId}/messages
    const unsubMessages = subscribeToPrivateMessages(chatId, (msgs) => {
      setChatMessages(msgs);
      setChatLoading(false);
      markPrivateMessagesSeen(chatId, student.id);
    });

    // Subscribe to chat metadata (typing indicators)
    const unsubMeta = subscribeToChatMetadata(chatId, (meta) => {
      setChatMetadata(meta);
    });

    return () => {
      unsubMessages();
      unsubMeta();
    };
  }, [student?.id, activeFriend?.userId]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, chatFilePreview]);

  // Handle typing indicator trigger
  const handleInputChange = (text: string) => {
    setChatInputText(text);

    if (!student || !activeFriend) return;
    const chatId = activeFriend.chatId || getPrivateChatId(student.id, activeFriend.userId);

    setChatTypingStatus(chatId, student.id, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setChatTypingStatus(chatId, student.id, false);
    }, 2500);
  };

  const handleSendFriendRequest = async (targetUser: RegisteredUser) => {
    if (!student) {
      setShowLoginModal(true);
      return;
    }

    setActionLoading((prev) => ({ ...prev, [targetUser.id]: true }));
    try {
      await sendFriendRequest(
        {
          id: student.id,
          name: student.name,
          matricNumber: student.matricNumber,
          avatarUrl: student.avatarUrl
        },
        {
          id: targetUser.id,
          name: targetUser.name
        }
      );
    } catch (err: any) {
      alert(err.message || 'Could not send friend request.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const handleRespondRequest = async (request: FriendRequest, action: 'accepted' | 'rejected') => {
    setActionLoading((prev) => ({ ...prev, [request.id]: true }));
    try {
      await respondToFriendRequest(request, action);
    } catch (err: any) {
      alert(err.message || 'Could not update request.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  const handleSelectChatFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image (JPG, PNG, WebP).');
      return;
    }

    setChatSelectedFile(file);
    setChatUploadProgress(0);
    const preview = URL.createObjectURL(file);
    setChatFilePreview(preview);
  };

  const removeChatFile = () => {
    setChatSelectedFile(null);
    if (chatFilePreview) {
      URL.revokeObjectURL(chatFilePreview);
      setChatFilePreview(null);
    }
    setChatUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendPrivateMsg = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!student || !activeFriend) return;

    const text = chatInputText.trim();
    if (!text && !chatSelectedFile) return;

    const chatId = activeFriend.chatId || getPrivateChatId(student.id, activeFriend.userId);
    setIsSendingMsg(true);

    let uploadedImageUrl: string | undefined = undefined;

    try {
      if (chatSelectedFile) {
        setChatIsUploading(true);
        uploadedImageUrl = await uploadHubChatPhoto(
          chatSelectedFile,
          student.id,
          (percent) => setChatUploadProgress(percent)
        );
        setChatIsUploading(false);
      }

      await sendPrivateMessage(chatId, {
        senderId: student.id,
        senderName: student.name,
        text: text || undefined,
        imageUrl: uploadedImageUrl
      });

      setChatInputText('');
      removeChatFile();
      setShowChatEmoji(false);
      setChatTypingStatus(chatId, student.id, false);
    } catch (err: any) {
      console.error('Failed to send private message:', err);
      alert(err?.message || 'Failed to send message. Please retry.');
    } finally {
      setIsSendingMsg(false);
      setChatIsUploading(false);
    }
  };

  // Helper filters
  const pendingIncoming = friendRequests.filter(
    (r) => r.toId === student?.id && r.status === 'pending'
  );
  const pendingOutgoingIds = friendRequests
    .filter((r) => r.fromId === student?.id && r.status === 'pending')
    .map((r) => r.toId);
  const friendIds = friends.map((f) => f.userId);

  const filteredDiscoverUsers = allUsers.filter((u) => {
    if (friendIds.includes(u.id)) return false;
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.matricNumber && u.matricNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const isFriendTyping =
    activeFriend &&
    chatMetadata?.typing &&
    chatMetadata.typing[activeFriend.userId] &&
    Date.now() - chatMetadata.typing[activeFriend.userId] < 3500;

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans pb-20 sm:pb-0">
      
      {/* 1. TOP HEADER */}
      <div className="bg-[#008751] text-white px-3 sm:px-4 py-2.5 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {activeFriend ? (
            <button
              onClick={() => setActiveFriend(null)}
              className="p-1.5 rounded-full hover:bg-black/15 transition text-white"
              title="Back to Friends list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onBackToHome}
              className="p-1.5 rounded-full hover:bg-black/15 transition text-white"
              title="Back to Marketplace"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {activeFriend ? (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-sm shadow border border-emerald-400 uppercase">
                {activeFriend.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight line-clamp-1">
                  {activeFriend.name}
                </h2>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1.5">
                  {isFriendTyping ? (
                    <span className="text-emerald-200 font-bold animate-pulse">Typing...</span>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-300" />
                      <span>{activeFriend.matricNumber || 'Verified Peer'}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                  Friends & Private Chat
                </h1>
                {pendingIncoming.length > 0 && (
                  <span className="bg-[#F68B1F] text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                    {pendingIncoming.length} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-100">
                1-on-1 private messaging for FUWukari students
              </p>
            </div>
          )}
        </div>

        {/* Identity badge */}
        <div>
          {student ? (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-white/20"
            >
              <span className="hidden sm:inline max-w-[100px] truncate">{student.name}</span>
              <span className="font-mono text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded text-emerald-200">
                {student.matricNumber}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-[#F68B1F] hover:bg-[#E07A15] text-white px-3 py-1.5 rounded-xl text-xs font-black shadow transition active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* 2. BODY: EITHER PRIVATE CHAT VIEW OR FRIENDS DIRECTORY TABS */}
      {activeFriend ? (
        // ==========================================
        // 1-ON-1 PRIVATE CHAT INTERFACE
        // ==========================================
        <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto">
          {/* Chat Messages Flow */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
            {chatLoading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-3 border-[#008751] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-500">Loading conversation...</p>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="py-16 text-center max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#008751] text-2xl flex items-center justify-center mx-auto mb-3">
                  🤝
                </div>
                <h4 className="text-sm font-black text-gray-800">
                  You are now connected with {activeFriend.name}!
                </h4>
                <p className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed">
                  Start your private 1-on-1 conversation. Messages are encrypted and stored securely in Firebase.
                </p>
                <button
                  onClick={() => setChatInputText('Hey! Are you on campus? 👋')}
                  className="px-4 py-2 bg-[#008751] hover:bg-[#007043] text-white text-xs font-black rounded-xl shadow transition"
                >
                  Say Hi 👋
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
                      className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 shadow-xs relative transition ${
                        isOwn
                          ? 'bg-[#DCF8C6] text-gray-900 rounded-br-xs border border-emerald-200'
                          : 'bg-white text-gray-900 rounded-bl-xs border border-gray-200'
                      }`}
                    >
                      {msg.imageUrl && (
                        <div className="rounded-xl overflow-hidden mb-2 bg-gray-100 max-h-72">
                          <img
                            src={msg.imageUrl}
                            alt="Chat attachment"
                            className="w-full h-auto object-cover max-h-72 rounded-xl cursor-pointer hover:opacity-95 transition"
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                          />
                        </div>
                      )}

                      {msg.text && (
                        <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}

                      {/* Footer: Time & Seen tick */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-400">
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : ''}
                        </span>
                        {isOwn && (
                          <span className={msg.seen ? 'text-blue-500 font-bold' : 'text-gray-400'}>
                            <CheckCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isFriendTyping && (
              <div className="flex items-center gap-2 p-2 max-w-[120px] bg-white rounded-xl shadow-xs border border-gray-200 text-xs text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 1-on-1 Chat Input Box */}
          <div className="bg-white border-t border-gray-200 p-2.5 sm:p-3 sticky bottom-14 sm:bottom-0 z-20 shadow-lg">
            <div className="max-w-3xl mx-auto">
              {chatFilePreview && (
                <div className="relative mb-2.5 p-2 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-3">
                  <img
                    src={chatFilePreview}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-xl border border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {chatSelectedFile?.name || 'Attachment'}
                    </p>
                    {chatIsUploading && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#008751] h-1.5 transition-all duration-200"
                            style={{ width: `${chatUploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#008751]">
                          Uploading {chatUploadProgress}%
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={removeChatFile}
                    className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {showChatEmoji && (
                <div className="p-2 mb-2 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-2 overflow-x-auto">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setChatInputText((prev) => prev + emoji)}
                      className="text-lg p-1.5 hover:bg-white hover:scale-125 rounded-lg transition shrink-0"
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
                  className="p-2 text-gray-500 hover:text-[#008751] hover:bg-gray-100 rounded-full transition shrink-0"
                  title="Emoji"
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
                  className="p-2 text-gray-500 hover:text-[#008751] hover:bg-gray-100 rounded-full transition shrink-0"
                  title="Attach Photo"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={`Message ${activeFriend.name}...`}
                  className="flex-1 py-2.5 px-4 bg-gray-100 border border-transparent focus:border-[#008751] focus:bg-white rounded-full text-xs sm:text-sm font-medium text-gray-900 focus:outline-none transition"
                />

                <button
                  type="submit"
                  disabled={isSendingMsg || (!chatInputText.trim() && !chatSelectedFile)}
                  className="w-10 h-10 rounded-full bg-[#008751] hover:bg-[#007043] disabled:opacity-40 text-white flex items-center justify-center shadow-md active:scale-95 transition shrink-0"
                >
                  {isSendingMsg ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 translate-x-0.5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        // ==========================================
        // DIRECTORY & TABS INTERFACE
        // ==========================================
        <div className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5">
          
          {/* Sub Navigation Tabs */}
          <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-200 flex items-center mb-4">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'friends'
                  ? 'bg-[#008751] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>My Friends ({friends.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
                activeTab === 'requests'
                  ? 'bg-[#008751] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Requests</span>
              {pendingIncoming.length > 0 && (
                <span className="bg-[#F68B1F] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingIncoming.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('discover')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'discover'
                  ? 'bg-[#008751] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Find Students</span>
            </button>
          </div>

          {/* TAB 1: MY FRIENDS */}
          {activeTab === 'friends' && (
            <div>
              {friends.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 shadow-xs max-w-md mx-auto my-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#008751] text-3xl flex items-center justify-center mx-auto mb-3">
                    👥
                  </div>
                  <h3 className="text-base font-black text-gray-900">
                    No friends connected yet
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 mb-5 leading-relaxed">
                    Connect with fellow FUWukari students to unlock 1-on-1 private messaging, share course materials, and chat directly!
                  </p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="px-5 py-2.5 bg-[#008751] hover:bg-[#007043] text-white text-xs font-black rounded-xl shadow-md transition"
                  >
                    Find Course Mates & Friends
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setActiveFriend(f)}
                      className="bg-white rounded-2xl p-4 border border-gray-200/90 hover:border-[#008751] shadow-xs hover:shadow-md cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#008751] font-black flex items-center justify-center text-base border border-emerald-200 uppercase">
                            {f.name.charAt(0)}
                          </div>
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-gray-900 truncate">
                            {f.name}
                          </h4>
                          {f.matricNumber && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                              {f.matricNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#008751] text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FRIEND REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {/* Incoming Requests */}
              <div>
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                  Incoming Requests ({pendingIncoming.length})
                </h3>
                {pendingIncoming.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center border border-gray-200 text-xs text-gray-500">
                    No pending incoming friend requests.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingIncoming.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-orange-100 text-[#F68B1F] font-black flex items-center justify-center text-sm uppercase">
                            {req.fromName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-black text-gray-900 truncate">
                              {req.fromName}
                            </h4>
                            {req.fromMatric && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 font-mono px-1.5 py-0.2 rounded">
                                {req.fromMatric}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRespondRequest(req, 'accepted')}
                            disabled={actionLoading[req.id]}
                            className="px-3 py-1.5 bg-[#008751] hover:bg-[#007043] text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleRespondRequest(req, 'rejected')}
                            disabled={actionLoading[req.id]}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DISCOVER STUDENTS */}
          {activeTab === 'discover' && (
            <div className="space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by name, matric number, or department..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008751] shadow-xs"
                />
              </div>

              {loading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-3 border-[#008751] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-500">Searching campus peers...</p>
                </div>
              ) : filteredDiscoverUsers.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-xs max-w-md mx-auto my-6">
                  <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-gray-800">No other students found</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Invite your course mates to open SolveAI / ZangaMarket and join the Hub!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredDiscoverUsers.map((target) => {
                    const isPending = pendingOutgoingIds.includes(target.id);
                    return (
                      <div
                        key={target.id}
                        className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-emerald-50 text-[#008751] font-black flex items-center justify-center text-sm border border-emerald-200 uppercase">
                            {target.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-black text-gray-900 truncate">
                              {target.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {target.matricNumber && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                  {target.matricNumber}
                                </span>
                              )}
                              {target.department && (
                                <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                                  {target.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isPending ? (
                          <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-xl border border-orange-200 shrink-0">
                            Requested
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendFriendRequest(target)}
                            disabled={actionLoading[target.id]}
                            className="px-3 py-1.5 bg-[#008751] hover:bg-[#007043] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1 shrink-0"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Friend</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Student Login Modal */}
      <StudentLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(loggedStudent) => setStudent(loggedStudent)}
        initialData={student}
        title="Connect with Friends"
        subtitle="Set your name and matric number to send friend requests and chat 1-on-1."
      />

    </div>
  );
};
