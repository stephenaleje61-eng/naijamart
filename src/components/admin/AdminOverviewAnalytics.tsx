import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  Home,
  Laptop,
  Loader2,
  MessageCircle,
  MessageSquare,
  Package,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Store,
  Tablet,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users
} from 'lucide-react';
import { collection, getDocs, limit, onSnapshot, query } from 'firebase/firestore';
import {
  Advertisement,
  HouseAgentProfile,
  Institution,
  Product,
  SellerProfile,
  ServiceListing,
  User,
  VisitorAnalyticsSummary
} from '../../types.js';
import { db, getAllProductsFromFirestoreForAdmin, toIsoString } from '../../services/firebase.js';
import { fetchAdminAnalyticsSummary } from '../../services/api.js';
import { DEFAULT_CATEGORIES } from '../../constants/categories.js';
import { DEFAULT_INSTITUTION_ID, VERIFIED_NIGERIAN_INSTITUTIONS } from '../../constants/institutions.js';

interface AdminOverviewAnalyticsProps {
  mode?: 'admin' | 'ceo';
  users?: User[];
  products?: Product[];
  sellers?: SellerProfile[];
  houseAgents?: HouseAgentProfile[];
  institutions?: Institution[];
  services?: ServiceListing[];
  advertisements?: Advertisement[];
  visitorAnalytics?: VisitorAnalyticsSummary;
  accommodationsCount?: number;
  studentPostsCount?: number;
  studentRequestsCount?: number;
  messagesCount?: number;
  activeUsersCount?: number;
  communityMembershipsCount?: number;
  pendingReportsCount?: number;
}

type ChartPeriod = 'daily' | 'weekly' | 'monthly';

function getNigeriaDateKey(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const watMs = d.getTime() + 60 * 60 * 1000;
  return new Date(watMs).toISOString().slice(0, 10);
}

function getNigeriaWeekStartKey(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const wat = new Date(d.getTime() + 60 * 60 * 1000);
  const day = wat.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  wat.setUTCDate(wat.getUTCDate() + diffToMonday);
  return wat.toISOString().slice(0, 10);
}

export const AdminOverviewAnalytics: React.FC<AdminOverviewAnalyticsProps> = ({
  mode = 'admin',
  users: propUsers,
  products: propProducts,
  sellers: propSellers,
  houseAgents: propHouseAgents,
  institutions: propInstitutions,
  services: propServices,
  advertisements: propAds,
  visitorAnalytics: propVisitors,
  accommodationsCount: propAccomCount,
  studentPostsCount: propStudentPostsCount,
  studentRequestsCount: propRequestsCount,
  messagesCount: propMessagesCount,
  activeUsersCount: propActiveUsersCount,
  communityMembershipsCount: propMembershipsCount,
  pendingReportsCount = 0
}) => {
  const [liveUsers, setLiveUsers] = useState<User[]>(propUsers || []);
  const [products, setProducts] = useState<Product[]>(propProducts || []);
  const [sellers, setSellers] = useState<SellerProfile[]>(propSellers || []);
  const [houseAgents, setHouseAgents] = useState<HouseAgentProfile[]>(propHouseAgents || []);
  const [institutions, setInstitutions] = useState<Institution[]>(
    propInstitutions && propInstitutions.length > 0 ? propInstitutions : VERIFIED_NIGERIAN_INSTITUTIONS
  );
  const [services, setServices] = useState<ServiceListing[]>(propServices || []);
  const [ads, setAds] = useState<Advertisement[]>(propAds || []);
  const [visitors, setVisitors] = useState<VisitorAnalyticsSummary>(
    propVisitors || {
      totalVisits: 0,
      totalUniqueVisitors: 0,
      todayVisits: 0,
      todayUniqueVisitors: 0,
      byDevice: { android: 0, iphone: 0, ipad: 0, desktop: 0, unknown: 0 },
      daily: []
    }
  );
  const [accomItems, setAccomItems] = useState<Array<{ institutionId?: string }>>([]);
  const [accomCount, setAccomCount] = useState<number>(propAccomCount ?? 0);
  const [postsItems, setPostsItems] = useState<Array<{ institutionId?: string }>>([]);
  const [postsCount, setPostsCount] = useState<number>(
    (propStudentPostsCount ?? 0) + (propRequestsCount ?? 0)
  );
  const [messagesCount, setMessagesCount] = useState<number>(propMessagesCount ?? 0);
  const [activeHubIds, setActiveHubIds] = useState<Set<string>>(() => new Set());
  const [membershipsCount, setMembershipsCount] = useState<number>(propMembershipsCount ?? 0);

  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('daily');
  const [loading, setLoading] = useState<boolean>(!propUsers || !propProducts);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (propUsers) setLiveUsers(propUsers);
  }, [propUsers]);
  useEffect(() => {
    if (propProducts) setProducts(propProducts);
  }, [propProducts]);
  useEffect(() => {
    if (propSellers) setSellers(propSellers);
  }, [propSellers]);
  useEffect(() => {
    if (propHouseAgents) setHouseAgents(propHouseAgents);
  }, [propHouseAgents]);
  useEffect(() => {
    if (propInstitutions && propInstitutions.length > 0) setInstitutions(propInstitutions);
  }, [propInstitutions]);
  useEffect(() => {
    if (propServices) setServices(propServices);
  }, [propServices]);
  useEffect(() => {
    if (propAds) setAds(propAds);
  }, [propAds]);
  useEffect(() => {
    if (propVisitors) setVisitors(propVisitors);
  }, [propVisitors]);

  // Real-time Firestore listener on `users` so Registered Users updates immediately on signup
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'users'), limit(1000)),
      (snap) => {
        const next: User[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: String(data?.name || data?.displayName || 'Campus User'),
            email: String(data?.email || '').toLowerCase().trim(),
            role: data?.role === 'admin' ? 'admin' : data?.role === 'seller' ? 'seller' : 'buyer',
            accountType: data?.accountType,
            institutionId: data?.institutionId ? String(data.institutionId) : DEFAULT_INSTITUTION_ID,
            campus: data?.campus ? String(data.campus) : undefined,
            state: data?.state ? String(data.state) : 'Taraba',
            city: data?.city ? String(data.city) : 'Wukari',
            isSuspended: Boolean(data?.isSuspended),
            isVerified: Boolean(data?.isVerified || data?.ceoVerified),
            ceoVerified: Boolean(data?.ceoVerified || data?.isVerified),
            lastSeen: data?.lastSeen,
            lastSeenAt: data?.lastSeenAt ? toIsoString(data.lastSeenAt) : undefined,
            createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
          };
        });
        setLiveUsers(next);
      },
      (err) => {
        console.warn('[AdminOverviewAnalytics users onSnapshot]:', err.message);
      }
    );
    return () => unsub();
  }, []);

  const loadFullAnalytics = useCallback(async () => {
    setErrorMsg(null);
    if (!propProducts) setLoading(true);
    try {
      const [
        visitorRes,
        prodsRes,
        sellersSnap,
        agentsSnap,
        huxSnap,
        accSnap,
        studentPostsSnap,
        genAnnSnap,
        sportSnap,
        reqSnap,
        hubMsgSnap,
        hubActSnap,
        privChatsSnap,
        instSnap,
        svcSnap,
        adSnap,
        memSnap
      ] = await Promise.all([
        !propVisitors ? fetchAdminAnalyticsSummary(30) : Promise.resolve(propVisitors),
        !propProducts ? getAllProductsFromFirestoreForAdmin() : Promise.resolve(propProducts),
        !propSellers ? getDocs(query(collection(db, 'sellerProfiles'), limit(1000))).catch(() => null) : Promise.resolve(null),
        !propHouseAgents ? getDocs(query(collection(db, 'houseAgents'), limit(500))).catch(() => null) : Promise.resolve(null),
        getDocs(query(collection(db, 'hux'), limit(500))).catch(() => null),
        getDocs(query(collection(db, 'accommodation'), limit(500))).catch(() => null),
        getDocs(query(collection(db, 'studentPosts'), limit(500))).catch(() => null),
        getDocs(query(collection(db, 'general_announcements'), limit(300))).catch(() => null),
        getDocs(query(collection(db, 'sport_updates'), limit(300))).catch(() => null),
        getDocs(query(collection(db, 'studentRequests'), limit(500))).catch(() => null),
        getDocs(query(collection(db, 'hubMessages'), limit(500))).catch(() => null),
        getDocs(query(collection(db, 'hubActiveUsers'), limit(500))).catch(() => null),
        getDocs(query(collection(db, 'privateChats'), limit(300))).catch(() => null),
        !propInstitutions ? getDocs(query(collection(db, 'institutions'), limit(400))).catch(() => null) : Promise.resolve(null),
        !propServices ? getDocs(query(collection(db, 'services'), limit(400))).catch(() => null) : Promise.resolve(null),
        !propAds ? getDocs(query(collection(db, 'advertisements'), limit(300))).catch(() => null) : Promise.resolve(null),
        getDocs(query(collection(db, 'communityMemberships'), limit(500))).catch(() => null)
      ]);

      if (visitorRes) setVisitors(visitorRes);
      if (prodsRes) setProducts(prodsRes);

      if (sellersSnap) {
        setSellers(
          sellersSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any)
          })) as SellerProfile[]
        );
      }

      if (agentsSnap) {
        setHouseAgents(
          agentsSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any)
          })) as HouseAgentProfile[]
        );
      }

      const accMap = new Map<string, { institutionId?: string }>();
      for (const d of huxSnap?.docs || []) {
        accMap.set(d.id, { institutionId: (d.data() as any)?.institutionId });
      }
      for (const d of accSnap?.docs || []) {
        accMap.set(d.id, { institutionId: (d.data() as any)?.institutionId });
      }
      setAccomItems(Array.from(accMap.values()));
      setAccomCount(propAccomCount !== undefined ? Math.max(propAccomCount, accMap.size) : accMap.size);

      const combinedPosts: Array<{ institutionId?: string }> = [];
      for (const d of studentPostsSnap?.docs || []) combinedPosts.push({ institutionId: (d.data() as any)?.institutionId });
      for (const d of genAnnSnap?.docs || []) combinedPosts.push({ institutionId: (d.data() as any)?.institutionId });
      for (const d of sportSnap?.docs || []) combinedPosts.push({ institutionId: (d.data() as any)?.institutionId });
      for (const d of reqSnap?.docs || []) combinedPosts.push({ institutionId: (d.data() as any)?.institutionId });
      setPostsItems(combinedPosts);
      setPostsCount(combinedPosts.length);

      const privMsgs = (privChatsSnap?.docs || []).reduce((acc, d) => {
        const data = d.data() as any;
        const c = Number(data?.messagesCount || 0);
        return acc + (c > 0 ? c : data?.lastMessageText || data?.lastMessageTime ? 1 : 0);
      }, 0);
      const totalMsgs = (hubMsgSnap?.size || 0) + privMsgs;
      setMessagesCount(propMessagesCount !== undefined ? Math.max(propMessagesCount, totalMsgs) : totalMsgs);

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const hubSet = new Set<string>();
      for (const d of hubActSnap?.docs || []) {
        const data = d.data() as any;
        const ts = Number(data?.lastActiveAt || 0);
        if (!ts || ts >= sevenDaysAgo) hubSet.add(String(data?.userId || d.id));
      }
      setActiveHubIds(hubSet);

      if (instSnap) {
        const map = new Map<string, Institution>();
        for (const inst of VERIFIED_NIGERIAN_INSTITUTIONS) map.set(inst.id, inst);
        for (const d of instSnap.docs) {
          const data = d.data() as any;
          map.set(d.id, { ...(map.get(d.id) || {}), ...data, id: data?.id || d.id } as Institution);
        }
        setInstitutions(Array.from(map.values()));
      }

      if (svcSnap) {
        setServices(svcSnap.docs.map((d) => ({ serviceId: d.id, ...(d.data() as any) })) as ServiceListing[]);
      }
      if (adSnap) {
        setAds(adSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Advertisement[]);
      }
      if (memSnap) {
        setMembershipsCount(Math.max(propMembershipsCount ?? 0, memSnap.size));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load full analytics snapshot.');
    } finally {
      setLoading(false);
    }
  }, [
    propVisitors,
    propProducts,
    propSellers,
    propHouseAgents,
    propInstitutions,
    propServices,
    propAds,
    propAccomCount,
    propMessagesCount,
    propMembershipsCount
  ]);

  useEffect(() => {
    loadFullAnalytics();
  }, [loadFullAnalytics]);

  // Derived real metrics
  const computed = useMemo(() => {
    const todayKey = getNigeriaDateKey(new Date());
    const monthPrefix = todayKey.slice(0, 7);
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const totalUsers = liveUsers.length;

    const sellerUserIds = new Set<string>();
    for (const u of liveUsers) {
      if (u.role === 'seller' || u.accountType === 'seller' || u.accountType === 'business_owner') {
        sellerUserIds.add(u.id);
      }
    }
    for (const s of sellers) {
      if (s.userId) sellerUserIds.add(s.userId);
      else sellerUserIds.add(s.id);
    }

    const totalSellers = sellerUserIds.size;
    const totalBuyers = liveUsers.filter((u) => u.role === 'buyer').length;
    const totalStudents = liveUsers.filter(
      (u) => u.accountType === 'student' || u.role === 'buyer'
    ).length;

    const agentIds = new Set<string>(houseAgents.map((h) => h.id));
    for (const u of liveUsers) {
      if (u.accountType === 'house_agent' || u.accountType === 'landlord') {
        agentIds.add(u.id);
      }
    }
    const totalAgents = agentIds.size;

    const activeIds = new Set<string>(activeHubIds);
    for (const u of liveUsers) {
      if (u.isSuspended) continue;
      const seenMs = u.lastSeenAt
        ? new Date(u.lastSeenAt).getTime()
        : typeof u.lastSeen === 'number'
        ? u.lastSeen
        : u.lastSeen
        ? new Date(u.lastSeen).getTime()
        : new Date(u.createdAt).getTime();
      if (!Number.isNaN(seenMs) && seenMs >= sevenDaysAgoMs) {
        activeIds.add(u.id);
      }
    }
    const totalActiveUsers = Math.max(propActiveUsersCount ?? 0, activeIds.size);

    let regToday = 0;
    let regThisWeek = 0;
    let regThisMonth = 0;
    for (const u of liveUsers) {
      const createdMs = new Date(u.createdAt).getTime();
      const dateKey = getNigeriaDateKey(u.createdAt);
      if (dateKey === todayKey) regToday += 1;
      if (!Number.isNaN(createdMs) && createdMs >= sevenDaysAgoMs) regThisWeek += 1;
      if (dateKey.startsWith(monthPrefix)) regThisMonth += 1;
    }

    const activeInstitutionsCount = institutions.filter((i) => i.status !== 'inactive').length;

    // User Growth Chart Buckets
    const growthBuckets: Array<{ label: string; key: string; count: number }> = [];
    if (chartPeriod === 'daily') {
      const countsMap = new Map<string, number>();
      for (const u of liveUsers) {
        const k = getNigeriaDateKey(u.createdAt);
        if (k) countsMap.set(k, (countsMap.get(k) || 0) + 1);
      }
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const k = getNigeriaDateKey(d);
        growthBuckets.push({ key: k, label: k.slice(5), count: countsMap.get(k) || 0 });
      }
    } else if (chartPeriod === 'weekly') {
      const countsMap = new Map<string, number>();
      for (const u of liveUsers) {
        const k = getNigeriaWeekStartKey(u.createdAt);
        if (k) countsMap.set(k, (countsMap.get(k) || 0) + 1);
      }
      for (let i = 7; i >= 0; i--) {
        const d = new Date(Date.now() - i * 7 * 86400000);
        const k = getNigeriaWeekStartKey(d);
        growthBuckets.push({ key: k, label: k.slice(5), count: countsMap.get(k) || 0 });
      }
    } else {
      const countsMap = new Map<string, number>();
      for (const u of liveUsers) {
        const k = getNigeriaDateKey(u.createdAt).slice(0, 7);
        if (k) countsMap.set(k, (countsMap.get(k) || 0) + 1);
      }
      const nowWat = new Date(Date.now() + 3600000);
      for (let i = 5; i >= 0; i--) {
        const dt = new Date(Date.UTC(nowWat.getUTCFullYear(), nowWat.getUTCMonth() - i, 1));
        const k = dt.toISOString().slice(0, 7);
        const label = dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        growthBuckets.push({ key: k, label, count: countsMap.get(k) || 0 });
      }
    }

    // Most Active Universities (combining users + products + posts + accommodations)
    const instMetaMap = new Map<string, Institution>();
    for (const inst of institutions) instMetaMap.set(inst.id, inst);

    const uniStats = new Map<
      string,
      { id: string; shortName: string; name: string; users: number; products: number; posts: number; accom: number; total: number }
    >();
    const bumpUni = (instIdRaw: string | undefined, field: 'users' | 'products' | 'posts' | 'accom') => {
      const instId = instIdRaw || DEFAULT_INSTITUTION_ID;
      const meta = instMetaMap.get(instId);
      const cur = uniStats.get(instId) || {
        id: instId,
        shortName: meta?.shortName || instId.toUpperCase(),
        name: meta?.name || instId,
        users: 0,
        products: 0,
        posts: 0,
        accom: 0,
        total: 0
      };
      cur[field] += 1;
      cur.total += 1;
      uniStats.set(instId, cur);
    };
    for (const u of liveUsers) bumpUni(u.institutionId, 'users');
    for (const p of products) bumpUni(p.institutionId, 'products');
    for (const post of postsItems) bumpUni(post.institutionId, 'posts');
    for (const acc of accomItems) bumpUni(acc.institutionId, 'accom');

    const topUniversities = Array.from(uniStats.values())
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Most Popular Marketplace Categories
    const catNameMap = new Map<string, string>();
    for (const c of DEFAULT_CATEGORIES) catNameMap.set(c.id, c.name);
    const catAgg = new Map<string, { id: string; name: string; count: number; views: number }>();
    for (const p of products) {
      const cid = p.categoryId || 'other';
      const cur = catAgg.get(cid) || {
        id: cid,
        name: catNameMap.get(cid) || cid.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        count: 0,
        views: 0
      };
      cur.count += 1;
      cur.views += Number(p.views || 0);
      catAgg.set(cid, cur);
    }
    const topCategories = Array.from(catAgg.values())
      .sort((a, b) => b.count - a.count || b.views - a.views)
      .slice(0, 8);

    // Marketplace Activity totals
    const totalProductViews = products.reduce((sum, p) => sum + Number(p.views || 0), 0);
    const totalWhatsappClicks = products.reduce((sum, p) => sum + Number(p.whatsappClicks || 0), 0);
    const totalAdImpressions = ads.reduce((sum, a) => sum + Number(a.impressions || 0), 0);
    const activeAdsCount = ads.filter((a) => a.status === 'active' && !a.isDeleted).length;
    const activeServicesCount = services.filter((s) => s.status === 'active').length;

    return {
      totalUsers,
      totalSellers,
      totalBuyers,
      totalStudents,
      totalAgents,
      totalActiveUsers,
      regToday,
      regThisWeek,
      regThisMonth,
      activeInstitutionsCount,
      growthBuckets,
      topUniversities,
      topCategories,
      totalProductViews,
      totalWhatsappClicks,
      totalAdImpressions,
      activeAdsCount,
      activeServicesCount
    };
  }, [liveUsers, sellers, houseAgents, products, institutions, postsItems, accomItems, ads, services, activeHubIds, propActiveUsersCount, chartPeriod]);

  const kpiCards = [
    {
      label: 'Total Website Visitors',
      value: visitors.totalUniqueVisitors.toLocaleString(),
      sub: `${visitors.totalVisits.toLocaleString()} total visits • ${visitors.todayUniqueVisitors} today`,
      icon: Globe,
      highlight: true
    },
    {
      label: 'Total Registered Users',
      value: computed.totalUsers.toLocaleString(),
      sub: 'Live database sync',
      icon: Users,
      highlight: true
    },
    {
      label: 'Total Active Users',
      value: computed.totalActiveUsers.toLocaleString(),
      sub: 'Active within 7 days',
      icon: Activity
    },
    {
      label: 'Total Students Registered',
      value: computed.totalStudents.toLocaleString(),
      sub: 'Verified student & buyer accounts',
      icon: GraduationCap
    },
    {
      label: 'Total Sellers',
      value: computed.totalSellers.toLocaleString(),
      sub: `${sellers.length} storefront profiles`,
      icon: Store
    },
    {
      label: 'Total Buyers',
      value: computed.totalBuyers.toLocaleString(),
      sub: 'Campus shoppers',
      icon: ShoppingBag
    },
    {
      label: 'Accommodation Agents',
      value: computed.totalAgents.toLocaleString(),
      sub: 'Verified agents & landlords',
      icon: Building2
    },
    {
      label: 'Total Products Posted',
      value: products.length.toLocaleString(),
      sub: `${products.filter((p) => p.status === 'active').length} active listings`,
      icon: Package
    },
    {
      label: 'Accommodation Listings',
      value: accomCount.toLocaleString(),
      sub: 'Hostels & self-contain rooms',
      icon: Home
    },
    {
      label: 'Total Posts Published',
      value: postsCount.toLocaleString(),
      sub: 'Hub posts, announcements & requests',
      icon: FileText
    },
    {
      label: 'Total Messages Sent',
      value: messagesCount.toLocaleString(),
      sub: 'Hub & private student chats',
      icon: MessageSquare
    },
    {
      label: 'Total University Groups',
      value: computed.activeInstitutionsCount.toLocaleString(),
      sub: `${membershipsCount.toLocaleString()} student group joins`,
      icon: UserCheck
    },
    {
      label: 'New Registrations Today',
      value: computed.regToday.toLocaleString(),
      sub: 'Nigeria WAT (UTC+1)',
      icon: UserPlus
    },
    {
      label: 'Registrations This Week',
      value: computed.regThisWeek.toLocaleString(),
      sub: 'Rolling 7-day window',
      icon: Calendar
    },
    {
      label: 'Registrations This Month',
      value: computed.regThisMonth.toLocaleString(),
      sub: 'Current calendar month',
      icon: TrendingUp
    }
  ];

  const maxGrowth = Math.max(1, ...computed.growthBuckets.map((b) => b.count));
  const visitorDays = visitors.daily.slice(-14);
  const maxVisitors = Math.max(1, ...visitorDays.map((d) => d.visits));
  const totalDeviceSum = Math.max(
    1,
    Object.values(visitors.byDevice || {}).reduce((a, b) => a + b, 0)
  );
  const maxUniScore = Math.max(1, ...computed.topUniversities.map((u) => u.total));
  const maxCatCount = Math.max(1, ...computed.topCategories.map((c) => c.count));

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#D9E5DF] p-8 flex flex-col items-center justify-center gap-3 text-xs font-bold text-[#10251D]">
        <Loader2 className="w-6 h-6 text-[#075B3B] animate-spin" />
        <span>Aggregating live NIGERIA CAMPUS MARKET statistics from database...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] text-xs font-semibold flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={loadFullAnalytics}
            className="px-3 py-1.5 rounded-lg bg-[#075B3B] text-white font-black text-[11px] inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#D9E5DF] shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#10251D] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#075B3B]" />
            <span>
              {mode === 'ceo' ? 'CEO Live Platform Overview & Analytics' : 'Live Platform Overview & Analytics'}
            </span>
          </h2>
          <p className="text-[11px] text-[#555555]">
            100% real-time database metrics across Nigerian universities &amp; polytechnics. Zero simulated numbers.
          </p>
        </div>
        <button
          type="button"
          onClick={loadFullAnalytics}
          className="px-3.5 py-2 rounded-xl bg-[#F4F8F5] hover:bg-[#075B3B] hover:text-white border border-[#D9E5DF] text-[#075B3B] text-xs font-black inline-flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Live Stats</span>
        </button>
      </div>

      {/* 15 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-2xl p-4 border shadow-xs transition ${
                card.highlight
                  ? 'bg-gradient-to-br from-[#10251D] to-[#075B3B] text-white border-[#075B3B]'
                  : 'bg-white text-[#10251D] border-[#E5E7EB]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider leading-snug ${
                    card.highlight ? 'text-white/85' : 'text-[#555555]'
                  }`}
                >
                  {card.label}
                </span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    card.highlight ? 'bg-[#D4A62A] text-[#10251D]' : 'bg-[#F4F8F5] text-[#075B3B]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p
                className={`text-2xl font-black mt-2 tabular-nums ${
                  card.highlight ? 'text-[#D4A62A]' : 'text-[#10251D]'
                }`}
              >
                {card.value}
              </p>
              <p
                className={`text-[11px] mt-1 truncate ${
                  card.highlight ? 'text-white/80' : 'text-[#6B7280]'
                }`}
              >
                {card.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1: User Growth & Website Visitor Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User Growth Chart */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-[#10251D]">User Growth Statistics</h3>
              <p className="text-[11px] text-[#555555]">
                New account registrations grouped by {chartPeriod} period
              </p>
            </div>
            <div className="inline-flex bg-[#F4F8F5] p-1 rounded-xl border border-[#D9E5DF] text-[11px] font-bold">
              {(['daily', 'weekly', 'monthly'] as ChartPeriod[]).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setChartPeriod(period)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                    chartPeriod === period
                      ? 'bg-[#075B3B] text-white'
                      : 'text-[#555555] hover:text-[#10251D]'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {computed.growthBuckets.every((b) => b.count === 0) ? (
            <div className="h-44 rounded-xl bg-[#F4F8F5] flex items-center justify-center text-xs text-[#555555]">
              No registrations recorded in this window yet.
            </div>
          ) : (
            <div className="pt-2">
              <svg
                viewBox={`0 0 ${computed.growthBuckets.length * 42} 170`}
                className="w-full h-44 overflow-visible"
                role="img"
                aria-label="User growth bar chart"
              >
                {computed.growthBuckets.map((bucket, idx) => {
                  const barHeight = Math.round((bucket.count / maxGrowth) * 115);
                  const x = idx * 42 + 8;
                  const y = 135 - barHeight;
                  return (
                    <g key={bucket.key}>
                      <title>{`${bucket.key}: ${bucket.count} user(s)`}</title>
                      <rect
                        x={x}
                        y={Math.max(12, y)}
                        width={26}
                        height={Math.max(4, barHeight)}
                        rx={6}
                        fill={bucket.count > 0 ? '#075B3B' : '#E5E7EB'}
                      />
                      {bucket.count > 0 && (
                        <text
                          x={x + 13}
                          y={Math.max(10, y - 4)}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="800"
                          fill="#10251D"
                        >
                          {bucket.count}
                        </text>
                      )}
                      <text
                        x={x + 13}
                        y={155}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fill="#6B7280"
                      >
                        {bucket.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Website Visitor Trends + Device Breakdown */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-[#10251D]">Website Visitor Trends (14 Days)</h3>
              <p className="text-[11px] text-[#555555]">
                Persisted visits &amp; visitor device breakdown
              </p>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-[#F4F8F5] text-[#075B3B] border border-[#D9E5DF]">
              Today: {visitors.todayVisits} visits
            </span>
          </div>

          {visitorDays.length === 0 ? (
            <div className="h-32 rounded-xl bg-[#F4F8F5] flex items-center justify-center text-xs text-[#555555]">
              Visitor telemetry will populate automatically as students visit the platform.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${visitorDays.length * 42} 145`}
              className="w-full h-36 overflow-visible"
              role="img"
              aria-label="Website visitor daily chart"
            >
              {visitorDays.map((day, idx) => {
                const barH = Math.round((day.visits / maxVisitors) * 90);
                const x = idx * 42 + 8;
                const y = 112 - barH;
                return (
                  <g key={day.dateKey}>
                    <title>{`${day.dateKey}: ${day.visits} visits (${day.uniqueVisitors} unique)`}</title>
                    <rect
                      x={x}
                      y={Math.max(12, y)}
                      width={26}
                      height={Math.max(4, barH)}
                      rx={6}
                      fill={day.visits > 0 ? '#D4A62A' : '#E5E7EB'}
                    />
                    {day.visits > 0 && (
                      <text
                        x={x + 13}
                        y={Math.max(10, y - 4)}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="800"
                        fill="#10251D"
                      >
                        {day.visits}
                      </text>
                    )}
                    <text
                      x={x + 13}
                      y={132}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#6B7280"
                    >
                      {day.dateKey.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Device breakdown pills/bars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E5E7EB]">
            {[
              { key: 'android', label: 'Android', icon: Smartphone, count: visitors.byDevice?.android || 0 },
              { key: 'iphone', label: 'iPhone', icon: Smartphone, count: visitors.byDevice?.iphone || 0 },
              { key: 'ipad', label: 'iPad', icon: Tablet, count: visitors.byDevice?.ipad || 0 },
              { key: 'desktop', label: 'Desktop', icon: Laptop, count: visitors.byDevice?.desktop || 0 }
            ].map((dev) => {
              const Icon = dev.icon;
              const pct = Math.round((dev.count / totalDeviceSum) * 100);
              return (
                <div key={dev.key} className="p-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] text-xs">
                  <div className="flex items-center justify-between text-[#10251D] font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Icon className="w-3.5 h-3.5 text-[#075B3B]" />
                      {dev.label}
                    </span>
                    <span className="tabular-nums">{dev.count}</span>
                  </div>
                  <div className="h-1.5 bg-white rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[#075B3B] rounded-full"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Most Active Universities & Most Popular Marketplace Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Most Active Universities */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#10251D]">Most Active Universities &amp; Polytechnics</h3>
            <p className="text-[11px] text-[#555555]">
              Ranked by combined registered students, product listings, posts, and hostels
            </p>
          </div>
          {computed.topUniversities.length === 0 ? (
            <p className="text-xs text-[#555555] py-6 text-center bg-[#F4F8F5] rounded-xl">
              No institution activity recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {computed.topUniversities.map((uni) => {
                const widthPct = Math.max(8, Math.round((uni.total / maxUniScore) * 100));
                return (
                  <div key={uni.id} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-[#10251D] truncate">
                        {uni.shortName}{' '}
                        <span className="font-normal text-[#555555]">— {uni.name}</span>
                      </span>
                      <span className="font-black text-[#075B3B] tabular-nums shrink-0">
                        {uni.total} total
                      </span>
                    </div>
                    <div className="h-2.5 bg-[#F4F8F5] rounded-full overflow-hidden border border-[#E5E7EB]">
                      <div
                        className="h-full bg-gradient-to-r from-[#075B3B] to-[#D4A62A] rounded-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#6B7280]">
                      {uni.users} users • {uni.products} products • {uni.posts} posts • {uni.accom} hostels
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Most Popular Marketplace Categories */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#10251D]">Most Popular Marketplace Categories</h3>
            <p className="text-[11px] text-[#555555]">
              Ranked by live listings posted and cumulative product views
            </p>
          </div>
          {computed.topCategories.length === 0 ? (
            <p className="text-xs text-[#555555] py-6 text-center bg-[#F4F8F5] rounded-xl">
              No product categories populated yet.
            </p>
          ) : (
            <div className="space-y-3">
              {computed.topCategories.map((cat) => {
                const widthPct = Math.max(8, Math.round((cat.count / maxCatCount) * 100));
                return (
                  <div key={cat.id} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#10251D] truncate">{cat.name}</span>
                      <span className="text-[11px] font-black text-[#075B3B] tabular-nums shrink-0">
                        {cat.count} items · {cat.views.toLocaleString()} views
                      </span>
                    </div>
                    <div className="h-2.5 bg-[#F4F8F5] rounded-full overflow-hidden border border-[#E5E7EB]">
                      <div
                        className="h-full bg-[#075B3B] rounded-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Total Marketplace Activity Summary Strip */}
      <div className="bg-[#10251D] text-white rounded-2xl p-5 border-b-4 border-[#D4A62A] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
        <div>
          <span className="text-white/75 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-[#D4A62A]" />
            Product Views
          </span>
          <strong className="text-lg font-black text-white tabular-nums mt-1 block">
            {computed.totalProductViews.toLocaleString()}
          </strong>
        </div>
        <div>
          <span className="text-white/75 flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
            WhatsApp Leads
          </span>
          <strong className="text-lg font-black text-[#D4A62A] tabular-nums mt-1 block">
            {computed.totalWhatsappClicks.toLocaleString()}
          </strong>
        </div>
        <div>
          <span className="text-white/75 block">Live Sponsored Ads</span>
          <strong className="text-lg font-black text-white tabular-nums mt-1 block">
            {computed.activeAdsCount.toLocaleString()}
          </strong>
        </div>
        <div>
          <span className="text-white/75 block">Ad Impressions</span>
          <strong className="text-lg font-black text-white tabular-nums mt-1 block">
            {computed.totalAdImpressions.toLocaleString()}
          </strong>
        </div>
        <div>
          <span className="text-white/75 block">Active Services</span>
          <strong className="text-lg font-black text-white tabular-nums mt-1 block">
            {computed.activeServicesCount.toLocaleString()}
          </strong>
        </div>
        <div>
          <span className="text-white/75 block">Pending Reports</span>
          <strong className="text-lg font-black text-[#D4A62A] tabular-nums mt-1 block">
            {pendingReportsCount.toLocaleString()}
          </strong>
        </div>
      </div>
    </div>
  );
};
