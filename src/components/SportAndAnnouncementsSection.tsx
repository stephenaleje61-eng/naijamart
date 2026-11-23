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
  X,
  Building2
} from 'lucide-react';
import {
  GENERAL_ANNOUNCEMENT_CATEGORIES,
  SPORT_CATEGORIES,
  formatRelativeTime,
  inferSportMatchStatus
} from '../services/announcements.js';
import {
  belongsToInstitution,
  DEFAULT_INSTITUTION_ID,
  getInstitutionById
} from '../constants/institutions.js';
import {
  Advertisement,
  CommunityAnnouncementPost,
  GeneralAnnouncementPost,
  Institution,
  SportMatchStatus,
  SportUpdatePost
} from '../types.js';
import { filterAdsForAudience } from '../services/ads.js';
import { EventPosterImage } from './EventPosterImage.js';
import { SponsoredAdCard } from './SponsoredAdCard.js';

interface SportAndAnnouncementsSectionProps {
  sportUpdates: SportUpdatePost[];
  generalAnnouncements: GeneralAnnouncementPost[];
  loading: boolean;
  savedIds: Set<string>;
  selectedInstitutionId?: string;
  activeInstitution?: Institution;
  institutions?: Institution[];
  ads?: Advertisement[];
  onSelectAd?: (ad: Advertisement) => void;
  onSelectPost: (post: CommunityAnnouncementPost) => void;
  onOpenPostModal: (defaultFeedType: 'sport_update' | 'general_announcement') => void;
  onOpenAuthorProfile: (authorId: string, authorName: string, authorAvatar?: string) => void;
}

const PAGE_SIZE = 9;

const MATCH_STATUS_TABS: { value: 'all' | SportMatchStatus; label: string }[] = [
  { value: 'all', label: 'All Sports' },
  { value: 'upcoming', label: 'Upcoming Matches' },
  { value: 'live', label: 'Live Updates' },
  { value: 'completed', label: 'Completed Results' },
  { value: 'announcement', label: 'Campus Sports News' },
  { value: 'other_sport', label: 'Other Campus Sports' }
];

const MATCH_STATUS_LABELS: Record<SportMatchStatus, string> = {
  upcoming: 'Upcoming Fixture',
  live: 'Live Update',
  completed: 'Final Result',
  announcement: 'Sports Notice',
  other_sport: 'Other Sport'
};

export const SportAndAnnouncementsSection: React.FC<SportAndAnnouncementsSectionProps> = ({
  sportUpdates,
  generalAnnouncements,
  loading,
  savedIds,
  selectedInstitutionId = DEFAULT_INSTITUTION_ID,
  activeInstitution,
  institutions,
  ads = [],
  onSelectAd,
  onSelectPost,
  onOpenPostModal,
  onOpenAuthorProfile
}) => {
  const [activeFeed, setActiveFeed] = useState<'sport_update' | 'general_announcement'>(
    'sport_update'
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [matchStatusFilter, setMatchStatusFilter] = useState<'all' | SportMatchStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  const currentInst = useMemo(
    () => activeInstitution || getInstitutionById(selectedInstitutionId, institutions),
    [activeInstitution, selectedInstitutionId, institutions]
  );

  const announcementAds = useMemo(
    () =>
      filterAdsForAudience(ads, {
        institutionId: selectedInstitutionId,
        institutions,
        placement: 'campus_announcements'
      }),
    [ads, selectedInstitutionId, institutions]
  );

  const instSports = useMemo(
    () => sportUpdates.filter((p) => belongsToInstitution(p.institutionId, selectedInstitutionId)),
    [sportUpdates, selectedInstitutionId]
  );

  const instAnnouncements = useMemo(
    () =>
      generalAnnouncements.filter((p) =>
        belongsToInstitution(p.institutionId, selectedInstitutionId)
      ),
    [generalAnnouncements, selectedInstitutionId]
  );

  const handleSwitchFeed = (nextFeed: 'sport_update' | 'general_announcement') => {
    setActiveFeed(nextFeed);
    setSelectedSubcategory('all');
    setMatchStatusFilter('all');
    setVisibleLimit(PAGE_SIZE);
  };

  const subcategories =
    activeFeed === 'sport_update' ? SPORT_CATEGORIES : GENERAL_ANNOUNCEMENT_CATEGORIES;

  const filteredPosts = useMemo<CommunityAnnouncementPost[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    const baseList: CommunityAnnouncementPost[] =
      activeFeed === 'sport_update' ? instSports : instAnnouncements;

    return baseList.filter((post) => {
      if (savedOnly && !savedIds.has(post.id)) return false;

      if (post.categoryType === 'sport_update' && matchStatusFilter !== 'all') {
        if (inferSportMatchStatus(post) !== matchStatusFilter) return false;
      }

      const cat =
        post.categoryType === 'sport_update' ? post.sportCategory : post.announcementCategory;
      if (selectedSubcategory !== 'all' && cat !== selectedSubcategory) return false;

      if (q) {
        const hay = [
          post.title,
          post.description,
          post.authorName,
          cat,
          post.campus || '',
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
    instSports,
    instAnnouncements,
    matchStatusFilter,
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
      className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl overflow-hidden shadow-xs"
    >
      {/* Clean White & Orange Header */}
      <div className="bg-[#FFFFFF] text-[#222222] p-5 sm:p-7 border-b border-[#EEEEEE]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FFF4E8] text-[#FF6A00] text-[10px] font-black uppercase tracking-wider">
                <Trophy className="w-3 h-3" />
                Campus Football &amp; Sports Centre
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#666666]">
                <Building2 className="w-3 h-3 text-[#F68B1F]" />
                {selectedInstitutionId === 'all' ? 'All Nigerian Campuses' : currentInst.shortName}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#222222]">
              CAMPUS SPORT UPDATES &amp; ANNOUNCEMENT CENTRE
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-[#666666]">
              &ldquo;Stay Updated. Follow Campus Football Fixtures &amp; Connect With Everyone.&rdquo;
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenPostModal(activeFeed)}
            className="px-5 py-3 bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] font-black text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
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
                ? 'bg-[#FFF4E8] border-[#FF6A00] text-[#222222] shadow-xs'
                : 'bg-[#F7F7F7] border-[#EEEEEE] text-[#303030] hover:border-[#F68B1F]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeFeed === 'sport_update'
                    ? 'bg-[#FF6A00] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] text-[#F68B1F]'
                }`}
              >
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black block">1. CAMPUS SPORT UPDATES</span>
                <span className="text-[11px] text-[#666666] truncate block">
                  Football fixtures, live updates, match results &amp; athletics
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
                activeFeed === 'sport_update'
                  ? 'bg-[#FF6A00] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] text-[#222222]'
              }`}
            >
              {instSports.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchFeed('general_announcement')}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
              activeFeed === 'general_announcement'
                ? 'bg-[#FFF4E8] border-[#FF6A00] text-[#222222] shadow-xs'
                : 'bg-[#F7F7F7] border-[#EEEEEE] text-[#303030] hover:border-[#F68B1F]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeFeed === 'general_announcement'
                    ? 'bg-[#FF6A00] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] text-[#F68B1F]'
                }`}
              >
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black block">
                  2. GENERAL ANNOUNCEMENTS
                </span>
                <span className="text-[11px] text-[#666666] truncate block">
                  Meetings, birthdays, scholarships, lost &amp; found, campus notices
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
                activeFeed === 'general_announcement'
                  ? 'bg-[#FF6A00] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] text-[#222222]'
              }`}
            >
              {instAnnouncements.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-6 space-y-4">
        {announcementAds.length > 0 && onSelectAd && (
          <div className="space-y-2.5">
            {announcementAds.slice(0, 2).map((ad) => (
              <SponsoredAdCard
                key={`ann-ad-${ad.id}`}
                ad={ad}
                onSelectAd={onSelectAd}
                variant="banner"
              />
            ))}
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              placeholder={
                activeFeed === 'sport_update'
                  ? `Search ${currentInst.shortName} football fixtures, teams, competitions, or venues...`
                  : `Search ${currentInst.shortName} announcements, scholarships, birthdays, or meetings...`
              }
              className="w-full pl-10 pr-9 py-2.5 bg-[#F7F7F7] border border-[#EEEEEE] focus:border-[#F68B1F] rounded-2xl text-xs font-medium text-[#303030] outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-[#666666] hover:text-[#222222]"
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
              className="px-3 py-2.5 bg-[#F7F7F7] border border-[#EEEEEE] rounded-2xl text-xs font-bold text-[#222222] outline-none focus:border-[#F68B1F] flex-1 md:flex-initial"
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
                    ? 'bg-[#222222] border-[#222222] text-[#FFFFFF]'
                    : 'bg-[#F7F7F7] border-[#EEEEEE] text-[#222222] hover:border-[#F68B1F]'
                }`}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${savedOnly ? 'fill-[#F68B1F] text-[#F68B1F]' : ''}`}
                />
                <span>Saved ({savedIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Sports Match Status Tabs (Upcoming / Live / Completed / News / Other Sports) */}
        {activeFeed === 'sport_update' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {MATCH_STATUS_TABS.map((tab) => {
              const active = matchStatusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setMatchStatusFilter(tab.value);
                    setVisibleLimit(PAGE_SIZE);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap border transition ${
                    active
                      ? 'bg-[#222222] border-[#222222] text-[#FFFFFF]'
                      : 'bg-[#FFFFFF] border-[#EEEEEE] text-[#303030] hover:border-[#F68B1F]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedSubcategory('all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition ${
              selectedSubcategory === 'all'
                ? 'bg-[#FF6A00] border-[#FF6A00] text-[#FFFFFF]'
                : 'bg-[#F7F7F7] border-[#EEEEEE] text-[#303030] hover:border-[#F68B1F]'
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
                  ? 'bg-[#FF6A00] border-[#FF6A00] text-[#FFFFFF]'
                  : 'bg-[#F7F7F7] border-[#EEEEEE] text-[#303030] hover:border-[#F68B1F]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sports Integrity Disclaimer */}
        {activeFeed === 'sport_update' && (
          <div className="p-3 bg-[#FFF4E8] border border-[#F68B1F]/30 rounded-2xl text-[11px] text-[#303030] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#FF6A00] shrink-0" />
            <span>
              <strong>Community Sports Feed:</strong> Match fixtures, results, and live scores are posted directly by students and sports organizers and are labeled &ldquo;User-Submitted • Unverified&rdquo; unless confirmed by officials.
            </span>
          </div>
        )}

        {/* Feed Grid */}
        {loading && visiblePosts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-[#F7F7F7] animate-pulse border border-[#EEEEEE]"
              />
            ))}
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="bg-[#F7F7F7] border border-[#EEEEEE] rounded-2xl p-8 sm:p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF4E8] text-[#FF6A00] flex items-center justify-center mx-auto">
              {activeFeed === 'sport_update' ? (
                <Trophy className="w-6 h-6" />
              ) : (
                <Megaphone className="w-6 h-6" />
              )}
            </div>
            <h3 className="text-base font-black text-[#222222]">
              {searchTerm || selectedSubcategory !== 'all' || matchStatusFilter !== 'all' || savedOnly
                ? 'No matching posts found'
                : activeFeed === 'sport_update'
                ? `No sports updates posted yet for ${currentInst.shortName}`
                : `No announcements posted yet for ${currentInst.shortName}`}
            </h3>
            <p className="text-xs text-[#666666] max-w-md mx-auto">
              {searchTerm || selectedSubcategory !== 'all' || matchStatusFilter !== 'all' || savedOnly
                ? 'Try clearing your filters or search keyword to see all campus posts.'
                : activeFeed === 'sport_update'
                ? 'Share real upcoming campus football fixtures, live updates, departmental tournaments, or athletics trials.'
                : 'Share student meetings, birthday shoutouts, scholarships, lost & found notices, or campus programmes.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenPostModal(activeFeed)}
                className="px-5 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs font-black rounded-xl transition flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Be the First to Post</span>
              </button>
              {(searchTerm || selectedSubcategory !== 'all' || matchStatusFilter !== 'all' || savedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedSubcategory('all');
                    setMatchStatusFilter('all');
                    setSavedOnly(false);
                  }}
                  className="px-4 py-2.5 bg-[#FFFFFF] border border-[#EEEEEE] hover:border-[#F68B1F] text-[#222222] text-xs font-bold rounded-xl"
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
                const statusBadge = isSport ? MATCH_STATUS_LABELS[inferSportMatchStatus(post)] : null;
                const dateVal = isSport ? post.matchDate : post.eventDate;
                const venueVal = isSport ? post.venue : post.location;
                const isBookmarked = savedIds.has(post.id);

                return (
                  <article
                    key={post.id}
                    className="group bg-[#FFFFFF] border border-[#EEEEEE] hover:border-[#F68B1F] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div
                      onClick={() => onSelectPost(post)}
                      className="cursor-pointer flex-1 flex flex-col"
                    >
                      {post.imageUrl ? (
                        <div className="relative h-44 bg-[#222222] overflow-hidden">
                          <EventPosterImage
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                            {post.isPinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#222222]/90 text-[#FFFFFF] text-[10px] font-black uppercase">
                                <Pin className="w-2.5 h-2.5 text-[#F68B1F]" /> Pinned
                              </span>
                            )}
                            {post.isFeatured && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-black uppercase">
                                <Star className="w-2.5 h-2.5" /> Featured
                              </span>
                            )}
                          </div>
                          <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-black uppercase shadow">
                            {catLabel}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-[#222222] px-4 py-3 border-b-2 border-[#FF6A00] flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-black uppercase truncate">
                            {catLabel}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {post.isPinned && (
                              <span className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#222222] text-[9px] font-black uppercase">
                                PINNED
                              </span>
                            )}
                            {post.isFeatured && (
                              <span className="px-1.5 py-0.5 rounded bg-[#F68B1F] text-[#FFFFFF] text-[9px] font-black uppercase">
                                FEATURED
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                        {isSport && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {statusBadge && (
                              <span className="px-2 py-0.5 rounded bg-[#FFF4E8] text-[#FF6A00] text-[10px] font-black">
                                {statusBadge}
                              </span>
                            )}
                            {post.score && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-[#222222] text-[#F68B1F] text-[11px] font-black">
                                {post.score}
                              </span>
                            )}
                            {post.isUnverifiedUserPost !== false && (
                              <span className="px-2 py-0.5 rounded bg-[#F7F7F7] border border-[#EEEEEE] text-[#303030] text-[10px] font-bold">
                                User-Submitted • Unverified
                              </span>
                            )}
                          </div>
                        )}

                        <h3 className="font-display text-sm sm:text-base font-black text-[#222222] group-hover:text-[#FF6A00] line-clamp-2 leading-snug transition">
                          {post.title}
                        </h3>

                        {isSport && post.teamOrPlayer && (
                          <p className="text-[11px] font-bold text-[#303030] line-clamp-1">
                            {post.teamOrPlayer}
                            {post.competitionName ? ` • ${post.competitionName}` : ''}
                          </p>
                        )}

                        <p className="text-xs text-[#666666] line-clamp-2 flex-1">
                          {post.description}
                        </p>

                        {(dateVal || venueVal) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#666666] pt-1">
                            {dateVal && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#F68B1F]" />
                                {dateVal}
                              </span>
                            )}
                            {venueVal && (
                              <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                                <MapPin className="w-3 h-3 text-[#F68B1F]" />
                                {venueVal}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-2.5 bg-[#F7F7F7] border-t border-[#EEEEEE] flex items-center justify-between gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenAuthorProfile(post.authorId, post.authorName, post.authorAvatar)
                        }
                        className="flex items-center gap-1.5 min-w-0 hover:text-[#FF6A00] transition"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#222222] text-[#FFFFFF] flex items-center justify-center overflow-hidden shrink-0">
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
                        <span className="font-bold text-[#222222] truncate">{post.authorName}</span>
                        <span className="text-[#888888] shrink-0">
                          • {formatRelativeTime(post.createdAt)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectPost(post)}
                        className="flex items-center gap-2.5 text-[#303030] font-bold shrink-0 hover:text-[#FF6A00]"
                      >
                        <span className="inline-flex items-center gap-0.5">
                          <Heart className="w-3 h-3 text-[#FF6A00]" />
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
                          <Bookmark className="w-3 h-3 fill-[#F68B1F] text-[#F68B1F]" />
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-[#FF6A00]" />
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
                  className="px-6 py-2.5 bg-[#222222] hover:bg-[#FF6A00] text-[#FFFFFF] text-xs font-black rounded-xl transition shadow-xs"
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
