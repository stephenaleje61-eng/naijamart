import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Smile,
  Image as ImageIcon,
  Radio,
  ArrowLeft,
  X,
  ShieldCheck,
  GraduationCap,
  Loader2,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { UploadTask } from 'firebase/storage';
import { HubMessage, RegisteredUser } from '../types.js';
import {
  subscribeToHubMessages,
  sendHubMessage,
  updateHubPresence,
  subscribeToHubActiveUsers
} from '../services/firebase.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { isValidImageFormat } from '../utils/imagePersistence.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';
import { StudentLoginModal } from './StudentLoginModal.js';
import { useAuth } from '../context/AuthContext.js';

interface SingleHubPageProps {
  onBackToHome: () => void;
  onNavigateToFriends: () => void;
  onStartDirectChat: (target: { id: string; name: string; matricNumber?: string }) => void;
}

const COMMON_EMOJIS = ['😂', '🔥', '💚', '👍', '🙏', '🎓', '⚡', '💯', '🏍️', '₦', '👏', '🥳', '📚', '🍲', '💪', '🙌'];

export const SingleHubPage: React.FC<SingleHubPageProps> = ({
  onBackToHome,
  onNavigateToFriends,
  onStartDirectChat
}) => {
  const { user: authUser } = useAuth();
  const [student, setStudent] = useState<RegisteredUser | null>(() => getLocalStudentSession());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const activeTaskRef = useRef<UploadTask | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Single Hub — FUWUKARI Group Chat | FU MARKET';
  }, []);

  useEffect(() => {
    if (authUser && (!student || student.id !== authUser.id)) {
      setStudent({
        id: authUser.id,
        name: authUser.name,
        matricNumber: student?.matricNumber || 'FUW-STUDENT',
        phone: authUser.phone || authUser.whatsappNumber,
        whatsappNumber: authUser.whatsappNumber,
        isOnline: true,
        lastSeen: Date.now()
      });
    }
  }, [authUser]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToHubMessages((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (student) {
      updateHubPresence(student.id, student.name, student.matricNumber);
      const interval = setInterval(() => {
        updateHubPresence(student.id, student.name, student.matricNumber);
      }, 45000);
      return () => clearInterval(interval);
    }
  }, [student?.id, student?.name, student?.matricNumber]);

  useEffect(() => {
    const unsub = subscribeToHubActiveUsers((count) => {
      setOnlineCount(count);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, filePreview]);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFormat(file)) {
      setUploadError('Only JPG, JPEG, PNG, and WebP images are allowed.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadProgress(0);
    setFilePreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelUpload = () => {
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch {}
      activeTaskRef.current = null;
    }
    setIsUploading(false);
    setIsSending(false);
    setUploadError('Image upload cancelled. Click Send to retry or remove attachment.');
  };

  const removeSelectedFile = () => {
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch {}
      activeTaskRef.current = null;
    }
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
        const result = await uploadImageToFirebaseStorage(selectedFile, {
          folder: 'hub_chats',
          ownerId: student.id,
          timeoutMs: 30000,
          onProgress: (pct) => setUploadProgress(pct),
          onTaskCreated: (task) => {
            activeTaskRef.current = task;
          },
          allowPersistentFallback: true
        });
        activeTaskRef.current = null;
        uploadedImageUrl = result.downloadUrl;
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
      activeTaskRef.current = null;
      setUploadError(err?.message || 'Could not send message. Please retry.');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#111111] flex flex-col font-sans pb-20 sm:pb-0">
      {/* Header */}
      <div className="bg-[#0B6B3A] border-b border-[#14532D] px-3 sm:px-4 py-2.5 sticky top-0 z-30 flex items-center justify-between text-white">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBackToHome}
            className="p-2 rounded-xl bg-[#14532D] border border-white/20 hover:bg-[#F2B90D] hover:text-[#111111] text-white transition"
            title="Back to FU MARKET"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[#14532D] border-2 border-[#F2B90D] text-[#F2B90D] font-black flex items-center justify-center text-lg">
              🎓
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#F2B90D] border-2 border-[#0B6B3A] rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-[#F2B90D]">
                Single Hub — FUWUKARI
              </h1>
              <span className="bg-[#F2B90D] text-[#111111] text-[10px] px-2 py-0.5 rounded-md font-black flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-ping" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-white/85 flex items-center gap-1.5">
              <span className="font-semibold text-white">{onlineCount} active now</span>
              <span>•</span>
              <span>Real campus group chat</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToFriends}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#14532D] border border-white/20 hover:bg-[#F2B90D] hover:text-[#111111] text-white rounded-xl text-xs font-bold transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Chats</span>
          </button>

          {student ? (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-[#14532D] hover:bg-[#0B6B3A] border border-white/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <div className="w-5 h-5 rounded-full bg-[#F2B90D] text-[#111111] flex items-center justify-center text-[10px] font-black uppercase">
                {student.name.charAt(0)}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate">{student.name}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Join Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 max-w-4xl w-full mx-auto flex flex-col justify-between">
        <div className="my-2 bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-3 text-center text-xs max-w-md mx-auto shadow-xs">
          <p className="font-black text-[#0B6B3A] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#0B6B3A]" />
            <span>FUWUKARI Open Student Messaging</span>
          </p>
          <p className="text-[11px] text-[#555555] mt-0.5 leading-relaxed">
            Every message here is posted live by verified students. Click any peer&apos;s name to start a private 1-on-1 chat.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-[#0B6B3A] animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-[#555555]">Loading FUWUKARI Hub messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#FFFFFF] border border-[#E5E7EB] text-3xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              💬
            </div>
            <h3 className="text-sm sm:text-base font-black text-[#111111]">
              No messages yet in Single Hub
            </h3>
            <p className="text-xs text-[#555555] mt-1 mb-4 leading-relaxed">
              Be the first student to start a real conversation with your course mates!
            </p>
            <button
              onClick={() => {
                if (!student) setShowLoginModal(true);
                else setInputText('Hello FUWUKARI!');
              }}
              className="px-4 py-2 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs font-black rounded-xl shadow-sm"
            >
              Say Hello
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
                    className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 border relative shadow-xs ${
                      isOwn
                        ? 'bg-[#0B6B3A] border-[#14532D] text-white rounded-br-xs'
                        : 'bg-[#FFFFFF] border-[#E5E7EB] text-[#111111] rounded-bl-xs'
                    }`}
                  >
                    {!isOwn && (
                      <button
                        type="button"
                        onClick={() =>
                          onStartDirectChat({
                            id: msg.senderId,
                            name: msg.senderName,
                            matricNumber: msg.matricNumber
                          })
                        }
                        className="flex items-center gap-1.5 mb-1 text-left hover:underline"
                        title="Start 1-on-1 private chat"
                      >
                        <span className="text-xs font-black text-[#0B6B3A] line-clamp-1">
                          {msg.senderName}
                        </span>
                        {msg.matricNumber && (
                          <span className="text-[10px] bg-[#F5F5F5] text-[#555555] font-mono px-1.5 py-0.2 rounded border border-[#E5E7EB] uppercase">
                            {msg.matricNumber}
                          </span>
                        )}
                      </button>
                    )}

                    {msg.imageUrl && (
                      <div className="rounded-xl overflow-hidden mb-2 bg-[#F5F5F5] max-h-72 border border-[#E5E7EB]">
                        <img
                          src={msg.imageUrl}
                          alt="Hub attachment"
                          className="w-full h-auto object-cover max-h-72 rounded-xl cursor-pointer hover:opacity-95"
                          onClick={() => setLightboxImage(msg.imageUrl!)}
                        />
                      </div>
                    )}

                    {msg.text && (
                      <p
                        className={`text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words ${
                          isOwn ? 'text-white' : 'text-[#111111]'
                        }`}
                      >
                        {msg.text}
                      </p>
                    )}

                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isOwn ? 'text-white/75' : 'text-[#6B7280]'
                      }`}
                    >
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

      {/* Input Bar */}
      <div className="bg-[#FFFFFF] border-t border-[#E5E7EB] p-2.5 sm:p-3 sticky bottom-14 sm:bottom-0 z-20">
        <div className="max-w-4xl mx-auto">
          {filePreview && (
            <div className="relative mb-2.5 p-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl flex items-center gap-3">
              <img
                src={filePreview}
                alt="Upload preview"
                className="w-14 h-14 object-cover rounded-xl border border-[#E5E7EB]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#111111] truncate">
                  {selectedFile?.name || 'Photo attachment'}
                </p>
                {isUploading ? (
                  <div className="mt-1 space-y-1">
                    <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#0B6B3A] h-1.5 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#0B6B3A]">Uploading {uploadProgress}%</span>
                      <button
                        type="button"
                        onClick={handleCancelUpload}
                        className="text-[#111111] underline font-bold"
                      >
                        Cancel Upload
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-[#555555]">Ready to upload &amp; send</span>
                )}
              </div>
              <button
                type="button"
                onClick={removeSelectedFile}
                className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#E5E7EB] text-[#555555] hover:text-[#111111] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {showEmojiPicker && (
            <div className="p-2 mb-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl flex items-center gap-2 overflow-x-auto">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="text-lg p-1.5 hover:bg-[#FFFFFF] rounded-lg transition shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {uploadError && (
            <div className="mb-2 p-2.5 bg-[#FFF8DB] border border-[#F2B90D] text-[#111111] text-xs rounded-xl flex items-center justify-between gap-2 font-semibold">
              <span>{uploadError}</span>
              <div className="flex items-center gap-2 shrink-0">
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    className="px-2 py-0.5 bg-[#0B6B3A] text-white font-black rounded flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-[#111111] font-bold underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-[#555555] hover:text-[#0B6B3A] hover:bg-[#F5F5F5] rounded-full transition shrink-0"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

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
              className="p-2 text-[#555555] hover:text-[#0B6B3A] hover:bg-[#F5F5F5] rounded-full transition shrink-0"
              title="Attach Photo"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={student ? 'Message FUWUKARI Single Hub...' : 'Enter name & matric to chat...'}
              className="flex-1 py-2.5 px-4 bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] focus:bg-[#FFFFFF] rounded-full text-xs sm:text-sm font-medium text-[#111111] placeholder-[#6B7280] outline-none"
            />

            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !selectedFile)}
              className="w-10 h-10 rounded-full bg-[#0B6B3A] hover:bg-[#14532D] disabled:opacity-40 text-[#F2B90D] flex items-center justify-center shrink-0 transition"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>

          {!student && (
            <p className="text-center text-[11px] text-[#555555] mt-1.5">
              <span>Browsing as guest. </span>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-[#0B6B3A] font-black underline"
              >
                Sign in with Name &amp; Matric Number to send messages
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#0B6B3A] border border-[#F2B90D] text-white flex items-center justify-center"
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

      <StudentLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(loggedStudent) => setStudent(loggedStudent)}
        initialData={student}
        title="FUWUKARI Campus ID — FU MARKET"
        subtitle="Set your name and matric number to join Single Hub, send friend requests, and chat 1-on-1."
      />
    </div>
  );
};
