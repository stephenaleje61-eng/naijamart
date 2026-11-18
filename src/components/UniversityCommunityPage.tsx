import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  Calculator,
  CheckCircle2,
  Home,
  MapPin,
  Megaphone,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users
} from 'lucide-react';
import {
  Advertisement,
  CampusEvent,
  CommunityAnnouncementPost,
  Institution,
  Product,
  RegisteredUser,
  UniversityCommunityMembership
} from '../types.js';
import { belongsToInstitution } from '../constants/institutions.js';
import { useAuth } from '../context/AuthContext.js';
import {
  joinUniversityCommunity,
  leaveUniversityCommunity,
  subscribeToAllCommunityMemberCounts,
  subscribeToCommunityMemberships
} from '../services/universityNetwork.js';
import { StudentSocialFeed } from './StudentSocialFeed.js';
import { NationalAnnouncementsSection } from './NationalAnnouncementsSection.js';

interface UniversityCommunityPageProps {
  institution: Institution;
  products: Product[];
  announcements?: CommunityAnnouncementPost[];
  events?: CampusEvent[];
  ads?: Advertisement[];
  knownUsers?: RegisteredUser[];
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onStartDirectChat?: (target: { id: string; name: string; matricNumber?: string }) => void;
  onOpenAuthModal?: () => void;
  onNavigateView?: (view: string) => void;
  onReportScam?: (target: {
    targetType: 'product' | 'post' | 'user';
    targetId: string;
    targetName: string;
    targetUserId?: string;
    institutionId?: string;
  }) => void;
  canPublishAnnouncements?: boolean;
  ceoSessionToken?: string;
}

type CommunityTab =
  | 'feed'
  | 'announcements'
  | 'marketplace'
  | 'events'
  | 'accommodation'
  | 'business'
  | 'sports'
  | 'academics';

export const UniversityCommunityPage: React.FC<UniversityCommunityPageProps> = ({
  institution,
  products,
  announcements = [],
  events = [],
  ads = [],
  knownUsers = [],
  onBack,
  onSelectProduct,
  onStartDirectChat,
  onOpenAuthModal,
  onNavigateView,
  onReportScam,
  canPublishAnnouncements = false,
  ceoSessionToken
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CommunityTab>('feed');
  const [memberships, setMemberships] = useState<UniversityCommunityMembership[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeToCommunityMemberships(user?.id, setMemberships);
    const unsub2 = subscribeToAllCommunityMemberCounts(setMemberCounts);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user?.id]);

  const isJoined = memberships.some((m) => m.institutionId === institution.id);
  const memberCount = memberCounts[institution.id] || 0;

  const instProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.status === 'active' &&
          belongsToInstitution(p.institutionId, institution.id)
      ),
    [products, institution.id]
  );

  const instAnnouncements = useMemo(
    () =>
      announcements.filter(
        (a) =>
          a.categoryType !== 'sport_update' &&
          belongsToInstitution(a.institutionId, institution.id)
      ),
    [announcements, institution.id]
  );

  const instSports = useMemo(
    () =>
      announcements.filter(
        (a) =>
          a.categoryType === 'sport_update' &&
          belongsToInstitution(a.institutionId, institution.id)
      ),
    [announcements, institution.id]
  );

  const instAds = useMemo(
    () =>
      ads.filter(
        (ad) =>
          ad.status === 'active' &&
          (!ad.institutionId || belongsToInstitution(ad.institutionId, institution.id))
      ),
    [ads, institution.id]
  );

  const instMembers = useMemo(
    () => knownUsers.filter((u) => belongsToInstitution(u.institutionId, institution.id)),
    [knownUsers, institution.id]
  );

  const handleToggleJoin = async () => {
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    setJoining(true);
    try {
      if (isJoined) {
        await leaveUniversityCommunity(user.id, institution.id);
      } else {
        await joinUniversityCommunity({
          userId: user.id,
          userName: user.name,
          institutionId: institution.id,
          campus: institution.campus,
          department: user.department,
          levelOfStudy: user.levelOfStudy
        });
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8F6] text-[#172B24] pb-20 sm:pb-12">
      {/* Community Top Bar */}
      <div className="bg-[#172B24] text-white border-b-2 border-[#D4A62A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Hub</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#D4A62A] text-[#172B24] text-[11px] font-extrabold">
                {institution.shortName} COMMUNITY
              </span>
              <button
                type="button"
                onClick={handleToggleJoin}
                disabled={joining}
                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                  isJoined
                    ? 'bg-emerald-100 text-[#087443]'
                    : 'bg-[#087443] hover:bg-[#065D36] text-white border border-white/20'
                }`}
              >
                {isJoined && <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isJoined ? 'Joined Community' : 'Join Community'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D4A62A]">
                <Building2 className="w-4 h-4" />
                <span>{institution.type}</span>
                <span>·</span>
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {institution.location}, {institution.state} State
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                {institution.name}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl">
                {institution.description ||
                  `Official NIGERIA UNIVERSITY HUB student community, marketplace, announcements, accommodation, and academic networking space for ${institution.shortName}.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#D4A62A]" />
                <span className="font-extrabold tabular-nums">
                  {Math.max(memberCount, instMembers.length)}
                </span>
                <span className="text-emerald-100">Members</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#D4A62A]" />
                <span className="font-extrabold tabular-nums">{instProducts.length}</span>
                <span className="text-emerald-100">Listings</span>
              </div>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            {(
              [
                { id: 'feed', label: 'Social Feed & Discussions', icon: MessageSquare },
                { id: 'announcements', label: 'Announcements', icon: Megaphone },
                { id: 'marketplace', label: `Marketplace (${instProducts.length})`, icon: ShoppingBag },
                { id: 'events', label: `Campus Events (${events.length})`, icon: Calendar },
                { id: 'accommodation', label: 'Accommodation & Agents', icon: Home },
                { id: 'business', label: `Business Promos (${instAds.length})`, icon: Sparkles },
                { id: 'sports', label: `Sports & Football (${instSports.length})`, icon: Trophy },
                { id: 'academics', label: 'Academic & GPA Tool', icon: Calculator }
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition ${
                    activeTab === tab.id
                      ? 'bg-[#D4A62A] text-[#172B24]'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Community Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'feed' && (
          <StudentSocialFeed
            selectedInstitution={institution}
            lockToInstitution={true}
            knownUsers={knownUsers}
            onStartDirectChat={onStartDirectChat}
            onOpenAuthModal={onOpenAuthModal}
            onReportScam={(t) => onReportScam?.(t)}
          />
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <NationalAnnouncementsSection
              activeInstitution={institution}
              canPublish={canPublishAnnouncements}
              ceoSessionToken={ceoSessionToken}
            />
            {instAnnouncements.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#D9E5DF] p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-[#172B24]">
                  Campus Community Posts ({instAnnouncements.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {instAnnouncements.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF]">
                      <span className="text-[10px] font-extrabold text-[#087443] uppercase">
                        {'announcementCategory' in item ? item.announcementCategory : item.sportCategory}
                      </span>
                      <h4 className="text-sm font-extrabold text-[#172B24] mt-1">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-3">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className="bg-white rounded-2xl border border-[#D9E5DF] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#172B24]">
                {institution.shortName} Campus Marketplace Listings
              </h2>
            </div>
            {instProducts.length === 0 ? (
              <p className="text-xs text-slate-600 py-8 text-center">
                No active marketplace listings posted for {institution.shortName} yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {instProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="text-left rounded-xl border border-[#D9E5DF] bg-white hover:border-[#087443] overflow-hidden transition flex flex-col"
                  >
                    <div className="aspect-square bg-[#F5F8F6] overflow-hidden">
                      <img
                        src={product.imageUrl || product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-1">
                      <h3 className="text-xs font-extrabold text-[#172B24] line-clamp-1">
                        {product.title}
                      </h3>
                      <p className="text-sm font-extrabold text-[#087443] tabular-nums">
                        ₦{Number(product.price || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{product.sellerName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-white rounded-2xl border border-[#D9E5DF] p-5 space-y-4">
            <h2 className="text-base font-extrabold text-[#172B24]">
              Campus Events &amp; Celebrations
            </h2>
            {events.length === 0 ? (
              <p className="text-xs text-slate-600 py-8 text-center">
                No upcoming campus events published yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {events.map((ev) => (
                  <div key={ev.id} className="rounded-xl border border-[#D9E5DF] overflow-hidden bg-[#F5F8F6]">
                    {ev.photoUrl && (
                      <img src={ev.photoUrl} alt={ev.celebrantName} className="w-full h-40 object-cover" />
                    )}
                    <div className="p-3.5 space-y-1">
                      <span className="text-[10px] font-extrabold text-[#087443] uppercase">
                        {ev.eventType}
                      </span>
                      <h3 className="text-sm font-extrabold text-[#172B24]">{ev.celebrantName}</h3>
                      <p className="text-xs text-slate-600">
                        {ev.eventDate} · {ev.venue}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'accommodation' && (
          <div className="bg-white rounded-2xl border border-[#D9E5DF] p-6 space-y-3 text-center">
            <Home className="w-10 h-10 text-[#087443] mx-auto" />
            <h2 className="text-base font-extrabold text-[#172B24]">
              {institution.shortName} Accommodation &amp; House Agents
            </h2>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              Browse verified self-contains, student lodges, roommates, and inspected campus house agents for {institution.name}.
            </p>
            {onNavigateView && (
              <button
                type="button"
                onClick={() => onNavigateView('hux')}
                className="px-5 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-extrabold transition"
              >
                Open Accommodation &amp; Agents Portal
              </button>
            )}
          </div>
        )}

        {activeTab === 'business' && (
          <div className="bg-white rounded-2xl border border-[#D9E5DF] p-5 space-y-4">
            <h2 className="text-base font-extrabold text-[#172B24]">
              Student Business Promotions ({institution.shortName})
            </h2>
            {instAds.length === 0 ? (
              <p className="text-xs text-slate-600 py-8 text-center">
                No promoted student businesses for {institution.shortName} yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {instAds.map((ad) => (
                  <div key={ad.id} className="rounded-xl border border-[#D9E5DF] overflow-hidden bg-[#F5F8F6] p-3 space-y-2">
                    <img src={ad.imageUrl} alt={ad.title} className="w-full h-36 object-cover rounded-lg" />
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-extrabold text-[#172B24] truncate">{ad.businessName}</h3>
                      {ad.ceoVerified && <BadgeCheck className="w-4 h-4 text-[#087443] shrink-0" />}
                    </div>
                    <p className="text-xs font-bold text-[#087443]">{ad.title}</p>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{ad.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sports' && (
          <div className="bg-white rounded-2xl border border-[#D9E5DF] p-5 space-y-4">
            <h2 className="text-base font-extrabold text-[#172B24]">
              Sports &amp; Football Fixtures ({institution.shortName})
            </h2>
            {instSports.length === 0 ? (
              <p className="text-xs text-slate-600 py-8 text-center">
                No campus football or sports updates posted yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {instSports.map((sp) => (
                  <div key={sp.id} className="p-4 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF]">
                    <span className="text-[10px] font-extrabold text-[#087443] uppercase">
                      {'sportCategory' in sp ? sp.sportCategory : sp.announcementCategory}
                    </span>
                    <h4 className="text-sm font-extrabold text-[#172B24] mt-1">{sp.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{sp.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'academics' && (
          <div className="bg-white rounded-2xl border border-[#D9E5DF] p-6 space-y-3 text-center">
            <Calculator className="w-10 h-10 text-[#087443] mx-auto" />
            <h2 className="text-base font-extrabold text-[#172B24]">
              Academic Info, Books &amp; CGPA Calculator
            </h2>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              Calculate your {institution.shortName} semester GPA &amp; cumulative CGPA, or browse department textbooks and past questions.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {onNavigateView && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigateView('gpa')}
                    className="px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-extrabold transition"
                  >
                    Launch GPA Calculator
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateView('opportunities')}
                    className="px-4 py-2.5 rounded-xl bg-[#172B24] hover:bg-[#087443] text-white text-xs font-extrabold transition"
                  >
                    Open Books &amp; Study Portal
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
