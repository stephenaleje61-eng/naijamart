import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Copy,
  Gift,
  Percent,
  PlusCircle,
  Share2,
  Sparkles,
  Trophy,
  UserPlus,
  Users
} from 'lucide-react';
import {
  AmbassadorApplication,
  CampusBookListing,
  CampusJobListing,
  Institution,
  Product,
  ReferralRecord,
  StudentDeal,
  StudentGiveaway
} from '../types.js';
import {
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  belongsToInstitution,
  getInstitutionById
} from '../constants/institutions.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import {
  enterStudentGiveaway,
  getUserReferralCode,
  saveCampusBook,
  saveCampusJob,
  saveStudentDeal,
  saveStudentGiveaway,
  submitAmbassadorApplication,
  submitReferralClaim,
  subscribeToAmbassadorApplications,
  subscribeToCampusBooks,
  subscribeToCampusJobs,
  subscribeToStudentDeals,
  subscribeToStudentGiveaways,
  subscribeToUserReferrals
} from '../services/campusEcosystem.js';

export type OpportunitiesTab =
  | 'jobs'
  | 'books'
  | 'deals'
  | 'giveaways'
  | 'referrals'
  | 'ambassadors'
  | 'leaderboards';

interface StudentOpportunitiesHubPageProps {
  initialTab?: OpportunitiesTab;
  selectedInstitutionId?: string;
  institutions?: Institution[];
  products?: Product[];
  onBackToHome: () => void;
  onSelectInstitution?: (id: string) => void;
  onOpenAuth?: () => void;
}

export const StudentOpportunitiesHubPage: React.FC<StudentOpportunitiesHubPageProps> = ({
  initialTab = 'jobs',
  selectedInstitutionId = DEFAULT_INSTITUTION_ID,
  institutions = VERIFIED_NIGERIAN_INSTITUTIONS,
  products = [],
  onBackToHome,
  onSelectInstitution,
  onOpenAuth
}) => {
  const { user, firebaseUser } = useAuth();
  const currentUid = firebaseUser?.uid || user?.id;

  const [activeTab, setActiveTab] = useState<OpportunitiesTab>(initialTab);
  const [jobs, setJobs] = useState<CampusJobListing[]>([]);
  const [books, setBooks] = useState<CampusBookListing[]>([]);
  const [deals, setDeals] = useState<StudentDeal[]>([]);
  const [giveaways, setGiveaways] = useState<StudentGiveaway[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [ambassadors, setAmbassadors] = useState<AmbassadorApplication[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Forms
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobType, setJobType] = useState<CampusJobListing['jobType']>('Internship');
  const [jobPay, setJobPay] = useState('');
  const [jobContact, setJobContact] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  const [showBookForm, setShowBookForm] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookCode, setBookCode] = useState('');
  const [bookDept, setBookDept] = useState('');
  const [bookType, setBookType] = useState<CampusBookListing['materialType']>('Past Question');
  const [bookPrice, setBookPrice] = useState('0');
  const [bookUrl, setBookUrl] = useState('');
  const [bookDesc, setBookDesc] = useState('');

  const [showDealForm, setShowDealForm] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealBiz, setDealBiz] = useState('');
  const [dealBadge, setDealBadge] = useState('20% Student Off');
  const [dealCode, setDealCode] = useState('');
  const [dealExpiry, setDealExpiry] = useState('');
  const [dealContact, setDealContact] = useState('');

  const [showGiveawayForm, setShowGiveawayForm] = useState(false);
  const [givTitle, setGivTitle] = useState('');
  const [givPrize, setGivPrize] = useState('');
  const [givEnd, setGivEnd] = useState('');

  const [referralClaimUid, setReferralClaimUid] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const [ambPhone, setAmbPhone] = useState(user?.phone || '');
  const [ambDept, setAmbDept] = useState(user?.department || '');
  const [ambLevel, setAmbLevel] = useState('200L');
  const [ambMotivation, setAmbMotivation] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const u1 = subscribeToCampusJobs(setJobs);
    const u2 = subscribeToCampusBooks(setBooks);
    const u3 = subscribeToStudentDeals(setDeals);
    const u4 = subscribeToStudentGiveaways(setGiveaways);
    const u5 = subscribeToAmbassadorApplications(setAmbassadors);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, []);

  useEffect(() => {
    return subscribeToUserReferrals(currentUid, setReferrals);
  }, [currentUid]);

  const currentInst = useMemo(
    () => getInstitutionById(selectedInstitutionId, institutions),
    [selectedInstitutionId, institutions]
  );

  const myReferralCode = currentUid ? getUserReferralCode(currentUid) : 'SIGN-IN-FIRST';

  const scopedJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.status === 'active' &&
          (selectedInstitutionId === 'all' ||
            j.isNationwide ||
            belongsToInstitution(j.institutionId, selectedInstitutionId))
      ),
    [jobs, selectedInstitutionId]
  );

  const scopedBooks = useMemo(
    () =>
      books.filter(
        (b) =>
          b.status === 'active' &&
          (selectedInstitutionId === 'all' ||
            belongsToInstitution(b.institutionId, selectedInstitutionId))
      ),
    [books, selectedInstitutionId]
  );

  const scopedDeals = useMemo(
    () =>
      deals.filter(
        (d) =>
          d.status === 'active' &&
          (selectedInstitutionId === 'all' ||
            d.isNationwide ||
            belongsToInstitution(d.institutionId, selectedInstitutionId))
      ),
    [deals, selectedInstitutionId]
  );

  const scopedGiveaways = useMemo(
    () =>
      giveaways.filter(
        (g) =>
          selectedInstitutionId === 'all' ||
          g.isNationwide ||
          belongsToInstitution(g.institutionId, selectedInstitutionId)
      ),
    [giveaways, selectedInstitutionId]
  );

  // Genuine University Leaderboards derived ONLY from actual database records
  const universityLeaderboard = useMemo(() => {
    const counts = new Map<
      string,
      { institution: Institution; productCount: number; totalViews: number; sellers: Set<string> }
    >();
    for (const p of products) {
      if (p.status !== 'active') continue;
      const inst = getInstitutionById(p.institutionId || DEFAULT_INSTITUTION_ID, institutions);
      const entry = counts.get(inst.id) || {
        institution: inst,
        productCount: 0,
        totalViews: 0,
        sellers: new Set<string>()
      };
      entry.productCount += 1;
      entry.totalViews += Number(p.views || 0);
      if (p.sellerId) entry.sellers.add(p.sellerId);
      counts.set(inst.id, entry);
    }
    return Array.from(counts.values())
      .map((item) => ({
        institution: item.institution,
        productCount: item.productCount,
        totalViews: item.totalViews,
        sellerCount: item.sellers.size
      }))
      .sort((a, b) => b.productCount - a.productCount || b.totalViews - a.totalViews)
      .slice(0, 15);
  }, [products, institutions]);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) {
      onOpenAuth?.();
      return;
    }
    await saveCampusJob({
      posterUid: currentUid,
      posterName: user?.name || 'Member',
      companyOrOrg: jobCompany.trim(),
      title: jobTitle.trim(),
      jobType,
      institutionId:
        selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId,
      isNationwide: selectedInstitutionId === 'all',
      location: currentInst.location,
      compensation: jobPay.trim() || 'Competitive Stipend',
      description: jobDesc.trim(),
      requirements: 'Student or fresh graduate',
      applicationLinkOrContact: jobContact.trim(),
      status: 'active'
    });
    setShowJobForm(false);
    setJobTitle('');
    setJobCompany('');
    setJobDesc('');
    setNotice('Job / Internship opportunity posted.');
  };

  const handlePostBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) {
      onOpenAuth?.();
      return;
    }
    const price = Math.max(0, Math.round(Number(bookPrice) || 0));
    await saveCampusBook({
      uploaderUid: currentUid,
      uploaderName: user?.name || 'Student',
      title: bookTitle.trim(),
      courseCode: bookCode.trim().toUpperCase(),
      department: bookDept.trim() || 'General Studies',
      level: 'All Levels',
      materialType: bookType,
      institutionId:
        selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId,
      isFree: price === 0,
      priceNaira: price,
      description: bookDesc.trim() || 'Campus study resource.',
      fileOrPreviewUrl: bookUrl.trim() || undefined,
      contactPhone: user?.phone || user?.whatsappNumber,
      status: 'active'
    });
    setShowBookForm(false);
    setBookTitle('');
    setBookCode('');
    setBookDesc('');
    setNotice('Book / Study material published.');
  };

  const handlePostDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) {
      onOpenAuth?.();
      return;
    }
    await saveStudentDeal({
      creatorUid: currentUid,
      businessName: dealBiz.trim(),
      title: dealTitle.trim(),
      discountBadge: dealBadge.trim(),
      category: 'Campus Deal',
      institutionId:
        selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId,
      isNationwide: selectedInstitutionId === 'all',
      promoCode: dealCode.trim().toUpperCase() || undefined,
      description: `Student discount offer by ${dealBiz.trim()}`,
      claimContact: dealContact.trim(),
      expiryDate: dealExpiry || '2026-12-31',
      status: 'active'
    });
    setShowDealForm(false);
    setDealTitle('');
    setDealBiz('');
    setNotice('Student deal published.');
  };

  const handlePostGiveaway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) {
      onOpenAuth?.();
      return;
    }
    await saveStudentGiveaway({
      hostUid: currentUid,
      hostName: user?.name || 'Campus Host',
      title: givTitle.trim(),
      prizeDescription: givPrize.trim(),
      institutionId:
        selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId,
      isNationwide: selectedInstitutionId === 'all',
      eligibility: 'Registered Nigerian Campus Students',
      endDate: givEnd || '2026-12-31',
      participantUids: [],
      status: 'open'
    });
    setShowGiveawayForm(false);
    setGivTitle('');
    setGivPrize('');
    setNotice('Student giveaway launched.');
  };

  const handleClaimReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !user?.email) {
      onOpenAuth?.();
      return;
    }
    try {
      const rec = await submitReferralClaim({
        referrerUid: referralClaimUid.trim(),
        referralCode: `NCM-${referralClaimUid.trim().slice(0, 6).toUpperCase()}`,
        referredUid: currentUid,
        referredEmail: user.email,
        referredName: user.name,
        institutionId: selectedInstitutionId
      });
      setNotice(
        rec.status === 'flagged_abuse'
          ? `Referral logged and queued for CEO review (${rec.flagReason}).`
          : 'Referral verified! +100 campus points awarded.'
      );
      setReferralClaimUid('');
    } catch (err: any) {
      setNotice(err?.message || 'Referral could not be applied.');
    }
  };

  const handleApplyAmbassador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !user?.email) {
      onOpenAuth?.();
      return;
    }
    await submitAmbassadorApplication({
      userUid: currentUid,
      fullName: user.name,
      email: user.email,
      phone: ambPhone.trim(),
      whatsapp: ambPhone.trim(),
      institutionId:
        selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId,
      department: ambDept.trim(),
      level: ambLevel.trim(),
      motivation: ambMotivation.trim()
    });
    setAmbMotivation('');
    setNotice('Campus Ambassador application submitted for CEO review!');
  };

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#10251D] pb-16">
      <div className="bg-[#087443] border-b-4 border-[#D4A62A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90 hover:text-[#D4A62A] mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
            Student Services, Opportunities &amp; Campus Growth
          </h1>
          <p className="text-xs sm:text-sm text-white/90 mt-1">
            Jobs &amp; SIWES, Books &amp; Past Questions, Student Deals, Giveaways, Referrals, Campus Ambassadors, and Live University Leaderboards.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { id: 'jobs', label: 'Jobs & Internships', icon: Briefcase },
              { id: 'books', label: 'Books & Past Questions', icon: BookOpen },
              { id: 'deals', label: 'Student Deals', icon: Percent },
              { id: 'giveaways', label: 'Giveaways', icon: Gift },
              { id: 'referrals', label: 'Referral Rewards', icon: Share2 },
              { id: 'ambassadors', label: 'Ambassadors', icon: Award },
              { id: 'leaderboards', label: 'Campus Leaderboards', icon: Trophy }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as OpportunitiesTab)}
                  className={`px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-[#D4A62A] text-[#10251D]'
                      : 'bg-white/10 text-white hover:bg-white/20'
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {notice && (
          <div className="p-3.5 bg-white border-2 border-[#087443] rounded-2xl text-xs font-bold text-[#087443] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* JOBS & INTERNSHIPS */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black">
                Jobs, SIWES &amp; Campus Internships ({scopedJobs.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowJobForm((v) => !v)}
                className="px-4 py-2 bg-[#087443] text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-[#D4A62A]" />
                <span>Post Job / SIWES</span>
              </button>
            </div>

            {showJobForm && (
              <form onSubmit={handlePostJob} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job / Internship Title *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input required value={jobCompany} onChange={(e) => setJobCompany(e.target.value)} placeholder="Company or Campus Org *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <select value={jobType} onChange={(e) => setJobType(e.target.value as any)} className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl">
                  <option value="Internship">Internship</option>
                  <option value="SIWES">SIWES Placement</option>
                  <option value="Part-time">Part-time Campus Job</option>
                  <option value="Freelance">Freelance / Gig</option>
                  <option value="Remote">Remote Role</option>
                  <option value="Campus Rep">Campus Ambassador / Rep</option>
                </select>
                <input value={jobPay} onChange={(e) => setJobPay(e.target.value)} placeholder="Monthly Pay / Stipend (e.g. ₦45,000)" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input required value={jobContact} onChange={(e) => setJobContact(e.target.value)} placeholder="Application Link / Email / WhatsApp *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl sm:col-span-2" />
                <textarea required rows={2} value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} placeholder="Role description & student requirements *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl sm:col-span-2" />
                <button type="submit" className="sm:col-span-2 py-2.5 bg-[#D4A62A] text-[#10251D] font-black rounded-xl">Publish Opportunity</button>
              </form>
            )}

            {scopedJobs.length === 0 ? (
              <div className="bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center text-xs text-[#556B60]">
                No jobs or SIWES listings posted for this campus yet. Employers &amp; student orgs can publish verified opportunities above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scopedJobs.map((j) => (
                  <div key={j.id} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A]">{j.jobType}</span>
                        <h3 className="font-bold text-sm mt-1">{j.title}</h3>
                        <p className="text-xs text-[#087443] font-bold">{j.companyOrOrg} &bull; {j.location}</p>
                      </div>
                      <span className="text-xs font-black text-[#10251D]">{j.compensation}</span>
                    </div>
                    <p className="text-xs text-[#374B41]">{j.description}</p>
                    <div className="pt-2 border-t border-[#D8E5DD] text-xs font-bold text-[#087443]">
                      Apply: {j.applicationLinkOrContact}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOKS & STUDY MATERIALS */}
        {activeTab === 'books' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black">
                Books, Handouts &amp; Past Questions ({scopedBooks.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowBookForm((v) => !v)}
                className="px-4 py-2 bg-[#087443] text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-[#D4A62A]" />
                <span>Share Book / Material</span>
              </button>
            </div>

            {showBookForm && (
              <form onSubmit={handlePostBook} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input required value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="Book or Past Question Title *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input value={bookCode} onChange={(e) => setBookCode(e.target.value)} placeholder="Course Code (e.g. MTH 101)" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input required value={bookDept} onChange={(e) => setBookDept(e.target.value)} placeholder="Department *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <select value={bookType} onChange={(e) => setBookType(e.target.value as any)} className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl">
                  <option value="Past Question">Past Question</option>
                  <option value="Textbook">Textbook</option>
                  <option value="Lecture Note">Lecture Note</option>
                  <option value="Handout">Handout</option>
                  <option value="Lab Manual">Lab Manual</option>
                </select>
                <input type="number" min={0} value={bookPrice} onChange={(e) => setBookPrice(e.target.value)} placeholder="Price in ₦ (0 for Free)" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input value={bookUrl} onChange={(e) => setBookUrl(e.target.value)} placeholder="Google Drive / PDF link (optional)" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <textarea rows={2} value={bookDesc} onChange={(e) => setBookDesc(e.target.value)} placeholder="Condition / pickup / course notes" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl sm:col-span-2" />
                <button type="submit" className="sm:col-span-2 py-2.5 bg-[#D4A62A] text-[#10251D] font-black rounded-xl">Publish Study Material</button>
              </form>
            )}

            {scopedBooks.length === 0 ? (
              <div className="bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center text-xs text-[#556B60]">
                No books or past questions shared here yet. Upload free lecture notes or list used textbooks for fellow students.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scopedBooks.map((b) => (
                  <div key={b.id} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-black text-[#087443]">{b.materialType} {b.courseCode ? `• ${b.courseCode}` : ''}</span>
                      <span className="px-2 py-0.5 rounded bg-[#F4F8F5] font-black">{b.isFree ? 'FREE' : formatNaira(b.priceNaira)}</span>
                    </div>
                    <h3 className="font-bold text-sm">{b.title}</h3>
                    <p className="text-xs text-[#556B60]">{b.department} &bull; Shared by {b.uploaderName}</p>
                    <p className="text-xs text-[#374B41]">{b.description}</p>
                    {b.fileOrPreviewUrl && (
                      <a href={b.fileOrPreviewUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-black text-[#087443] underline">
                        Open Study Resource
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STUDENT DEALS */}
        {activeTab === 'deals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black">Student Deals &amp; Discounts ({scopedDeals.length})</h2>
              <button
                type="button"
                onClick={() => setShowDealForm((v) => !v)}
                className="px-4 py-2 bg-[#087443] text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-[#D4A62A]" />
                <span>Add Student Deal</span>
              </button>
            </div>
            {showDealForm && (
              <form onSubmit={handlePostDeal} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input required value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} placeholder="Deal Headline *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input required value={dealBiz} onChange={(e) => setDealBiz(e.target.value)} placeholder="Business / Vendor Name *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input required value={dealBadge} onChange={(e) => setDealBadge(e.target.value)} placeholder="Discount (e.g. 15% OFF)" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input value={dealCode} onChange={(e) => setDealCode(e.target.value)} placeholder="Promo Code (Optional)" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input required value={dealContact} onChange={(e) => setDealContact(e.target.value)} placeholder="WhatsApp / Shop Location to Claim *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input type="date" value={dealExpiry} onChange={(e) => setDealExpiry(e.target.value)} className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <button type="submit" className="sm:col-span-2 py-2.5 bg-[#D4A62A] text-[#10251D] font-black rounded-xl">Publish Student Deal</button>
              </form>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scopedDeals.length === 0 ? (
                <div className="md:col-span-3 bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center text-xs text-[#556B60]">
                  No active student deals listed yet. Vendors can publish exclusive student discount codes above.
                </div>
              ) : (
                scopedDeals.map((d) => (
                  <div key={d.id} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded bg-[#D4A62A] text-[#10251D] text-xs font-black">{d.discountBadge}</span>
                    <h3 className="font-bold text-sm">{d.title}</h3>
                    <p className="text-xs text-[#087443] font-bold">{d.businessName}</p>
                    {d.promoCode && (
                      <div className="p-2 bg-[#F4F8F5] rounded-lg text-xs font-black">Code: {d.promoCode}</div>
                    )}
                    <div className="text-[11px] text-[#556B60]">Claim: {d.claimContact} &bull; Expires: {d.expiryDate}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* GIVEAWAYS */}
        {activeTab === 'giveaways' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black">Student Giveaways ({scopedGiveaways.length})</h2>
              <button
                type="button"
                onClick={() => setShowGiveawayForm((v) => !v)}
                className="px-4 py-2 bg-[#087443] text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-[#D4A62A]" />
                <span>Launch Giveaway</span>
              </button>
            </div>
            {showGiveawayForm && (
              <form onSubmit={handlePostGiveaway} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input required value={givTitle} onChange={(e) => setGivTitle(e.target.value)} placeholder="Giveaway Title *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input required value={givPrize} onChange={(e) => setGivPrize(e.target.value)} placeholder="Prize (e.g. Data Bundle / Books) *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <input type="date" value={givEnd} onChange={(e) => setGivEnd(e.target.value)} className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <button type="submit" className="sm:col-span-3 py-2.5 bg-[#D4A62A] text-[#10251D] font-black rounded-xl">Publish Giveaway</button>
              </form>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scopedGiveaways.length === 0 ? (
                <div className="md:col-span-2 bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center text-xs text-[#556B60]">
                  No active giveaways at the moment. Brands and student unions can launch giveaways here.
                </div>
              ) : (
                scopedGiveaways.map((g) => {
                  const joined = Boolean(currentUid && g.participantUids.includes(currentUid));
                  return (
                    <div key={g.id} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-[#087443] uppercase">{g.status}</span>
                        <span className="text-[#556B60] tabular-nums">{g.participantUids.length} entries</span>
                      </div>
                      <h3 className="font-bold text-sm">{g.title}</h3>
                      <p className="text-xs text-[#374B41]">Prize: {g.prizeDescription}</p>
                      <button
                        type="button"
                        disabled={joined || g.status !== 'open'}
                        onClick={() => (currentUid ? enterStudentGiveaway(g, currentUid) : onOpenAuth?.())}
                        className="px-4 py-2 bg-[#087443] disabled:bg-[#F4F8F5] disabled:text-[#556B60] text-white text-xs font-black rounded-xl"
                      >
                        {joined ? 'Entry Recorded' : 'Enter Giveaway'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* REFERRALS */}
        {activeTab === 'referrals' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-4">
              <h2 className="font-display text-lg font-black flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#087443]" />
                <span>Your Referral Invite Code</span>
              </h2>
              <div className="p-4 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-[#556B60]">YOUR REFERRAL ID</div>
                  <div className="text-lg font-black text-[#087443]">{currentUid || 'Sign in to view ID'}</div>
                  <div className="text-xs font-bold text-[#10251D]">Code: {myReferralCode}</div>
                </div>
                {currentUid && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(currentUid);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-3 py-2 bg-[#087443] text-white text-xs font-black rounded-xl inline-flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Copied' : 'Copy ID'}</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleClaimReferral} className="space-y-2 text-xs">
                <label className="font-black block">Were you invited by a friend? Enter their Referrer User ID:</label>
                <div className="flex gap-2">
                  <input
                    required
                    value={referralClaimUid}
                    onChange={(e) => setReferralClaimUid(e.target.value)}
                    placeholder="Referrer User ID"
                    className="flex-1 p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl"
                  />
                  <button type="submit" className="px-4 py-2.5 bg-[#D4A62A] text-[#10251D] font-black rounded-xl">
                    Verify &amp; Claim
                  </button>
                </div>
                <p className="text-[11px] text-[#556B60]">
                  Protected by server-side anti-abuse verification (blocks self-referrals &amp; duplicate claims).
                </p>
              </form>
            </div>

            <div className="bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-base font-black">
                Verified Referrals ({referrals.filter((r) => r.status === 'verified').length})
              </h3>
              {referrals.length === 0 ? (
                <p className="text-xs text-[#556B60]">No referrals recorded yet.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {referrals.map((r) => (
                    <div key={r.id} className="p-3 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl flex justify-between">
                      <span className="font-bold">{r.referredName}</span>
                      <span className="font-black text-[#087443]">+{r.rewardPoints} pts ({r.status})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AMBASSADORS */}
        {activeTab === 'ambassadors' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-3">
              <h2 className="font-display text-lg font-black flex items-center gap-2">
                <Award className="w-5 h-5 text-[#087443]" />
                <span>Apply as Campus Ambassador</span>
              </h2>
              <form onSubmit={handleApplyAmbassador} className="space-y-3 text-xs">
                <input required value={ambPhone} onChange={(e) => setAmbPhone(e.target.value)} placeholder="Phone / WhatsApp Number *" className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                  <input required value={ambDept} onChange={(e) => setAmbDept(e.target.value)} placeholder="Department *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                  <input required value={ambLevel} onChange={(e) => setAmbLevel(e.target.value)} placeholder="Level (e.g. 200L) *" className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                </div>
                <textarea required rows={3} value={ambMotivation} onChange={(e) => setAmbMotivation(e.target.value)} placeholder="Why do you want to represent NIGERIA CAMPUS MARKET on your campus?" className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <button type="submit" className="w-full py-2.5 bg-[#087443] text-white font-black rounded-xl">Submit Ambassador Application</button>
              </form>
            </div>

            <div className="bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-base font-black">Approved Campus Ambassadors</h3>
              {ambassadors.filter((a) => a.status === 'approved').length === 0 ? (
                <p className="text-xs text-[#556B60]">Ambassador applications are reviewed and approved in the CEO Control Centre.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {ambassadors
                    .filter((a) => a.status === 'approved')
                    .map((a) => (
                      <div key={a.id} className="p-3 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl flex justify-between">
                        <div>
                          <div className="font-black">{a.fullName}</div>
                          <div className="text-[#556B60]">{getInstitutionById(a.institutionId, institutions).shortName} &bull; {a.department}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A] font-black self-center">APPROVED</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEADERBOARDS */}
        {activeTab === 'leaderboards' && (
          <div className="bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-black flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#D4A62A]" />
                  <span>Live University &amp; Polytechnic Leaderboards</span>
                </h2>
                <p className="text-xs text-[#556B60]">Ranked strictly by active verified marketplace listings and real campus engagement.</p>
              </div>
            </div>
            {universityLeaderboard.length === 0 ? (
              <p className="text-xs text-[#556B60]">Leaderboard will rank campuses automatically as listings go live.</p>
            ) : (
              <div className="divide-y divide-[#D8E5DD]">
                {universityLeaderboard.map((row, idx) => (
                  <div key={row.institution.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#087443] text-[#D4A62A] font-black flex items-center justify-center shrink-0 tabular-nums">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-[#10251D] truncate">{row.institution.name}</div>
                        <div className="text-[#556B60]">{row.institution.state} &bull; {row.sellerCount} seller(s)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      <span className="font-black text-[#087443]">{row.productCount} listings</span>
                      {onSelectInstitution && (
                        <button
                          type="button"
                          onClick={() => onSelectInstitution(row.institution.id)}
                          className="px-3 py-1.5 bg-[#F4F8F5] hover:bg-[#087443] hover:text-white border border-[#D8E5DD] rounded-lg font-bold"
                        >
                          Visit Campus
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
