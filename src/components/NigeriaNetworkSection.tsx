import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Compass,
  MapPin,
  MessageCircle,
  Search,
  UserPlus,
  Users
} from 'lucide-react';
import {
  Institution,
  InstitutionType,
  RegisteredUser,
  UniversityCommunityMembership
} from '../types.js';
import {
  NIGERIAN_INSTITUTIONS,
  NIGERIAN_STATES_AND_FCT
} from '../constants/institutions.js';
import { useAuth } from '../context/AuthContext.js';
import {
  joinUniversityCommunity,
  leaveUniversityCommunity,
  subscribeToAllCommunityMemberCounts,
  subscribeToCommunityMemberships
} from '../services/universityNetwork.js';
import { sendFriendRequest } from '../services/firebase.js';

interface NigeriaNetworkSectionProps {
  institutions?: Institution[];
  activeInstitution: Institution;
  selectedCampus: string;
  onSelectInstitution: (institution: Institution, campus?: string) => void;
  onOpenCommunityPage: (institution: Institution) => void;
  knownUsers?: RegisteredUser[];
  onStartDirectChat?: (target: { id: string; name: string; matricNumber?: string }) => void;
  onOpenAuthModal?: () => void;
}

export const NigeriaNetworkSection: React.FC<NigeriaNetworkSectionProps> = ({
  institutions = NIGERIAN_INSTITUTIONS,
  activeInstitution,
  selectedCampus,
  onSelectInstitution,
  onOpenCommunityPage,
  knownUsers = [],
  onStartDirectChat,
  onOpenAuthModal
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState<'All' | InstitutionType>('All');
  const [memberships, setMemberships] = useState<UniversityCommunityMembership[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [busyInstId, setBusyInstId] = useState<string | null>(null);
  const [studentFilterInst, setStudentFilterInst] = useState<string>('all');
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub1 = subscribeToCommunityMemberships(user?.id, setMemberships);
    const unsub2 = subscribeToAllCommunityMemberCounts(setMemberCounts);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user?.id]);

  const joinedSet = useMemo(
    () => new Set(memberships.map((m) => m.institutionId)),
    [memberships]
  );

  const filteredInstitutions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return institutions.filter((inst) => {
      if (inst.status === 'inactive') return false;
      if (stateFilter !== 'All' && inst.state.toLowerCase() !== stateFilter.toLowerCase()) {
        return false;
      }
      if (typeFilter !== 'All' && inst.type !== typeFilter) return false;
      if (!q) return true;
      return (
        inst.name.toLowerCase().includes(q) ||
        inst.shortName.toLowerCase().includes(q) ||
        inst.state.toLowerCase().includes(q) ||
        inst.location.toLowerCase().includes(q)
      );
    });
  }, [institutions, searchQuery, stateFilter, typeFilter]);

  const discoverStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return knownUsers
      .filter((u) => {
        if (u.id === user?.id) return false;
        if (studentFilterInst !== 'all' && u.institutionId !== studentFilterInst) return false;
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          (u.department && u.department.toLowerCase().includes(q)) ||
          (u.campus && u.campus.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [knownUsers, user?.id, studentFilterInst, searchQuery]);

  const handleToggleMembership = async (inst: Institution) => {
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    setBusyInstId(inst.id);
    try {
      if (joinedSet.has(inst.id)) {
        await leaveUniversityCommunity(user.id, inst.id);
        setNetworkNotice(`Left ${inst.shortName} community.`);
      } else {
        await joinUniversityCommunity({
          userId: user.id,
          userName: user.name,
          institutionId: inst.id,
          campus: inst.campus,
          department: user.department,
          levelOfStudy: user.levelOfStudy
        });
        onSelectInstitution(inst, inst.campus);
        setNetworkNotice(`Joined ${inst.shortName} community! Your active campus is now synced.`);
      }
      setTimeout(() => setNetworkNotice(null), 4000);
    } finally {
      setBusyInstId(null);
    }
  };

  const handleConnectStudent = async (peer: RegisteredUser) => {
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    try {
      await sendFriendRequest(
        { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        { id: peer.id, name: peer.name }
      );
      setNetworkNotice(`Friend request sent to ${peer.name}.`);
      setTimeout(() => setNetworkNotice(null), 3500);
    } catch (err: any) {
      setNetworkNotice(err?.message || 'Unable to send friend request.');
      setTimeout(() => setNetworkNotice(null), 3500);
    }
  };

  return (
    <section
      id="nigeria-university-network"
      className="bg-white rounded-2xl border border-[#D9E5DF] p-5 sm:p-6 shadow-xs space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#087443]">
            <Compass className="w-4 h-4 text-[#D4A62A]" />
            <span>NIGERIA UNIVERSITY NETWORK</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#172B24] mt-0.5">
            Universities, Polytechnics &amp; Student Communities Across 36 States + FCT
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Active Campus: <strong className="text-[#087443]">{activeInstitution.name}</strong> ({selectedCampus || activeInstitution.campus})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeInstitution.campus || selectedCampus}
            onChange={(e) => onSelectInstitution(activeInstitution, e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#D9E5DF] bg-[#F5F8F6] text-xs font-bold text-[#172B24]"
            aria-label="Select Campus"
          >
            {activeInstitution.campuses.map((c) => (
              <option key={c} value={c}>
                Campus: {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onOpenCommunityPage(activeInstitution)}
            className="px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-extrabold flex items-center gap-1.5 transition"
          >
            <span>Open {activeInstitution.shortName} Community</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {networkNotice && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-[#087443]/30 text-xs font-bold text-[#087443]">
          {networkNotice}
        </div>
      )}

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#F5F8F6] p-3 rounded-xl border border-[#D9E5DF]">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search university, acronym, state..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D9E5DF] bg-white text-xs font-medium text-[#172B24] focus:outline-none focus:border-[#087443]"
          />
        </div>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[#D9E5DF] bg-white text-xs font-bold text-[#172B24]"
        >
          <option value="All">All 36 States &amp; FCT</option>
          {NIGERIAN_STATES_AND_FCT.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-[#D9E5DF] bg-white text-xs font-bold text-[#172B24]"
        >
          <option value="All">All Institution Types</option>
          <option value="Federal University">Federal Universities</option>
          <option value="State University">State Universities</option>
          <option value="Private University">Private Universities</option>
          <option value="Federal Polytechnic">Federal Polytechnics</option>
          <option value="State Polytechnic">State Polytechnics</option>
          <option value="College of Education">Colleges of Education</option>
        </select>
      </div>

      {/* Institution Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredInstitutions.slice(0, 18).map((inst) => {
          const isJoined = joinedSet.has(inst.id);
          const isSelected = activeInstitution.id === inst.id;
          const count = memberCounts[inst.id] || 0;

          return (
            <div
              key={inst.id}
              className={`rounded-xl border p-3.5 transition flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-[#087443] bg-[#F5F8F6]'
                  : 'border-[#D9E5DF] bg-white hover:border-[#087443]/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#172B24] text-[#D4A62A] text-[10px] font-extrabold">
                      {inst.shortName}
                    </span>
                    <span className="text-[10px] font-bold text-[#087443]">{inst.type}</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#172B24] mt-1.5 line-clamp-2">
                    {inst.name}
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#087443] shrink-0" />
                    <span>
                      {inst.location}, {inst.state}
                    </span>
                  </p>
                </div>

                {count > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-[#D9E5DF] text-[10px] font-bold text-[#172B24] shrink-0">
                    <Users className="w-3 h-3 text-[#087443]" />
                    <span className="tabular-nums">{count}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 pt-2 border-t border-[#D9E5DF]/60">
                <button
                  type="button"
                  onClick={() => onSelectInstitution(inst, inst.campus)}
                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    isSelected
                      ? 'bg-[#172B24] text-white'
                      : 'bg-[#F5F8F6] text-[#172B24] hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Switch Here'}
                </button>

                <button
                  type="button"
                  disabled={busyInstId === inst.id}
                  onClick={() => handleToggleMembership(inst)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                    isJoined
                      ? 'bg-emerald-50 text-[#087443] border border-[#087443]/30'
                      : 'bg-[#087443] text-white hover:bg-[#065D36]'
                  }`}
                >
                  {isJoined && <CheckCircle2 className="w-3 h-3" />}
                  <span>{isJoined ? 'Joined' : 'Join'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenCommunityPage(inst)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#D4A62A]/15 hover:bg-[#D4A62A]/30 text-[#172B24] text-[11px] font-extrabold transition"
                >
                  Hub
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discover Students Across Campuses (Real registered users only) */}
      <div className="pt-4 border-t border-[#D9E5DF] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#087443]" />
            <h3 className="text-sm font-extrabold text-[#172B24]">
              Discover Students Across Campuses
            </h3>
          </div>
          <select
            value={studentFilterInst}
            onChange={(e) => setStudentFilterInst(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#D9E5DF] bg-[#F5F8F6] text-xs font-bold text-[#172B24]"
          >
            <option value="all">All Institutions ({knownUsers.length})</option>
            <option value={activeInstitution.id}>{activeInstitution.shortName} Only</option>
          </select>
        </div>

        {discoverStudents.length === 0 ? (
          <p className="text-xs text-slate-600 bg-[#F5F8F6] rounded-xl p-4 border border-[#D9E5DF]">
            No other registered students match your filter yet. Students who sign in or update their campus profile appear here automatically.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {discoverStudents.map((peer) => {
              const peerInst = institutions.find((i) => i.id === peer.institutionId);
              return (
                <div
                  key={peer.id}
                  className="p-3.5 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF] flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#172B24] text-[#D4A62A] font-extrabold flex items-center justify-center shrink-0 overflow-hidden">
                      {peer.avatarUrl ? (
                        <img src={peer.avatarUrl} alt={peer.name} className="w-full h-full object-cover" />
                      ) : (
                        peer.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-extrabold text-[#172B24] truncate">{peer.name}</p>
                        {(peer.isVerified || peer.ceoVerified) && (
                          <BadgeCheck className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600 truncate">
                        {peerInst?.shortName || 'Nigeria Hub'}
                        {peer.department ? ` · ${peer.department}` : ''}
                      </p>
                      {peer.levelOfStudy && (
                        <p className="text-[10px] font-semibold text-[#087443]">{peer.levelOfStudy}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleConnectStudent(peer)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#087443] hover:bg-[#065D36] text-white text-[11px] font-bold flex items-center justify-center gap-1 transition"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Add Friend</span>
                    </button>
                    {onStartDirectChat && (
                      <button
                        type="button"
                        onClick={() =>
                          onStartDirectChat({
                            id: peer.id,
                            name: peer.name,
                            matricNumber: peer.matricNumber
                          })
                        }
                        className="py-1.5 px-2.5 rounded-lg bg-white border border-[#D9E5DF] hover:border-[#087443] text-[#172B24] text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <MessageCircle className="w-3 h-3 text-[#087443]" />
                        <span>Chat</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
