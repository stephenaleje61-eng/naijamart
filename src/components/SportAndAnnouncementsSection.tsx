import React, { useMemo, useState } from 'react';
import {
  Trophy,
  Megaphone,
  PlusCircle,
  Search,
  Pin,
  Star,
  Calendar,
  MapPin,
  Heart,
  MessageSquare,
  Eye,
  Bookmark,
  ShieldAlert,
  User as UserIcon,
  ArrowRight,
  X
} from 'lucide-react';
import {
  GENERAL_ANNOUNCEMENT_CATEGORIES,
  SPORT_CATEGORIES,
  formatRelativeTime
} from '../services/announcements.js';
import {
  CommunityAnnouncementPost,
  GeneralAnnouncementPost,
  SportUpdatePost
} from '../types.js';
import { EventPosterImage } from './EventPosterImage.js';

interface SportAndAnnouncementsSectionProps {
  sportUpdates: SportUpdatePost[];
  generalAnnouncements: GeneralAnnouncementPost[];
  loading: boolean;
  savedIds: Set<string>;
  onSelectPost: (post: CommunityAnnouncementPost) => void;
  onOpenPostModal: (defaultFeedType: 'sport_update' | 'general_announcement') => void;
  onOpenAuthorProfile: (authorId: string, authorName: string, authorAvatar?: string) => void;
}

const PAGE_SIZE = 9;

export const SportAndAnnouncementsSection: React.FC<SportAndAnnouncementsSectionProps> = ({
  sportUpdates,
  generalAnnouncements,
  loading,
  savedIds,
  onSelectPost,
  onOpenPostModal,
  onOpenAuthorProfile
}) => {
  const [activeFeed, setActiveFeed] = useState<'sport_update' | 'general_announcement'>(
    'sport_update'
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  const handleSwitchFeed = (nextFeed: 'sport_update' | 'general_announcement') => {
    setActiveFeed(nextFeed);
    setSelectedSubcategory('all');
    setVisibleLimit(PAGE_SIZE);
  };

  const subcategories =
    activeFeed === 'sport_update' ? SPORT_CATEGORIES : GENERAL_ANNOUNCEMENT_CATEGORIES;

  const filteredPosts = useMemo<CommunityAnnouncementPost[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    const baseList: CommunityAnnouncementPost[] =
      activeFeed === 'sport_update' ? sportUpdates : generalAnnouncements;

    return baseList.filter((post) => {
      if (savedOnly && !savedIds.has(post.id)) return false;

      const cat =
        post.categoryType === 'sport_update' ? post.sportCategory : post.announcementCategory;
      if (selectedSubcategory !== 'all' && cat !== selectedSubcategory) return false;

      if (q) {
        const hay = [
          post.title,
          post.description,
          post.authorName,
          cat,
          post.categoryType === 'sport_update'
            ? `${post.teamOrPlayer || ''} ${post.competitionName || ''} ${post.venue || ''}`
            : `${post.location || ''}`
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    activeFeed,
    sportUpdates,
    generalAnnouncements,
    selectedSubcategory,
    searchTerm,
    savedOnly,
    savedIds
  ]);

  const visiblePosts = filteredPosts.slice(0, visibleLimit);
  const hasMore = filteredPosts.length > visiblePosts.length;

  return (
    <section
      id="fu-sport-announcement-centre"
      className="bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-xs"
    >
      {/* Hero Header Banner (Black + Bold Orange Sports & Campus News Design) */}
      <div className="bg-[#111111] text-white p-5 sm:p-7 border-b-4 border-[#EA580C]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#EA580C] text-white text-[10px] font-black uppercase tracking-wider">
                <Trophy className="w-3 h-3" />
                Live Campus Hub
              </span>
              <span className="text-[11px] font-bold text-[#FDBA74]">
                Open to All FUWUKARI Visitors
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              FU SPORT UPDATE &amp; ANNOUNCEMENT CENTRE
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-white/80">
              &ldquo;Stay Updated. Share Information. Connect With Everyone.&rdquo;
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenPostModal(activeFeed)}
            className="px-5 py-3 bg-[#EA580C] hover:bg-[#C2410C] text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
        </div>

        {/* Two Main Categories Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={() => handleSwitchFeed('sport_update')}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
              activeFeed === 'sport_update'
                ? 'bg-[#EA580C] border-[#EA580C] text-white shadow-md'
                : 'bg-white/5 border-white/15 text-white/85 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeFeed === 'sport_update'
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#EA580C]/20 text-[#FB923C]'
                }`}
              >
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black block">1. FU SPORT UPDATE</span>
                <span className="text-[11px] opacity-85 truncate block">
                  Football fixtures, scores, tournaments, basketball &amp; athletics
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
                activeFeed === 'sport_update'
                  ? 'bg-white text-[#EA580C]'
                  : 'bg-white/10 text-white'
              }`}
            >
              {sportUpdates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchFeed('general_announcement')}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
              activeFeed === 'general_announcement'
                ? 'bg-[#EA580C] border-[#EA580C] text-white shadow-md'
                : 'bg-white/5 border-white/15 text-white/85 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeFeed === 'general_announcement'
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#EA580C]/20 text-[#FB923C]'
                }`}
              >
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black block">
                  2. FU GENERAL ANNOUNCEMENTS
                </span>
                <span className="text-[11px] opacity-85 truncate block">
                  Meetings, birthdays, scholarships, lost &amp; found, campus notices
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
                activeFeed === 'general_announcement'
                  ? 'bg-white text-[#EA580C]'
                  : 'bg-white/10 text-white'
              }`}
            >
              {generalAnnouncements.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              placeholder={
                activeFeed === 'sport_update'
                  ? 'Search football fixtures, departments, competitions, or venues...'
                  : 'Search announcements, scholarships, lost & found, birthdays, or meetings...'
              }
              className="w-full pl-10 pr-9 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] rounded-2xl text-xs font-medium text-[#111111] outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-[#6B7280] hover:text-[#111111]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedSubcategory}
              onChange={(e) => {
                setSelectedSubcategory(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              className="px-3 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-xs font-bold text-[#111111] outline-none focus:border-[#EA580C] flex-1 md:flex-initial"
            >
              <option value="all">
                All {activeFeed === 'sport_update' ? 'Sports Categories' : 'Announcements'}
              </option>
              {subcategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {savedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSavedOnly((v) => !v)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-1.5 transition ${
                  savedOnly
                    ? 'bg-[#111111] border-[#111111] text-white'
                    : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111111] hover:border-[#EA580C]'
                }`}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${savedOnly ? 'fill-[#EA580C] text-[#EA580C]' : ''}`}
                />
                <span>Saved ({savedIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedSubcategory('all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition ${
              selectedSubcategory === 'all'
                ? 'bg-[#EA580C] border-[#EA580C] text-white'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#374151] hover:border-[#EA580C]'
            }`}
          >
            All Topics
          </button>
          {subcategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedSubcategory(selectedSubcategory === cat ? 'all' : cat);
                setVisibleLimit(PAGE_SIZE);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition ${
                selectedSubcategory === cat
                  ? 'bg-[#EA580C] border-[#EA580C] text-white'
                  : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#374151] hover:border-[#EA580C]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sports Integrity Disclaimer */}
        {activeFeed === 'sport_update' && (
          <div className="p-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl text-[11px] text-[#9A3412] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#EA580C] shrink-0" />
            <span>
              <strong>Community Sports Feed:</strong> Match fixtures, results, and live scores are posted directly by FUWUKARI students and are labeled as user-submitted unless confirmed by tournament officials.
            </span>
          </div>
        )}

        {/* Feed Grid */}
        {loading && visiblePosts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-[#F3F4F6] animate-pulse border border-[#E5E7EB]"
              />
            ))}
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-3xl p-8 sm:p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EA580C]/15 text-[#EA580C] flex items-center justify-center mx-auto">
              {activeFeed === 'sport_update' ? (
                <Trophy className="w-6 h-6" />
              ) : (
                <Megaphone className="w-6 h-6" />
              )}
            </div>
            <h3 className="text-base font-black text-[#111111]">
              {searchTerm || selectedSubcategory !== 'all' || savedOnly
                ? 'No matching posts found'
                : activeFeed === 'sport_update'
                ? 'No FU Sport Updates posted yet'
                : 'No FU General Announcements posted yet'}
            </h3>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto">
              {searchTerm || selectedSubcategory !== 'all' || savedOnly
                ? 'Try clearing your filters or search keyword to see all campus posts.'
                : activeFeed === 'sport_update'
                ? 'Share upcoming FUWUKARI football fixtures, live scores, departmental tournaments, or athletics trials.'
                : 'Share student meetings, birthday shoutouts, scholarships, lost & found notices, or campus programmes.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenPostModal(activeFeed)}
                className="px-5 py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black rounded-xl transition flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Be the First to Post</span>
              </button>
              {(searchTerm || selectedSubcategory !== 'all' || savedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedSubcategory('all');
                    setSavedOnly(false);
                  }}
                  className="px-4 py-2.5 bg-white border border-[#E5E7EB] hover:border-[#EA580C] text-[#111111] text-xs font-bold rounded-xl"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visiblePosts.map((post) => {
                const isSport = post.categoryType === 'sport_update';
                const catLabel = isSport ? post.sportCategory : post.announcementCategory;
                const dateVal = isSport ? post.matchDate : post.eventDate;
                const venueVal = isSport ? post.venue : post.location;
                const isBookmarked = savedIds.has(post.id);

                return (
                  <article
                    key={post.id}
                    className="group bg-white border border-[#E5E7EB] hover:border-[#EA580C] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div
                      onClick={() => onSelectPost(post)}
                      className="cursor-pointer flex-1 flex flex-col"
                    >
                      {/* Media Header if Poster exists */}
                      {post.imageUrl ? (
                        <div className="relative h-44 bg-[#111111] overflow-hidden">
                          <EventPosterImage
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                            {post.isPinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#111111]/90 text-white text-[10px] font-black uppercase">
                                <Pin className="w-2.5 h-2.5 text-[#EA580C]" /> Pinned
                              </span>
                            )}
                            {post.isFeatured && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F2B90D] text-[#111111] text-[10px] font-black uppercase">
                                <Star className="w-2.5 h-2.5" /> Featured
                              </span>
                            )}
                          </div>
                          <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-[#EA580C] text-white text-[10px] font-black uppercase shadow">
                            {catLabel}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-[#111111] px-4 py-3 border-b-2 border-[#EA580C] flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#EA580C] text-white text-[10px] font-black uppercase truncate">
                            {catLabel}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {post.isPinned && (
                              <span className="px-1.5 py-0.5 rounded bg-white text-[#111111] text-[9px] font-black uppercase">
                                PINNED
                              </span>
                            )}
                            {post.isFeatured && (
                              <span className="px-1.5 py-0.5 rounded bg-[#F2B90D] text-[#111111] text-[9px] font-black uppercase">
                                FEATURED
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                        {isSport && (post.score || post.isUnverifiedUserPost !== false) && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {post.score && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-[#111111] text-white text-[11px] font-black">
                                {post.score}
                              </span>
                            )}
                            {post.isUnverifiedUserPost !== false && (
                              <span className="px-2 py-0.5 rounded bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] text-[10px] font-bold">
                                User-Submitted
                              </span>
                            )}
                          </div>
                        )}

                        <h3 className="font-display text-sm sm:text-base font-black text-[#111111] group-hover:text-[#EA580C] line-clamp-2 leading-snug transition">
                          {post.title}
                        </h3>

                        {isSport && post.teamOrPlayer && (
                          <p className="text-[11px] font-bold text-[#374151] line-clamp-1">
                            {post.teamOrPlayer}
                            {post.competitionName ? ` • ${post.competitionName}` : ''}
                          </p>
                        )}

                        <p className="text-xs text-[#4B5563] line-clamp-2 flex-1">
                          {post.description}
                        </p>

                        {(dateVal || venueVal) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B7280] pt-1">
                            {dateVal && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#EA580C]" />
                                {dateVal}
                              </span>
                            )}
                            {venueVal && (
                              <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                                <MapPin className="w-3 h-3 text-[#EA580C]" />
                                {venueVal}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Author + Engagement */}
                    <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenAuthorProfile(post.authorId, post.authorName, post.authorAvatar)
                        }
                        className="flex items-center gap-1.5 min-w-0 hover:text-[#EA580C] transition"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center overflow-hidden shrink-0">
                          {post.authorAvatar ? (
                            <img
                              src={post.authorAvatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-3 h-3" />
                          )}
                        </div>
                        <span className="font-bold text-[#111111] truncate">{post.authorName}</span>
                        <span className="text-[#9CA3AF] shrink-0">
                          • {formatRelativeTime(post.createdAt)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectPost(post)}
                        className="flex items-center gap-2.5 text-[#4B5563] font-bold shrink-0 hover:text-[#EA580C]"
                      >
                        <span className="inline-flex items-center gap-0.5">
                          <Heart className="w-3 h-3 text-[#EA580C]" />
                          {post.likesCount}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          {post.commentsCount}
                        </span>
                        <span className="hidden sm:inline-flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />
                          {post.views}
                        </span>
                        {isBookmarked && (
                          <Bookmark className="w-3 h-3 fill-[#EA580C] text-[#EA580C]" />
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-[#EA580C]" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
                  className="px-6 py-2.5 bg-[#111111] hover:bg-[#EA580C] text-white text-xs font-black rounded-xl transition shadow-xs"
                >
                  Load More ({filteredPosts.length - visiblePosts.length} more)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
