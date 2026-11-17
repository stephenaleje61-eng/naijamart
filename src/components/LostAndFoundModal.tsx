import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  PackageSearch,
  Upload,
  MapPin,
  Calendar,
  Phone,
  CheckCircle2,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';
import {
  LostFoundItem,
  LostFoundItemCategory,
  LostFoundReportType
} from '../types.js';
import {
  FUWUKARI_EMERGENCY_LOCATIONS,
  LOST_FOUND_CATEGORIES,
  buildEmergencyCallHref,
  createLostFoundItem
} from '../services/emergencyCentre.js';
import { uploadLostFoundPhoto } from '../services/imageStorage.js';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../services/firebase.js';

interface LostAndFoundModalProps {
  items: LostFoundItem[];
  onClose: () => void;
  onReportSubmitted?: () => void;
}

export const LostAndFoundModal: React.FC<LostAndFoundModalProps> = ({
  items,
  onClose,
  onReportSubmitted
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'browse' | 'submit'>('browse');
  const [typeFilter, setTypeFilter] = useState<'all' | LostFoundReportType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | LostFoundItemCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [reportType, setReportType] = useState<LostFoundReportType>('lost');
  const [itemCategory, setItemCategory] = useState<LostFoundItemCategory>('phone');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationPreset, setLocationPreset] = useState<string>(FUWUKARI_EMERGENCY_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [recoveryInstructions, setRecoveryInstructions] = useState('');
  const [contactPhone, setContactPhone] = useState(() => user?.phone || '');
  const [showPublicContact, setShowPublicContact] = useState(false);
  const [privateIdentifierHint, setPrivateIdentifierHint] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.reportType !== typeFilter) return false;
      if (categoryFilter !== 'all' && item.itemCategory !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.recoveryInstructions.toLowerCase().includes(q)
      );
    });
  }, [items, typeFilter, categoryFilter, searchQuery]);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setUploadingPhoto(true);
    setUploadProgress(5);
    try {
      const uid = auth.currentUser?.uid || user?.id || 'reporter';
      const result = await uploadLostFoundPhoto(file, uid, (pct) => setUploadProgress(pct));
      setImageUrl(result.downloadUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to upload photo.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const resolvedLocation =
      locationPreset === 'Other' ? customLocation.trim() : locationPreset;

    if (!resolvedLocation) {
      setErrorMsg('Please provide the location where the item was lost or found.');
      return;
    }

    setSubmitting(true);
    try {
      await createLostFoundItem({
        reportType,
        itemCategory,
        title,
        description,
        location: resolvedLocation,
        incidentDate,
        recoveryInstructions,
        showPublicContact,
        contactPhone: contactPhone.trim() || undefined,
        privateIdentifierHint: privateIdentifierHint.trim() || undefined,
        imageUrl: imageUrl || undefined,
        reporterLabel: user?.name || 'FUWUKARI Community Member'
      });

      setTitle('');
      setDescription('');
      setRecoveryInstructions('');
      setPrivateIdentifierHint('');
      setImageUrl('');
      setSuccessMsg(
        'Lost & Found report published! Sensitive ID/matric numbers are automatically protected.'
      );
      setActiveTab('browse');
      onReportSubmitted?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to publish Lost & Found listing.');
    } finally {
      setSubmitting(false);
    }
  };

  const categoryLabel = (cat: LostFoundItemCategory) =>
    LOST_FOUND_CATEGORIES.find((c) => c.id === cat)?.label || 'Other';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col text-[#10251D]">
        {/* Header */}
        <div className="bg-[#0F1E3D] text-white p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#087443] text-white flex items-center justify-center shrink-0">
              <PackageSearch className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black">
                FUWUKARI Lost &amp; Found Centre
              </h2>
              <p className="text-xs text-white/80">
                Report or recover phones, student ID cards, wallets, bags, keys, and personal items safely
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Lost and Found"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-5 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black transition ${
                activeTab === 'browse'
                  ? 'bg-[#0F1E3D] text-white'
                  : 'bg-white border border-[#CBD5E1] text-[#334155]'
              }`}
            >
              Browse Lost &amp; Found ({items.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccessMsg(null);
                setErrorMsg(null);
                setActiveTab('submit');
              }}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                activeTab === 'submit'
                  ? 'bg-[#087443] text-white'
                  : 'bg-white border border-[#CBD5E1] text-[#087443]'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Lost / Found Item</span>
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {successMsg && (
            <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-bold text-[#087443] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'browse' ? (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search phone model, bag colour, Student Affairs, hostel..."
                    className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs outline-none"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0F1E3D] outline-none"
                >
                  <option value="all">Lost &amp; Found</option>
                  <option value="lost">Lost Items Only</option>
                  <option value="found">Found Items Only</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0F1E3D] outline-none"
                >
                  <option value="all">All Categories</option>
                  {LOST_FOUND_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {filteredItems.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-3">
                  <PackageSearch className="w-10 h-10 text-[#0F1E3D] mx-auto" />
                  <h3 className="text-sm font-black text-[#0F1E3D]">
                    {items.length === 0
                      ? 'No Lost or Found Items Reported Yet'
                      : 'No Matching Lost & Found Listings'}
                  </h3>
                  <p className="text-xs text-[#475569] max-w-md mx-auto leading-relaxed">
                    Missing a phone, Student ID card, wallet, bag, or key around campus? Submit a Lost or Found notice so the owner or finder can coordinate safe pickup through Student Affairs or Campus Security.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('submit')}
                    className="min-h-[44px] px-5 py-2.5 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black rounded-xl transition"
                  >
                    Report Lost / Found Item
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden flex flex-col justify-between"
                    >
                      {item.imageUrl && (
                        <div className="h-40 bg-white border-b border-[#E2E8F0] overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                item.reportType === 'found'
                                  ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#087443]'
                                  : 'bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]'
                              }`}
                            >
                              {item.reportType === 'found' ? 'Found Item' : 'Lost Item'}
                            </span>
                            <span className="text-[11px] font-bold text-[#475569]">
                              {categoryLabel(item.itemCategory)} ·{' '}
                              <span className="uppercase text-[#0F1E3D]">{item.status}</span>
                            </span>
                          </div>

                          <h3 className="font-black text-sm text-[#0F1E3D] leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-xs text-[#334155] leading-relaxed">
                            {item.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#475569] pt-1">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#0F1E3D]" />
                              {item.location}
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Calendar className="w-3.5 h-3.5 text-[#0F1E3D]" />
                              {item.incidentDate}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#1E293B] mt-1">
                            <span className="font-black text-[#0F1E3D] block text-[11px]">
                              Recovery Instructions:
                            </span>
                            {item.recoveryInstructions}
                          </div>
                        </div>

                        {item.publicRecoveryContact && (
                          <a
                            href={buildEmergencyCallHref(item.publicRecoveryContact)}
                            className="min-h-[44px] mt-2 w-full px-4 py-2 bg-[#0F1E3D] hover:bg-[#16294F] text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition"
                          >
                            <Phone className="w-4 h-4" />
                            <span>Call Recovery Contact ({item.publicRecoveryContact})</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Privacy Warning */}
              <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065D36] flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#087443] shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">Student Privacy Protection</p>
                  <p className="mt-0.5 leading-relaxed">
                    Do NOT publish raw matric numbers, full ID card numbers, NIN, or BVN in public descriptions or photos. FU MARKET automatically redacts ID/matric patterns publicly, and any private claim hint you provide below is stored strictly for Help Centre verification.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-bold text-[#991B1B]">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setReportType('lost')}
                  className={`min-h-[44px] rounded-xl text-xs font-black transition ${
                    reportType === 'lost'
                      ? 'bg-[#DC2626] text-white'
                      : 'text-[#334155]'
                  }`}
                >
                  I Lost an Item
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('found')}
                  className={`min-h-[44px] rounded-xl text-xs font-black transition ${
                    reportType === 'found'
                      ? 'bg-[#087443] text-white'
                      : 'text-[#334155]'
                  }`}
                >
                  I Found an Item
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F1E3D] block">
                    Item Category *
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as LostFoundItemCategory)}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#10251D] outline-none"
                  >
                    {LOST_FOUND_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F1E3D] block">
                    Date Lost / Found *
                  </label>
                  <input
                    type="date"
                    required
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#10251D] outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-[#0F1E3D] block">
                  Item Name / Short Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Black Techno Camon phone / Brown leather wallet / Keys with blue tag"
                  className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#10251D] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-[#0F1E3D] block">
                  Public Description (no ID/matric numbers) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe colour, brand, or visible non-sensitive markings..."
                  className="w-full p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#10251D] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F1E3D] block">
                    Location Lost / Found *
                  </label>
                  <select
                    value={locationPreset}
                    onChange={(e) => setLocationPreset(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#10251D] outline-none"
                  >
                    {FUWUKARI_EMERGENCY_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                    <option value="Other">Other location...</option>
                  </select>
                  {locationPreset === 'Other' && (
                    <input
                      type="text"
                      required
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="Specify exact campus or lodge area"
                      className="w-full min-h-[44px] px-3 py-2 mt-1.5 bg-white border border-[#CBD5E1] rounded-xl text-xs outline-none"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-[#0F1E3D] block">
                    Recovery / Drop-off Instructions *
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryInstructions}
                    onChange={(e) => setRecoveryInstructions(e.target.value)}
                    placeholder="e.g. Submitted at Student Affairs / Meet at Main Gate Security Post"
                    className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#10251D] outline-none"
                  />
                </div>
              </div>

              {/* Contact & Private Verification Hint */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0F1E3D] block">
                      Your Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="080..."
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs outline-none tabular-nums"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0F1E3D] block">
                      Private Verification Hint (Admin Only)
                    </label>
                    <input
                      type="text"
                      value={privateIdentifierHint}
                      onChange={(e) => setPrivateIdentifierHint(e.target.value)}
                      placeholder="e.g. Wallpaper, matric no., lockscreen note"
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#1E293B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPublicContact}
                    onChange={(e) => setShowPublicContact(e.target.checked)}
                    className="w-4 h-4 accent-[#087443]"
                  />
                  <span>
                    Show my phone number publicly as the recovery contact (otherwise kept private for admin only)
                  </span>
                </label>
              </div>

              {/* Optional Photo */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="min-h-[44px] px-4 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0F1E3D] inline-flex items-center gap-2 cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>
                    {uploadingPhoto
                      ? `Uploading (${uploadProgress}%)...`
                      : imageUrl
                      ? 'Replace Item Photo'
                      : 'Upload Item Photo (Optional)'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingPhoto}
                    onChange={handleUploadPhoto}
                    className="hidden"
                  />
                </label>

                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Uploaded item preview"
                    className="w-12 h-12 rounded-xl object-cover border border-[#CBD5E1]"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="min-h-[44px] px-4 py-2 bg-[#F1F5F9] text-[#334155] text-xs font-bold rounded-xl"
                >
                  Back to Listings
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingPhoto}
                  className="min-h-[44px] px-6 py-2.5 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black rounded-xl transition disabled:opacity-60"
                >
                  {submitting ? 'Publishing...' : 'Publish Lost & Found Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
