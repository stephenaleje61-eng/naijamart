import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  Star,
  ArchiveRestore,
  FileCheck2,
  Lock
} from 'lucide-react';
import {
  AdPaymentRecord,
  AdminAuditLogRecord,
  Advertisement,
  ContentArchiveRecord,
  UnifiedContentRecord,
  WebsiteContentFilterKey
} from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { CEO_EMAIL, isAuthorizedCeo, isFirebaseCeoVerified } from '../services/events.js';
import {
  adminApproveAndActivateAd,
  adminDeleteAdvertisementPermanently,
  adminSoftDeleteAdvertisement,
  adminUpdateAdvertisement,
  adminVerifyAdPayment,
  BUSINESS_CATEGORIES,
  fetchAllAdsForAdmin,
  fetchAllPaymentsForAdmin
} from '../services/ads.js';
import {
  approveOrRejectUnifiedRecord,
  bulkDeleteUnifiedContentRecords,
  DELETE_CONFIRMATION_MESSAGE,
  deleteUnifiedContentRecord,
  editUnifiedContentRecord,
  fetchAllWebsiteContent,
  fetchArchivedContent,
  fetchImmutableAuditLogs,
  restoreArchivedContent
} from '../services/ceoMasterControl.js';
import { formatNaira } from './ProductCard.js';

interface CeoMasterControlModalProps {
  onClose: () => void;
  initialTab?: MasterTab;
  onDataChanged?: () => void;
}

type MasterTab = 'all-content' | 'ads' | 'archive' | 'protected';

const FILTER_OPTIONS: { key: WebsiteContentFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'products', label: 'Products' },
  { key: 'services', label: 'Services' },
  { key: 'advertisements', label: 'Advertisements' },
  { key: 'events', label: 'Events' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'sports', label: 'Sports' },
  { key: 'emergency', label: 'Emergency & Safety' },
  { key: 'business_listings', label: 'Business listings' },
  { key: 'student_posts', label: 'Student posts' },
  { key: 'comments', label: 'Comments' },
  { key: 'other', label: 'Other content' }
];

export const CeoMasterControlModal: React.FC<CeoMasterControlModalProps> = ({
  onClose,
  initialTab = 'all-content',
  onDataChanged
}) => {
  const { user } = useAuth();
  const isCeoVerified = isAuthorizedCeo(user) && isFirebaseCeoVerified();

  const [activeTab, setActiveTab] = useState<MasterTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Global Content State
  const [contentRecords, setContentRecords] = useState<UnifiedContentRecord[]>([]);
  const [protectedStats, setProtectedStats] = useState({
    paymentsCount: 0,
    auditLogsCount: 0,
    adminsProtected: 1
  });
  const [contentFilter, setContentFilter] = useState<WebsiteContentFilterKey>('all');
  const [sectionTagFilter, setSectionTagFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [softDeleteMode, setSoftDeleteMode] = useState(true);

  // Ads Management State
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [adFilter, setAdFilter] = useState<'all' | 'pending_approval' | 'active' | 'paused' | 'rejected' | 'expired'>('all');
  const [adSearch, setAdSearch] = useState('');
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [verifyingPaymentAd, setVerifyingPaymentAd] = useState<Advertisement | null>(null);
  const [verifyMode, setVerifyMode] = useState<'ceo_manual' | 'paystack_ref'>('ceo_manual');
  const [verifyRefInput, setVerifyRefInput] = useState('');

  // Archive & Protected Records State
  const [archives, setArchives] = useState<ContentArchiveRecord[]>([]);
  const [payments, setPayments] = useState<AdPaymentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);

  // Inspect / Edit / Delete Confirmation Modals
  const [inspectRecord, setInspectRecord] = useState<UnifiedContentRecord | null>(null);
  const [editRecordTarget, setEditRecordTarget] = useState<UnifiedContentRecord | null>(null);
  const [editDraft, setEditDraft] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    status: ''
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    mode: 'single' | 'bulk' | 'ad_permanent';
    items: UnifiedContentRecord[];
    adTarget?: Advertisement;
    reason: string;
    useSoft: boolean;
  } | null>(null);
  const [deletingNow, setDeletingNow] = useState(false);

  const flash = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const loadMasterData = useCallback(async () => {
    if (!isCeoVerified) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const [contentRes, adsRes, archiveRes, paymentsRes, logsRes] = await Promise.allSettled([
        fetchAllWebsiteContent(),
        fetchAllAdsForAdmin(),
        fetchArchivedContent(),
        fetchAllPaymentsForAdmin(),
        fetchImmutableAuditLogs()
      ]);

      if (contentRes.status === 'fulfilled') {
        setContentRecords(contentRes.value.records);
        setProtectedStats(contentRes.value.protectedStats);
      } else {
        setErrorMsg(contentRes.reason?.message || 'Unable to load website content.');
      }

      if (adsRes.status === 'fulfilled') setAds(adsRes.value);
      if (archiveRes.status === 'fulfilled') setArchives(archiveRes.value);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value);

      setSelectedKeys(new Set());
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load CEO Master Control workspace.');
    } finally {
      setLoading(false);
    }
  }, [isCeoVerified]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  const availableSectionTags = useMemo(() => {
    const tags = new Set<string>();
    for (const r of contentRecords) tags.add(r.sectionTag);
    return Array.from(tags).sort();
  }, [contentRecords]);

  const filteredContent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contentRecords.filter((rec) => {
      if (contentFilter !== 'all' && rec.filterGroup !== contentFilter) return false;
      if (sectionTagFilter !== 'all' && rec.sectionTag !== sectionTagFilter) return false;
      if (!q) return true;
      return (
        rec.title.toLowerCase().includes(q) ||
        rec.ownerName.toLowerCase().includes(q) ||
        rec.categoryLabel.toLowerCase().includes(q) ||
        rec.sectionTag.toLowerCase().includes(q) ||
        rec.sourceId.toLowerCase().includes(q) ||
        rec.statusLabel.toLowerCase().includes(q) ||
        (rec.ownerContact || '').toLowerCase().includes(q)
      );
    });
  }, [contentRecords, contentFilter, sectionTagFilter, searchQuery]);

  const filteredAds = useMemo(() => {
    const q = adSearch.trim().toLowerCase();
    return ads.filter((a) => {
      if (adFilter !== 'all' && a.status !== adFilter) return false;
      if (!q) return true;
      return (
        a.businessName.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.ownerName.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.businessCategory.toLowerCase().includes(q)
      );
    });
  }, [ads, adFilter, adSearch]);

  const toggleSelectKey = (compositeKey: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(compositeKey)) next.delete(compositeKey);
      else next.add(compositeKey);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    const filteredKeys = filteredContent.map((r) => r.compositeKey);
    const allSelected =
      filteredKeys.length > 0 && filteredKeys.every((k) => selectedKeys.has(k));
    if (allSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        for (const k of filteredKeys) next.delete(k);
        return next;
      });
    } else {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        for (const k of filteredKeys) next.add(k);
        return next;
      });
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    setDeletingNow(true);
    setErrorMsg(null);
    try {
      const reason = deleteConfirm.reason.trim() || undefined;
      if (deleteConfirm.mode === 'ad_permanent' && deleteConfirm.adTarget) {
        if (deleteConfirm.useSoft) {
          await adminSoftDeleteAdvertisement(deleteConfirm.adTarget, reason);
          flash('Advertisement moved to Recovery Archive.');
        } else {
          await adminDeleteAdvertisementPermanently(deleteConfirm.adTarget, reason);
          flash('Advertisement deleted permanently.');
        }
      } else if (deleteConfirm.mode === 'single' && deleteConfirm.items[0]) {
        await deleteUnifiedContentRecord(deleteConfirm.items[0], {
          softDelete: deleteConfirm.useSoft,
          reason
        });
        flash(
          deleteConfirm.useSoft
            ? 'Record moved to Recovery Archive and logged in audit trail.'
            : 'Record deleted permanently and logged in audit trail.'
        );
      } else if (deleteConfirm.mode === 'bulk') {
        const res = await bulkDeleteUnifiedContentRecords(deleteConfirm.items, {
          softDelete: deleteConfirm.useSoft,
          reason
        });
        flash(
          `Bulk delete complete: ${res.deleted} removed${res.failed > 0 ? `, ${res.failed} failed` : ''}.`
        );
      }
      setDeleteConfirm(null);
      await loadMasterData();
      onDataChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Delete operation failed.');
    } finally {
      setDeletingNow(false);
    }
  };

  const handleSaveInlineEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecordTarget) return;
    setErrorMsg(null);
    try {
      await editUnifiedContentRecord(editRecordTarget, {
        ...(editDraft.title ? { title: editDraft.title } : {}),
        ...(editDraft.description !== undefined ? { description: editDraft.description } : {}),
        ...(editDraft.price !== '' ? { price: Number(editDraft.price) } : {}),
        ...(editDraft.location ? { location: editDraft.location } : {}),
        ...(editDraft.status ? { status: editDraft.status } : {})
      });
      setEditRecordTarget(null);
      flash('Record updated cleanly.');
      await loadMasterData();
      onDataChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update record.');
    }
  };

  const handleApproveRejectUnified = async (
    rec: UnifiedContentRecord,
    decision: 'approve' | 'reject'
  ) => {
    setErrorMsg(null);
    try {
      await approveOrRejectUnifiedRecord(rec, decision);
      flash(`Record marked ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      await loadMasterData();
      onDataChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Action failed.');
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingPaymentAd) return;
    setErrorMsg(null);
    try {
      const payment = await adminVerifyAdPayment({
        ad: verifyingPaymentAd,
        mode: verifyMode,
        reference: verifyRefInput.trim() || undefined
      });
      setVerifyingPaymentAd(null);
      setVerifyRefInput('');
      flash(`Payment verified (${payment.reference}). You can now Approve & Activate this advert.`);
      await loadMasterData();
      onDataChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Payment verification failed.');
    }
  };

  const handleSaveAdEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;
    setErrorMsg(null);
    try {
      await adminUpdateAdvertisement(
        editingAd,
        {
          businessName: editingAd.businessName,
          title: editingAd.title,
          description: editingAd.description,
          businessCategory: editingAd.businessCategory,
          location: editingAd.location,
          phone: editingAd.phone,
          whatsappNumber: editingAd.whatsappNumber,
          websiteOrSocialLink: editingAd.websiteOrSocialLink,
          startDate: editingAd.startDate,
          expiryDate: editingAd.expiryDate,
          isFeatured: editingAd.isFeatured,
          adminNotes: editingAd.adminNotes
        },
        'edit'
      );
      setEditingAd(null);
      flash('Advertisement details saved.');
      await loadMasterData();
      onDataChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save advertisement changes.');
    }
  };

  const selectedRecords = useMemo(
    () => filteredContent.filter((r) => selectedKeys.has(r.compositeKey)),
    [filteredContent, selectedKeys]
  );

  if (!isCeoVerified) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 text-[#111111]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#B91C1C]">
              <Lock className="w-5 h-5" />
              <h2 className="text-base font-black">CEO Access Restricted</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-[#E5E7EB] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#444444] leading-relaxed">
            <strong>FU MARKET CEO MASTER CONTROL</strong> is strictly restricted to the authorized administrator Google account ({CEO_EMAIL}).
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#111111] text-white text-xs font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="FU MARKET CEO MASTER CONTROL"
    >
      <div className="relative w-full max-w-7xl bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col text-[#111111]">
        {/* Header */}
        <div className="bg-[#111111] text-white px-5 py-4 flex items-center justify-between gap-4 border-b border-[#27272A] shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-[#F2B90D] tracking-tight truncate">
              FU MARKET CEO MASTER CONTROL
            </h2>
            <p className="text-xs text-white/75 truncate">
              Signed in as {user?.email || CEO_EMAIL} · Central Content, Advertising, Payment &amp; Audit Control
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadMasterData}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close CEO Master Control"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#F2B90D] text-white hover:text-[#111111] flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Navigation Bar */}
        <div className="px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'all-content' as MasterTab, label: `ALL WEBSITE CONTENT (${contentRecords.length})` },
            { id: 'ads' as MasterTab, label: `Advertising Management (${ads.filter((a) => !a.isDeleted).length})` },
            { id: 'archive' as MasterTab, label: `Recovery Archive (${archives.length})` },
            { id: 'protected' as MasterTab, label: `Protected Records & Audit Logs (${auditLogs.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition whitespace-nowrap shrink-0 tabular-nums ${
                activeTab === tab.id
                  ? 'bg-[#0B6B3A] text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#444444] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feedback Banners */}
        {(errorMsg || statusMsg) && (
          <div className="px-5 pt-3 space-y-2 shrink-0 bg-white">
            {errorMsg && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold rounded-xl flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </span>
                <button type="button" onClick={() => setErrorMsg(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {statusMsg && (
              <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] text-[#14532D] text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Main Workspace Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#F5F5F5] space-y-5">
          {loading ? (
            <div className="py-16 text-center text-xs font-bold text-[#555555]">
              Loading website records and protected logs...
            </div>
          ) : activeTab === 'all-content' ? (
            /* TAB 1: ALL WEBSITE CONTENT */
            <div className="space-y-4">
              {/* Filter Bar + Search */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-[#111111]">ALL WEBSITE CONTENT</h3>
                    <p className="text-xs text-[#555555]">
                      Manage marketplace products, product photos, adverts, events, birthdays, sports, announcements, student posts, comments, accommodation, riders, files &amp; reports.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-[#555555] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search title, owner, category, ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl outline-none"
                      />
                    </div>

                    <select
                      value={sectionTagFilter}
                      onChange={(e) => setSectionTagFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-bold bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl outline-none"
                      aria-label="Filter by exact section type"
                    >
                      <option value="all">All 17 Content Types</option>
                      {availableSectionTags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E7EB]">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setContentFilter(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                        contentFilter === opt.key
                          ? 'bg-[#111111] text-[#F2B90D]'
                          : 'bg-[#F5F5F5] text-[#444444] hover:text-[#111111]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Selection & Bulk Toolbar */}
                <div className="pt-2 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs">
                    <label className="inline-flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={softDeleteMode}
                        onChange={(e) => setSoftDeleteMode(e.target.checked)}
                        className="w-4 h-4 accent-[#0B6B3A]"
                      />
                      <span>Move deleted items to Recovery Archive (Soft Delete)</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#555555] tabular-nums">
                      Showing {filteredContent.length} records · {selectedRecords.length} selected
                    </span>
                    {selectedRecords.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirm({
                            mode: 'bulk',
                            items: selectedRecords,
                            reason: '',
                            useSoft: softDeleteMode
                          })
                        }
                        className="px-3.5 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-black rounded-xl transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="tabular-nums">
                          Bulk Delete Selected ({selectedRecords.length})
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Unified Content Table */}
              {filteredContent.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center text-xs text-[#555555]">
                  No website content matched your current search or filter.
                </div>
              ) : (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-black text-[#444444]">
                        <tr>
                          <th className="p-3 w-10">
                            <input
                              type="checkbox"
                              aria-label="Select all visible records"
                              checked={
                                filteredContent.length > 0 &&
                                filteredContent.every((r) => selectedKeys.has(r.compositeKey))
                              }
                              onChange={toggleSelectAllFiltered}
                              className="w-4 h-4 accent-[#0B6B3A]"
                            />
                          </th>
                          <th className="p-3">Content &amp; Title</th>
                          <th className="p-3">Owner</th>
                          <th className="p-3">Section / Category</th>
                          <th className="p-3">Created</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {filteredContent.map((rec) => {
                          const checked = selectedKeys.has(rec.compositeKey);
                          return (
                            <tr
                              key={rec.compositeKey}
                              className={`hover:bg-[#F9FAFB] transition ${checked ? 'bg-[#F0FDF4]/60' : ''}`}
                            >
                              <td className="p-3 align-top">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSelectKey(rec.compositeKey)}
                                  aria-label={`Select ${rec.title}`}
                                  className="w-4 h-4 accent-[#0B6B3A]"
                                />
                              </td>
                              <td className="p-3 align-top">
                                <div className="flex items-start gap-2.5 max-w-sm">
                                  {rec.imageUrl && (
                                    <img
                                      src={rec.imageUrl}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                      className="w-10 h-10 rounded-lg object-cover border border-[#E5E7EB] shrink-0 bg-[#F5F5F5]"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-[#111111] line-clamp-2">
                                      {rec.title}
                                    </p>
                                    {rec.subtitle && (
                                      <p className="text-[11px] text-[#555555] line-clamp-1 mt-0.5">
                                        {rec.subtitle}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 align-top">
                                <p className="font-bold text-[#111111]">{rec.ownerName}</p>
                                {rec.ownerContact && (
                                  <p className="text-[11px] text-[#555555] font-mono tabular-nums">
                                    {rec.ownerContact}
                                  </p>
                                )}
                              </td>
                              <td className="p-3 align-top text-[#444444]">
                                <span className="font-bold text-[#111111] block">
                                  {rec.sectionTag}
                                </span>
                                <span className="text-[11px] text-[#555555]">
                                  {rec.categoryLabel}
                                </span>
                              </td>
                              <td className="p-3 align-top text-[11px] text-[#555555] tabular-nums whitespace-nowrap">
                                {new Date(rec.createdAt).toLocaleDateString('en-NG')}
                              </td>
                              <td className="p-3 align-top">
                                <span className="text-xs font-bold text-[#111111]">
                                  {rec.statusLabel}
                                </span>
                              </td>
                              <td className="p-3 align-top">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setInspectRecord(rec)}
                                    title="Inspect Record"
                                    className="p-1.5 rounded-lg border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#333333]"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {rec.supportsEdit && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditRecordTarget(rec);
                                        setEditDraft({
                                          title: String(rec.rawData.title || rec.rawData.celebrantName || rec.rawData.shopName || rec.rawData.name || ''),
                                          description: String(rec.rawData.description || rec.rawData.text || ''),
                                          price: String(rec.rawData.price ?? rec.rawData.budget ?? ''),
                                          location: String(rec.rawData.location || rec.rawData.venue || rec.rawData.area || ''),
                                          status: String(rec.rawData.status || '')
                                        });
                                      }}
                                      title="Edit Content"
                                      className="p-1.5 rounded-lg border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#0B6B3A]"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {rec.supportsApproval && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleApproveRejectUnified(rec, 'approve')}
                                        className="px-2 py-1 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-[11px] font-bold rounded-lg"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApproveRejectUnified(rec, 'reject')}
                                        className="px-2 py-1 bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#111111] text-[#111111] text-[11px] font-bold rounded-lg"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteConfirm({
                                        mode: 'single',
                                        items: [rec],
                                        reason: '',
                                        useSoft: Boolean(softDeleteMode && rec.supportsSoftDelete)
                                      })
                                    }
                                    title="Delete Content"
                                    className="p-1.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] hover:bg-[#B91C1C] hover:text-white text-[#B91C1C] transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'ads' ? (
            /* TAB 2: ADMIN ADVERTISING MANAGEMENT */
            <div className="space-y-4">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['all', 'pending_approval', 'active', 'paused', 'rejected', 'expired'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAdFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                          adFilter === st
                            ? 'bg-[#0B6B3A] text-white'
                            : 'bg-[#F5F5F5] text-[#444444] hover:text-[#111111]'
                        }`}
                      >
                        {st === 'all' ? 'All Ads' : st.replace('_', ' ')}
                      </button>
                    )
                  )}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-[#555555] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search business, owner, phone..."
                    value={adSearch}
                    onChange={(e) => setAdSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl outline-none"
                  />
                </div>
              </div>

              {filteredAds.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center text-xs text-[#555555]">
                  No advertisements found in this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAds.map((ad) => (
                    <div
                      key={ad.id}
                      className={`bg-white border rounded-2xl p-4 flex flex-col lg:flex-row gap-4 justify-between ${
                        ad.isDeleted ? 'border-[#FCA5A5] opacity-75' : 'border-[#E5E7EB]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 min-w-0 flex-1">
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          referrerPolicy="no-referrer"
                          className="w-full sm:w-44 h-28 object-cover rounded-xl border border-[#E5E7EB] shrink-0 bg-[#F5F5F5]"
                        />
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-black text-[#0B6B3A]">{ad.businessName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-bold text-[#111111]">{ad.packageName} ({formatNaira(ad.packagePrice)})</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-bold uppercase text-[#111111]">
                              Status: {ad.status}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-black uppercase ${
                                ad.paymentStatus === 'paid' ? 'text-[#0B6B3A]' : 'text-[#B91C1C]'
                              }`}
                            >
                              Payment: {ad.paymentStatus}
                            </span>
                            {ad.isFeatured && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-black text-[#EA580C]">Featured ★</span>
                              </>
                            )}
                          </div>

                          <h4 className="text-sm font-black text-[#111111]">{ad.title}</h4>
                          <p className="text-xs text-[#555555] line-clamp-2">{ad.description}</p>

                          <div className="text-[11px] text-[#444444] flex flex-wrap gap-x-3 gap-y-1 pt-1 tabular-nums">
                            <span>
                              Owner: <strong>{ad.ownerName}</strong>
                            </span>
                            <span>
                              Phone: <strong className="font-mono">{ad.phone}</strong>
                            </span>
                            <span>
                              WhatsApp: <strong className="font-mono">{ad.whatsappNumber}</strong>
                            </span>
                            <span>Location: {ad.location}</span>
                            {ad.paymentReference && (
                              <span>
                                Ref: <code className="font-mono">{ad.paymentReference}</code>
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-[#555555] flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
                            <span>
                              Start: {ad.startDate ? new Date(ad.startDate).toLocaleDateString('en-NG') : 'Not set'}
                            </span>
                            <span>
                              Expiry: {ad.expiryDate ? new Date(ad.expiryDate).toLocaleDateString('en-NG') : 'Not set'}
                            </span>
                            <span>Views: {ad.impressions}</span>
                            <span>Clicks: {ad.clicks}</span>
                            <span>WhatsApp Leads: {ad.whatsappClicks}</span>
                          </div>
                        </div>
                      </div>

                      {/* CEO Ad Controls */}
                      <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2 shrink-0">
                        {ad.paymentStatus !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyingPaymentAd(ad);
                              setVerifyMode(ad.paymentReference ? 'paystack_ref' : 'ceo_manual');
                              setVerifyRefInput(ad.paymentReference || '');
                            }}
                            className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black rounded-lg transition whitespace-nowrap flex items-center gap-1"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Verify Payment</span>
                          </button>
                        )}

                        {ad.status !== 'active' && (
                          <button
                            type="button"
                            onClick={async () => {
                              setErrorMsg(null);
                              try {
                                await adminApproveAndActivateAd(ad);
                                flash(`Activated "${ad.businessName}" on FU MARKET ADS.`);
                                await loadMasterData();
                                onDataChanged?.();
                              } catch (err: any) {
                                setErrorMsg(err?.message);
                              }
                            }}
                            className="px-3 py-1.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black rounded-lg transition whitespace-nowrap flex items-center gap-1"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>{ad.status === 'paused' ? 'Reactivate' : 'Approve & Publish'}</span>
                          </button>
                        )}

                        {ad.status === 'active' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await adminUpdateAdvertisement(ad, { status: 'paused' }, 'pause');
                              flash('Advertisement paused.');
                              await loadMasterData();
                              onDataChanged?.();
                            }}
                            className="px-3 py-1.5 bg-[#F5F5F5] border border-[#E5E7EB] text-[#111111] text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center gap-1"
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>
                        )}

                        {ad.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await adminUpdateAdvertisement(ad, { status: 'rejected' }, 'reject');
                              flash('Advertisement rejected.');
                              await loadMasterData();
                              onDataChanged?.();
                            }}
                            className="px-3 py-1.5 bg-[#F5F5F5] border border-[#E5E7EB] text-[#111111] text-xs font-bold rounded-lg transition whitespace-nowrap"
                          >
                            Reject
                          </button>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await adminUpdateAdvertisement(
                                ad,
                                { isFeatured: !ad.isFeatured },
                                'feature'
                              );
                              flash(ad.isFeatured ? 'Unfeatured advert.' : 'Featured advert on homepage.');
                              await loadMasterData();
                              onDataChanged?.();
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1 ${
                              ad.isFeatured
                                ? 'bg-[#F2B90D] border-[#F2B90D] text-[#111111]'
                                : 'bg-white border-[#E5E7EB] text-[#444444]'
                            }`}
                          >
                            <Star className="w-3.5 h-3.5" />
                            <span>{ad.isFeatured ? 'Featured' : 'Feature'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingAd({ ...ad })}
                            className="px-2.5 py-1.5 bg-white border border-[#E5E7EB] hover:border-[#0B6B3A] rounded-lg text-xs font-bold text-[#111111]"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                mode: 'ad_permanent',
                                items: [],
                                adTarget: ad,
                                reason: '',
                                useSoft: !ad.isDeleted
                              })
                            }
                            className="p-1.5 bg-[#FEF2F2] border border-[#FCA5A5] hover:bg-[#B91C1C] hover:text-white text-[#B91C1C] rounded-lg transition"
                            title="Delete Advertisement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'archive' ? (
            /* TAB 3: RECOVERY ARCHIVE */
            <div className="space-y-3">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                <h3 className="text-sm font-black text-[#111111]">
                  Soft-Deleted Content &amp; Recovery Archive
                </h3>
                <p className="text-xs text-[#555555]">
                  Restore accidentally deleted products, adverts, events, announcements, student posts, comments or listings directly back to their live Firestore collection.
                </p>
              </div>

              {archives.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center text-xs text-[#555555]">
                  Recovery archive is empty.
                </div>
              ) : (
                archives.map((arc) => (
                  <div
                    key={arc.id}
                    className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="text-xs text-[#555555] tabular-nums">
                        <strong className="text-[#111111]">{arc.contentType}</strong> · {arc.categoryLabel} · Deleted{' '}
                        {new Date(arc.deletedAt).toLocaleString('en-NG')}
                      </p>
                      <h4 className="text-sm font-black text-[#111111]">{arc.title}</h4>
                      <p className="text-xs text-[#555555]">
                        Owner: {arc.ownerName} {arc.deletionReason ? `· Reason: "${arc.deletionReason}"` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setErrorMsg(null);
                        try {
                          await restoreArchivedContent(arc);
                          flash(`Restored "${arc.title}" cleanly.`);
                          await loadMasterData();
                          onDataChanged?.();
                        } catch (err: any) {
                          setErrorMsg(err?.message || 'Restore failed.');
                        }
                      }}
                      className="px-4 py-2 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <ArchiveRestore className="w-4 h-4 text-[#F2B90D]" />
                      <span>Restore Content</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* TAB 4: PROTECTED RECORDS & AUDIT LOGS */
            <div className="space-y-5">
              <div className="bg-[#FFF8DB] border border-[#F2B90D] rounded-2xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#111111] shrink-0 mt-0.5" />
                <div className="text-xs text-[#111111] space-y-1">
                  <p className="font-black">Protected System Records (Excluded from Bulk Deletion)</p>
                  <p className="tabular-nums">
                    Admin accounts ({protectedStats.adminsProtected}), Verified Payment Ledgers ({payments.length}), Deletion Audit Logs ({auditLogs.length}), and Firebase Configuration are strictly protected against bulk deletion in both backend endpoints and Firestore Security Rules.
                  </p>
                </div>
              </div>

              {/* Payment Ledger */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-[#111111]">
                  Verified Advertising Payment Records (`adPayments`)
                </h3>
                {payments.length === 0 ? (
                  <p className="text-xs text-[#555555] py-4">No verified payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs tabular-nums">
                      <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-black text-[#444444]">
                        <tr>
                          <th className="p-2.5">Reference</th>
                          <th className="p-2.5">Business</th>
                          <th className="p-2.5">Package</th>
                          <th className="p-2.5">Amount</th>
                          <th className="p-2.5">Provider</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-2.5 font-mono text-[11px]">{p.reference}</td>
                            <td className="p-2.5 font-bold">{p.businessName}</td>
                            <td className="p-2.5 uppercase">{p.packageId}</td>
                            <td className="p-2.5 font-black text-[#0B6B3A]">
                              {formatNaira(p.amountNaira)}
                            </td>
                            <td className="p-2.5">{p.provider}</td>
                            <td className="p-2.5 font-bold">{p.status}</td>
                            <td className="p-2.5 text-[#555555]">
                              {new Date(p.verifiedAt || p.createdAt).toLocaleString('en-NG')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Immutable Deletion & Moderation Audit Log */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-[#111111]">
                  Immutable CEO Audit Logs (`adminAuditLogs`)
                </h3>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-[#555555] py-4">No audit entries recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs tabular-nums">
                      <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-black text-[#444444]">
                        <tr>
                          <th className="p-2.5">Action</th>
                          <th className="p-2.5">Content Type</th>
                          <th className="p-2.5">Record ID &amp; Title</th>
                          <th className="p-2.5">Administrator</th>
                          <th className="p-2.5">Reason</th>
                          <th className="p-2.5">Date &amp; Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {auditLogs.map((l) => (
                          <tr key={l.id}>
                            <td className="p-2.5 font-black uppercase text-[#0B6B3A]">{l.action}</td>
                            <td className="p-2.5 font-mono text-[11px]">{l.contentType}</td>
                            <td className="p-2.5">
                              <span className="font-mono text-[11px] text-[#555555] block">
                                {l.recordId}
                              </span>
                              {l.recordTitle && (
                                <span className="font-bold text-[#111111]">{l.recordTitle}</span>
                              )}
                            </td>
                            <td className="p-2.5">{l.adminEmail}</td>
                            <td className="p-2.5 text-[#555555]">{l.reason || '—'}</td>
                            <td className="p-2.5 text-[#555555]">
                              {new Date(l.createdAt).toLocaleString('en-NG')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EXACT ADMIN DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-2xl text-[#111111]">
            <h3 className="text-base font-black text-[#B91C1C]">
              {DELETE_CONFIRMATION_MESSAGE}
            </h3>

            {deleteConfirm.mode === 'bulk' ? (
              <p className="text-xs font-bold text-[#111111] tabular-nums">
                Selected records for deletion: {deleteConfirm.items.length}
              </p>
            ) : (
              <p className="text-xs text-[#444444]">
                Target:{' '}
                <strong>
                  {deleteConfirm.adTarget
                    ? `${deleteConfirm.adTarget.businessName} — ${deleteConfirm.adTarget.title}`
                    : deleteConfirm.items[0]?.title}
                </strong>
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-[#444444] mb-1">
                Deletion Reason (Optional, saved to Audit Log)
              </label>
              <input
                type="text"
                value={deleteConfirm.reason}
                onChange={(e) =>
                  setDeleteConfirm((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                }
                placeholder="e.g. Duplicate post, expired advert, spam, policy violation"
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl outline-none focus:border-[#0B6B3A]"
              />
            </div>

            {(deleteConfirm.mode === 'ad_permanent' ||
              deleteConfirm.items.some((i) => i.supportsSoftDelete)) && (
              <label className="flex items-center gap-2 text-xs font-semibold text-[#333333]">
                <input
                  type="checkbox"
                  checked={deleteConfirm.useSoft}
                  onChange={(e) =>
                    setDeleteConfirm((prev) =>
                      prev ? { ...prev, useSoft: e.target.checked } : null
                    )
                  }
                  className="w-4 h-4 accent-[#0B6B3A]"
                />
                <span>Soft-delete to Recovery Archive (can be restored later)</span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deletingNow}
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] text-[#111111] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingNow}
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white text-xs font-black rounded-xl"
              >
                {deletingNow ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT RECORD MODAL */}
      {inspectRecord && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto text-[#111111]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-sm font-black">
                Inspect · {inspectRecord.sectionTag}
              </h3>
              <button type="button" onClick={() => setInspectRecord(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            {inspectRecord.imageUrl && (
              <img
                src={inspectRecord.imageUrl}
                alt={inspectRecord.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-60 object-contain rounded-xl bg-[#F5F5F5] border border-[#E5E7EB]"
              />
            )}
            <pre className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(inspectRecord.rawData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* INLINE EDIT RECORD MODAL */}
      {editRecordTarget && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveInlineEdit}
            className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5 text-[#111111]"
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
              <h3 className="text-sm font-black">Edit {editRecordTarget.sectionTag}</h3>
              <button type="button" onClick={() => setEditRecordTarget(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Title / Name</label>
              <input
                type="text"
                value={editDraft.title}
                onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl outline-none focus:border-[#0B6B3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Description / Comment Text</label>
              <textarea
                rows={3}
                value={editDraft.description}
                onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl outline-none focus:border-[#0B6B3A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Price / Budget (₦)</label>
                <input
                  type="number"
                  value={editDraft.price}
                  onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl outline-none focus:border-[#0B6B3A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Location / Venue</label>
                <input
                  type="text"
                  value={editDraft.location}
                  onChange={(e) => setEditDraft((d) => ({ ...d, location: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl outline-none focus:border-[#0B6B3A]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditRecordTarget(null)}
                className="px-4 py-2 text-xs font-bold border border-[#E5E7EB] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-black bg-[#0B6B3A] text-white rounded-xl"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VERIFY AD PAYMENT MODAL */}
      {verifyingPaymentAd && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleVerifyPayment}
            className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4 text-[#111111]"
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
              <h3 className="text-sm font-black">
                Verify Payment · {verifyingPaymentAd.businessName}
              </h3>
              <button type="button" onClick={() => setVerifyingPaymentAd(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#555555] tabular-nums">
              Expected Package: <strong>{verifyingPaymentAd.packageName}</strong> (
              {formatNaira(verifyingPaymentAd.packagePrice)})
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold">
                <input
                  type="radio"
                  checked={verifyMode === 'ceo_manual'}
                  onChange={() => setVerifyMode('ceo_manual')}
                />
                <span>CEO Confirmed Transfer / Direct Payment (08167258121)</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold">
                <input
                  type="radio"
                  checked={verifyMode === 'paystack_ref'}
                  onChange={() => setVerifyMode('paystack_ref')}
                />
                <span>Verify Paystack Reference via Server</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                {verifyMode === 'paystack_ref'
                  ? 'Paystack Transaction Reference *'
                  : 'Transfer Reference / Receipt Note (Optional)'}
              </label>
              <input
                type="text"
                required={verifyMode === 'paystack_ref'}
                value={verifyRefInput}
                onChange={(e) => setVerifyRefInput(e.target.value)}
                placeholder={
                  verifyMode === 'paystack_ref' ? 'FUMKT_AD_...' : 'Bank receipt or WhatsApp confirmation'
                }
                className="w-full px-3 py-2 text-xs font-mono border border-[#E5E7EB] rounded-xl outline-none focus:border-[#0B6B3A]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyingPaymentAd(null)}
                className="px-4 py-2 text-xs font-bold border border-[#E5E7EB] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-black bg-[#0B6B3A] text-white rounded-xl"
              >
                Mark Payment Verified
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT ADVERTISEMENT MODAL (INCLUDING START & EXPIRY DATES) */}
      {editingAd && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveAdEdits}
            className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5 text-[#111111]"
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
              <h3 className="text-sm font-black">Edit Advertisement</h3>
              <button type="button" onClick={() => setEditingAd(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Business Name</label>
                <input
                  type="text"
                  value={editingAd.businessName}
                  onChange={(e) => setEditingAd({ ...editingAd, businessName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Business Category</label>
                <select
                  value={editingAd.businessCategory}
                  onChange={(e) =>
                    setEditingAd({ ...editingAd, businessCategory: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl bg-white"
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Advertisement Headline</label>
              <input
                type="text"
                value={editingAd.title}
                onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea
                rows={3}
                value={editingAd.description}
                onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Phone</label>
                <input
                  type="text"
                  value={editingAd.phone}
                  onChange={(e) => setEditingAd({ ...editingAd, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={editingAd.whatsappNumber}
                  onChange={(e) => setEditingAd({ ...editingAd, whatsappNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Start Date</label>
                <input
                  type="date"
                  value={editingAd.startDate ? editingAd.startDate.slice(0, 10) : ''}
                  onChange={(e) =>
                    setEditingAd({
                      ...editingAd,
                      startDate: e.target.value
                        ? new Date(`${e.target.value}T00:00:00.000Z`).toISOString()
                        : undefined
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editingAd.expiryDate ? editingAd.expiryDate.slice(0, 10) : ''}
                  onChange={(e) =>
                    setEditingAd({
                      ...editingAd,
                      expiryDate: e.target.value
                        ? new Date(`${e.target.value}T23:59:59.000Z`).toISOString()
                        : undefined
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAd(null)}
                className="px-4 py-2 text-xs font-bold border border-[#E5E7EB] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-black bg-[#0B6B3A] text-white rounded-xl"
              >
                Save Advertisement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
