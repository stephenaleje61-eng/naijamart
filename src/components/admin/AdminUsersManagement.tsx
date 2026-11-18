import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Download,
  Eye,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X
} from 'lucide-react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { Institution, User } from '../../types.js';
import { db, toIsoString } from '../../services/firebase.js';
import { DEFAULT_INSTITUTION_ID, VERIFIED_NIGERIAN_INSTITUTIONS } from '../../constants/institutions.js';
import { CEO_EMAIL, ceoDeleteUserAccount, ceoUpdateUserSuspension } from '../../services/ceoAdmin.js';
import { adminDeleteUserAccount, adminToggleUserSuspension } from '../../services/api.js';
import { CeoVerifiedBadge } from '../CeoVerifiedBadge.js';

interface AdminUsersManagementProps {
  mode?: 'admin' | 'ceo';
  initialUsers?: User[];
  institutions?: Institution[];
  onRefreshSnapshot?: () => Promise<void>;
  onRunSensitiveAction?: (action: () => Promise<void>) => Promise<void>;
  onStatusMessage?: (msg: string) => void;
  onErrorMessage?: (msg: string) => void;
  onToggleCeoVerifyUser?: (user: User) => Promise<void>;
}

type DateFilterPreset = 'all' | 'today' | 'week' | 'month' | 'custom';
type RoleFilter = 'all' | 'buyer' | 'seller' | 'verified' | 'suspended';

function toWatDateKey(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

function escapeCsvCell(val: unknown): string {
  const s = String(val ?? '').replace(/\r?\n/g, ' ');
  if (s.includes(',') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const AdminUsersManagement: React.FC<AdminUsersManagementProps> = ({
  mode = 'admin',
  initialUsers = [],
  institutions = VERIFIED_NIGERIAN_INSTITUTIONS,
  onRefreshSnapshot,
  onRunSensitiveAction,
  onStatusMessage,
  onErrorMessage,
  onToggleCeoVerifyUser
}) => {
  const [liveUsers, setLiveUsers] = useState<User[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (initialUsers.length > 0 && liveUsers.length === 0) {
      setLiveUsers(initialUsers);
    }
  }, [initialUsers, liveUsers.length]);

  // Real-time live user counter & table sync whenever someone registers
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'users'), limit(1000)),
      (snap) => {
        const map = new Map<string, User>();
        for (const u of initialUsers) map.set(u.id, u);
        for (const d of snap.docs) {
          const data = d.data() as any;
          const email = String(data?.email || '').toLowerCase().trim();
          map.set(d.id, {
            id: d.id,
            name: String(data?.name || data?.displayName || 'Campus User'),
            email,
            role: data?.role === 'admin' && email === CEO_EMAIL ? 'admin' : data?.role === 'seller' ? 'seller' : 'buyer',
            accountType: data?.accountType,
            department: data?.department ? String(data.department) : undefined,
            levelOfStudy: data?.levelOfStudy ? String(data.levelOfStudy) : undefined,
            bio: data?.bio ? String(data.bio) : undefined,
            institutionId: data?.institutionId ? String(data.institutionId) : DEFAULT_INSTITUTION_ID,
            campus: data?.campus ? String(data.campus) : undefined,
            phone: data?.phone ? String(data.phone) : '',
            whatsappNumber: data?.whatsappNumber ? String(data.whatsappNumber) : '',
            state: data?.state ? String(data.state) : 'Taraba',
            city: data?.city ? String(data.city) : 'Wukari',
            avatarUrl: data?.avatarUrl ? String(data.avatarUrl) : undefined,
            isSuspended: Boolean(data?.isSuspended),
            suspensionReason: data?.suspensionReason ? String(data.suspensionReason) : undefined,
            isVerified: Boolean(data?.isVerified || data?.ceoVerified),
            ceoVerified: Boolean(data?.ceoVerified || data?.isVerified),
            lastSeenAt: data?.lastSeenAt ? toIsoString(data.lastSeenAt) : undefined,
            createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
          });
        }
        const sorted = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setLiveUsers(sorted);
      },
      (err) => {
        console.warn('[AdminUsersManagement onSnapshot]:', err.message);
      }
    );
    return () => unsub();
  }, [initialUsers]);

  const instMap = useMemo(() => {
    const map = new Map<string, Institution>();
    for (const i of VERIFIED_NIGERIAN_INSTITUTIONS) map.set(i.id, i);
    for (const i of institutions) map.set(i.id, i);
    return map;
  }, [institutions]);

  const getInstitutionLabel = (instId?: string) => {
    const inst = instMap.get(instId || DEFAULT_INSTITUTION_ID);
    return inst ? `${inst.shortName} — ${inst.name}` : instId || 'Unassigned';
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const todayKey = toWatDateKey(new Date());
    const monthPrefix = todayKey.slice(0, 7);
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return liveUsers.filter((u) => {
      const inst = instMap.get(u.institutionId || DEFAULT_INSTITUTION_ID);
      const instNames = `${u.institutionId || ''} ${inst?.shortName || ''} ${inst?.name || ''} ${u.campus || ''}`.toLowerCase();
      if (q) {
        const matchesSearch =
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          instNames.includes(q) ||
          (u.city || '').toLowerCase().includes(q) ||
          (u.state || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (institutionFilter !== 'all' && (u.institutionId || DEFAULT_INSTITUTION_ID) !== institutionFilter) {
        return false;
      }

      if (roleFilter === 'buyer' && u.role !== 'buyer') return false;
      if (roleFilter === 'seller' && u.role !== 'seller') return false;
      if (roleFilter === 'verified' && !(u.ceoVerified || u.isVerified)) return false;
      if (roleFilter === 'suspended' && !u.isSuspended) return false;

      if (datePreset !== 'all') {
        const uKey = toWatDateKey(u.createdAt);
        const uMs = new Date(u.createdAt).getTime();
        if (datePreset === 'today' && uKey !== todayKey) return false;
        if (datePreset === 'week' && (Number.isNaN(uMs) || uMs < sevenDaysAgoMs)) return false;
        if (datePreset === 'month' && !uKey.startsWith(monthPrefix)) return false;
        if (datePreset === 'custom') {
          if (startDate && uKey < startDate) return false;
          if (endDate && uKey > endDate) return false;
        }
      }

      return true;
    });
  }, [liveUsers, searchQuery, institutionFilter, roleFilter, datePreset, startDate, endDate, instMap]);

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Full Name',
      'Email',
      'University / Institution',
      'Campus',
      'Role',
      'Account Type',
      'Phone',
      'WhatsApp',
      'State',
      'City',
      'Status',
      'Verified',
      'Registration Date'
    ];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.name,
      u.email,
      getInstitutionLabel(u.institutionId),
      u.campus || '',
      u.role,
      u.accountType || u.role,
      u.phone || '',
      u.whatsappNumber || '',
      u.state || '',
      u.city || '',
      u.isSuspended ? 'Suspended' : 'Active',
      u.ceoVerified || u.isVerified ? 'Yes' : 'No',
      u.createdAt
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nigeria-campus-market-users-${toWatDateKey(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onStatusMessage?.(`Exported ${filteredUsers.length} user record(s) to CSV.`);
  };

  const runAction = async (fn: () => Promise<void>) => {
    if (mode === 'ceo' && onRunSensitiveAction) {
      await onRunSensitiveAction(fn);
    } else {
      await fn();
    }
  };

  const handleSuspendOrRestore = async (target: User, shouldSuspend: boolean, reason?: string) => {
    setBusyUserId(target.id);
    try {
      await runAction(async () => {
        if (mode === 'ceo') {
          await ceoUpdateUserSuspension({
            userId: target.id,
            suspend: shouldSuspend,
            reason
          });
        } else {
          await adminToggleUserSuspension(target.id, reason);
        }
        onStatusMessage?.(
          `${target.name}'s account has been ${shouldSuspend ? 'suspended' : 'restored to active'}.`
        );
        if (onRefreshSnapshot) await onRefreshSnapshot();
      });
    } catch (err: any) {
      onErrorMessage?.(err?.message || 'Failed to update account status.');
    } finally {
      setBusyUserId(null);
      setSuspendTarget(null);
      setSuspendReason('');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyUserId(target.id);
    try {
      await runAction(async () => {
        if (mode === 'ceo') {
          await ceoDeleteUserAccount(target.id);
        } else {
          await adminDeleteUserAccount(target.id);
        }
        setLiveUsers((prev) => prev.filter((u) => u.id !== target.id));
        onStatusMessage?.(`Permanently deleted account for ${target.name} (${target.email}).`);
        if (onRefreshSnapshot) await onRefreshSnapshot();
      });
      setDeleteTarget(null);
    } catch (err: any) {
      onErrorMessage?.(err?.message || 'Failed to delete user account.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
      {/* Header & Live Auto-Updating Total + CSV Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-[#10251D] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#087443]" />
              <span>Registered Users Management</span>
            </h2>
            <span className="px-3 py-1 rounded-full bg-[#087443] text-[#D4A62A] text-xs font-black tabular-nums">
              {liveUsers.length.toLocaleString()} Total Registered
            </span>
          </div>
          <p className="text-xs text-[#555555] mt-0.5">
            Live sync updates automatically on every signup. Search, filter, inspect, suspend/restore, export CSV, or delete accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-2 rounded-xl bg-[#10251D] hover:bg-black text-[#D4A62A] text-xs font-black inline-flex items-center gap-1.5 transition cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV ({filteredUsers.length})</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#F4F8F5] p-3.5 rounded-xl border border-[#D9E5DF] text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-[#087443] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or university..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D1D5DB] bg-white outline-none focus:border-[#087443]"
          />
        </div>

        <select
          value={institutionFilter}
          onChange={(e) => setInstitutionFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[#D1D5DB] bg-white font-semibold outline-none focus:border-[#087443]"
          aria-label="Filter by University or Institution"
        >
          <option value="all">All Universities &amp; Institutions</option>
          {Array.from(instMap.values())
            .sort((a, b) => a.shortName.localeCompare(b.shortName))
            .map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.shortName} — {inst.name}
              </option>
            ))}
        </select>

        <select
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value as DateFilterPreset)}
          className="px-3 py-2 rounded-xl border border-[#D1D5DB] bg-white font-semibold outline-none focus:border-[#087443]"
          aria-label="Filter by Registration Date"
        >
          <option value="all">All Registration Dates</option>
          <option value="today">Registered Today</option>
          <option value="week">Registered This Week</option>
          <option value="month">Registered This Month</option>
          <option value="custom">Custom Date Range</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="px-3 py-2 rounded-xl border border-[#D1D5DB] bg-white font-semibold outline-none focus:border-[#087443]"
          aria-label="Filter by Role or Account Status"
        >
          <option value="all">All Roles &amp; Statuses</option>
          <option value="buyer">Students / Buyers Only</option>
          <option value="seller">Sellers Only</option>
          <option value="verified">CEO Verified Users</option>
          <option value="suspended">Suspended Accounts</option>
        </select>

        {datePreset === 'custom' && (
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3 pt-1">
            <label className="flex items-center gap-2 font-bold text-[#10251D]">
              <Calendar className="w-3.5 h-3.5 text-[#087443]" />
              <span>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] bg-white"
              />
            </label>
            <label className="flex items-center gap-2 font-bold text-[#10251D]">
              <span>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] bg-white"
              />
            </label>
          </div>
        )}
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="py-10 text-center bg-[#F4F8F5] rounded-2xl border border-[#E5E7EB] text-xs text-[#555555]">
          No registered users match your current search or filter criteria.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#E5E7EB] rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F8F5] text-[#555555] uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">University / Campus</th>
                <th className="p-3">Role &amp; Status</th>
                <th className="p-3">Registered</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredUsers.map((u) => {
                const verified = Boolean(u.ceoVerified || u.isVerified);
                const isSelfCeo = u.email.toLowerCase() === CEO_EMAIL;
                const inst = instMap.get(u.institutionId || DEFAULT_INSTITUTION_ID);
                const isBusy = busyUserId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-[#F4F8F5]/60 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#087443] text-[#D4A62A] font-black flex items-center justify-center shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-[#10251D]">{u.name}</span>
                            {verified && <CeoVerifiedBadge verified variant="compact" />}
                            {isSelfCeo && (
                              <span className="px-2 py-0.5 rounded bg-[#D4A62A] text-[#10251D] text-[9px] font-black uppercase">
                                CEO
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#555555] truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-[#10251D] block">
                        {inst ? inst.shortName : u.institutionId || 'Nationwide'}
                      </span>
                      <span className="text-[11px] text-[#555555] block truncate max-w-[200px]">
                        {inst ? inst.name : `${u.city || 'Wukari'}, ${u.state || 'Taraba'}`}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#F4F8F5] border border-[#D9E5DF] text-[#10251D] uppercase font-bold text-[10px]">
                          {u.role}
                        </span>
                        {u.isSuspended ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-black text-[10px] uppercase">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#087443] font-bold text-[10px] uppercase">
                            Active
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-[11px] text-[#555555] whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProfileUser(u)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F4F8F5] hover:bg-[#087443] hover:text-white border border-[#D9E5DF] text-[#10251D] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </button>

                        {mode === 'ceo' && onToggleCeoVerifyUser && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onToggleCeoVerifyUser(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#087443] font-bold text-[11px] cursor-pointer transition"
                          >
                            {verified ? 'Unverify' : 'Verify'}
                          </button>
                        )}

                        {!isSelfCeo && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                if (u.isSuspended) {
                                  handleSuspendOrRestore(u, false);
                                } else {
                                  setSuspendTarget(u);
                                  setSuspendReason('');
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition ${
                                u.isSuspended
                                  ? 'bg-[#087443] hover:bg-[#065D36] text-white'
                                  : 'bg-[#10251D] hover:bg-black text-[#D4A62A]'
                              }`}
                            >
                              {u.isSuspended ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Restore</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Suspend</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDeleteTarget(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition"
                              title="Delete account permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View Individual User Profile Modal */}
      {profileUser && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#D9E5DF] shadow-2xl overflow-hidden text-[#10251D]">
            <div className="bg-gradient-to-r from-[#10251D] to-[#087443] text-white p-5 flex items-center justify-between border-b-4 border-[#D4A62A]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#D4A62A] text-[#10251D] font-black text-lg flex items-center justify-center">
                  {profileUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-base">{profileUser.name}</h3>
                  <p className="text-xs text-white/80">{profileUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileUser(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase text-[#555555] flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-[#087443]" />
                    University / Institution
                  </span>
                  <p className="font-bold mt-1">{getInstitutionLabel(profileUser.institutionId)}</p>
                  {profileUser.campus && (
                    <p className="text-[11px] text-[#555555]">Campus: {profileUser.campus}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase text-[#555555] flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#087443]" />
                    Contact Details
                  </span>
                  <p className="font-bold mt-1">
                    Phone: {profileUser.phone || 'Not provided'}
                  </p>
                  <p className="text-[11px] text-[#555555]">
                    WhatsApp: {profileUser.whatsappNumber || 'Not provided'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase text-[#555555] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#087443]" />
                    Location &amp; Academics
                  </span>
                  <p className="font-bold mt-1">
                    {profileUser.city || 'Wukari'}, {profileUser.state || 'Taraba'}
                  </p>
                  {(profileUser.department || profileUser.levelOfStudy) && (
                    <p className="text-[11px] text-[#555555]">
                      {profileUser.department || ''} {profileUser.levelOfStudy || ''}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase text-[#555555] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#087443]" />
                    Role &amp; Timeline
                  </span>
                  <p className="font-bold mt-1 capitalize">
                    Role: {profileUser.role} ({profileUser.accountType || profileUser.role})
                  </p>
                  <p className="text-[11px] text-[#555555]">
                    Joined: {new Date(profileUser.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {profileUser.bio && (
                <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase text-[#555555] block mb-1">
                    Student Bio
                  </span>
                  <p className="text-[#10251D]">{profileUser.bio}</p>
                </div>
              )}

              {profileUser.isSuspended && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">
                  <strong className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Account Suspended
                  </strong>
                  <p className="mt-0.5 text-[11px]">
                    Reason: {profileUser.suspensionReason || 'Policy moderation action'}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setProfileUser(null)}
                  className="px-4 py-2 rounded-xl bg-[#087443] text-white font-black text-xs"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Account Modal */}
      {suspendTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSuspendOrRestore(
                suspendTarget,
                true,
                suspendReason.trim() || 'Suspended by NIGERIA CAMPUS MARKET Admin'
              );
            }}
            className="bg-white w-full max-w-md rounded-2xl border border-[#E5E7EB] p-5 space-y-3 shadow-2xl text-[#10251D]"
          >
            <h4 className="font-black text-sm flex items-center gap-2">
              <UserX className="w-4 h-4 text-[#087443]" />
              <span>Suspend User: {suspendTarget.name}</span>
            </h4>
            <p className="text-xs text-[#555555]">
              Suspending <Mail className="w-3 h-3 inline mx-0.5" /> {suspendTarget.email} will block sign-in and hide active storefronts until restored.
            </p>
            <textarea
              required
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter suspension reason (visible to moderation audit)..."
              className="w-full p-2.5 rounded-xl border border-[#D1D5DB] bg-[#F4F8F5] text-xs outline-none focus:border-[#087443]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspendTarget(null)}
                className="px-3.5 py-2 rounded-xl border border-[#D1D5DB] text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyUserId === suspendTarget.id}
                className="px-4 py-2 rounded-xl bg-[#10251D] text-[#D4A62A] text-xs font-black"
              >
                {busyUserId === suspendTarget.id ? 'Suspending...' : 'Confirm Suspend'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-2xl border border-red-200 p-5 space-y-4 shadow-2xl text-[#10251D]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-red-800">Permanently Delete User Account?</h4>
                <p className="text-xs text-[#555555] mt-1">
                  You are about to permanently remove <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) and associated seller profiles. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={busyUserId === deleteTarget.id}
                className="px-3.5 py-2 rounded-xl border border-[#D1D5DB] text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={busyUserId === deleteTarget.id}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black"
              >
                {busyUserId === deleteTarget.id ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
