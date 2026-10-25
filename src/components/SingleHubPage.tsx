import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Smile,
  Image as ImageIcon,
  Users,
  Radio,
  Sparkles,
  ArrowLeft,
  X,
  Upload,
  Clock,
  ShieldCheck,
  GraduationCap,
  AlertCircle,
  Loader2,
  RefreshCw,
  Phone,
  MessageSquare
} from 'lucide-react';
import { HubMessage, HubActiveUser, RegisteredUser } from '../types.js';
import {
  subscribeToHubMessages,
  sendHubMessage,
  updateHubPresence,
  subscribeToHubActiveUsers
} from '../services/firebase.js';
import { uploadHubChatPhoto } from '../services/imageStorage.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';
import { StudentLoginModal } from './StudentLoginModal.js';
import { useAuth } from '../context/AuthContext.js';

interface SingleHubPageProps {
  onBackToHome: () => void;
  onNavigateToFriends: () => void;
  onNavigateToHux: () => void;
}

const COMMON_EMOJIS = ['😂', '🔥', '❤️', '👍', '🙏', '🎓', '⚡', '💯', '🏍️', '₦', '👏', '🥳', '📚', '🍲', '💪', '🙌'];

export const SingleHubPage: React.FC<SingleHubPageProps> = ({
  onBackToHome,
  onNavigateToFriends,
  onNavigateToHux
}) => {
  const { user: authUser } = useAuth();
  const [student, setStudent] = useState<RegisteredUser | null>(() => getLocalStudentSession());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [onlineUsers, setOnlineUsers] = useState<HubActiveUser[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with AuthContext user if logged in
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

  // Subscribe to real-time hub messages in Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToHubMessages((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Presence heartbeat in Firestore
  useEffect(() => {
    if (student) {
      updateHubPresence(student.id, student.name, student.matricNumber);
      const interval = setInterval(() => {
        updateHubPresence(student.id, student.name, student.matricNumber);
      }, 45000);
      return () => clearInterval(interval);
    }
  }, [student?.id, student?.name, student?.matricNumber]);

  // Subscribe to active online count
  useEffect(() => {
    const unsub = subscribeToHubActiveUsers((count, users) => {
      setOnlineCount(Math.max(count, 1));
      setOnlineUsers(users);
    });
    return () => unsub();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, filePreview]);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadProgress(0);
    const preview = URL.createObjectURL(file);
    setFilePreview(preview);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    setUploadProgress(0);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!student) {
      setShowLoginModal(true);
      return;
    }

    const text = inputText.trim();
    if (!text && !selectedFile) return;

    setIsSending(true);
    setUploadError(null);

    let uploadedImageUrl: string | undefined = undefined;

    try {
      if (selectedFile) {
        setIsUploading(true);
        uploadedImageUrl = await uploadHubChatPhoto(
          selectedFile,
          student.id,
          (percent) => setUploadProgress(percent)
        );
        setIsUploading(false);
      }

      await sendHubMessage({
        senderId: student.id,
        senderName: student.name,
        matricNumber: student.matricNumber,
        text: text || undefined,
        imageUrl: uploadedImageUrl
      });

      setInputText('');
      removeSelectedFile();
      setShowEmojiPicker(false);
    } catch (err: any) {
      console.error('Failed to send hub message:', err);
      setUploadError(err?.message || 'Could not send message. Please retry.');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans pb-20 sm:pb-0">
      
      {/* 1. TOP NAV BAR (WhatsApp Campus Group Header Style) */}
      <div className="bg-[#008751] text-white px-3 sm:px-4 py-2.5 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBackToHome}
            className="p-1.5 rounded-full hover:bg-black/15 transition text-white"
            title="Back to Marketplace"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Group Avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white text-[#008751] font-black flex items-center justify-center text-lg shadow-sm border border-emerald-300">
              🎓
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#008751] rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                Single Hub - FUWukari
              </h1>
              <span className="bg-emerald-800/80 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-300 animate-ping" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 flex items-center gap-1.5">
              <span className="font-semibold">{onlineCount} online</span>
              <span>•</span>
              <span className="opacity-90">Open campus group</span>
            </p>
          </div>
        </div>

        {/* Student Profile Action */}
        <div className="flex items-center gap-2">
          {student ? (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-white/20"
              title="Edit your campus identity"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-black uppercase">
                {student.name.charAt(0)}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate">{student.name}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-[#F68B1F] hover:bg-[#E07A15] text-white px-3 py-1.5 rounded-xl text-xs font-black shadow transition active:scale-95 flex items-center gap-1"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Join Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CHAT MESSAGES CONTAINER */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 max-w-4xl w-full mx-auto flex flex-col justify-between">
        
        {/* Notice Banner */}
        <div className="my-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3 text-center text-xs shadow-xs max-w-md mx-auto">
          <p className="font-bold flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Welcome to FUWukari Single Hub!</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
            Real-time open chat for all Federal University Wukari students. Discuss campus updates, find course mates, and share information.
          </p>
        </div>

        {/* Messages List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-[#008751] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-500">Connecting to FUWukari Hub messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#008751] text-3xl flex items-center justify-center mx-auto mb-3">
              💬
            </div>
            <h3 className="text-sm sm:text-base font-black text-gray-800">
              No messages yet in FUWukari Hub
            </h3>
            <p className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed">
              Be the first to say hello, ask a question, or share an update with the campus!
            </p>
            <button
              onClick={() => {
                if (!student) {
                  setShowLoginModal(true);
                } else {
                  setInputText('Hello FUWukari! 👋');
                }
              }}
              className="px-4 py-2 bg-[#008751] hover:bg-[#007043] text-white text-xs font-extrabold rounded-xl shadow transition"
            >
              Say Hello 👋
            </button>
          </div>
        ) : (
          <div className="space-y-3 my-2">
            {messages.map((msg) => {
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
                    {/* Sender Header */}
                    {!isOwn && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-black text-[#008751] line-clamp-1">
                          {msg.senderName}
                        </span>
                        {msg.matricNumber && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-200 uppercase">
                            {msg.matricNumber}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Image Attachment if present */}
                    {msg.imageUrl && (
                      <div className="rounded-xl overflow-hidden mb-2 bg-gray-100 max-h-72">
                        <img
                          src={msg.imageUrl}
                          alt="Hub attachment"
                          className="w-full h-auto object-cover max-h-72 rounded-xl cursor-pointer hover:opacity-95 transition"
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                      </div>
                    )}

                    {/* Text Content */}
                    {msg.text && (
                      <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-400">
                      <span>{formatMessageTime(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 3. INPUT COMPONENT & EMOJI DRAWER */}
      <div className="bg-white border-t border-gray-200 p-2.5 sm:p-3 sticky bottom-14 sm:bottom-0 z-20 shadow-lg">
        <div className="max-w-4xl mx-auto">
          
          {/* Selected Image Preview with Progress */}
          {filePreview && (
            <div className="relative mb-2.5 p-2 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-3">
              <img
                src={filePreview}
                alt="Upload preview"
                className="w-14 h-14 object-cover rounded-xl border border-gray-300"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">
                  {selectedFile?.name || 'Photo attachment'}
                </p>
                {isUploading ? (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#008751] h-1.5 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#008751]">
                      Uploading to Firebase {uploadProgress}%
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-500">Ready to send with message</span>
                )}
              </div>
              <button
                type="button"
                onClick={removeSelectedFile}
                disabled={isUploading}
                className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Emoji Bar */}
          {showEmojiPicker && (
            <div className="p-2 mb-2 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-2 overflow-x-auto">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="text-lg p-1.5 hover:bg-white hover:scale-125 rounded-lg transition shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-red-700 font-bold ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main Input Bar */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
            {/* Emoji Toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-500 hover:text-[#008751] hover:bg-gray-100 rounded-full transition shrink-0"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Photo Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSelectFile}
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

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={student ? "Type a message to FUWukari Hub..." : "Enter name & matric to chat..."}
              className="flex-1 py-2.5 px-4 bg-gray-100 border border-transparent focus:border-[#008751] focus:bg-white rounded-full text-xs sm:text-sm font-medium text-gray-900 focus:outline-none transition"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !selectedFile)}
              className="w-10 h-10 rounded-full bg-[#008751] hover:bg-[#007043] disabled:opacity-40 text-white flex items-center justify-center shadow-md active:scale-95 transition shrink-0"
              title="Send message"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 translate-x-0.5" />
              )}
            </button>
          </form>

          {/* Prompt if not authenticated */}
          {!student && (
            <p className="text-center text-[11px] text-gray-500 mt-1.5">
              <span>You're browsing as guest. </span>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-[#008751] font-bold underline"
              >
                Sign in with Name & Matric Number to send messages
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Student Login Modal */}
      <StudentLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(loggedStudent) => setStudent(loggedStudent)}
        initialData={student}
        title="FUWukari Campus ID"
        subtitle="Set your name and matric number to join the Single Hub discussion, send friend requests, and post housing listings."
      />

    </div>
  );
};
