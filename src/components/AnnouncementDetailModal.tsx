import React, { useEffect, useState } from 'react';
import {
  X,
  Trophy,
  Megaphone,
  Heart,
  Bookmark,
  MessageSquare,
  Share2,
  Copy,
  CheckCircle2,
  Flag,
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  Eye,
  Edit3,
  Trash2,
  CornerDownRight,
  AlertTriangle,
  ShieldAlert,
  User as UserIcon,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../services/firebase.js';
import {
  addPostComment,
  checkUserLikedPost,
  deleteAnnouncementPost,
  deletePostComment,
  formatRelativeTime,
  getPostShareUrl,
  getPostWhatsAppShareUrl,
  incrementPostView,
  subscribeToPostComments,
  submitAnnouncementReport,
  togglePostLike,
  toggleSaveAnnouncement
} from '../services/announcements.js';
import { isAuthorizedCeo } from '../services/events.js';
import {
  AnnouncementComment,
  CommunityAnnouncementPost,
  PostCollectionName
} from '../types.js';

interface AnnouncementDetailModalProps {
  post: CommunityAnnouncementPost;
  isSaved: boolean;
  onClose: () => void;
  onEditPost: (post: CommunityAnnouncementPost) => void;
  onDeleted: (postId: string) => void;
  onOpenAuthorProfile: (authorId: string, authorName: string, authorAvatar?: string) => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onToast: (msg: string) => void;
}

const REPORT_REASONS = [
  'Fake score or misleading information',
  'Scam / suspicious payment request',
  'Spam or repetitive advertising',
  'Abusive or offensive content',
  'Inappropriate image or impersonation',
  'Other rule violation'
];

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  post,
  isSaved,
  onClose,
  onEditPost,
  onDeleted,
  onOpenAuthorProfile,
  onOpenAuthModal,
  onToast
}) => {
  const { user, loginWithGoogle } = useAuth();
  const postCollection: PostCollectionName =
    post.categoryType === 'sport_update' ? 'sport_updates' : 'general_announcements';

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [comments, setComments] = useState<AnnouncementComment[]>([]);
  const [viewsCount, setViewsCount] = useState(post.views);

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<AnnouncementComment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);
  const [togglingSave, setTogglingSave] = useState(false);

  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Inline report state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  // Inline delete confirm state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const fbUid = auth.currentUser?.uid;
  const isOwner = Boolean(fbUid && fbUid === post.authorId);
  const isCeoAdmin = isAuthorizedCeo(user);

  useEffect(() => {
    setLikesCount(post.likesCount);
    setViewsCount(post.views);
  }, [post.id, post.likesCount, post.views]);

  useEffect(() => {
    let active = true;
    incrementPostView(postCollection, post.id);
    checkUserLikedPost(postCollection, post.id).then((liked) => {
      if (active) setIsLiked(liked);
    });
    const unsub = subscribeToPostComments(postCollection, post.id, (list) => {
      if (active) setComments(list);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [postCollection, post.id, fbUid]);

  const handleGoogleQuickSignIn = async () => {
    setSigningInGoogle(true);
    setActionError(null);
    try {
      await loginWithGoogle();
      setShowAuthPrompt(false);
      onToast('Signed in! You can now like, comment, reply, and save posts.');
    } catch (err: any) {
      setActionError(err?.message || 'Google Sign-In cancelled or failed.');
    } finally {
      setSigningInGoogle(false);
    }
  };

  const requireAuthForSocial = (): boolean => {
    if (auth.currentUser?.uid) return true;
    setShowAuthPrompt(true);
    return false;
  };

  const handleToggleLike = async () => {
    if (!requireAuthForSocial() || togglingLike) return;
    setTogglingLike(true);
    setActionError(null);
    const optimisticNext = !isLiked;
    setIsLiked(optimisticNext);
    setLikesCount((prev) => Math.max(0, prev + (optimisticNext ? 1 : -1)));
    try {
      const nowLiked = await togglePostLike(postCollection, post.id);
      setIsLiked(nowLiked);
    } catch (err: any) {
      setIsLiked(!optimisticNext);
      setLikesCount((prev) => Math.max(0, prev + (optimisticNext ? -1 : 1)));
      setActionError(err?.message || 'Could not update like.');
    } finally {
      setTogglingLike(false);
    }
  };

  const handleToggleSave = async () => {
    if (!requireAuthForSocial() || togglingSave) return;
    setTogglingSave(true);
    setActionError(null);
    try {
      const savedNow = await toggleSaveAnnouncement(post);
      onToast(savedNow ? 'Announcement saved to your bookmarks.' : 'Removed from saved posts.');
    } catch (err: any) {
      setActionError(err?.message || 'Could not save announcement.');
    } finally {
      setTogglingSave(false);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = getPostShareUrl(postCollection, post.id);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      onToast('Post link copied! Share anywhere.');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      onToast(shareUrl);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuthForSocial()) return;
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    setActionError(null);
    try {
      await addPostComment(postCollection, post.id, commentText, user, replyingTo?.id);
      setCommentText('');
      setReplyingTo(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to submit comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (comment: AnnouncementComment) => {
    setActionError(null);
    try {
      await deletePostComment(comment);
      onToast('Comment removed.');
    } catch (err: any) {
      setActionError(err?.message || 'Could not delete comment.');
    }
  };

  const handleDeletePost = async () => {
    setDeletingPost(true);
    setActionError(null);
    try {
      await deleteAnnouncementPost(postCollection, post.id);
      onToast('Post deleted.');
      onDeleted(post.id);
      onClose();
    } catch (err: any) {
      setActionError(err?.message || 'Could not delete post.');
    } finally {
      setDeletingPost(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDetails.trim()) {
      setActionError('Please briefly explain why you are reporting this post.');
      return;
    }
    setSubmittingReport(true);
    setActionError(null);
    try {
      await submitAnnouncementReport({
        postId: post.id,
        postCollection,
        postTitle: post.title,
        reason: reportReason,
        details: reportDetails,
        reporterName: user?.name || auth.currentUser?.displayName || 'Campus Visitor'
      });
      setReportSent(true);
      setReportDetails('');
      setShowReportForm(false);
      onToast('Report submitted to FU MARKET Admin Moderation Desk.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const topComments = comments.filter((c) => !c.parentCommentId);
  const repliesByParent = comments.reduce<Record<string, AnnouncementComment[]>>((acc, c) => {
    if (c.parentCommentId) {
      if (!acc[c.parentCommentId]) acc[c.parentCommentId] = [];
      acc[c.parentCommentId].push(c);
    }
    return acc;
  }, {});

  const isSport = post.categoryType === 'sport_update';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E7EB] my-4 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="bg-[#111111] text-white px-5 py-4 flex items-center justify-between gap-3 border-b-4 border-[#EA580C] shrink-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EA580C] text-white text-[10px] font-black uppercase tracking-wider">
              {isSport ? <Trophy className="w-3.5 h-3.5" /> : <Megaphone className="w-3.5 h-3.5" />}
              {isSport ? post.sportCategory : post.announcementCategory}
            </span>
            {post.isPinned && (
              <span className="px-2 py-0.5 rounded bg-white text-[#111111] text-[10px] font-black uppercase">
                PINNED
              </span>
            )}
            {post.isFeatured && (
              <span className="px-2 py-0.5 rounded bg-[#F2B90D] text-[#111111] text-[10px] font-black uppercase">
                FEATURED
              </span>
            )}
            {isSport && post.isUnverifiedUserPost !== false && (
              <span className="px-2 py-0.5 rounded bg-white/15 text-[#FDBA74] border border-white/20 text-[10px] font-bold">
                User-Submitted • Unverified
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close post details"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#EA580C] text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Poster / Image */}
          {post.imageUrl && (
            <div className="bg-[#111111] max-h-[380px] flex items-center justify-center overflow-hidden border-b border-[#E5E7EB]">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full max-h-[380px] object-contain"
              />
            </div>
          )}

          <div className="p-5 sm:p-7 space-y-5">
            {actionError && (
              <div className="p-3 bg-[#FFF7ED] border border-[#EA580C] text-[#9A3412] text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Auth Sign-in prompt if guest attempts like/save/comment */}
            {showAuthPrompt && !fbUid && (
              <div className="p-4 bg-[#111111] text-white rounded-2xl border-2 border-[#EA580C] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-white">Sign in to Like, Comment, or Save</h4>
                    <p className="text-xs text-white/75 mt-0.5">
                      Reading and sharing posts is free without login. Quick verification keeps campus updates spam-free.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAuthPrompt(false)}
                    className="text-white/70 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={signingInGoogle}
                    onClick={handleGoogleQuickSignIn}
                    className="px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black rounded-xl transition disabled:opacity-60"
                  >
                    {signingInGoogle ? 'Signing in...' : 'Continue with Google (1 Tap)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthPrompt(false);
                      onOpenAuthModal('login');
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition"
                  >
                    Sign In / Create Account
                  </button>
                </div>
              </div>
            )}

            {/* Title + Score highlight */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <h2 className="font-display text-xl sm:text-2xl font-black text-[#111111] leading-tight">
                  {post.title}
                </h2>
                {isSport && post.score && (
                  <div className="shrink-0 bg-[#111111] text-white px-4 py-2 rounded-2xl border-2 border-[#EA580C] text-center">
                    <span className="block text-[9px] uppercase tracking-wider text-[#FDBA74] font-black">
                      Reported Score
                    </span>
                    <span className="text-base font-black tracking-tight">{post.score}</span>
                  </div>
                )}
              </div>

              {/* Author Bar + Edit/Delete */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => onOpenAuthorProfile(post.authorId, post.authorName, post.authorAvatar)}
                  className="flex items-center gap-2.5 text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EA580C] text-white flex items-center justify-center font-black text-sm overflow-hidden shrink-0">
                    {post.authorAvatar ? (
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#111111] group-hover:text-[#EA580C] transition block">
                      {post.authorName}
                    </span>
                    <span className="text-[11px] text-[#6B7280] flex items-center gap-2">
                      <span>Published {formatRelativeTime(post.createdAt)}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {viewsCount} views
                      </span>
                    </span>
                  </div>
                </button>

                {(isOwner || isCeoAdmin) && (
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => onEditPost(post)}
                        className="px-3 py-1.5 rounded-xl bg-[#F3F4F6] hover:bg-[#111111] hover:text-white text-[#111111] text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                    {confirmDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={deletingPost}
                          onClick={handleDeletePost}
                          className="px-3 py-1.5 rounded-xl bg-[#DC2626] text-white text-xs font-black"
                        >
                          {deletingPost ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#F3F4F6] text-xs font-bold text-[#374151]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="px-3 py-1.5 rounded-xl bg-[#FEF2F2] hover:bg-[#DC2626] text-[#DC2626] hover:text-white text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Structured Metadata */}
            {(isSport
              ? post.teamOrPlayer || post.competitionName || post.matchDate || post.matchTime || post.venue
              : post.eventDate || post.eventTime || post.location) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 text-xs">
                {isSport && post.teamOrPlayer && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                        Teams / Players
                      </span>
                      <span className="font-bold text-[#111111]">{post.teamOrPlayer}</span>
                    </div>
                  </div>
                )}
                {isSport && post.competitionName && (
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                        Competition
                      </span>
                      <span className="font-bold text-[#111111]">{post.competitionName}</span>
                    </div>
                  </div>
                )}
                {(isSport ? post.matchDate : post.eventDate) && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                        Date
                      </span>
                      <span className="font-bold text-[#111111]">
                        {isSport ? post.matchDate : post.eventDate}
                      </span>
                    </div>
                  </div>
                )}
                {(isSport ? post.matchTime : post.eventTime) && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                        Time
                      </span>
                      <span className="font-bold text-[#111111]">
                        {isSport ? post.matchTime : post.eventTime}
                      </span>
                    </div>
                  </div>
                )}
                {(isSport ? post.venue : post.location) && (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                        Venue / Location
                      </span>
                      <span className="font-bold text-[#111111]">
                        {isSport ? post.venue : post.location}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Main Body */}
            <div className="text-sm text-[#1F2937] leading-relaxed whitespace-pre-line">
              {post.description}
            </div>

            {isSport && post.isUnverifiedUserPost !== false && (
              <div className="p-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl text-[11px] text-[#9A3412] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                <span>
                  This update and any score shown were submitted directly by a campus user and have not yet been independently verified by official tournament organizers.
                </span>
              </div>
            )}

            {/* Social Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E5E7EB]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  disabled={togglingLike}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition ${
                    isLiked
                      ? 'bg-[#EA580C] border-[#EA580C] text-white'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111111] hover:border-[#EA580C]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
                  <span>{likesCount}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleSave}
                  disabled={togglingSave}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                    isSaved
                      ? 'bg-[#111111] border-[#111111] text-white'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111111] hover:border-[#111111]'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#EA580C] text-[#EA580C]' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <a
                  href={getPostWhatsAppShareUrl(post)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black flex items-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#F2B90D]" />
                  <span>Share WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#EA580C] text-[#111111] text-xs font-bold flex items-center gap-1.5 transition"
                >
                  {copiedLink ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6B3A]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                  )}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowReportForm((v) => !v)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-1 transition"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{reportSent ? 'Reported' : 'Report'}</span>
              </button>
            </div>

            {/* Inline Report Form */}
            {showReportForm && (
              <form
                onSubmit={handleSubmitReport}
                className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#111111] uppercase tracking-wider">
                    Report Post to Moderation Desk
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="text-xs font-bold text-[#6B7280]"
                  >
                    Cancel
                  </button>
                </div>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#111111] outline-none focus:border-[#EA580C]"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={2}
                  required
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe why this post violates campus safety or accuracy guidelines..."
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#111111] outline-none focus:border-[#EA580C]"
                />
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 bg-[#111111] hover:bg-[#EA580C] text-white text-xs font-black rounded-xl transition disabled:opacity-60"
                >
                  {submittingReport ? 'Submitting Report...' : 'Submit Report'}
                </button>
              </form>
            )}

            {/* COMMENTS & REPLIES */}
            <div className="pt-4 border-t border-[#E5E7EB] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#111111] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#EA580C]" />
                  <span>Comments &amp; Discussion ({comments.length})</span>
                </h3>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleSubmitComment} className="space-y-2">
                {replyingTo && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[11px] font-bold text-[#9A3412]">
                    <span>
                      Replying to <strong>{replyingTo.authorName}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-[#EA580C] hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onFocus={() => {
                      if (!fbUid) setShowAuthPrompt(true);
                    }}
                    placeholder={
                      fbUid
                        ? replyingTo
                          ? `Reply to ${replyingTo.authorName}...`
                          : 'Write a comment, match reaction, or question...'
                        : 'Sign in with Google above to comment or reply...'
                    }
                    className="flex-1 px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] rounded-2xl text-xs text-[#111111] outline-none resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="px-4 py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black rounded-2xl flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingComment ? 'Posting...' : 'Post'}</span>
                  </button>
                </div>
              </form>

              {/* Comment Thread */}
              {topComments.length === 0 ? (
                <div className="text-center py-6 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-xs text-[#6B7280]">
                  No comments yet. Be the first student to share your thoughts!
                </div>
              ) : (
                <div className="space-y-3">
                  {topComments.map((c) => {
                    const replies = repliesByParent[c.id] || [];
                    const canDelete = Boolean(fbUid && (fbUid === c.authorId || isCeoAdmin));
                    return (
                      <div key={c.id} className="space-y-2">
                        <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onOpenAuthorProfile(c.authorId, c.authorName, c.authorAvatar)
                              }
                              className="text-xs font-black text-[#111111] hover:text-[#EA580C] transition"
                            >
                              {c.authorName}
                            </button>
                            <span className="text-[10px] text-[#6B7280]">
                              {formatRelativeTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-[#1F2937] whitespace-pre-line">{c.text}</p>
                          <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-[#6B7280]">
                            <button
                              type="button"
                              onClick={() => {
                                if (!requireAuthForSocial()) return;
                                setReplyingTo(c);
                              }}
                              className="hover:text-[#EA580C]"
                            >
                              Reply
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c)}
                                className="hover:text-[#DC2626]"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        {replies.length > 0 && (
                          <div className="pl-5 sm:pl-7 space-y-2 border-l-2 border-[#FED7AA] ml-3">
                            {replies.map((rep) => {
                              const canDelRep = Boolean(
                                fbUid && (fbUid === rep.authorId || isCeoAdmin)
                              );
                              return (
                                <div
                                  key={rep.id}
                                  className="p-3 bg-white border border-[#E5E7EB] rounded-2xl space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onOpenAuthorProfile(
                                          rep.authorId,
                                          rep.authorName,
                                          rep.authorAvatar
                                        )
                                      }
                                      className="text-xs font-black text-[#111111] hover:text-[#EA580C] flex items-center gap-1"
                                    >
                                      <CornerDownRight className="w-3 h-3 text-[#EA580C]" />
                                      <span>{rep.authorName}</span>
                                    </button>
                                    <span className="text-[10px] text-[#6B7280]">
                                      {formatRelativeTime(rep.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#1F2937] whitespace-pre-line">
                                    {rep.text}
                                  </p>
                                  {canDelRep && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(rep)}
                                      className="text-[11px] font-bold text-[#6B7280] hover:text-[#DC2626]"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
