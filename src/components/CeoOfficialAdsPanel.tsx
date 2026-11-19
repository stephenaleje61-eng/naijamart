import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  FileCheck2,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  Megaphone,
  PauseCircle,
  Pin,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  Video,
  X
} from 'lucide-react';
import {
  AdPackageId,
  AdPlacement,
  AdType,
  AdVisibilityScope,
  Advertisement,
  AdvertisingRequest
} from '../types.js';
import {
  AD_PLACEMENT_OPTIONS,
  AD_TYPE_OPTIONS,
  ADVERTISING_PACKAGES,
  AUDIENCE_SCOPE_OPTIONS,
  BUSINESS_CATEGORIES,
  adminApproveAndActivateAd,
  adminUpdateAdRequestStatus,
  adminUpdateAdvertisement,
  adminVerifyAdPayment,
  ceoCreateOfficialAd,
  ceoDeleteOfficialAd,
  ceoUpdateOfficialAd,
  computeAdAnalyticsSummary,
  getAdTypeLabel,
  getAudienceScopeLabel,
  isAdExpired
} from '../services/ads.js';
import { uploadAdLogoImage, uploadAdvertisementImage } from '../services/imageStorage.js';
import {
  DEFAULT_INSTITUTION_CAMPUS,
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  getInstitutionById
} from '../constants/institutions.js';
import { ALL_MARKETPLACE_CATEGORIES } from '../constants/categories.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';
import { SponsoredAdCard } from './SponsoredAdCard.js';
import { formatNaira } from './ProductCard.js';
import { auth } from '../services/firebase.js';

type PanelTab = 'manage' | 'create' | 'analytics';

interface CeoOfficialAdsPanelProps {
  ads: Advertisement[];
  requests?: AdvertisingRequest[];
  initialMode?: PanelTab;
  prefillRequest?: AdvertisingRequest | null;
  onClearPrefill?: () => void;
  onRefresh: () => Promise<void>;
  onFlash: (msg: string) => void;
  onError: (msg: string) => void;
  onOpenFullModal?: () => void;
}

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export const CeoOfficialAdsPanel: React.FC<CeoOfficialAdsPanelProps> = ({
  ads,
  requests = [],
  initialMode = 'manage',
  prefillRequest,
  onClearPrefill,
  onRefresh,
  onFlash,
  onError,
  onOpenFullModal
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>(initialMode);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [sourceRequestId, setSourceRequestId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'unpublished' | 'paused' | 'expired' | 'pending_approval'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Composer / Editor fields
  const [adType, setAdType] = useState<AdType>('business_ad');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [businessCategory, setBusinessCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('all');
  const [phone, setPhone] = useState('08167258121');
  const [whatsappNumber, setWhatsappNumber] = useState('08167258121');
  const [websiteOrSocialLink, setWebsiteOrSocialLink] = useState('');
  const [location, setLocation] = useState('Nationwide (All Nigerian Universities)');
  const [packageId, setPackageId] = useState<AdPackageId>('featured');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [targetPlacements, setTargetPlacements] = useState<AdPlacement[]>([
    'homepage_featured',
    'marketplace_sponsored'
  ]);
  const [visibilityScope, setVisibilityScope] = useState<AdVisibilityScope>('all_institutions');
  const [institutionId, setInstitutionId] = useState<string>(DEFAULT_INSTITUTION_ID);
  const [campus, setCampus] = useState<string>(DEFAULT_INSTITUTION_CAMPUS);
  const [targetInstitutionIds, setTargetInstitutionIds] = useState<string[]>([]);
  const [targetCampuses, setTargetCampuses] = useState<string[]>([]);
  const [audienceSearch, setAudienceSearch] = useState('');
  const [startDateInput, setStartDateInput] = useState(() =>
    toDatetimeLocalValue(new Date().toISOString())
  );
  const [expiryDateInput, setExpiryDateInput] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
  );
  const [status, setStatus] = useState<'active' | 'unpublished' | 'paused'>('active');
  const [isFeatured, setIsFeatured] = useState<boolean>(true);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteAd, setConfirmDeleteAd] = useState<Advertisement | null>(null);

  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode]);

  const resetForm = () => {
    setEditingAd(null);
    setSourceRequestId('');
    setAdType('business_ad');
    setBusinessName('');
    setOwnerName('');
    setTitle('');
    setDescription('');
    setBusinessCategory(BUSINESS_CATEGORIES[0]);
    setTargetCategoryId('all');
    setPhone('08167258121');
    setWhatsappNumber('08167258121');
    setWebsiteOrSocialLink('');
    setLocation('Nationwide (All Nigerian Universities)');
    setPackageId('featured');
    setDurationDays(30);
    setTargetPlacements(['homepage_featured', 'marketplace_sponsored']);
    setVisibilityScope('all_institutions');
    setInstitutionId(DEFAULT_INSTITUTION_ID);
    setCampus(DEFAULT_INSTITUTION_CAMPUS);
    setTargetInstitutionIds([]);
    setTargetCampuses([]);
    setAudienceSearch('');
    const now = Date.now();
    setStartDateInput(toDatetimeLocalValue(new Date(now).toISOString()));
    setExpiryDateInput(toDatetimeLocalValue(new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()));
    setStatus('active');
    setIsFeatured(true);
    setIsPinned(false);
    setImageUrl('');
    setImages([]);
    setLogoUrl('');
    setVideoUrl('');
    setAdminNotes('');
  };

  // Pre-fill composer whenever a Request is converted to an Ad
  useEffect(() => {
    if (!prefillRequest) return;
    resetForm();
    setSourceRequestId(prefillRequest.id);
    setBusinessName(prefillRequest.businessName);
    setOwnerName(prefillRequest.advertiserName);
    setAdType(prefillRequest.adType || 'business_ad');
    setTitle(`${prefillRequest.businessName} — Featured Promotion`);
    setDescription(prefillRequest.message);
    setBusinessCategory(prefillRequest.category || BUSINESS_CATEGORIES[0]);
    setPhone(prefillRequest.phone);
    setWhatsappNumber(prefillRequest.whatsappNumber || prefillRequest.phone);
    setPackageId(prefillRequest.preferredPackageId || 'featured');
    const pkg = ADVERTISING_PACKAGES.find((p) => p.id === prefillRequest.preferredPackageId);
    const days = pkg?.durationDays || 30;
    setDurationDays(days);
    setExpiryDateInput(toDatetimeLocalValue(new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()));
    if (prefillRequest.targetAudience) {
      setVisibilityScope(prefillRequest.targetAudience);
    }
    if (prefillRequest.targetInstitutionId && prefillRequest.targetInstitutionId !== 'all') {
      setTargetInstitutionIds([prefillRequest.targetInstitutionId]);
      setInstitutionId(prefillRequest.targetInstitutionId);
      setVisibilityScope(
        prefillRequest.targetAudience === 'specific_communities'
          ? 'specific_communities'
          : 'selected_universities'
      );
    }
    if (prefillRequest.attachments && prefillRequest.attachments.length > 0) {
      setImages(prefillRequest.attachments);
      setImageUrl(prefillRequest.attachments[0]);
    }
    setActiveTab('create');
  }, [prefillRequest]);

  const openNewComposer = () => {
    resetForm();
    onClearPrefill?.();
    setActiveTab('create');
  };

  const openEditComposer = (ad: Advertisement) => {
    onClearPrefill?.();
    setEditingAd(ad);
    setSourceRequestId(ad.sourceRequestId || '');
    setAdType(ad.adType || 'business_ad');
    setBusinessName(ad.businessName);
    setOwnerName(ad.ownerName);
    setTitle(ad.title);
    setDescription(ad.description);
    setBusinessCategory(ad.businessCategory || BUSINESS_CATEGORIES[0]);
    setTargetCategoryId(ad.targetCategoryId || 'all');
    setPhone(ad.phone || '08167258121');
    setWhatsappNumber(ad.whatsappNumber || ad.phone || '08167258121');
    setWebsiteOrSocialLink(ad.websiteOrSocialLink || '');
    setLocation(ad.location || '');
    setPackageId(ad.packageId || 'basic');
    setDurationDays(ad.durationDays || 7);
    setTargetPlacements(
      ad.targetPlacements && ad.targetPlacements.length > 0
        ? ad.targetPlacements
        : [ad.placement || 'homepage_featured']
    );
    setVisibilityScope(ad.visibilityScope || 'all_institutions');
    const instId = ad.institutionId || DEFAULT_INSTITUTION_ID;
    setInstitutionId(instId);
    const instObj = getInstitutionById(instId);
    setCampus(ad.campus || instObj.campus || instObj.campuses[0] || DEFAULT_INSTITUTION_CAMPUS);
    setTargetInstitutionIds(
      ad.targetInstitutionIds && ad.targetInstitutionIds.length > 0
        ? ad.targetInstitutionIds
        : ad.institutionId
        ? [ad.institutionId]
        : []
    );
    setTargetCampuses(ad.targetCampuses || []);
    setStartDateInput(toDatetimeLocalValue(ad.startDate || ad.createdAt));
    setExpiryDateInput(toDatetimeLocalValue(ad.expiryDate));
    setStatus(
      ad.status === 'paused' ? 'paused' : ad.status === 'unpublished' ? 'unpublished' : 'active'
    );
    setIsFeatured(Boolean(ad.isFeatured));
    setIsPinned(Boolean(ad.isPinned));
    const list = ad.images && ad.images.length > 0 ? ad.images : ad.imageUrl ? [ad.imageUrl] : [];
    setImages(list);
    setImageUrl(ad.imageUrl || list[0] || '');
    setLogoUrl(ad.logoUrl || '');
    setVideoUrl(ad.videoUrl || '');
    setAdminNotes(ad.adminNotes || '');
    setActiveTab('create');
  };

  const handleBannerSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setBannerUploading(true);
    setBannerProgress(10);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < Math.min(files.length, 6 - images.length); i++) {
        const file = files[i];
        const res = await uploadAdvertisementImage(
          file,
          auth.currentUser?.uid || 'ceo',
          (pct) => setBannerProgress(pct)
        );
        uploadedUrls.push(res.downloadUrl);
      }
      const nextImages = Array.from(new Set([...images, ...uploadedUrls])).slice(0, 6);
      setImages(nextImages);
      if (!imageUrl.trim() && nextImages[0]) {
        setImageUrl(nextImages[0]);
      }
      onFlash(`Uploaded ${uploadedUrls.length} advertisement image(s).`);
    } catch (err: any) {
      onError(err?.message || 'Banner upload failed.');
    } finally {
      setBannerUploading(false);
      setBannerProgress(0);
    }
  };

  const handleLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoUploading(true);
    try {
      const res = await uploadAdLogoImage(file, auth.currentUser?.uid || 'ceo');
      setLogoUrl(res.downloadUrl);
      onFlash('Business logo uploaded successfully.');
    } catch (err: any) {
      onError(err?.message || 'Logo upload failed.');
    } finally {
      setLogoUploading(false);
    }
  };

  const togglePlacement = (p: AdPlacement) => {
    setTargetPlacements((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((item) => item !== p) : prev) : [...prev, p]
    );
  };

  const toggleTargetInstitution = (id: string) => {
    setTargetInstitutionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleTargetCampus = (key: string) => {
    setTargetCampuses((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const combinedImages = Array.from(new Set([imageUrl.trim(), ...images].filter(Boolean))).slice(
      0,
      6
    );
    const primaryImage = combinedImages[0] || '';
    if (!primaryImage) {
      onError('Please upload or provide at least one advertisement image.');
      return;
    }
    if (
      (visibilityScope === 'selected_universities' || visibilityScope === 'specific_communities') &&
      targetInstitutionIds.length === 0
    ) {
      onError('Select at least one target university for this audience scope.');
      return;
    }
    if (visibilityScope === 'selected_campuses' && targetCampuses.length === 0) {
      onError('Select at least one target campus for this audience scope.');
      return;
    }

    const startIso = startDateInput ? new Date(startDateInput).toISOString() : undefined;
    const expiryIso = expiryDateInput ? new Date(expiryDateInput).toISOString() : undefined;

    setSaving(true);
    try {
      const payload = {
        adType,
        businessName,
        ownerName,
        title,
        description,
        businessCategory,
        targetCategoryId,
        phone,
        whatsappNumber,
        websiteOrSocialLink,
        location,
        packageId,
        durationDays,
        placement: targetPlacements[0] || 'homepage_featured',
        targetPlacements,
        visibilityScope,
        institutionId:
          visibilityScope === 'selected_universities' || visibilityScope === 'specific_communities'
            ? targetInstitutionIds[0] || institutionId
            : institutionId,
        campus,
        targetInstitutionIds,
        targetCampuses,
        startDate: startIso,
        expiryDate: expiryIso,
        status,
        isFeatured,
        isPinned,
        imageUrl: primaryImage,
        images: combinedImages,
        logoUrl,
        videoUrl,
        adminNotes,
        ...(sourceRequestId ? { sourceRequestId } : {})
      };

      if (editingAd) {
        await ceoUpdateOfficialAd(editingAd, payload);
        onFlash(`Official advertisement "${businessName}" updated.`);
      } else {
        const created = await ceoCreateOfficialAd(payload);
        if (sourceRequestId) {
          await adminUpdateAdRequestStatus(sourceRequestId, {
            status: 'converted',
            convertedAdId: created.id,
            adminNotes: `Converted to published advertisement (${created.id})`
          }).catch(() => {});
        }
        onFlash(
          status === 'active'
            ? `Official advertisement "${businessName}" published live across target universities!`
            : `Advertisement "${businessName}" saved as ${status}.`
        );
      }

      onClearPrefill?.();
      resetForm();
      setActiveTab('manage');
      await onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Failed to save advertisement.');
    } finally {
      setSaving(false);
    }
  };

  const filteredInstitutionsForPicker = useMemo(() => {
    const q = audienceSearch.trim().toLowerCase();
    if (!q) return VERIFIED_NIGERIAN_INSTITUTIONS;
    return VERIFIED_NIGERIAN_INSTITUTIONS.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.shortName.toLowerCase().includes(q) ||
        i.state.toLowerCase().includes(q)
    );
  }, [audienceSearch]);

  const filteredAds = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return ads.filter((ad) => {
      if (ad.isDeleted) return false;
      const expired = isAdExpired(ad);
      if (filterStatus === 'expired') {
        if (!expired) return false;
      } else if (filterStatus === 'active') {
        if (expired || ad.status !== 'active') return false;
      } else if (filterStatus !== 'all' && ad.status !== filterStatus) {
        return false;
      }
      if (!q) return true;
      return (
        ad.businessName.toLowerCase().includes(q) ||
        ad.title.toLowerCase().includes(q) ||
        ad.businessCategory.toLowerCase().includes(q) ||
        ad.location.toLowerCase().includes(q)
      );
    });
  }, [ads, filterStatus, searchTerm]);

  const adAnalytics = useMemo(
    () => computeAdAnalyticsSummary(ads, requests),
    [ads, requests]
  );

  // Live preview object for composer
  const previewAd: Advertisement = useMemo(() => {
    const combined = Array.from(new Set([imageUrl.trim(), ...images].filter(Boolean)));
    return {
      id: editingAd?.id || 'preview_ad',
      businessName: businessName.trim() || 'Your Business or Brand Name',
      ownerName: ownerName.trim() || 'Official Advertiser',
      phone: phone.trim() || '08167258121',
      whatsappNumber: whatsappNumber.trim() || phone.trim() || '08167258121',
      businessCategory,
      adType,
      title: title.trim() || 'Campaign Headline Appears Here',
      description:
        description.trim() ||
        'Live preview of how students across Nigerian universities will see your sponsored card.',
      imageUrl: combined[0] || '',
      images: combined,
      logoUrl: logoUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      location: location.trim() || 'Nationwide (All Nigerian Campuses)',
      visibilityScope,
      targetPlacements,
      placement: targetPlacements[0] || 'homepage_featured',
      websiteOrSocialLink: websiteOrSocialLink.trim() || undefined,
      packageId,
      packageName: packageId.toUpperCase(),
      packagePrice: 0,
      durationDays,
      status: status === 'active' ? 'active' : 'paused',
      paymentStatus: 'paid',
      isFeatured,
      isPinned,
      isVerified: true,
      ceoVerified: true,
      impressions: editingAd?.impressions || 0,
      clicks: editingAd?.clicks || 0,
      whatsappClicks: editingAd?.whatsappClicks || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [
    editingAd,
    businessName,
    ownerName,
    phone,
    whatsappNumber,
    businessCategory,
    adType,
    title,
    description,
    imageUrl,
    images,
    logoUrl,
    videoUrl,
    location,
    visibilityScope,
    targetPlacements,
    websiteOrSocialLink,
    packageId,
    durationDays,
    status,
    isFeatured,
    isPinned
  ]);

  const selectedInst = getInstitutionById(institutionId);

  return (
    <div className="space-y-4">
      {/* Studio Navigation Bar */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#075B3B] mb-1">
              <Megaphone className="w-3.5 h-3.5 text-[#F2C94C]" />
              <span>Nationwide Campus Advertising Studio</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#202B26]">
              Sponsored Campaigns, Audience Targeting &amp; Live Ad Performance
            </h2>
            <p className="text-xs text-[#202B26]/70 mt-0.5">
              Publish nationwide or university-targeted campaigns with instant preview, multi-placement delivery, scheduled expiration, and real engagement tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openNewComposer}
              className="px-4 py-2.5 rounded-xl bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-xs font-black inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#F2C94C]" />
              <span>Create Advertisement</span>
            </button>
            {onOpenFullModal && (
              <button
                type="button"
                onClick={onOpenFullModal}
                className="px-3.5 py-2.5 rounded-xl bg-[#F4F7F5] hover:bg-[#F2C94C]/20 border border-[#D9E5DF] text-[#202B26] text-xs font-bold transition cursor-pointer"
              >
                Master Archive
              </button>
            )}
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E6EFEA]">
          {[
            {
              id: 'manage' as PanelTab,
              label: `Published Ads (${ads.filter((a) => !a.isDeleted).length})`,
              icon: Layers
            },
            {
              id: 'create' as PanelTab,
              label: editingAd ? 'Edit Advertisement' : 'Create Advertisement Studio',
              icon: Sparkles
            },
            {
              id: 'analytics' as PanelTab,
              label: 'Sponsored Ad Analytics',
              icon: BarChart3
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  active
                    ? 'bg-[#075B3B] text-[#FFFFFF]'
                    : 'bg-[#F4F7F5] text-[#202B26] hover:bg-[#E6EFEA]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#F2C94C]' : 'text-[#075B3B]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CREATE / EDIT ADVERTISEMENT STUDIO WITH LIVE PREVIEW */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSubmit}
            className="xl:col-span-8 bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-5 space-y-5 text-xs shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E6EFEA]">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#202B26]">
                  {editingAd
                    ? `Editing Advertisement: ${editingAd.businessName}`
                    : sourceRequestId
                    ? `Converting Ad Request: ${businessName}`
                    : 'Create & Publish New Sponsored Advertisement'}
                </h3>
                <p className="text-[11px] text-[#202B26]/65">
                  Configure ad creative, multi-placements, university targeting, and active schedule.
                </p>
              </div>
              {(editingAd || sourceRequestId) && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onClearPrefill?.();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#F4F7F5] hover:bg-[#E6EFEA] text-[#202B26] font-bold cursor-pointer"
                >
                  Reset Form
                </button>
              )}
            </div>

            {/* Images, Logo & Optional Video */}
            <div className="bg-[#F4F7F5] p-4 rounded-xl border border-[#D9E5DF] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="block font-black text-[#202B26]">
                    Campaign Banner &amp; Gallery Images (Up to 6) *
                  </label>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleBannerSelected}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={bannerUploading || images.length >= 6}
                      className="px-3.5 py-2 rounded-xl bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {bannerUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#F2C94C]" />
                      )}
                      <span>
                        {bannerUploading ? `Uploading ${bannerProgress}%` : 'Upload Image(s)'}
                      </span>
                    </button>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImageUrl(val);
                        if (val.trim() && images.length === 0) setImages([val.trim()]);
                      }}
                      placeholder="Or paste primary banner image HTTPS URL..."
                      className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF] outline-none focus:border-[#075B3B]"
                    />
                  </div>
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {images.map((img, idx) => (
                        <div
                          key={idx}
                          className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 ${
                            img === imageUrl ? 'border-[#075B3B]' : 'border-[#D9E5DF]'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Slide ${idx + 1}`}
                            onClick={() => setImageUrl(img)}
                            className="w-full h-full object-cover cursor-pointer"
                            title="Click to make primary cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = images.filter((u) => u !== img);
                              setImages(next);
                              if (imageUrl === img) setImageUrl(next[0] || '');
                            }}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block font-black text-[#202B26]">Brand Logo (Optional)</label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoSelected}
                  />
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl bg-[#FFFFFF] border border-[#D9E5DF] overflow-hidden flex items-center justify-center shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-[#202B26]/35" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#D9E5DF] hover:border-[#075B3B] text-[#202B26] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {logoUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#075B3B]" />
                      )}
                      <span>{logoUploading ? 'Uploading...' : 'Upload Logo'}</span>
                    </button>
                  </div>
                  <div className="pt-1">
                    <label className="flex items-center gap-1 font-bold text-[#202B26] mb-1">
                      <Video className="w-3.5 h-3.5 text-[#075B3B]" />
                      <span>Promo Video URL (Optional)</span>
                    </label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/... or video URL"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#D9E5DF] bg-[#FFFFFF] outline-none focus:border-[#075B3B]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Core Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-[#202B26] mb-1">Advertisement Type *</label>
                <select
                  value={adType}
                  onChange={(e) => setAdType(e.target.value as AdType)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF] focus:border-[#075B3B] outline-none"
                >
                  {AD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#202B26] mb-1">Business / Organization Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Royal Taste Bukka or TechHub Nigeria"
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] focus:border-[#075B3B] outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-[#202B26] mb-1">Advertisement Headline / Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Clear, compelling title students will see..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] focus:border-[#075B3B] outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#202B26] mb-1">Ad Industry Category *</label>
                <select
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF] focus:border-[#075B3B] outline-none"
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#202B26] mb-1">Marketplace Category Feed Filter</label>
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF] focus:border-[#075B3B] outline-none"
                >
                  <option value="all">All Marketplace Categories</option>
                  {ALL_MARKETPLACE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#202B26] mb-1">Call Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] focus:border-[#075B3B] outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#202B26] mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] focus:border-[#075B3B] outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#202B26] mb-1">Location / Campus Address *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Nationwide / Abuja & Lagos Campuses"
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] focus:border-[#075B3B] outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#202B26] mb-1">Website / Registration / Social Link</label>
                <input
                  type="url"
                  value={websiteOrSocialLink}
                  onChange={(e) => setWebsiteOrSocialLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] focus:border-[#075B3B] outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-[#202B26] mb-1">Full Advertisement Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the offer, eligibility, prices, deadlines, or delivery options..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] focus:border-[#075B3B] outline-none"
                />
              </div>
            </div>

            {/* Nationwide & Targeted University Audience Scope */}
            <div className="bg-[#F4F7F5] p-4 rounded-xl border border-[#D9E5DF] space-y-3">
              <div>
                <label className="block font-black text-[#202B26] mb-1">
                  Target Audience &amp; University Visibility *
                </label>
                <select
                  value={visibilityScope}
                  onChange={(e) => setVisibilityScope(e.target.value as AdVisibilityScope)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF] font-bold text-[#075B3B] outline-none"
                >
                  {AUDIENCE_SCOPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                  {visibilityScope === 'specific_institution' && (
                    <option value="specific_institution">Legacy Specific Institution</option>
                  )}
                </select>
                <p className="text-[11px] text-[#202B26]/70 mt-1">
                  {AUDIENCE_SCOPE_OPTIONS.find((o) => o.id === visibilityScope)?.description}
                </p>
              </div>

              {(visibilityScope === 'selected_universities' ||
                visibilityScope === 'specific_communities' ||
                visibilityScope === 'selected_campuses') && (
                <div className="bg-[#FFFFFF] rounded-xl border border-[#D9E5DF] p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#202B26]">
                      {visibilityScope === 'selected_campuses'
                        ? `Select Target Campuses (${targetCampuses.length} selected)`
                        : `Select Target Universities (${targetInstitutionIds.length} selected)`}
                    </span>
                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-[#075B3B] absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={audienceSearch}
                        onChange={(e) => setAudienceSearch(e.target.value)}
                        placeholder="Filter universities..."
                        className="w-full pl-8 pr-2.5 py-1 text-[11px] rounded-lg border border-[#D9E5DF] outline-none focus:border-[#075B3B]"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                    {filteredInstitutionsForPicker.map((inst) => {
                      if (visibilityScope === 'selected_campuses') {
                        return inst.campuses.map((campName) => {
                          const key = `${inst.id}::${campName}`;
                          const checked = targetCampuses.includes(key);
                          return (
                            <label
                              key={key}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] cursor-pointer ${
                                checked
                                  ? 'bg-[#075B3B]/10 border-[#075B3B] text-[#075B3B] font-bold'
                                  : 'border-[#E6EFEA] text-[#202B26]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTargetCampus(key)}
                                className="accent-[#075B3B]"
                              />
                              <span className="truncate">
                                {inst.shortName} — {campName}
                              </span>
                            </label>
                          );
                        });
                      }
                      const checked = targetInstitutionIds.includes(inst.id);
                      return (
                        <label
                          key={inst.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] cursor-pointer ${
                            checked
                              ? 'bg-[#075B3B]/10 border-[#075B3B] text-[#075B3B] font-bold'
                              : 'border-[#E6EFEA] text-[#202B26]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTargetInstitution(inst.id)}
                            className="accent-[#075B3B]"
                          />
                          <span className="truncate">
                            <strong>{inst.shortName}</strong> · {inst.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {visibilityScope === 'specific_institution' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={institutionId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setInstitutionId(nextId);
                      const inst = getInstitutionById(nextId);
                      setCampus(inst.campus || inst.campuses[0] || '');
                    }}
                    className="px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF]"
                  >
                    {VERIFIED_NIGERIAN_INSTITUTIONS.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.shortName} — {inst.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF]"
                  >
                    {selectedInst.campuses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Placement Checkboxes */}
            <div className="bg-[#F4F7F5] p-4 rounded-xl border border-[#D9E5DF] space-y-2.5">
              <label className="block font-black text-[#202B26]">
                Where Should This Advertisement Appear? (Multi-Placement)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AD_PLACEMENT_OPTIONS.map((pl) => {
                  const checked = targetPlacements.includes(pl.id);
                  return (
                    <label
                      key={pl.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                        checked
                          ? 'bg-[#FFFFFF] border-[#075B3B] shadow-2xs'
                          : 'bg-[#FFFFFF]/60 border-[#D9E5DF]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlacement(pl.id)}
                        className="accent-[#075B3B] mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-[#202B26] block">{pl.label}</span>
                        <span className="text-[10px] text-[#202B26]/65">{pl.description}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Schedule, Tier & Publishing Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-[#202B26] mb-1">Package Tier</label>
                <select
                  value={packageId}
                  onChange={(e) => {
                    const pid = e.target.value as AdPackageId;
                    setPackageId(pid);
                    const found = ADVERTISING_PACKAGES.find((p) => p.id === pid);
                    if (found) {
                      setDurationDays(found.durationDays);
                      setIsFeatured(pid === 'featured');
                      const startMs = startDateInput ? new Date(startDateInput).getTime() : Date.now();
                      setExpiryDateInput(
                        toDatetimeLocalValue(
                          new Date(startMs + found.durationDays * 24 * 60 * 60 * 1000).toISOString()
                        )
                      );
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF]"
                >
                  {ADVERTISING_PACKAGES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatNaira(p.priceNaira)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 font-bold text-[#202B26] mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#075B3B]" />
                  <span>Start Date &amp; Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 font-bold text-[#202B26] mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#075B3B]" />
                  <span>Expiration Date &amp; Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={expiryDateInput}
                  onChange={(e) => setExpiryDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#202B26] mb-1">Publish Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'unpublished' | 'paused')}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#FFFFFF] font-bold"
                >
                  <option value="active">Published (Active Live)</option>
                  <option value="unpublished">Unpublished (Hidden)</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-1">
              <label className="inline-flex items-center gap-2 font-bold text-[#202B26] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="accent-[#075B3B] w-4 h-4"
                />
                <span>Priority Featured Campaign</span>
              </label>
              <label className="inline-flex items-center gap-2 font-bold text-[#202B26] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="accent-[#075B3B] w-4 h-4"
                />
                <span>Pin to Top of Feeds</span>
              </label>
            </div>

            <div className="pt-3 border-t border-[#E6EFEA] flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClearPrefill?.();
                  setActiveTab('manage');
                }}
                className="px-4 py-2.5 rounded-xl border border-[#D9E5DF] font-bold text-[#202B26] hover:bg-[#F4F7F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || bannerUploading || logoUploading}
                className="px-5 py-2.5 rounded-xl bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] font-black inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {editingAd
                    ? 'Save Campaign Updates'
                    : status === 'active'
                    ? 'Publish Advertisement Live'
                    : 'Save Advertisement Draft'}
                </span>
              </button>
            </div>
          </form>

          {/* Real-Time Live Preview Column */}
          <div className="xl:col-span-4 space-y-3 xl:sticky xl:top-20">
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#075B3B]">
                  Live Student Preview
                </span>
                <span className="text-[11px] font-bold text-[#202B26]/65">
                  {getAudienceScopeLabel(visibilityScope)}
                </span>
              </div>
              <SponsoredAdCard
                ad={previewAd}
                onSelectAd={() => {}}
                trackImpressionOnMount={false}
              />
              <div className="text-[11px] text-[#202B26]/70 bg-[#F4F7F5] rounded-xl p-3 space-y-1">
                <p>
                  <strong>Active Placements:</strong> {targetPlacements.length} selected
                </p>
                <p>
                  <strong>Starts:</strong>{' '}
                  {startDateInput ? new Date(startDateInput).toLocaleString() : 'Immediately'}
                </p>
                <p>
                  <strong>Expires:</strong>{' '}
                  {expiryDateInput ? new Date(expiryDateInput).toLocaleString() : 'Schedule based on tier'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PUBLISHED & DRAFT ADS MANAGER */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'active', 'unpublished', 'paused', 'expired', 'pending_approval'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                      filterStatus === st
                        ? 'bg-[#075B3B] text-[#FFFFFF]'
                        : 'bg-[#F4F7F5] text-[#202B26]/80 hover:text-[#202B26]'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                )
              )}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#075B3B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search business, title, location..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F7F5] border border-[#D9E5DF] focus:border-[#075B3B] rounded-xl outline-none text-[#202B26]"
              />
            </div>
          </div>

          {filteredAds.length === 0 ? (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-10 text-center text-xs text-[#202B26]/70">
              No advertisements match this filter. Click <strong>Create Advertisement</strong> above to publish a campaign.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAds.map((ad) => {
                const expired = isAdExpired(ad);
                return (
                  <div
                    key={ad.id}
                    className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-4 flex flex-col lg:flex-row justify-between gap-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 min-w-0 flex-1">
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-full sm:w-44 h-28 object-cover rounded-xl border border-[#D9E5DF] bg-[#F4F7F5] shrink-0"
                      />
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-black text-sm text-[#075B3B]">{ad.businessName}</span>
                          <CeoVerifiedBadge
                            verified={Boolean(ad.ceoVerified || ad.isVerified)}
                            variant="compact"
                          />
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              expired
                                ? 'bg-red-100 text-red-700'
                                : ad.status === 'active'
                                ? 'bg-emerald-100 text-[#075B3B]'
                                : 'bg-[#F4F7F5] text-[#202B26]'
                            }`}
                          >
                            {expired ? 'expired' : ad.status}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#F4F7F5] border border-[#D9E5DF] text-[10px] font-bold text-[#202B26]">
                            {getAdTypeLabel(ad.adType)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#F2C94C]/25 text-[#202B26] text-[10px] font-black flex items-center gap-1">
                            <Globe className="w-3 h-3 text-[#075B3B]" />
                            {getAudienceScopeLabel(ad.visibilityScope)}
                          </span>
                          {ad.isPinned && (
                            <span className="px-2 py-0.5 rounded bg-[#075B3B] text-[#F2C94C] text-[10px] font-black inline-flex items-center gap-1">
                              <Pin className="w-3 h-3" /> Pinned
                            </span>
                          )}
                          {ad.isFeatured && (
                            <span className="px-2 py-0.5 rounded bg-[#F2C94C] text-[#202B26] text-[10px] font-black inline-flex items-center gap-1">
                              <Star className="w-3 h-3" /> Featured
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-sm text-[#202B26]">{ad.title}</h4>
                        <p className="text-xs text-[#202B26]/75 line-clamp-2">{ad.description}</p>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#202B26]/70 tabular-nums pt-0.5">
                          <span>
                            Placements:{' '}
                            <strong>
                              {(ad.targetPlacements && ad.targetPlacements.length > 0
                                ? ad.targetPlacements
                                : [ad.placement || 'homepage_featured']
                              ).join(', ')}
                            </strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-3 h-3 text-[#075B3B]" /> {ad.impressions} views · {ad.clicks}{' '}
                            clicks · {ad.whatsappClicks} WA
                          </span>
                          {ad.expiryDate && (
                            <span>
                              Expires: <strong>{new Date(ad.expiryDate).toLocaleDateString()}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2 shrink-0">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditComposer(ad)}
                          className="px-3 py-1.5 rounded-lg bg-[#F4F7F5] hover:bg-[#075B3B]/10 border border-[#D9E5DF] text-[#202B26] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#075B3B]" />
                          Edit
                        </button>

                        {ad.paymentStatus !== 'paid' && (
                          <button
                            type="button"
                            disabled={busyId === ad.id}
                            onClick={async () => {
                              setBusyId(ad.id);
                              try {
                                await adminVerifyAdPayment({ ad, mode: 'ceo_manual' });
                                onFlash(`Verified payment for ${ad.businessName}.`);
                                await onRefresh();
                              } catch (err: any) {
                                onError(err?.message || 'Payment verification failed.');
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#F2C94C] text-[#202B26] text-xs font-black inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            Confirm Payment
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busyId === ad.id}
                          onClick={async () => {
                            setBusyId(ad.id);
                            try {
                              await adminUpdateAdvertisement(
                                ad,
                                { isPinned: !ad.isPinned },
                                ad.isPinned ? 'edit' : 'feature'
                              );
                              onFlash(
                                !ad.isPinned
                                  ? `Pinned "${ad.businessName}" to top of sponsored feeds.`
                                  : `Unpinned "${ad.businessName}".`
                              );
                              await onRefresh();
                            } catch (err: any) {
                              onError(err?.message || 'Update failed.');
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#F4F7F5] border border-[#D9E5DF] text-[#202B26] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Pin className="w-3.5 h-3.5 text-[#075B3B]" />
                          {ad.isPinned ? 'Unpin' : 'Pin'}
                        </button>

                        {ad.status === 'active' ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId === ad.id}
                              onClick={async () => {
                                setBusyId(ad.id);
                                try {
                                  await adminUpdateAdvertisement(ad, { status: 'paused' }, 'pause');
                                  onFlash(`Paused "${ad.businessName}".`);
                                  await onRefresh();
                                } catch (err: any) {
                                  onError(err?.message);
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#F4F7F5] border border-[#D9E5DF] text-[#202B26] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              Pause
                            </button>
                            <button
                              type="button"
                              disabled={busyId === ad.id}
                              onClick={async () => {
                                setBusyId(ad.id);
                                try {
                                  await adminUpdateAdvertisement(ad, { status: 'unpublished' }, 'pause');
                                  onFlash(`Unpublished "${ad.businessName}".`);
                                  await onRefresh();
                                } catch (err: any) {
                                  onError(err?.message);
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#F4F7F5] border border-[#D9E5DF] text-[#202B26] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              Unpublish
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === ad.id}
                            onClick={async () => {
                              setBusyId(ad.id);
                              try {
                                await adminApproveAndActivateAd(ad);
                                onFlash(`Published "${ad.businessName}" live.`);
                                await onRefresh();
                              } catch (err: any) {
                                onError(err?.message);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-xs font-black inline-flex items-center gap-1 cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-[#F2C94C]" />
                            Publish Live
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteAd(ad)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-[#FFFFFF] border border-red-200 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REAL SPONSORED AD ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Total Ads', value: adAnalytics.total, highlight: true },
              { label: 'Live Active', value: adAnalytics.active },
              { label: 'Pending Req', value: adAnalytics.pending },
              { label: 'Unpublished', value: adAnalytics.unpublished },
              { label: 'Paused', value: adAnalytics.paused },
              { label: 'Expired', value: adAnalytics.expired },
              { label: 'Total Views', value: adAnalytics.totalImpressions },
              { label: 'Clicks + WA', value: adAnalytics.totalClicks + adAnalytics.totalWhatsappClicks }
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={`rounded-2xl p-3.5 border shadow-xs ${
                  kpi.highlight
                    ? 'bg-[#075B3B] text-[#FFFFFF] border-[#075B3B]'
                    : 'bg-[#FFFFFF] text-[#202B26] border-[#D9E5DF]'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">
                  {kpi.label}
                </span>
                <strong
                  className={`text-xl font-black mt-1 block tabular-nums ${
                    kpi.highlight ? 'text-[#F2C94C]' : 'text-[#075B3B]'
                  }`}
                >
                  {kpi.value.toLocaleString()}
                </strong>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-5 space-y-3 shadow-xs">
              <h3 className="text-sm font-black text-[#202B26] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#075B3B]" />
                <span>Most Viewed Sponsored Advertisements</span>
              </h3>
              {adAnalytics.topViewedAds.length === 0 ? (
                <p className="text-xs text-[#202B26]/65 py-6 text-center bg-[#F4F7F5] rounded-xl">
                  No advertisement impressions recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {adAnalytics.topViewedAds.map((ad, idx) => (
                    <div
                      key={ad.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F4F7F5] border border-[#E6EFEA] text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-black text-[#075B3B] mr-1.5">#{idx + 1}</span>
                        <strong className="text-[#202B26]">{ad.businessName}</strong>
                        <p className="text-[11px] text-[#202B26]/70 truncate">{ad.title}</p>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <span className="font-black text-[#075B3B] block">{ad.impressions} views</span>
                        <span className="text-[10px] text-[#202B26]/65">
                          {ad.clicks} clicks · {ad.whatsappClicks} WA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-5 space-y-3 shadow-xs">
              <h3 className="text-sm font-black text-[#202B26] flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-[#075B3B]" />
                <span>Top Advertised Businesses &amp; Partners</span>
              </h3>
              {adAnalytics.topBusinesses.length === 0 ? (
                <p className="text-xs text-[#202B26]/65 py-6 text-center bg-[#F4F7F5] rounded-xl">
                  No business ad partners recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {adAnalytics.topBusinesses.map((biz, idx) => (
                    <div
                      key={biz.businessName}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F4F7F5] border border-[#E6EFEA] text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-black text-[#075B3B] mr-1.5">#{idx + 1}</span>
                        <strong className="text-[#202B26] truncate">{biz.businessName}</strong>
                        <span className="block text-[10px] text-[#202B26]/65">
                          {biz.adsCount} campaign(s)
                        </span>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <span className="font-black text-[#075B3B] block">{biz.impressions} impressions</span>
                        <span className="text-[10px] text-[#202B26]/65">{biz.clicks} total clicks</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Ad Confirmation */}
      {confirmDeleteAd && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-2xl max-w-md w-full p-5 space-y-4 border border-[#D9E5DF] shadow-2xl">
            <div className="flex items-center gap-2 text-red-700">
              <CheckCircle2 className="w-5 h-5" />
              <h4 className="font-black text-sm">Delete Official Advertisement</h4>
            </div>
            <p className="text-xs text-[#202B26]">
              Are you sure you want to permanently delete <strong>{confirmDeleteAd.businessName}</strong> ({confirmDeleteAd.title})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAd(null)}
                className="px-4 py-2 rounded-xl border border-[#D9E5DF] text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmDeleteAd.id}
                onClick={async () => {
                  const target = confirmDeleteAd;
                  setBusyId(target.id);
                  try {
                    await ceoDeleteOfficialAd(target, 'Deleted from CEO Official Ads Manager');
                    setConfirmDeleteAd(null);
                    onFlash(`Deleted "${target.businessName}".`);
                    await onRefresh();
                  } catch (err: any) {
                    onError(err?.message || 'Delete failed.');
                  } finally {
                    setBusyId(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-[#FFFFFF] text-xs font-black cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
