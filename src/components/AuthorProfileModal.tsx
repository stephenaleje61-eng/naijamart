import React, { useState, useEffect } from 'react';
import { X, MapPin, ShieldCheck, Calendar, Trophy, Megaphone, User as UserIcon } from 'lucide-react';
import {
  CommunityAnnouncementPost,
  PublicAuthorProfile
} from '../types.js';
import {
  formatRelativeTime,
  getPublicAuthorProfile
} from '../services/announcements.js';
import { EventPosterImage } from './EventPosterImage.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';

interface AuthorProfileModalProps {
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  allPosts: CommunityAnnouncementPost[];
  onSelectPost: (post: CommunityAnnouncementPost) => void;
  onClose: () => void;
}

export const AuthorProfileModal: React.FC<AuthorProfileModalProps> = ({
  authorId,
  authorName,
  authorAvatar,
  allPosts,
  onSelectPost,
  onClose
}) => {
  const [profile, setProfile] = useState<PublicAuthorProfile>({
    authorId,
    name: authorName,
    ...(authorAvatar ? { avatarUrl: authorAvatar } : {})
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublicAuthorProfile(authorId, authorName, authorAvatar)
      .then((res) => {
        if (active) setProfile(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authorId, authorName, authorAvatar]);

  const authorPosts = allPosts.filter((p) => p.authorId === authorId && p.status === 'published');

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E7EB]">
        {/* Header */}
        <div className="bg-[#087443] text-white px-5 py-5 flex items-center justify-between gap-3 border-b-4 border-[#D4A62A]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#D4A62A] text-[#10251D] flex items-center justify-center font-black text-lg overflow-hidden shrink-0 border-2 border-white/25">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-black text-white truncate">
                  {profile.name}
                </h3>
                {profile.username && (
                  <span className="text-xs font-bold text-[#D4A62A]">@{profile.username}</span>
                )}
                <CeoVerifiedBadge
                  verified={Boolean(profile.isVerifiedSeller)}
                  entityIds={[profile.authorId, authorId]}
                  variant="compact"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/80 mt-1">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#D4A62A]" />
                    {profile.city}
                  </span>
                )}
                {profile.department && (
                  <span className="flex items-center gap-1">
                    {profile.department}
                  </span>
                )}
                {profile.joinedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#D4A62A]" />
                    Member since {new Date(profile.joinedAt).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close author profile"
            className="w-9 h-9 rounded-xl bg-[#065D36] hover:bg-[#D4A62A] text-white hover:text-[#10251D] flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Author's Posts */}
        <div className="p-5 sm:p-6 max-h-[68vh] overflow-y-auto space-y-4">
          {profile.bio && !profile.isPrivateProfile && (
            <div className="p-3.5 rounded-2xl bg-[#F4F8F5] border border-[#E5E7EB] text-xs text-[#374151]">
              {profile.bio}
            </div>
          )}

          {profile.isPrivateProfile && (
            <div className="p-4 rounded-2xl bg-[#FFF8DB] border border-[#D4A62A] text-xs font-semibold text-[#10251D]">
              This member has limited their public profile details in Privacy Settings.
            </div>
          )}

          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#10251D]">
              Published Sports &amp; Announcements ({authorPosts.length})
            </h4>
            {loading && <span className="text-[11px] text-[#6B7280]">Refreshing profile...</span>}
          </div>

          {authorPosts.length === 0 ? (
            <div className="py-8 text-center bg-[#F4F8F5] rounded-2xl border border-[#E5E7EB] text-xs text-[#6B7280]">
              No active public updates posted by this user yet.
            </div>
          ) : (
            <div className="space-y-3">
              {authorPosts.map((post) => {
                const isSport = post.categoryType === 'sport_update';
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectPost(post);
                    }}
                    className="w-full text-left p-3.5 rounded-2xl border border-[#E5E7EB] hover:border-[#087443] bg-[#F4F8F5] hover:bg-white transition flex items-start gap-3"
                  >
                    {post.imageUrl && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#10251D] shrink-0">
                        <EventPosterImage src={post.imageUrl} alt={post.title} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isSport ? 'bg-[#10251D] text-[#D4A62A]' : 'bg-[#087443] text-white'
                          }`}
                        >
                          {isSport ? <Trophy className="w-3 h-3" /> : <Megaphone className="w-3 h-3" />}
                          {isSport ? post.sportCategory : post.announcementCategory}
                        </span>
                        <span className="text-[11px] text-[#6B7280]">
                          {formatRelativeTime(post.createdAt)}
                        </span>
                      </div>
                      <h5 className="text-sm font-black text-[#10251D] line-clamp-1">
                        {post.title}
                      </h5>
                      <p className="text-xs text-[#4B5563] line-clamp-2">{post.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
