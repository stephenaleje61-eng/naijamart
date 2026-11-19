import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquareReply,
  Phone,
  Search,
  Sparkles,
  Trash2,
  XCircle
} from 'lucide-react';
import { AdvertisingRequest, AdvertisingRequestStatus } from '../types.js';
import {
  adminDeleteAdRequest,
  adminUpdateAdRequestStatus,
  getAdTypeLabel,
  getAudienceScopeLabel
} from '../services/ads.js';
import { getInstitutionById } from '../constants/institutions.js';

interface AdRequestsInboxPanelProps {
  requests: AdvertisingRequest[];
  onRefresh: () => Promise<void>;
  onFlash: (msg: string) => void;
  onError: (msg: string) => void;
  onConvertToAd: (req: AdvertisingRequest) => void;
}

function buildRequestWhatsAppHref(req: AdvertisingRequest): string {
  const digits = (req.whatsappNumber || req.phone || '').replace(/\D/g, '');
  const intl =
    digits.startsWith('0') && digits.length === 11
      ? `234${digits.slice(1)}`
      : digits.startsWith('234')
      ? digits
      : `234${digits}`;
  const msg = `Hello ${req.advertiserName} (${req.businessName}), thank you for your advertising request on NIGERIA CAMPUS MARKET.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export const AdRequestsInboxPanel: React.FC<AdRequestsInboxPanelProps> = ({
  requests,
  onRefresh,
  onFlash,
  onError,
  onConvertToAd
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | AdvertisingRequestStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [confirmDeleteReq, setConfirmDeleteReq] = useState<AdvertisingRequest | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const counts = useMemo(() => {
    const res = { all: requests.length, pending: 0, approved: 0, converted: 0, rejected: 0 };
    for (const r of requests) {
      if (r.status === 'pending') res.pending += 1;
      else if (r.status === 'approved') res.approved += 1;
      else if (r.status === 'converted') res.converted += 1;
      else if (r.status === 'rejected') res.rejected += 1;
    }
    return res;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (!q) return true;
      return (
        req.businessName.toLowerCase().includes(q) ||
        req.advertiserName.toLowerCase().includes(q) ||
        req.phone.toLowerCase().includes(q) ||
        (req.email || '').toLowerCase().includes(q) ||
        req.category.toLowerCase().includes(q) ||
        req.message.toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, searchTerm]);

  const openReplyEditor = (req: AdvertisingRequest) => {
    if (replyTargetId === req.id) {
      setReplyTargetId(null);
      return;
    }
    setReplyTargetId(req.id);
    setReplyDraft(req.adminReply || '');
    setNotesDraft(req.adminNotes || '');
  };

  const handleSaveReply = async (req: AdvertisingRequest) => {
    setBusyId(req.id);
    try {
      await adminUpdateAdRequestStatus(req.id, {
        adminReply: replyDraft,
        adminNotes: notesDraft
      });
      setReplyTargetId(null);
      onFlash(`Saved reply & internal notes for ${req.businessName}.`);
      await onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Failed to save reply.');
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (req: AdvertisingRequest, nextStatus: AdvertisingRequestStatus) => {
    setBusyId(req.id);
    try {
      await adminUpdateAdRequestStatus(req.id, { status: nextStatus });
      onFlash(`Marked ${req.businessName} request as ${nextStatus}.`);
      await onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Status update failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#075B3B] mb-1">
              <Inbox className="w-3.5 h-3.5 text-[#F2C94C]" />
              <span>Advertising Requests &amp; Business Inquiries</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#202B26]">
              Advertising Request Inbox ({requests.length})
            </h2>
            <p className="text-xs text-[#202B26]/70 mt-0.5">
              Review nationwide business inquiries, contact advertisers directly, approve or reject requests, or convert any request into a live Sponsored Advertisement.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-[#F2C94C]/25 border border-[#F2C94C] font-black text-[#202B26] tabular-nums">
              {counts.pending} Pending Review
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[#E6EFEA]">
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'pending', 'approved', 'converted', 'rejected'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer tabular-nums ${
                  statusFilter === st
                    ? 'bg-[#075B3B] text-[#FFFFFF]'
                    : 'bg-[#F4F7F5] text-[#202B26]/80 hover:text-[#202B26]'
                }`}
              >
                {st} ({counts[st]})
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#075B3B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search business, name, phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F7F5] border border-[#D9E5DF] focus:border-[#075B3B] rounded-xl outline-none text-[#202B26]"
            />
          </div>
        </div>
      </div>

      {/* Request Cards */}
      {filtered.length === 0 ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-10 text-center text-xs text-[#202B26]/70">
          No advertising requests match this filter yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isBusy = busyId === req.id;
            const statusStyle =
              req.status === 'pending'
                ? 'bg-[#F2C94C]/30 text-[#202B26] border-[#F2C94C]'
                : req.status === 'approved'
                ? 'bg-[#0B8050]/15 text-[#075B3B] border-[#0B8050]/30'
                : req.status === 'converted'
                ? 'bg-[#075B3B] text-[#FFFFFF] border-[#075B3B]'
                : 'bg-red-50 text-red-700 border-red-200';

            return (
              <div
                key={req.id}
                className="bg-[#FFFFFF] rounded-2xl border border-[#D9E5DF] p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-[#075B3B]">{req.businessName}</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase ${statusStyle}`}>
                        {req.status}
                      </span>
                      {req.adType && (
                        <span className="px-2 py-0.5 rounded-md bg-[#F4F7F5] border border-[#D9E5DF] text-[10px] font-bold text-[#202B26]">
                          {getAdTypeLabel(req.adType)}
                        </span>
                      )}
                      {req.preferredPackageId && (
                        <span className="px-2 py-0.5 rounded-md bg-[#F4F7F5] text-[10px] font-extrabold uppercase text-[#0B8050]">
                          Prefers {req.preferredPackageId}
                        </span>
                      )}
                      <span className="text-[11px] text-[#202B26]/60 tabular-nums">
                        {new Date(req.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#202B26]/80">
                      <span>
                        Contact: <strong>{req.advertiserName}</strong>
                      </span>
                      <span>
                        Category: <strong>{req.category}</strong>
                      </span>
                      <span>
                        Target:{' '}
                        <strong>
                          {req.targetAudience ? getAudienceScopeLabel(req.targetAudience) : 'Nationwide'}
                          {req.targetInstitutionId && req.targetInstitutionId !== 'all'
                            ? ` (${getInstitutionById(req.targetInstitutionId).shortName})`
                            : ''}
                        </strong>
                      </span>
                    </div>

                    <p className="text-xs text-[#202B26] bg-[#F4F7F5] rounded-xl p-3 border border-[#E6EFEA] whitespace-pre-line">
                      {req.message}
                    </p>

                    {req.attachments && req.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {req.attachments.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewImg(url)}
                            className="w-16 h-16 rounded-lg overflow-hidden border border-[#D9E5DF] hover:border-[#075B3B] transition cursor-pointer"
                            title="Inspect uploaded attachment"
                          >
                            <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {(req.adminReply || req.adminNotes) && (
                      <div className="rounded-xl bg-[#F4F7F5] border border-[#0B8050]/25 p-2.5 text-[11px] space-y-1">
                        {req.adminReply && (
                          <p className="text-[#075B3B]">
                            <strong>Admin Reply:</strong> {req.adminReply}
                          </p>
                        )}
                        {req.adminNotes && (
                          <p className="text-[#202B26]/75">
                            <strong>Internal Note:</strong> {req.adminNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Direct Contact + Workflow Actions */}
                  <div className="flex flex-col gap-2 shrink-0 lg:items-end">
                    <div className="flex flex-wrap gap-1.5">
                      <a
                        href={`tel:${req.phone}`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#F4F7F5] hover:bg-[#E6EFEA] border border-[#D9E5DF] text-xs font-bold text-[#202B26] inline-flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#075B3B]" />
                        <span>{req.phone}</span>
                      </a>
                      <a
                        href={buildRequestWhatsAppHref(req)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#0B8050] hover:bg-[#075B3B] text-[#FFFFFF] text-xs font-bold inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#F2C94C]" />
                        <span>WhatsApp</span>
                      </a>
                      {req.email && (
                        <a
                          href={`mailto:${req.email}?subject=${encodeURIComponent(
                            `NIGERIA CAMPUS MARKET Advertising — ${req.businessName}`
                          )}`}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F4F7F5] hover:bg-[#E6EFEA] border border-[#D9E5DF] text-xs font-bold text-[#202B26] inline-flex items-center gap-1"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#075B3B]" />
                          <span>Email</span>
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onConvertToAd(req)}
                        className="px-3 py-1.5 rounded-lg bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#F2C94C]" />
                        <span>Convert to Advertisement</span>
                      </button>

                      {req.status !== 'approved' && req.status !== 'converted' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(req, 'approved')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0B8050]/10 hover:bg-[#0B8050]/20 text-[#075B3B] border border-[#0B8050]/30 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      {req.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(req, 'rejected')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F4F7F5] hover:bg-red-50 text-[#202B26] hover:text-red-700 border border-[#D9E5DF] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openReplyEditor(req)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#F4F7F5] hover:bg-[#F2C94C]/25 border border-[#D9E5DF] text-[#202B26] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquareReply className="w-3.5 h-3.5 text-[#075B3B]" />
                        <span>Reply / Note</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteReq(req)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-[#FFFFFF] border border-red-200 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Reply / Notes Drawer */}
                {replyTargetId === req.id && (
                  <div className="pt-3 border-t border-[#E6EFEA] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-[#202B26] mb-1">Admin Reply Summary</label>
                      <textarea
                        rows={2}
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder="Record pricing sent, approval instructions, or response message..."
                        className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#F4F7F5] focus:bg-[#FFFFFF] focus:border-[#075B3B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#202B26] mb-1">Private Admin Notes</label>
                      <textarea
                        rows={2}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Payment status, follow-up date, placement advice..."
                        className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#F4F7F5] focus:bg-[#FFFFFF] focus:border-[#075B3B] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyTargetId(null)}
                        className="px-3.5 py-1.5 rounded-lg border border-[#D9E5DF] text-xs font-bold text-[#202B26] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSaveReply(req)}
                        className="px-4 py-1.5 rounded-lg bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Reply &amp; Notes</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attachment Lightbox */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="max-w-2xl w-full bg-[#FFFFFF] rounded-2xl p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            <img src={previewImg} alt="Request attachment" className="w-full max-h-[75vh] object-contain rounded-xl" />
            <div className="flex justify-between items-center text-xs px-1">
              <a
                href={previewImg}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#075B3B] font-bold inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Full Image
              </a>
              <button
                type="button"
                onClick={() => setPreviewImg(null)}
                className="px-3 py-1 rounded-lg bg-[#075B3B] text-[#FFFFFF] font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDeleteReq && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-2xl max-w-md w-full p-5 space-y-4 border border-[#D9E5DF] shadow-2xl">
            <h4 className="font-black text-sm text-red-700">Delete Advertising Request</h4>
            <p className="text-xs text-[#202B26]">
              Permanently remove the request from <strong>{confirmDeleteReq.businessName}</strong> ({confirmDeleteReq.advertiserName})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteReq(null)}
                className="px-4 py-2 rounded-xl border border-[#D9E5DF] text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmDeleteReq.id}
                onClick={async () => {
                  const target = confirmDeleteReq;
                  setBusyId(target.id);
                  try {
                    await adminDeleteAdRequest(target.id, target.businessName);
                    setConfirmDeleteReq(null);
                    onFlash(`Deleted advertising request from ${target.businessName}.`);
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
