import React, { useEffect, useMemo, useState } from 'react';
import {
  Phone,
  AlertOctagon,
  Megaphone,
  PackageSearch,
  History,
  Download,
  CheckCircle2,
  Trash2,
  Plus,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  Search
} from 'lucide-react';
import {
  EmergencyAuditLog,
  EmergencyContact,
  EmergencyDepartment,
  EmergencyReport,
  EmergencyReportStatus,
  LostFoundItem,
  LostFoundPrivateRecord,
  LostFoundStatus,
  SafetyAnnouncement,
  SafetyAnnouncementCategory,
  SafetyAnnouncementSeverity
} from '../types.js';
import {
  EMERGENCY_DEPARTMENT_OPTIONS,
  EMERGENCY_REPORT_STATUSES,
  SAFETY_ANNOUNCEMENT_CATEGORIES,
  deleteEmergencyContact,
  deleteEmergencyReport,
  deleteLostFoundItem,
  deleteSafetyAnnouncement,
  exportEmergencyReportsCsv,
  fetchLostFoundPrivateForAdmin,
  publishSafetyAnnouncement,
  saveEmergencyContact,
  subscribeToEmergencyAuditLogsForAdmin,
  subscribeToEmergencyContacts,
  subscribeToEmergencyReportsForAdmin,
  subscribeToLostFoundItems,
  subscribeToSafetyAnnouncements,
  toggleEmergencyContactVerification,
  toggleLostFoundHidden,
  toggleSafetyAnnouncementActive,
  updateEmergencyReportStatus,
  updateLostFoundStatus
} from '../services/emergencyCentre.js';

interface AdminEmergencyTabProps {
  onStatusMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

type EmergencySubTab =
  | 'reports'
  | 'contacts'
  | 'announcements'
  | 'lost-found'
  | 'audit';

export const AdminEmergencyTab: React.FC<AdminEmergencyTabProps> = ({
  onStatusMessage,
  onErrorMessage
}) => {
  const [subTab, setSubTab] = useState<EmergencySubTab>('reports');

  // Real-time collections
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [announcements, setAnnouncements] = useState<SafetyAnnouncement[]>([]);
  const [lostFoundItems, setLostFoundItems] = useState<LostFoundItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<EmergencyAuditLog[]>([]);

  // Report Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EmergencyReportStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [reportNoteDrafts, setReportNoteDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteReportId, setConfirmDeleteReportId] = useState<string | null>(null);

  // Contact Editor Form
  const [editingContactId, setEditingContactId] = useState<string | undefined>(undefined);
  const [contactName, setContactName] = useState('');
  const [contactDept, setContactDept] = useState<EmergencyDepartment>('security');
  const [contactPhone, setContactPhone] = useState('');
  const [contactHours, setContactHours] = useState('24/7');
  const [contactDesc, setContactDesc] = useState('');
  const [contactVerified, setContactVerified] = useState(true);
  const [savingContact, setSavingContact] = useState(false);

  // Safety Announcement Form
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | undefined>(undefined);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertCategory, setAlertCategory] = useState<SafetyAnnouncementCategory>('safety_notice');
  const [alertSeverity, setAlertSeverity] = useState<SafetyAnnouncementSeverity>('important');
  const [alertDesc, setAlertDesc] = useState('');
  const [alertPinned, setAlertPinned] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);

  // Lost & Found private hint inspector
  const [privateHintMap, setPrivateHintMap] = useState<Record<string, LostFoundPrivateRecord | null>>({});

  useEffect(() => {
    let unsubReports = () => {};
    let unsubAudit = () => {};
    try {
      unsubReports = subscribeToEmergencyReportsForAdmin(
        (list) => setReports(list),
        (err) => onErrorMessage(err.message)
      );
      unsubAudit = subscribeToEmergencyAuditLogsForAdmin((logs) => setAuditLogs(logs));
    } catch (err: any) {
      onErrorMessage(err?.message || 'Admin authorization required for emergency queue.');
    }

    const unsubContacts = subscribeToEmergencyContacts((list) => setContacts(list));
    const unsubAlerts = subscribeToSafetyAnnouncements(
      (list) => setAnnouncements(list),
      undefined,
      true
    );
    const unsubLnf = subscribeToLostFoundItems(
      (list) => setLostFoundItems(list),
      undefined,
      true
    );

    return () => {
      unsubReports();
      unsubAudit();
      unsubContacts();
      unsubAlerts();
      unsubLnf();
    };
  }, []);

  const distinctCategories = useMemo(
    () => Array.from(new Set(reports.map((r) => r.reportType))).sort(),
    [reports]
  );

  const distinctLocations = useMemo(
    () => Array.from(new Set(reports.map((r) => r.location))).sort(),
    [reports]
  );

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && r.reportType !== categoryFilter) return false;
      if (locationFilter !== 'all' && r.location !== locationFilter) return false;

      if (dateFrom) {
        const fromMs = new Date(dateFrom).getTime();
        if (new Date(r.createdAt).getTime() < fromMs) return false;
      }
      if (dateTo) {
        const toMs = new Date(dateTo + 'T23:59:59').getTime();
        if (new Date(r.createdAt).getTime() > toMs) return false;
      }

      if (!q) return true;
      return (
        r.reportId.toLowerCase().includes(q) ||
        r.reportType.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        (r.contactPhone || '').toLowerCase().includes(q)
      );
    });
  }, [reports, statusFilter, categoryFilter, locationFilter, dateFrom, dateTo, searchQuery]);

  const handleUpdateStatus = async (report: EmergencyReport, nextStatus: EmergencyReportStatus) => {
    try {
      const note =
        reportNoteDrafts[report.reportId] !== undefined
          ? reportNoteDrafts[report.reportId]
          : report.adminNotes;
      await updateEmergencyReportStatus(report, nextStatus, note);
      onStatusMessage(`Report ${report.reportId} updated to ${nextStatus}.`);
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to update report status.');
    }
  };

  const handleDeleteReport = async (report: EmergencyReport) => {
    try {
      await deleteEmergencyReport(report);
      setConfirmDeleteReportId(null);
      onStatusMessage(`Removed report ${report.reportId}.`);
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to delete report.');
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      await saveEmergencyContact({
        id: editingContactId,
        name: contactName,
        department: contactDept,
        phone: contactPhone,
        operatingHours: contactHours,
        description: contactDesc,
        verified: contactVerified
      });
      setEditingContactId(undefined);
      setContactName('');
      setContactPhone('');
      setContactHours('24/7');
      setContactDesc('');
      setContactVerified(true);
      onStatusMessage(
        editingContactId ? 'Emergency contact updated.' : 'Emergency contact added.'
      );
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to save emergency contact.');
    } finally {
      setSavingContact(false);
    }
  };

  const handleEditContact = (c: EmergencyContact) => {
    setEditingContactId(c.id);
    setContactName(c.name);
    setContactDept(c.department);
    setContactPhone(c.phone);
    setContactHours(c.operatingHours);
    setContactDesc(c.description);
    setContactVerified(c.verified);
  };

  const handlePublishAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAlert(true);
    try {
      await publishSafetyAnnouncement({
        id: editingAnnouncementId,
        title: alertTitle,
        category: alertCategory,
        severity: alertSeverity,
        description: alertDesc,
        isPinned: alertPinned
      });
      setEditingAnnouncementId(undefined);
      setAlertTitle('');
      setAlertDesc('');
      setAlertPinned(false);
      onStatusMessage(
        editingAnnouncementId
          ? 'Safety announcement updated.'
          : 'Campus safety announcement published!'
      );
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to publish safety announcement.');
    } finally {
      setSavingAlert(false);
    }
  };

  const handleInspectPrivateClaim = async (itemId: string) => {
    if (privateHintMap[itemId] !== undefined) return;
    const priv = await fetchLostFoundPrivateForAdmin(itemId);
    setPrivateHintMap((prev) => ({ ...prev, [itemId]: priv }));
  };

  return (
    <div className="space-y-5">
      {/* Live Overview Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7EB]">
          <span className="text-[10px] font-bold uppercase text-[#64748B] block">
            Open Queue
          </span>
          <span className="text-xl font-black text-[#DC2626] tabular-nums">
            {reports.filter((r) => r.status === 'Received' || r.status === 'Under Review').length}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7EB]">
          <span className="text-[10px] font-bold uppercase text-[#64748B] block">
            Total Reports
          </span>
          <span className="text-xl font-black text-[#0F1E3D] tabular-nums">
            {reports.length}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7EB]">
          <span className="text-[10px] font-bold uppercase text-[#64748B] block">
            Verified Numbers
          </span>
          <span className="text-xl font-black text-[#087443] tabular-nums">
            {contacts.filter((c) => c.verified).length}/{contacts.length}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7EB]">
          <span className="text-[10px] font-bold uppercase text-[#64748B] block">
            Active Alerts
          </span>
          <span className="text-xl font-black text-[#0F1E3D] tabular-nums">
            {announcements.filter((a) => a.isActive).length}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7EB]">
          <span className="text-[10px] font-bold uppercase text-[#64748B] block">
            Lost &amp; Found
          </span>
          <span className="text-xl font-black text-[#0F1E3D] tabular-nums">
            {lostFoundItems.length}
          </span>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-[#E5E7EB]">
        {[
          { id: 'reports' as EmergencySubTab, label: `Reports Queue (${reports.length})`, icon: AlertOctagon },
          { id: 'contacts' as EmergencySubTab, label: `Emergency Contacts (${contacts.length})`, icon: Phone },
          { id: 'announcements' as EmergencySubTab, label: `Safety Alerts (${announcements.length})`, icon: Megaphone },
          { id: 'lost-found' as EmergencySubTab, label: `Lost & Found (${lostFoundItems.length})`, icon: PackageSearch },
          { id: 'audit' as EmergencySubTab, label: `Audit Logs (${auditLogs.length})`, icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                subTab === tab.id
                  ? 'bg-[#0F1E3D] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: REPORTS QUEUE */}
      {subTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reference ID, category, location, phone..."
                  className="w-full min-h-[40px] pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => exportEmergencyReportsCsv(filteredReports)}
                disabled={filteredReports.length === 0}
                className="min-h-[40px] px-4 py-1.5 bg-[#087443] hover:bg-[#065D36] disabled:opacity-50 text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV ({filteredReports.length})</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="min-h-[38px] px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
              >
                <option value="all">All Statuses</option>
                {EMERGENCY_REPORT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="min-h-[38px] px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
              >
                <option value="all">All Categories</option>
                {distinctCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="min-h-[38px] px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
              >
                <option value="all">All Locations</option>
                {distinctLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Filter from date"
                className="min-h-[38px] px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
              />

              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Filter to date"
                className="min-h-[38px] px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
              />
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] text-center text-xs text-[#64748B]">
              No emergency or security concern reports match the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((rep) => {
                const isExpanded = expandedReportId === rep.reportId;
                const noteValue =
                  reportNoteDrafts[rep.reportId] !== undefined
                    ? reportNoteDrafts[rep.reportId]
                    : rep.adminNotes || '';
                return (
                  <div
                    key={rep.reportId}
                    className="bg-white p-4 rounded-2xl border border-[#E5E7EB] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded font-black uppercase ${
                              rep.kind === 'emergency'
                                ? 'bg-[#DC2626] text-white'
                                : 'bg-[#0F1E3D] text-white'
                            }`}
                          >
                            {rep.kind === 'emergency' ? 'Emergency' : 'Security Concern'}
                          </span>
                          <span className="font-mono font-black text-[#0F1E3D] tabular-nums">
                            {rep.reportId}
                          </span>
                          {rep.isConfidential && (
                            <span className="inline-flex items-center gap-1 text-[#0F1E3D] font-bold">
                              <Lock className="w-3 h-3" /> Confidential
                            </span>
                          )}
                          <span className="text-[#64748B] tabular-nums">
                            · {new Date(rep.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-[#10251D] mt-1">
                          {rep.reportType} — {rep.location}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={rep.status}
                          onChange={(e) =>
                            handleUpdateStatus(rep, e.target.value as EmergencyReportStatus)
                          }
                          className="min-h-[38px] px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-black text-[#0F1E3D]"
                        >
                          {EMERGENCY_REPORT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedReportId(isExpanded ? null : rep.reportId)
                          }
                          className="min-h-[38px] px-3 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F1E3D]"
                        >
                          {isExpanded ? 'Hide Details' : 'Inspect'}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#334155] leading-relaxed">{rep.description}</p>

                    {isExpanded && (
                      <div className="pt-3 border-t border-[#E5E7EB] space-y-3 text-xs">
                        <div className="flex flex-wrap gap-4 text-[#475569]">
                          <span>
                            <strong>Incident Time:</strong> {rep.incidentDate}
                          </span>
                          <span>
                            <strong>Reporter:</strong>{' '}
                            {rep.isConfidential
                              ? 'Confidential Reporter'
                              : rep.reporterName || 'Anonymous'}
                          </span>
                          <span>
                            <strong>Contact Phone:</strong> {rep.contactPhone || 'Not provided'}
                          </span>
                        </div>

                        {rep.attachmentUrls && rep.attachmentUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {rep.attachmentUrls.map((url, idx) => (
                              <a
                                key={url + idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-20 h-20 rounded-xl overflow-hidden border border-[#CBD5E1]"
                              >
                                <img
                                  src={url}
                                  alt={`Attachment ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={noteValue}
                            onChange={(e) =>
                              setReportNoteDrafts((prev) => ({
                                ...prev,
                                [rep.reportId]: e.target.value
                              }))
                            }
                            placeholder="Optional status update / resolution note (visible to tracker)..."
                            className="flex-1 min-h-[40px] px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(rep, rep.status)}
                            className="min-h-[40px] px-4 bg-[#087443] text-white text-xs font-black rounded-xl"
                          >
                            Save Note
                          </button>

                          {confirmDeleteReportId === rep.reportId ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteReport(rep)}
                                className="min-h-[40px] px-3 bg-[#DC2626] text-white text-xs font-black rounded-xl"
                              >
                                Confirm Remove
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteReportId(null)}
                                className="min-h-[40px] px-3 bg-[#F1F5F9] text-xs font-bold rounded-xl"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteReportId(rep.reportId)}
                              className="min-h-[40px] px-3 bg-[#FEF2F2] text-[#DC2626] text-xs font-black rounded-xl inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: EMERGENCY CONTACTS CRUD */}
      {subTab === 'contacts' && (
        <div className="space-y-4">
          <form
            onSubmit={handleSaveContact}
            className="bg-white p-4 rounded-2xl border border-[#E5E7EB] space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-[#0F1E3D]">
                {editingContactId ? 'Edit Emergency Contact' : 'Add Official Emergency Contact'}
              </h4>
              {editingContactId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingContactId(undefined);
                    setContactName('');
                    setContactPhone('');
                    setContactDesc('');
                  }}
                  className="text-xs font-bold text-[#64748B] hover:text-[#10251D]"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Organisation / Unit Name"
                className="min-h-[40px] px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
              />
              <select
                value={contactDept}
                onChange={(e) => setContactDept(e.target.value as EmergencyDepartment)}
                className="min-h-[40px] px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
              >
                {EMERGENCY_DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Verified Phone Number"
                className="min-h-[40px] px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs tabular-nums"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={contactHours}
                onChange={(e) => setContactHours(e.target.value)}
                placeholder="Operating Hours (e.g. 24/7)"
                className="min-h-[40px] px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
              />
              <input
                type="text"
                required
                value={contactDesc}
                onChange={(e) => setContactDesc(e.target.value)}
                placeholder="Service description (e.g. Main Gate Security Desk)"
                className="sm:col-span-2 min-h-[40px] px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-[#0F1E3D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactVerified}
                  onChange={(e) => setContactVerified(e.target.checked)}
                  className="w-4 h-4 accent-[#087443]"
                />
                <span>Mark as Verified Emergency Contact</span>
              </label>

              <button
                type="submit"
                disabled={savingContact}
                className="min-h-[40px] px-5 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {savingContact
                    ? 'Saving...'
                    : editingContactId
                    ? 'Update Contact'
                    : 'Save Contact'}
                </span>
              </button>
            </div>
          </form>

          <div className="space-y-2.5">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="bg-white p-3.5 rounded-2xl border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-[#0F1E3D]">{c.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        c.verified
                          ? 'bg-[#ECFDF5] text-[#087443]'
                          : 'bg-[#FFFBEB] text-[#92400E]'
                      }`}
                    >
                      {c.verified ? 'Verified' : 'Unverified'}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      · {EMERGENCY_DEPARTMENT_OPTIONS.find((d) => d.id === c.department)?.shortLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] mt-0.5">
                    <span className="font-mono font-bold text-[#10251D] tabular-nums">
                      {c.phone}
                    </span>{' '}
                    · {c.operatingHours} · {c.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleEmergencyContactVerification(c)}
                    className="min-h-[36px] px-3 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F1E3D]"
                  >
                    {c.verified ? 'Unverify' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditContact(c)}
                    aria-label="Edit contact"
                    className="min-h-[36px] min-w-[36px] bg-[#F1F5F9] rounded-xl flex items-center justify-center text-[#0F1E3D]"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEmergencyContact(c)}
                    aria-label="Delete contact"
                    className="min-h-[36px] min-w-[36px] bg-[#FEF2F2] rounded-xl flex items-center justify-center text-[#DC2626]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SAFETY ANNOUNCEMENTS */}
      {subTab === 'announcements' && (
        <div className="space-y-4">
          <form
            onSubmit={handlePublishAlert}
            className="bg-white p-4 rounded-2xl border border-[#E5E7EB] space-y-3"
          >
            <h4 className="font-black text-sm text-[#0F1E3D]">
              {editingAnnouncementId ? 'Edit Safety Alert' : 'Publish Official Campus Safety Notice'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                placeholder="Safety Alert Title"
                className="min-h-[40px] px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
              />
              <select
                value={alertCategory}
                onChange={(e) => setAlertCategory(e.target.value as SafetyAnnouncementCategory)}
                className="min-h-[40px] px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
              >
                {SAFETY_ANNOUNCEMENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={alertSeverity}
                onChange={(e) => setAlertSeverity(e.target.value as SafetyAnnouncementSeverity)}
                className="min-h-[40px] px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
              >
                <option value="info">Info Notice</option>
                <option value="important">Important Alert</option>
                <option value="urgent">Urgent Warning</option>
              </select>
            </div>
            <textarea
              required
              rows={3}
              value={alertDesc}
              onChange={(e) => setAlertDesc(e.target.value)}
              placeholder="Write verified campus safety advice or emergency service update..."
              className="w-full p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-[#0F1E3D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertPinned}
                  onChange={(e) => setAlertPinned(e.target.checked)}
                  className="w-4 h-4 accent-[#0F1E3D]"
                />
                <span>Pin to top of Emergency &amp; Help Centre</span>
              </label>

              <button
                type="submit"
                disabled={savingAlert}
                className="min-h-[40px] px-5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black rounded-xl"
              >
                {savingAlert
                  ? 'Publishing...'
                  : editingAnnouncementId
                  ? 'Update Safety Alert'
                  : 'Publish Safety Alert'}
              </button>
            </div>
          </form>

          <div className="space-y-2.5">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="bg-white p-3.5 rounded-2xl border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-black uppercase text-[#DC2626]">{a.severity}</span>
                    <span>·</span>
                    <span className="font-bold text-[#0F1E3D]">{a.title}</span>
                    {!a.isActive && <span className="text-[#64748B]">(Archived)</span>}
                  </div>
                  <p className="text-xs text-[#475569] mt-1">{a.description}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSafetyAnnouncementActive(a)}
                    className="min-h-[36px] px-3 bg-[#F1F5F9] rounded-xl text-xs font-bold"
                  >
                    {a.isActive ? 'Archive' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSafetyAnnouncement(a)}
                    aria-label="Delete alert"
                    className="min-h-[36px] min-w-[36px] bg-[#FEF2F2] text-[#DC2626] rounded-xl flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: LOST & FOUND MODERATION */}
      {subTab === 'lost-found' && (
        <div className="space-y-3">
          {lostFoundItems.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] text-center text-xs text-[#64748B]">
              No Lost &amp; Found submissions yet.
            </div>
          ) : (
            lostFoundItems.map((item) => {
              const priv = privateHintMap[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-2xl border border-[#E5E7EB] space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-black uppercase text-[#087443]">
                        {item.reportType} · {item.itemCategory} · {item.location}
                      </span>
                      <h4 className="font-black text-sm text-[#0F1E3D]">{item.title}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          updateLostFoundStatus(item, e.target.value as LostFoundStatus)
                        }
                        className="min-h-[36px] px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
                      >
                        <option value="open">Open</option>
                        <option value="matched">Matched</option>
                        <option value="recovered">Recovered</option>
                        <option value="closed">Closed</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => toggleLostFoundHidden(item)}
                        className="min-h-[36px] px-3 bg-[#F1F5F9] rounded-xl text-xs font-bold inline-flex items-center gap-1"
                      >
                        {item.isHiddenByAdmin ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Restore
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Hide
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInspectPrivateClaim(item.id)}
                        className="min-h-[36px] px-3 bg-[#0F1E3D] text-white rounded-xl text-xs font-bold"
                      >
                        Private Verification
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteLostFoundItem(item)}
                        aria-label="Delete lost and found listing"
                        className="min-h-[36px] min-w-[36px] bg-[#FEF2F2] text-[#DC2626] rounded-xl flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#475569]">{item.description}</p>
                  {priv !== undefined && (
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F1E3D]">
                      {priv ? (
                        <span>
                          <strong>Private Phone:</strong> {priv.privatePhone || 'None'} ·{' '}
                          <strong>Private Identifier Hint:</strong>{' '}
                          {priv.privateIdentifierHint || 'None'}
                        </span>
                      ) : (
                        <span>No private verification metadata stored for this item.</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 5: AUDIT LOGS */}
      {subTab === 'audit' && (
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
          {auditLogs.length === 0 ? (
            <div className="text-center text-[#64748B] py-6">
              No Emergency Centre administrator actions recorded yet.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="font-bold text-[#0F1E3D] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#087443]" />
                    {log.action} ({log.targetType})
                  </span>
                  <span className="tabular-nums">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-[#10251D]">{log.summary}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
