import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArchiveRestore,
  CheckCircle2,
  Edit3,
  History,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X
} from 'lucide-react';
import {
  AdminAuditLogRecord,
  ContentArchiveRecord,
  UnifiedContentRecord,
  WebsiteContentFilterKey
} from '../types.js';
import {
  DELETE_CONFIRMATION_MESSAGE,
  approveOrRejectUnifiedRecord,
  bulkDeleteUnifiedContentRecords,
  deleteUnifiedContentRecord,
  editUnifiedContentRecord,
  fetchAllWebsiteContent,
  fetchArchivedContent,
  fetchImmutableAuditLogs,
  restoreArchivedContent
} from '../services/ceoMasterControl.js';

interface CeoContentManagementPanelProps {
  onFlash: (msg: string) => void;
  onError: (msg: string) => void;
}

const FILTER_OPTIONS: { key: WebsiteContentFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'products', label: 'Products' },
  { key: 'services', label: 'Services' },
  { key: 'advertisements', label: 'Advertisements' },
  { key: 'events', label: 'Events' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'sports', label: 'Sports' },
  { key: 'emergency', label: 'Emergency & Safety' },
  { key: 'business_listings', label: 'Businesses & Agents' },
  { key: 'student_posts', label: 'Student Posts' },
  { key: 'comments', label: 'Comments' },
  { key: 'other', label: 'Accommodation & Other' }
];

export const CeoContentManagementPanel: React.FC<CeoContentManagementPanelProps> = ({
  onFlash,
  onError
}) => {
  const [subTab, setSubTab] = useState<'content' | 'archive' | 'audit'>('content');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<UnifiedContentRecord[]>([]);
  const [archives, setArchives] = useState<ContentArchiveRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);
  const [protectedStats, setProtectedStats] = useState({
    paymentsCount: 0,
    auditLogsCount: 0,
    adminsProtected: 1
  });

  const [filterGroup, setFilterGroup] = useState<WebsiteContentFilterKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [softDeleteMode, setSoftDeleteMode] = useState(true);

  const [editTarget, setEditTarget] = useState<UnifiedContentRecord | null>(null);
  const [editDraft, setEditDraft] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    status: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    mode: 'single' | 'bulk';
    items: UnifiedContentRecord[];
    reason: string;
    useSoft: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [contentRes, archiveRes, logsRes] = await Promise.allSettled([
        fetchAllWebsiteContent(),
        fetchArchivedContent(),
        fetchImmutableAuditLogs()
      ]);

      if (contentRes.status === 'fulfilled') {
        setRecords(contentRes.value.records);
        setProtectedStats(contentRes.value.protectedStats);
      } else {
        onError(contentRes.reason?.message || 'Unable to load website content.');
      }

      if (archiveRes.status === 'fulfilled') setArchives(archiveRes.value);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value);
      setSelectedKeys(new Set());
    } catch (err: any) {
      onError(err?.message || 'Failed to load Content Management Centre.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter((rec) => {
      if (filterGroup !== 'all' && rec.filterGroup !== filterGroup) return false;
      if (!q) return true;
      return (
        rec.title.toLowerCase().includes(q) ||
        rec.ownerName.toLowerCase().includes(q) ||
        rec.categoryLabel.toLowerCase().includes(q) ||
        rec.sectionTag.toLowerCase().includes(q) ||
        rec.statusLabel.toLowerCase().includes(q)
      );
    });
  }, [records, filterGroup, searchTerm]);

  const selectedRecords = useMemo(
    () => filteredRecords.filter((r) => selectedKeys.has(r.compositeKey)),
    [filteredRecords, selectedKeys]
  );

  const toggleSelectAll = () => {
    const visibleKeys = filteredRecords.map((r) => r.compositeKey);
    const allSelected = visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.has(k));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const k of visibleKeys) {
        if (allSelected) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const reason = deleteConfirm.reason.trim() || undefined;
      if (deleteConfirm.mode === 'single' && deleteConfirm.items[0]) {
        await deleteUnifiedContentRecord(deleteConfirm.items[0], {
          softDelete: deleteConfirm.useSoft,
          reason
        });
        onFlash(
          deleteConfirm.useSoft
            ? 'Content moved to Recovery Archive.'
            : 'Content permanently deleted.'
        );
      } else if (deleteConfirm.mode === 'bulk') {
        const res = await bulkDeleteUnifiedContentRecords(deleteConfirm.items, {
          softDelete: deleteConfirm.useSoft,
          reason
        });
        onFlash(
          `Bulk delete finished: ${res.deleted} removed${res.failed ? `, ${res.failed} failed` : ''}.`
        );
      }
      setDeleteConfirm(null);
      await loadAll();
    } catch (err: any) {
      onError(err?.message || 'Delete operation failed.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      await editUnifiedContentRecord(editTarget, {
        ...(editDraft.title ? { title: editDraft.title } : {}),
        ...(editDraft.description !== undefined ? { description: editDraft.description } : {}),
        ...(editDraft.price !== '' ? { price: Number(editDraft.price) } : {}),
        ...(editDraft.location ? { location: editDraft.location } : {}),
        ...(editDraft.status ? { status: editDraft.status } : {})
      });
      setEditTarget(null);
      onFlash('Website content updated successfully.');
      await loadAll();
    } catch (err: any) {
      onError(err?.message || 'Failed to update record.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#087443] mb-1">
              <Layers className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>Centralized CEO Content Moderation</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#10251D]">
              NIGERIA CAMPUS MARKET Content Management Centre ({records.length} Records)
            </h2>
            <p className="text-xs text-[#10251D]/70">
              Manage products, accommodation, house agents, services, ads, events, sports updates, announcements, emergency reports &amp; comments. Protected collections: {protectedStats.adminsProtected} Admin(s), {protectedStats.paymentsCount} Payment(s), {protectedStats.auditLogsCount} Audit Log(s).
            </p>
          </div>
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D4A62A] ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Content</span>
          </button>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E7EB]">
          {[
            { id: 'content' as const, label: `All Website Content (${records.length})`, icon: Layers },
            { id: 'archive' as const, label: `Recovery Archive (${archives.length})`, icon: ArchiveRestore },
            { id: 'audit' as const, label: `Audit Logs (${auditLogs.length})`, icon: History }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  subTab === t.id
                    ? 'bg-[#087443] text-white'
                    : 'bg-[#F4F8F5] text-[#10251D] hover:bg-[#087443]/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${subTab === t.id ? 'text-[#D4A62A]' : 'text-[#087443]'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-xs font-bold text-[#10251D]/70">
          <Loader2 className="w-6 h-6 animate-spin text-[#087443] mx-auto mb-2" />
          Loading all website collections...
        </div>
      ) : subTab === 'content' ? (
        <div className="space-y-3">
          {/* Filter + Search + Bulk Controls */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-[#087443] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search title, author, category, status..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl outline-none text-[#10251D]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-2 font-bold text-[#10251D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={softDeleteMode}
                    onChange={(e) => setSoftDeleteMode(e.target.checked)}
                    className="accent-[#087443] w-4 h-4"
                  />
                  <span>Soft Delete to Recovery Archive</span>
                </label>

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
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bulk Delete ({selectedRecords.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#E5E7EB]">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilterGroup(opt.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterGroup === opt.key
                      ? 'bg-[#10251D] text-[#D4A62A]'
                      : 'bg-[#F4F8F5] text-[#10251D]/80 hover:text-[#10251D]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Table */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F8F5] border-b border-[#E5E7EB] text-[11px] font-black text-[#10251D] sticky top-0">
                  <tr>
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredRecords.length > 0 &&
                          filteredRecords.every((r) => selectedKeys.has(r.compositeKey))
                        }
                        onChange={toggleSelectAll}
                        className="accent-[#087443] w-4 h-4"
                        aria-label="Select all filtered content"
                      />
                    </th>
                    <th className="p-3">Content</th>
                    <th className="p-3">Section</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredRecords.slice(0, 200).map((rec) => {
                    const checked = selectedKeys.has(rec.compositeKey);
                    return (
                      <tr key={rec.compositeKey} className={checked ? 'bg-[#087443]/5' : 'hover:bg-[#F4F8F5]/60'}>
                        <td className="p-3 align-top">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedKeys((prev) => {
                                const next = new Set(prev);
                                if (next.has(rec.compositeKey)) next.delete(rec.compositeKey);
                                else next.add(rec.compositeKey);
                                return next;
                              })
                            }
                            className="accent-[#087443] w-4 h-4"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <div className="flex items-start gap-2 max-w-sm">
                            {rec.imageUrl && (
                              <img
                                src={rec.imageUrl}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-[#10251D] line-clamp-1">{rec.title}</p>
                              {rec.subtitle && (
                                <p className="text-[11px] text-[#10251D]/65 line-clamp-1">{rec.subtitle}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <span className="font-bold text-[#087443] block">{rec.sectionTag}</span>
                          <span className="text-[11px] text-[#10251D]/65">{rec.categoryLabel}</span>
                        </td>
                        <td className="p-3 align-top">
                          <span className="font-semibold text-[#10251D]">{rec.ownerName}</span>
                        </td>
                        <td className="p-3 align-top">
                          <span className="px-2 py-0.5 rounded bg-[#F4F8F5] border border-gray-200 font-bold text-[11px] text-[#10251D]">
                            {rec.statusLabel}
                          </span>
                        </td>
                        <td className="p-3 align-top">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {rec.supportsEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditTarget(rec);
                                  setEditDraft({
                                    title: String(
                                      rec.rawData.title ||
                                        rec.rawData.celebrantName ||
                                        rec.rawData.shopName ||
                                        rec.rawData.agentName ||
                                        rec.rawData.name ||
                                        ''
                                    ),
                                    description: String(
                                      rec.rawData.description || rec.rawData.bio || rec.rawData.text || ''
                                    ),
                                    price: String(rec.rawData.price ?? rec.rawData.budget ?? ''),
                                    location: String(
                                      rec.rawData.location ||
                                        rec.rawData.areaCovered ||
                                        rec.rawData.venue ||
                                        rec.rawData.area ||
                                        ''
                                    ),
                                    status: String(rec.rawData.status || '')
                                  });
                                }}
                                title="Edit"
                                className="p-1.5 rounded-lg border border-gray-200 hover:border-[#087443] text-[#087443] cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {rec.supportsApproval && (
                              <>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await approveOrRejectUnifiedRecord(rec, 'approve');
                                    onFlash(`Approved "${rec.title}".`);
                                    await loadAll();
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[#087443] text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await approveOrRejectUnifiedRecord(rec, 'reject');
                                    onFlash(`Rejected "${rec.title}".`);
                                    await loadAll();
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[#F4F8F5] border border-gray-300 text-[#10251D] text-[11px] font-bold cursor-pointer"
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
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 transition cursor-pointer"
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
        </div>
      ) : subTab === 'archive' ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-3">
          <h3 className="text-sm font-black text-[#10251D]">
            Soft-Deleted Content Recovery Archive ({archives.length})
          </h3>
          {archives.length === 0 ? (
            <p className="text-xs text-[#10251D]/65 py-6 text-center">
              Recovery archive is empty.
            </p>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {archives.map((arc) => (
                <div
                  key={arc.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <strong className="text-[#10251D]">{arc.title}</strong>
                    <p className="text-[11px] text-[#10251D]/70">
                      {arc.contentType} ({arc.sourceCollection}) • Deleted {new Date(arc.deletedAt).toLocaleString()}
                      {arc.deletionReason ? ` • Reason: ${arc.deletionReason}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await restoreArchivedContent(arc);
                      onFlash(`Restored "${arc.title}" back to ${arc.sourceCollection}.`);
                      await loadAll();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5 text-[#D4A62A]" />
                    <span>Restore Content</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-3">
          <h3 className="text-sm font-black text-[#10251D]">
            Immutable CEO Moderation Audit Trail ({auditLogs.length})
          </h3>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-[#10251D]/65 py-6 text-center">No audit records yet.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A] text-[10px] font-black uppercase mr-2">
                      {log.action}
                    </span>
                    <strong className="text-[#10251D]">{log.recordTitle || log.recordId}</strong>
                    <span className="text-[#10251D]/65 ml-1.5">({log.contentType})</span>
                    {log.reason && <p className="text-[11px] text-[#10251D]/70 mt-1">Reason: {log.reason}</p>}
                  </div>
                  <span className="text-[11px] text-[#10251D]/60 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-[#087443]/25 shadow-2xl">
            <div className="bg-[#087443] text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="font-black text-sm">Edit Content ({editTarget.sectionTag})</h4>
              <button type="button" onClick={() => setEditTarget(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#10251D] mb-1">Title / Name</label>
                <input
                  type="text"
                  value={editDraft.title}
                  onChange={(e) => setEditDraft((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 outline-none focus:border-[#087443]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#10251D] mb-1">Description / Bio</label>
                <textarea
                  rows={3}
                  value={editDraft.description}
                  onChange={(e) => setEditDraft((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 outline-none focus:border-[#087443]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Price (₦)</label>
                  <input
                    type="number"
                    value={editDraft.price}
                    onChange={(e) => setEditDraft((p) => ({ ...p, price: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 outline-none focus:border-[#087443]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#10251D] mb-1">Location</label>
                  <input
                    type="text"
                    value={editDraft.location}
                    onChange={(e) => setEditDraft((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 outline-none focus:border-[#087443]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exact Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-red-200 shadow-2xl">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h4 className="font-black text-sm">{DELETE_CONFIRMATION_MESSAGE}</h4>
            </div>
            <p className="text-xs text-[#10251D]">
              You are about to {deleteConfirm.useSoft ? 'archive (soft delete)' : 'permanently delete'}{' '}
              <strong>{deleteConfirm.items.length}</strong> record(s).
            </p>
            <input
              type="text"
              value={deleteConfirm.reason}
              onChange={(e) => setDeleteConfirm((p) => (p ? { ...p, reason: e.target.value } : null))}
              placeholder="Optional moderation reason (logged in audit trail)..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:border-[#087443]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                  Confirm Delete
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
