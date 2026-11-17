import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  Globe,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import {
  AdPackageId,
  AdPlacement,
  AdVisibilityScope,
  Advertisement
} from '../types.js';
import {
  ADVERTISING_PACKAGES,
  BUSINESS_CATEGORIES,
  adminApproveAndActivateAd,
  adminUpdateAdvertisement,
  adminVerifyAdPayment,
  ceoCreateOfficialAd,
  ceoDeleteOfficialAd,
  ceoUpdateOfficialAd
} from '../services/ads.js';
import { uploadAdLogoImage, uploadAdvertisementImage } from '../services/imageStorage.js';
import {
  DEFAULT_INSTITUTION_CAMPUS,
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  getInstitutionById
} from '../constants/institutions.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';
import { formatNaira } from './ProductCard.js';
import { auth } from '../services/firebase.js';

interface CeoOfficialAdsPanelProps {
  ads: Advertisement[];
  onRefresh: () => Promise<void>;
  onFlash: (msg: string) => void;
  onError: (msg: string) => void;
  onOpenFullModal?: () => void;
}

const PLACEMENT_OPTIONS: Array<{ value: AdPlacement; label: string }> = [
  { value: 'ads_section', label: 'NIGERIA CAMPUS MARKET ADS Showcase' },
  { value: 'homepage_hero', label: 'Homepage Hero Spotlight Banner' },
  { value: 'institution_spotlight', label: 'Institution Spotlight Banner' },
  { value: 'category_feed', label: 'Category Marketplace Feed' }
];

export const CeoOfficialAdsPanel: React.FC<CeoOfficialAdsPanelProps> = ({
  ads,
  onRefresh,
  onFlash,
  onError,
  onOpenFullModal
}) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'paused' | 'pending_approval' | 'rejected' | 'expired'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Composer / Editor fields
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [businessCategory, setBusinessCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [phone, setPhone] = useState('08167258121');
  const [whatsappNumber, setWhatsappNumber] = useState('08167258121');
  const [websiteOrSocialLink, setWebsiteOrSocialLink] = useState('');
  const [location, setLocation] = useState('');
  const [packageId, setPackageId] = useState<AdPackageId>('featured');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [placement, setPlacement] = useState<AdPlacement>('ads_section');
  const [visibilityScope, setVisibilityScope] = useState<AdVisibilityScope>('all_institutions');
  const [institutionId, setInstitutionId] = useState<string>(DEFAULT_INSTITUTION_ID);
  const [campus, setCampus] = useState<string>(DEFAULT_INSTITUTION_CAMPUS);
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [isFeatured, setIsFeatured] = useState<boolean>(true);
  const [imageUrl, setImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteAd, setConfirmDeleteAd] = useState<Advertisement | null>(null);

  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = () => {
    setEditingAd(null);
    setBusinessName('');
    setOwnerName('');
    setTitle('');
    setDescription('');
    setBusinessCategory(BUSINESS_CATEGORIES[0]);
    setPhone('08167258121');
    setWhatsappNumber('08167258121');
    setWebsiteOrSocialLink('');
    setLocation('');
    setPackageId('featured');
    setDurationDays(30);
    setPlacement('ads_section');
    setVisibilityScope('all_institutions');
    setInstitutionId(DEFAULT_INSTITUTION_ID);
    setCampus(DEFAULT_INSTITUTION_CAMPUS);
    setStatus('active');
    setIsFeatured(true);
    setImageUrl('');
    setLogoUrl('');
    setAdminNotes('');
  };

  const openNewComposer = () => {
    resetForm();
    setComposerOpen(true);
  };

  const openEditComposer = (ad: Advertisement) => {
    setEditingAd(ad);
    setBusinessName(ad.businessName);
    setOwnerName(ad.ownerName);
    setTitle(ad.title);
    setDescription(ad.description);
    setBusinessCategory(ad.businessCategory || BUSINESS_CATEGORIES[0]);
    setPhone(ad.phone || '08167258121');
    setWhatsappNumber(ad.whatsappNumber || ad.phone || '08167258121');
    setWebsiteOrSocialLink(ad.websiteOrSocialLink || '');
    setLocation(ad.location || '');
    setPackageId(ad.packageId || 'basic');
    setDurationDays(ad.durationDays || 7);
    setPlacement(ad.placement || 'ads_section');
    setVisibilityScope(ad.visibilityScope || 'specific_institution');
    const instId = ad.institutionId || DEFAULT_INSTITUTION_ID;
    setInstitutionId(instId);
    const instObj = getInstitutionById(instId);
    setCampus(ad.campus || instObj.campus || instObj.campuses[0] || DEFAULT_INSTITUTION_CAMPUS);
    setStatus(ad.status === 'paused' ? 'paused' : 'active');
    setIsFeatured(Boolean(ad.isFeatured));
    setImageUrl(ad.imageUrl || '');
    setLogoUrl(ad.logoUrl || '');
    setAdminNotes(ad.adminNotes || '');
    setComposerOpen(true);
  };

  const handleBannerSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBannerUploading(true);
    setBannerProgress(5);
    try {
      const res = await uploadAdvertisementImage(
        file,
        auth.currentUser?.uid || 'ceo',
        (pct) => setBannerProgress(pct)
      );
      setImageUrl(res.downloadUrl);
      onFlash('Advertisement banner uploaded successfully.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      onError('Please upload an advertisement banner image first.');
      return;
    }
    setSaving(true);
    try {
      if (editingAd) {
        await ceoUpdateOfficialAd(editingAd, {
          businessName,
          ownerName,
          title,
          description,
          businessCategory,
          phone,
          whatsappNumber,
          websiteOrSocialLink,
          location,
          packageId,
          durationDays,
          placement,
          visibilityScope,
          institutionId,
          campus,
          status,
          isFeatured,
          imageUrl,
          logoUrl,
          adminNotes
        });
        onFlash(`Official advertisement "${businessName}" updated.`);
      } else {
        await ceoCreateOfficialAd({
          businessName,
          ownerName,
          title,
          description,
          businessCategory,
          phone,
          whatsappNumber,
          websiteOrSocialLink,
          location,
          packageId,
          durationDays,
          placement,
          visibilityScope,
          institutionId,
          campus,
          status,
          isFeatured,
          imageUrl,
          logoUrl,
          adminNotes
        });
        onFlash(`Official advertisement "${businessName}" published live!`);
      }
      setComposerOpen(false);
      resetForm();
      await onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Failed to save advertisement.');
    } finally {
      setSaving(false);
    }
  };

  const filteredAds = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return ads.filter((ad) => {
      if (ad.isDeleted) return false;
      if (filterStatus !== 'all' && ad.status !== filterStatus) return false;
      if (!q) return true;
      return (
        ad.businessName.toLowerCase().includes(q) ||
        ad.title.toLowerCase().includes(q) ||
        ad.businessCategory.toLowerCase().includes(q) ||
        ad.location.toLowerCase().includes(q)
      );
    });
  }, [ads, filterStatus, searchTerm]);

  const selectedInst = getInstitutionById(institutionId);

  return (
    <div className="space-y-4">
      {/* Header & Action Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#087443] mb-1">
              <Megaphone className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>CEO-Exclusive Official Advertising System</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#10251D]">
              NIGERIA CAMPUS MARKET Official Ad Composer &amp; Manager ({ads.filter((a) => !a.isDeleted).length})
            </h2>
            <p className="text-xs text-[#10251D]/70 mt-0.5">
              Only the authorized NIGERIA CAMPUS MARKET CEO can upload banners/logos, create official ads, control visibility scope &amp; placement, pause/resume, edit, or delete ads.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openNewComposer}
              className="px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D4A62A]" />
              <span>Publish Official Ad</span>
            </button>
            {onOpenFullModal && (
              <button
                type="button"
                onClick={onOpenFullModal}
                className="px-3.5 py-2.5 rounded-xl bg-[#F4F8F5] hover:bg-[#D4A62A]/20 border border-[#E5E7EB] text-[#10251D] text-xs font-bold transition cursor-pointer"
              >
                Master Archive View
              </button>
            )}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[#E5E7EB]">
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'active', 'paused', 'pending_approval', 'rejected', 'expired'] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterStatus === st
                      ? 'bg-[#087443] text-white'
                      : 'bg-[#F4F8F5] text-[#10251D]/80 hover:text-[#10251D]'
                  }`}
                >
                  {st === 'all' ? 'All Ads' : st.replace('_', ' ')}
                </button>
              )
            )}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#087443] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search business, title, location..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl outline-none text-[#10251D]"
            />
          </div>
        </div>
      </div>

      {/* Composer / Editor Modal */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setComposerOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-[#087443]/25"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#087443] text-white px-5 py-4 flex items-center justify-between border-b-4 border-[#D4A62A]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#D4A62A]">
                  CEO OFFICIAL AD STUDIO
                </p>
                <h3 className="text-base sm:text-lg font-black">
                  {editingAd ? `Edit Official Ad: ${editingAd.businessName}` : 'Create & Publish Official Advertisement'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Banner & Logo Uploaders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F4F8F5] p-4 rounded-xl border border-[#E5E7EB]">
                <div className="md:col-span-2 space-y-2">
                  <label className="block font-black text-[#10251D]">
                    Advertisement Banner Image *
                  </label>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleBannerSelected}
                  />
                  <div className="flex items-center gap-3">
                    <div className="w-28 h-20 rounded-xl bg-white border border-gray-300 overflow-hidden flex items-center justify-center shrink-0">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={bannerUploading}
                        className="px-3.5 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {bannerUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-[#D4A62A]" />
                        )}
                        <span>{bannerUploading ? `Uploading ${bannerProgress}%` : 'Upload Ad Banner'}</span>
                      </button>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Or paste Firebase/HTTPS banner URL..."
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-[11px] outline-none focus:border-[#087443]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block font-black text-[#10251D]">
                    Brand Logo (Optional)
                  </label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoSelected}
                  />
                  <div className="flex items-center gap-2.5">
                    <div className="w-14 h-14 rounded-full bg-white border border-gray-300 overflow-hidden flex items-center justify-center shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="px-3 py-2 rounded-xl bg-white border border-gray-300 hover:border-[#087443] text-[#10251D] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {logoUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#087443]" />
                      )}
                      <span>{logoUploading ? 'Uploading...' : 'Upload Logo'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ad Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Royal Taste Bukka"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Campaign Headline *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Fresh Shawarma & Meals Delivered Fast"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Owner / Contact Person</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Business owner name"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Category *</label>
                  <select
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:border-[#087443] outline-none"
                  >
                    {BUSINESS_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Behind LT / Main Campus Gate"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Website or Social Link</label>
                  <input
                    type="url"
                    value={websiteOrSocialLink}
                    onChange={(e) => setWebsiteOrSocialLink(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#087443] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#10251D] mb-1">Advertisement Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Full details of products, offers, delivery speed, and campus discounts..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#087443] outline-none"
                  />
                </div>
              </div>

              {/* Placement, Package & National Institution Visibility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#F4F8F5] p-4 rounded-xl border border-[#E5E7EB]">
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Package Tier</label>
                  <select
                    value={packageId}
                    onChange={(e) => {
                      const pid = e.target.value as AdPackageId;
                      setPackageId(pid);
                      const found = ADVERTISING_PACKAGES.find((p) => p.id === pid);
                      if (found) {
                        setDurationDays(found.durationDays);
                        setIsFeatured(pid === 'featured');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none"
                  >
                    {ADVERTISING_PACKAGES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatNaira(p.priceNaira)} / {p.durationDays}d)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Ad Placement</label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value as AdPlacement)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none"
                  >
                    {PLACEMENT_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Visibility Scope</label>
                  <select
                    value={visibilityScope}
                    onChange={(e) => setVisibilityScope(e.target.value as AdVisibilityScope)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none"
                  >
                    <option value="all_institutions">All Nigerian Institutions (National)</option>
                    <option value="specific_institution">Specific Institution Only</option>
                  </select>
                </div>

                {visibilityScope === 'specific_institution' && (
                  <>
                    <div>
                      <label className="block font-bold text-[#10251D] mb-1">Target Institution</label>
                      <select
                        value={institutionId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setInstitutionId(nextId);
                          const inst = getInstitutionById(nextId);
                          setCampus(inst.campus || inst.campuses[0] || '');
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none"
                      >
                        {VERIFIED_NIGERIAN_INSTITUTIONS.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.shortName} — {inst.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-[#10251D] mb-1">Campus</label>
                      <select
                        value={campus}
                        onChange={(e) => setCampus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none"
                      >
                        {selectedInst.campuses.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 font-bold text-[#10251D]">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="accent-[#087443] w-4 h-4"
                  />
                  <span>Mark as Priority Featured Ad</span>
                </label>

                <label className="inline-flex items-center gap-2 font-bold text-[#10251D]">
                  <span>Publish Status:</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'paused')}
                    className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white font-bold"
                  >
                    <option value="active">Active (Live Immediately)</option>
                    <option value="paused">Paused (Draft)</option>
                  </select>
                </label>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-[#10251D] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || bannerUploading || logoUploading}
                  className="px-5 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingAd ? 'Save Advertisement Changes' : 'Publish Official Advertisement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ad Cards List */}
      {filteredAds.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-10 text-center text-xs text-[#10251D]/70">
          No advertisements match this filter. Click <strong>Publish Official Ad</strong> above to publish an advertisement.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAds.map((ad) => (
            <div
              key={ad.id}
              className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-col lg:flex-row justify-between gap-4 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row gap-4 min-w-0 flex-1">
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="w-full sm:w-44 h-28 object-cover rounded-xl border border-gray-200 bg-[#F4F8F5] shrink-0"
                />
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {ad.logoUrl && (
                      <img
                        src={ad.logoUrl}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover border border-[#087443]/30"
                      />
                    )}
                    <span className="font-black text-sm text-[#087443]">{ad.businessName}</span>
                    <CeoVerifiedBadge verified={Boolean(ad.ceoVerified || ad.isVerified)} variant="compact" />
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        ad.status === 'active'
                          ? 'bg-emerald-100 text-[#087443]'
                          : 'bg-gray-100 text-[#10251D]'
                      }`}
                    >
                      {ad.status}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#D4A62A]/20 text-[#10251D] text-[10px] font-black uppercase flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#087443]" />
                      {ad.visibilityScope === 'all_institutions'
                        ? 'All Campuses'
                        : getInstitutionById(ad.institutionId).shortName}
                    </span>
                    {ad.isFeatured && (
                      <span className="px-2 py-0.5 rounded bg-[#D4A62A] text-[#10251D] text-[10px] font-black uppercase flex items-center gap-1">
                        <Star className="w-3 h-3" /> Featured
                      </span>
                    )}
                  </div>

                  <h4 className="font-black text-sm text-[#10251D]">{ad.title}</h4>
                  <p className="text-xs text-[#10251D]/75 line-clamp-2">{ad.description}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#10251D]/70 tabular-nums pt-0.5">
                    <span>Placement: <strong>{ad.placement || 'ads_section'}</strong></span>
                    <span>Package: <strong>{ad.packageName}</strong> ({formatNaira(ad.packagePrice)})</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3 h-3 text-[#087443]" /> {ad.impressions} views
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 text-[#087443]" /> {ad.clicks} clicks · {ad.whatsappClicks} WA
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2 shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditComposer(ad)}
                    className="px-3 py-1.5 rounded-lg bg-[#F4F8F5] hover:bg-[#087443]/10 border border-[#E5E7EB] text-[#10251D] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#087443]" />
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
                      className="px-3 py-1.5 rounded-lg bg-[#D4A62A] text-[#10251D] text-xs font-black inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      Confirm Payment
                    </button>
                  )}

                  {ad.status === 'active' ? (
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
                      className="px-3 py-1.5 rounded-lg bg-[#F4F8F5] border border-gray-300 text-[#10251D] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      Pause
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === ad.id}
                      onClick={async () => {
                        setBusyId(ad.id);
                        try {
                          await adminApproveAndActivateAd(ad);
                          onFlash(`Activated "${ad.businessName}".`);
                          await onRefresh();
                        } catch (err: any) {
                          onError(err?.message);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black inline-flex items-center gap-1 cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
                      Activate
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAd(ad)}
                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Ad Confirmation */}
      {confirmDeleteAd && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-gray-200 shadow-2xl">
            <div className="flex items-center gap-2 text-red-700">
              <CheckCircle2 className="w-5 h-5" />
              <h4 className="font-black text-sm">Delete Official Advertisement</h4>
            </div>
            <p className="text-xs text-[#10251D]">
              Are you sure you want to permanently delete <strong>{confirmDeleteAd.businessName}</strong> ({confirmDeleteAd.title})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAd(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer"
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
