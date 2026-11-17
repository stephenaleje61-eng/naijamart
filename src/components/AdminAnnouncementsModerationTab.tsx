import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Megaphone,
  Flag,
  CheckCircle2,
  XCircle,
  Trash2,
  Pin,
  Star,
  ShieldAlert,
  RotateCcw,
  Search,
  UserX,
  Eye,
  Heart,
  MessageSquare
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase.js';
import { useAuth } from '../context/AuthContext.js';
import { isFirebaseCeoVerified } from '../services/events.js';
import {
  adminModerateAnnouncement,
  adminResolveAnnouncementReport,
  deleteAnnouncementPost,
  formatRelativeTime,
  getAllAnnouncementsForAdmin
} from '../services/announcements.js';
import { adminToggleUserSuspension } from '../services/api.js';
import {
  AnnouncementModerationStatus,
  AnnouncementReport,
  CommunityAnnouncementPost,
  GeneralAnnouncementPost,
  PostCollectionName,
  SportUpdatePost
} from '../types.js';

interface AdminAnnouncementsModerationTabProps {
  onStatus?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export const AdminAnnouncementsModerationTab: React.FC<
  AdminAnnouncementsModerationTabProps
> = ({ onStatus, onError }) => {
  const { loginWithGoogle } = useAuth();
  const [subTab, setSubTab] = useState<'sports' | 'general' | 'reports'>('sports');
  const [statusFilter, setStatusFilter] = useState<'all' | AnnouncementModerationStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [sportUpdates, setSportUpdates] = useState<SportUpdatePost[]>([]);
  const [generalAnnouncements, setGeneralAnnouncements] = useState<GeneralAnnouncementPost[]>([]);
  const [reports, setReports] = useState<AnnouncementReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<boolean>(() => isFirebaseCeoVerified());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [suspendingAuthorId, setSuspendingAuthorId] = useState<string | null>(null);

  const loadModerationData = async () => {
    setVerified(isFirebaseCeoVerified());
    if (!isFirebaseCeoVerified()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getAllAnnouncementsForAdmin();
      setSportUpdates(data.sportUpdates);
      setGeneralAnnouncements(data.generalAnnouncements);
      setReports(data.reports);
    } catch (err: any) {
      onError?.(err?.message || 'Failed to load community announcements for moderation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModerationData();
  }, []);

  const handleGoogleVerify = async () => {
    try {
      await loginWithGoogle();
      await loadModerationData();
    } catch (err: any) {
      onError?.(err?.message || 'Google Admin verification failed.');
    }
  };

  const handleUpdatePost = async (
    post: CommunityAnnouncementPost,
    updates: {
      status?: AnnouncementModerationStatus;
      isPinned?: boolean;
      isFeatured?: boolean;
      isUnverifiedUserPost?: boolean;
    },
    successText: string
  ) => {
    const col: PostCollectionName =
      post.categoryType === 'sport_update' ? 'sport_updates' : 'general_announcements';
    try {
      await adminModerateAnnouncement(col, post.id, updates);
      onStatus?.(successText);
      await loadModerationData();
    } catch (err: any) {
      onError?.(err?.message || 'Could not update announcement.');
    }
  };

  const handleDeletePost = async (col: PostCollectionName, postId: string) => {
    try {
      await deleteAnnouncementPost(col, postId);
      setConfirmDeleteId(null);
      onStatus?.('Post permanently deleted.');
      await loadModerationData();
    } catch (err: any) {
      onError?.(err?.message || 'Failed to delete post.');
    }
  };

  const handleSuspendAuthor = async (authorId: string, authorName: string) => {
    if (!authorId) return;
    setSuspendingAuthorId(authorId);
    const reason = 'Suspended by NIGERIA CAMPUS MARKET Administrator for community post policy violation.';
    try {
      // Suspend in Firestore users/{authorId}
      const refDoc = doc(db, 'users', authorId);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        if (snap.data()?.role === 'admin') {
          onError?.('Administrator accounts cannot be suspended.');
          return;
        }
        await updateDoc(refDoc, { isSuspended: true, suspensionReason: reason });
      } else {
        await setDoc(refDoc, {
          id: authorId,
          name: authorName || 'FUWUKARI Student',
          role: 'buyer',
          isSuspended: true,
          suspensionReason: reason
        });
      }
      // Best-effort sync with Express API user store if present
      await adminToggleUserSuspension(authorId, reason).catch(() => {});
      onStatus?.(`Author "${authorName}" has been suspended from posting.`);
    } catch (err: any) {
      onError?.(err?.message || 'Failed to suspend user account.');
    } finally {
      setSuspendingAuthorId(null);
    }
  };

  const handleResolveReport = async (
    rep: AnnouncementReport,
    status: 'resolved' | 'dismissed',
    removeTargetPost = false
  ) => {
    try {
      if (removeTargetPost) {
        await adminModerateAnnouncement(rep.postCollection, rep.postId, {
          status: 'removed',
          adminNotes: `Removed following report: ${rep.reason}`
        }).catch(() => {});
      }
      await adminResolveAnnouncementReport(
        rep.id,
        status,
        removeTargetPost ? 'Post removed & report resolved.' : `Report ${status} by Admin.`
      );
      onStatus?.(`Report marked ${status}${removeTargetPost ? ' and post hidden' : ''}.`);
      await loadModerationData();
    } catch (err: any) {
      onError?.(err?.message || 'Failed to resolve report.');
    }
  };

  if (!verified) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-[#D4A62A] mx-auto" />
        <h3 className="font-black text-base text-[#10251D]">
          Admin Google Verification Required
        </h3>
        <p className="text-xs text-[#555555] max-w-md mx-auto">
          Verify with your authorized Google admin account (<code className="font-mono">stephenaleje61@gmail.com</code>) to approve, reject, pin, feature, or remove sports updates and campus announcements.
        </p>
        <button
          type="button"
          onClick={handleGoogleVerify}
          className="px-5 py-2.5 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black rounded-xl transition"
        >
          Verify Admin Google Account
        </button>
      </div>
    );
  }

  const pendingSportsCount = sportUpdates.filter((p) => p.status === 'pending').length;
  const pendingGeneralCount = generalAnnouncements.filter((p) => p.status === 'pending').length;
  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  const activeList: CommunityAnnouncementPost[] =
    subTab === 'sports' ? sportUpdates : subTab === 'general' ? generalAnnouncements : [];

  const filteredPosts = activeList.filter((post) => {
    if (statusFilter !== 'all' && post.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const hay = `${post.title} ${post.authorName} ${post.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSubTab('sports')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition ${
              subTab === 'sports'
                ? 'bg-[#087443] text-white'
                : 'bg-[#F4F8F5] text-[#333333] hover:text-[#10251D]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#D4A62A]" />
            <span>Sport Updates ({sportUpdates.length})</span>
            {pendingSportsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#10251D] text-[#D4A62A] rounded-full text-[10px]">
                {pendingSportsCount} pending
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('general')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition ${
              subTab === 'general'
                ? 'bg-[#087443] text-white'
                : 'bg-[#F4F8F5] text-[#333333] hover:text-[#10251D]'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-[#D4A62A]" />
            <span>General Announcements ({generalAnnouncements.length})</span>
            {pendingGeneralCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#10251D] text-[#D4A62A] rounded-full text-[10px]">
                {pendingGeneralCount} pending
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('reports')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition ${
              subTab === 'reports'
                ? 'bg-[#10251D] text-white'
                : 'bg-[#F4F8F5] text-[#333333] hover:text-[#10251D]'
            }`}
          >
            <Flag className="w-3.5 h-3.5 text-[#D4A62A]" />
            <span>Post Reports ({pendingReportsCount} pending)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadModerationData}
          className="px-3 py-1.5 bg-[#F4F8F5] hover:bg-[#E5E7EB] text-[#10251D] text-xs font-bold rounded-xl flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reload
        </button>
      </div>

      {/* Filters for Posts Tabs */}
      {subTab !== 'reports' && (
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search posts by title or author..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs outline-none focus:border-[#087443]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'pending', 'published', 'rejected', 'removed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize border ${
                  statusFilter === st
                    ? 'bg-[#10251D] border-[#10251D] text-white'
                    : 'bg-white border-[#E5E7EB] text-[#555555]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center text-xs font-bold text-[#6B7280]">
          Loading community posts &amp; reports...
        </div>
      ) : subTab === 'reports' ? (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center text-xs text-[#6B7280]">
              No community announcement reports submitted yet.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] font-black uppercase">
                      {rep.reason}
                    </span>
                    <span className="text-[#6B7280]">
                      Collection: <code className="font-mono">{rep.postCollection}</code>
                    </span>
                    <span className="text-[#6B7280]">
                      • By {rep.reporterName || 'Visitor'} ({formatRelativeTime(rep.createdAt)})
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-[#10251D]">{rep.postTitle}</h4>
                  <p className="text-xs text-[#555555] bg-[#F9FAFB] p-2.5 rounded-xl border border-[#E5E7EB]">
                    &ldquo;{rep.details}&rdquo;
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {rep.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleResolveReport(rep, 'resolved', true)}
                        className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black rounded-xl"
                      >
                        Remove Post &amp; Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveReport(rep, 'dismissed', false)}
                        className="px-3 py-1.5 bg-[#F4F8F5] border border-[#E5E7EB] text-[#10251D] text-xs font-bold rounded-xl"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1 rounded-xl bg-[#F4F8F5] text-[#555555] text-xs font-black uppercase">
                      {rep.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center text-xs text-[#6B7280]">
          No posts found under this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const col: PostCollectionName =
              post.categoryType === 'sport_update' ? 'sport_updates' : 'general_announcements';
            const catLabel =
              post.categoryType === 'sport_update'
                ? post.sportCategory
                : post.announcementCategory;

            return (
              <div
                key={post.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3 shadow-xs"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase">
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          post.status === 'published'
                            ? 'bg-[#087443]/10 text-[#087443]'
                            : post.status === 'pending'
                            ? 'bg-[#D4A62A]/20 text-[#10251D] border border-[#D4A62A]'
                            : 'bg-[#10251D] text-white'
                        }`}
                      >
                        {post.status}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#F4F8F5] text-[#10251D]">
                        {catLabel}
                      </span>
                      {post.isPinned && (
                        <span className="px-2 py-0.5 rounded bg-[#10251D] text-white">PINNED</span>
                      )}
                      {post.isFeatured && (
                        <span className="px-2 py-0.5 rounded bg-[#D4A62A] text-[#10251D]">
                          FEATURED
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-sm text-[#10251D]">{post.title}</h4>
                    <p className="text-xs text-[#4B5563] line-clamp-2">{post.description}</p>

                    {post.moderationFlags && post.moderationFlags.length > 0 && (
                      <div className="p-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[11px] font-bold text-[#B91C1C]">
                        Auto-spam flags: {post.moderationFlags.join(' • ')}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6B7280]">
                      <span>
                        Author: <strong className="text-[#10251D]">{post.authorName}</strong>
                      </span>
                      <span>• {formatRelativeTime(post.createdAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {post.views}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {post.likesCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {post.commentsCount}
                      </span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {post.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdatePost(post, { status: 'published' }, 'Post approved & published.')
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-[11px] font-black flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}
                    {post.status !== 'rejected' && post.status !== 'removed' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdatePost(
                            post,
                            { status: 'rejected' },
                            'Post rejected and hidden from public.'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-[#F4F8F5] hover:bg-[#10251D] hover:text-white text-[#10251D] text-[11px] font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Hide / Reject
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePost(
                          post,
                          { isPinned: !post.isPinned },
                          post.isPinned ? 'Post unpinned.' : 'Post pinned to top.'
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 border ${
                        post.isPinned
                          ? 'bg-[#10251D] border-[#10251D] text-white'
                          : 'bg-white border-[#E5E7EB] text-[#10251D]'
                      }`}
                    >
                      <Pin className="w-3 h-3" />
                      {post.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePost(
                          post,
                          { isFeatured: !post.isFeatured },
                          post.isFeatured ? 'Removed featured badge.' : 'Post featured!'
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 border ${
                        post.isFeatured
                          ? 'bg-[#D4A62A] border-[#D4A62A] text-[#10251D]'
                          : 'bg-white border-[#E5E7EB] text-[#10251D]'
                      }`}
                    >
                      <Star className="w-3 h-3" />
                      {post.isFeatured ? 'Featured' : 'Feature'}
                    </button>
                    <button
                      type="button"
                      disabled={suspendingAuthorId === post.authorId}
                      onClick={() => handleSuspendAuthor(post.authorId, post.authorName)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#FEF2F2] hover:bg-[#B91C1C] text-[#B91C1C] hover:text-white border border-[#FECACA] text-[11px] font-bold flex items-center gap-1 transition"
                      title="Suspend abusive author"
                    >
                      <UserX className="w-3 h-3" />
                      Suspend User
                    </button>

                    {confirmDeleteId === post.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeletePost(col, post.id)}
                          className="px-2.5 py-1.5 bg-[#DC2626] text-white text-[11px] font-black rounded-xl"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 bg-[#F4F8F5] text-[#555555] text-[11px] font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(post.id)}
                        className="p-1.5 rounded-xl bg-[#FEF2F2] hover:bg-[#DC2626] text-[#DC2626] hover:text-white transition"
                        title="Delete Post Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
