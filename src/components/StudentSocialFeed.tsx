import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Bell,
  BellOff,
  Flag,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus
} from 'lucide-react';
import {
  Advertisement,
  Institution,
  StudentPost,
  StudentPostCategory,
  StudentPostComment,
  RegisteredUser
} from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { NIGERIAN_INSTITUTIONS } from '../constants/institutions.js';
import { filterAdsForAudience } from '../services/ads.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { SponsoredAdCard } from './SponsoredAdCard.js';
import {
  addPostComment,
  createStudentPost,
  deleteStudentPost,
  reportStudentPost,
  shareStudentPost,
  subscribeToFollowedDiscussionIds,
  subscribeToMyLikedPostIds,
  subscribeToPostComments,
  subscribeToStudentPosts,
  toggleFollowDiscussion,
  toggleStudentPostLike
} from '../services/universityNetwork.js';
import { sendFriendRequest } from '../services/firebase.js';

interface StudentSocialFeedProps {
  selectedInstitution?: Institution;
  lockToInstitution?: boolean;
  onStartDirectChat?: (target: { id: string; name: string; matricNumber?: string }) => void;
  onOpenAuthModal?: () => void;
  onReportScam?: (target: {
    targetType: 'post' | 'user';
    targetId: string;
    targetName: string;
    targetUserId?: string;
    institutionId?: string;
  }) => void;
  knownUsers?: RegisteredUser[];
  ads?: Advertisement[];
  onSelectAd?: (ad: Advertisement) => void;
}

const POST_CATEGORIES: Array<{ id: StudentPostCategory; label: string }> = [
  { id: 'campus_update', label: 'Campus Update' },
  { id: 'academic_discussion', label: 'Academic Discussion' },
  { id: 'study_resource', label: 'Study Resource' },
  { id: 'marketplace_highlight', label: 'Marketplace Highlight' },
  { id: 'event_meetup', label: 'Event & Meetup' },
  { id: 'sport_gist', label: 'Sports & Football' }
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - (Date.parse(iso) || Date.now());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-NG');
}

const PostCommentsPanel: React.FC<{
  post: StudentPost;
  onRequireAuth?: () => void;
}> = ({ post, onRequireAuth }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<StudentPostComment[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<StudentPostComment | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    return subscribeToPostComments(post.id, setComments);
  }, [post.id]);

  const topLevel = comments.filter((c) => !c.parentCommentId);
  const repliesByParent = comments.reduce<Record<string, StudentPostComment[]>>((acc, c) => {
    if (c.parentCommentId) {
      if (!acc[c.parentCommentId]) acc[c.parentCommentId] = [];
      acc[c.parentCommentId].push(c);
    }
    return acc;
  }, {});

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addPostComment({
        post,
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatarUrl,
        authorInstitutionId: user.institutionId,
        authorVerified: Boolean(user.isVerified || user.ceoVerified),
        text: text.trim(),
        parentCommentId: replyTo?.id
      });
      setText('');
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#D9E5DF] space-y-2.5">
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {topLevel.length === 0 ? (
          <p className="text-[11px] text-slate-500">No comments yet. Start the discussion.</p>
        ) : (
          topLevel.map((comment) => (
            <div key={comment.id} className="space-y-1.5">
              <div className="p-2.5 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF]/70">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-extrabold text-[#172B24] truncate">
                      {comment.authorName}
                    </span>
                    {comment.authorVerified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                    )}
                    <span className="text-[10px] text-slate-500">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(comment)}
                    className="text-[10px] font-bold text-[#087443] hover:underline"
                  >
                    Reply
                  </button>
                </div>
                <p className="text-xs text-[#172B24] mt-1 whitespace-pre-wrap">{comment.text}</p>
              </div>
              {(repliesByParent[comment.id] || []).map((reply) => (
                <div
                  key={reply.id}
                  className="ml-5 p-2 rounded-xl bg-white border border-[#D9E5DF] text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#172B24]">{reply.authorName}</span>
                    {reply.authorVerified && (
                      <BadgeCheck className="w-3 h-3 text-[#087443]" />
                    )}
                    <span className="text-[10px] text-slate-400">
                      {formatRelativeTime(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-0.5">{reply.text}</p>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {replyTo && (
        <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-emerald-50 text-[11px] text-[#087443]">
          <span>Replying to <strong>{replyTo.authorName}</strong></span>
          <button type="button" onClick={() => setReplyTo(null)} className="font-bold underline">
            Cancel
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={user ? 'Write a comment...' : 'Sign in to join the conversation'}
          className="flex-1 px-3 py-2 rounded-xl border border-[#D9E5DF] bg-white text-xs text-[#172B24] focus:outline-none focus:border-[#087443]"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="px-3 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
    </div>
  );
};

export const StudentSocialFeed: React.FC<StudentSocialFeedProps> = ({
  selectedInstitution,
  lockToInstitution = false,
  onStartDirectChat,
  onOpenAuthModal,
  onReportScam,
  knownUsers = [],
  ads = [],
  onSelectAd
}) => {
  const { user } = useAuth();
  const [scope, setScope] = useState<'nationwide' | 'campus'>(
    lockToInstitution ? 'campus' : 'nationwide'
  );
  const communityAds = filterAdsForAudience(ads, {
    institutionId: scope === 'campus' ? selectedInstitution?.id : 'all',
    placement: 'community_feed'
  });
  const [categoryFilter, setCategoryFilter] = useState<StudentPostCategory | 'all'>('all');
  const [posts, setPosts] = useState<StudentPost[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [openCommentsFor, setOpenCommentsFor] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  // Composer state
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<StudentPostCategory>('campus_update');
  const [postInstitutionId, setPostInstitutionId] = useState(
    selectedInstitution?.id || user?.institutionId || NIGERIAN_INSTITUTIONS[0]?.id || 'fuwukari'
  );
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [posting, setPosting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Reporting modal inline state
  const [reportingPost, setReportingPost] = useState<StudentPost | null>(null);
  const [reportReason, setReportReason] = useState('Misinformation / Spam');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (selectedInstitution?.id) {
      setPostInstitutionId(selectedInstitution.id);
    }
  }, [selectedInstitution?.id]);

  useEffect(() => {
    const instFilter =
      scope === 'campus' && selectedInstitution?.id ? selectedInstitution.id : undefined;
    return subscribeToStudentPosts(setPosts, instFilter);
  }, [scope, selectedInstitution?.id]);

  useEffect(() => {
    return subscribeToMyLikedPostIds(user?.id, setLikedIds);
  }, [user?.id]);

  useEffect(() => {
    return subscribeToFollowedDiscussionIds(user?.id, setFollowedIds);
  }, [user?.id]);

  const visiblePosts = posts.filter(
    (p) => categoryFilter === 'all' || p.category === categoryFilter
  );

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    setUploadingImage(true);
    setComposerError(null);
    try {
      const res = await uploadImageToFirebaseStorage(file, {
        folder: 'student_posts',
        ownerId: user.id,
        allowPersistentFallback: true
      });
      setImageUrls((prev) => [...prev, res.downloadUrl].slice(0, 4));
    } catch (err: any) {
      setComposerError(err?.message || 'Could not upload photo.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    if (!content.trim() || posting) return;
    setPosting(true);
    setComposerError(null);
    const targetInst = NIGERIAN_INSTITUTIONS.find((i) => i.id === postInstitutionId);
    try {
      await createStudentPost({
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatarUrl,
        authorInstitutionId: user.institutionId || targetInst?.id,
        authorInstitutionName: targetInst?.shortName || targetInst?.name,
        authorDepartment: user.department,
        authorLevel: user.levelOfStudy,
        authorVerified: Boolean(user.isVerified || user.ceoVerified),
        institutionId: postInstitutionId,
        state: targetInst?.state,
        category,
        content: content.trim(),
        imageUrls
      });
      setContent('');
      setImageUrls([]);
      setFeedback('Your post is live on NIGERIA UNIVERSITY HUB.');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setComposerError(err?.message || 'Could not publish post.');
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (post: StudentPost) => {
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    try {
      await toggleStudentPostLike({
        post,
        userId: user.id,
        userName: user.name,
        isCurrentlyLiked: likedIds.has(post.id)
      });
    } catch {
      // Non-blocking
    }
  };

  const handleShare = async (post: StudentPost) => {
    const shareUrl = `${window.location.origin}/?socialPost=${encodeURIComponent(post.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.authorName} on NIGERIA UNIVERSITY HUB`,
          text: post.content.slice(0, 120),
          url: shareUrl
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback('Post link copied to clipboard.');
        setTimeout(() => setFeedback(null), 3000);
      }
      await shareStudentPost(post.id);
    } catch {
      // Cancelled share
    }
  };

  const handleAddFriendFromPost = async (post: StudentPost) => {
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    if (post.authorId === user.id) return;
    try {
      await sendFriendRequest(
        { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        { id: post.authorId, name: post.authorName }
      );
      setFeedback(`Friend request sent to ${post.authorName}.`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback(err?.message || 'Friend request notice.');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleSubmitPostReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingPost) return;
    try {
      await reportStudentPost({
        postId: reportingPost.id,
        postAuthorId: reportingPost.authorId,
        reporterId: user?.id || 'anonymous',
        reporterName: user?.name || 'Campus Member',
        reason: reportReason,
        details: reportDetails || reportReason
      });
      setReportingPost(null);
      setReportDetails('');
      setFeedback('Post reported for moderation review.');
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      setFeedback('Unable to submit report right now.');
    }
  };

  return (
    <section className="space-y-4">
      {/* Header & Filters */}
      <div className="bg-white rounded-2xl border border-[#D9E5DF] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#087443]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>CAMPUS SOCIAL FEED &amp; DISCUSSIONS</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#172B24] mt-0.5">
              Connect Across Nigerian Campuses
            </h2>
          </div>

          {!lockToInstitution && selectedInstitution && (
            <div className="inline-flex rounded-xl bg-[#F5F8F6] p-1 border border-[#D9E5DF]">
              <button
                type="button"
                onClick={() => setScope('nationwide')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  scope === 'nationwide'
                    ? 'bg-[#087443] text-white'
                    : 'text-[#172B24] hover:bg-white'
                }`}
              >
                All Nigeria
              </button>
              <button
                type="button"
                onClick={() => setScope('campus')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  scope === 'campus'
                    ? 'bg-[#087443] text-white'
                    : 'text-[#172B24] hover:bg-white'
                }`}
              >
                {selectedInstitution.shortName} Only
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition ${
              categoryFilter === 'all'
                ? 'bg-[#172B24] text-white'
                : 'bg-[#F5F8F6] text-[#172B24] hover:bg-slate-200'
            }`}
          >
            All Topics
          </button>
          {POST_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition ${
                categoryFilter === c.id
                  ? 'bg-[#087443] text-white'
                  : 'bg-[#F5F8F6] text-[#172B24] hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-[#087443]/30 text-xs font-bold text-[#087443]">
          {feedback}
        </div>
      )}

      {/* Post Composer */}
      <form
        onSubmit={handlePublish}
        className="bg-white rounded-2xl border border-[#D9E5DF] p-4 shadow-xs space-y-3"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#087443] text-white font-extrabold flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              (user?.name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 space-y-2.5">
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                user
                  ? 'Share campus news, academic gist, study resources, hostel tips, or marketplace highlights...'
                  : 'Sign in to post updates, ask academic questions, and connect with peers...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9E5DF] bg-[#F5F8F6]/60 text-xs sm:text-sm text-[#172B24] focus:bg-white focus:outline-none focus:border-[#087443]"
            />

            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url, idx) => (
                  <div key={url + idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#D9E5DF]">
                    <img src={url} alt="Upload" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StudentPostCategory)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#D9E5DF] bg-[#F5F8F6] text-xs font-bold text-[#172B24]"
                >
                  {POST_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>

                {!lockToInstitution && (
                  <select
                    value={postInstitutionId}
                    onChange={(e) => setPostInstitutionId(e.target.value)}
                    className="max-w-[190px] px-2.5 py-1.5 rounded-lg border border-[#D9E5DF] bg-[#F5F8F6] text-xs font-bold text-[#172B24]"
                  >
                    {NIGERIAN_INSTITUTIONS.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.shortName}
                      </option>
                    ))}
                  </select>
                )}

                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F8F6] hover:bg-emerald-50 border border-[#D9E5DF] text-xs font-bold text-[#172B24] cursor-pointer">
                  {uploadingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#087443]" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5 text-[#087443]" />
                  )}
                  <span>Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingImage || imageUrls.length >= 4}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={posting || uploadingImage || (!content.trim() && Boolean(user))}
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    onOpenAuthModal?.();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-extrabold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {posting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{user ? 'Publish Post' : 'Sign In to Post'}</span>
              </button>
            </div>

            {composerError && <p className="text-xs font-bold text-red-600">{composerError}</p>}
          </div>
        </div>
      </form>

      {/* Posts Feed */}
      {visiblePosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#D9E5DF] p-8 text-center">
          <p className="text-sm font-bold text-[#172B24]">
            No student posts in this view yet.
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Be the first student to start an academic discussion or campus update above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {communityAds.length > 0 && onSelectAd && (
            <SponsoredAdCard
              ad={communityAds[0]}
              onSelectAd={onSelectAd}
              variant="banner"
            />
          )}
          {visiblePosts.map((post) => {
            const isLiked = likedIds.has(post.id);
            const isFollowed = followedIds.has(post.id);
            const authorUser = knownUsers.find((u) => u.id === post.authorId);
            const inst = NIGERIAN_INSTITUTIONS.find((i) => i.id === post.institutionId);
            const isOwner = Boolean(user && (user.id === post.authorId || user.role === 'admin'));

            return (
              <article
                key={post.id}
                className="bg-white rounded-2xl border border-[#D9E5DF] p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#172B24] text-[#D4A62A] font-extrabold flex items-center justify-center shrink-0 overflow-hidden">
                      {post.authorAvatar ? (
                        <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                      ) : (
                        post.authorName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-extrabold text-[#172B24] truncate">
                          {post.authorName}
                        </span>
                        {(post.authorVerified || authorUser?.isVerified || authorUser?.ceoVerified) && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-[#087443] bg-emerald-50 border border-[#087443]/30 px-1.5 py-0.5 rounded-md"
                            title="Verified Nigerian Student"
                          >
                            <BadgeCheck className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        )}
                        {authorUser?.scamStatus === 'confirmed_fraudulent' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                            Confirmed Flag
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">
                        {post.authorInstitutionName || inst?.shortName || 'Nigerian Campus'}
                        {post.authorDepartment ? ` · ${post.authorDepartment}` : ''}
                        {post.authorLevel ? ` · ${post.authorLevel}` : ''} ·{' '}
                        {formatRelativeTime(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-[#F5F8F6] border border-[#D9E5DF] text-[10px] font-extrabold text-[#087443] whitespace-nowrap shrink-0">
                    {POST_CATEGORIES.find((c) => c.id === post.category)?.label || 'Update'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#172B24] leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                {Array.isArray(post.imageUrls) && post.imageUrls.length > 0 && (
                  <div className={`grid gap-2 ${post.imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {post.imageUrls.map((url, idx) => (
                      <img
                        key={url + idx}
                        src={url}
                        alt={`Post media ${idx + 1}`}
                        className="w-full max-h-72 object-cover rounded-xl border border-[#D9E5DF]"
                      />
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-[#F5F8F6] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        isLiked
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-[#F5F8F6] text-[#172B24] hover:bg-slate-200'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span className="tabular-nums">{post.likesCount || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenCommentsFor((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-[#F5F8F6] hover:bg-slate-200 text-xs font-bold text-[#172B24] flex items-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#087443]" />
                      <span className="tabular-nums">{post.commentsCount || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShare(post)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F5F8F6] hover:bg-slate-200 text-xs font-bold text-[#172B24] flex items-center gap-1.5 transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{post.sharesCount || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          onOpenAuthModal?.();
                          return;
                        }
                        toggleFollowDiscussion({
                          postId: post.id,
                          userId: user.id,
                          isFollowing: isFollowed
                        }).catch(() => {});
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                        isFollowed
                          ? 'bg-[#087443] text-white'
                          : 'bg-[#F5F8F6] text-[#172B24] hover:bg-slate-200'
                      }`}
                      title={isFollowed ? 'Following discussion' : 'Follow discussion'}
                    >
                      {isFollowed ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isFollowed ? 'Following' : 'Follow'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {user?.id !== post.authorId && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAddFriendFromPost(post)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#F5F8F6] hover:bg-emerald-50 text-[11px] font-bold text-[#087443] flex items-center gap-1"
                          title="Add student as friend"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Connect</span>
                        </button>
                        {onStartDirectChat && (
                          <button
                            type="button"
                            onClick={() =>
                              onStartDirectChat({
                                id: post.authorId,
                                name: post.authorName
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-[#F5F8F6] hover:bg-emerald-50 text-[11px] font-bold text-[#172B24]"
                          >
                            Message
                          </button>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setReportingPost(post)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      title="Report inappropriate post"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>

                    {onReportScam && (
                      <button
                        type="button"
                        onClick={() =>
                          onReportScam({
                            targetType: 'post',
                            targetId: post.id,
                            targetName: `${post.authorName}'s post`,
                            targetUserId: post.authorId,
                            institutionId: post.institutionId
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Report suspected scam"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => deleteStudentPost(post.id).catch(() => {})}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {openCommentsFor[post.id] && (
                  <PostCommentsPanel post={post} onRequireAuth={onOpenAuthModal} />
                )}
              </article>
            );
          })}
        </div>
      )}

      {reportingPost && (
        <div className="fixed inset-0 z-50 bg-[#172B24]/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitPostReport}
            className="bg-white w-full max-w-md rounded-2xl border border-[#D9E5DF] p-5 space-y-3 shadow-2xl"
          >
            <h3 className="text-sm font-extrabold text-[#172B24]">
              Report Inappropriate Post
            </h3>
            <p className="text-xs text-slate-600">
              Author: <strong>{reportingPost.authorName}</strong>
            </p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs font-semibold text-[#172B24]"
            >
              <option>Misinformation / Spam</option>
              <option>Harassment or Hate Speech</option>
              <option>Scam / Fraudulent Link</option>
              <option>Inappropriate / Explicit Content</option>
            </select>
            <textarea
              rows={3}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Optional moderation details..."
              className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportingPost(null)}
                className="px-3.5 py-2 rounded-xl bg-[#F5F8F6] text-xs font-bold text-[#172B24]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#087443] text-white text-xs font-extrabold"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
