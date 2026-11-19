import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  GraduationCap,
  MapPin,
  Search,
  Sparkles,
  X
} from 'lucide-react';
import { Institution, InstitutionType } from '../types.js';
import {
  DEFAULT_INSTITUTION_ID,
  INSTITUTION_STATES,
  INSTITUTION_TYPE_OPTIONS
} from '../constants/institutions.js';

interface InstitutionDirectorySectionProps {
  institutions: Institution[];
  selectedInstitutionId: string;
  selectedCampus: string;
  onSelectInstitution: (institutionId: string, campus: string) => void;
  onOpenFullModal?: () => void;
}

export const InstitutionDirectorySection: React.FC<InstitutionDirectorySectionProps> = ({
  institutions,
  selectedInstitutionId,
  selectedCampus,
  onSelectInstitution,
  onOpenFullModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<InstitutionType | 'all'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);
  const [campusSelectionMap, setCampusSelectionMap] = useState<Record<string, string>>({});

  const activeInstitution = useMemo(
    () =>
      institutions.find((i) => i.id === selectedInstitutionId) ||
      institutions.find((i) => i.id === DEFAULT_INSTITUTION_ID) ||
      institutions[0],
    [institutions, selectedInstitutionId]
  );

  const filteredInstitutions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return institutions.filter((inst) => {
      if (typeFilter !== 'all' && inst.type !== typeFilter) return false;
      if (stateFilter !== 'all' && inst.state !== stateFilter) return false;
      if (!q) return true;
      return (
        inst.name.toLowerCase().includes(q) ||
        inst.shortName.toLowerCase().includes(q) ||
        inst.state.toLowerCase().includes(q) ||
        inst.location.toLowerCase().includes(q) ||
        inst.type.toLowerCase().includes(q)
      );
    });
  }, [institutions, searchQuery, typeFilter, stateFilter]);

  const displayedInstitutions = useMemo(() => {
    if (showAll || searchQuery.trim() || typeFilter !== 'all' || stateFilter !== 'all') {
      return filteredInstitutions;
    }
    return filteredInstitutions.slice(0, 8);
  }, [filteredInstitutions, showAll, searchQuery, typeFilter, stateFilter]);

  const typeBadgeTone = (type: InstitutionType): string => {
    switch (type) {
      case 'Federal University':
        return 'bg-[#075B3B]/10 text-[#075B3B] border-[#075B3B]/25';
      case 'State University':
        return 'bg-[#202B26]/8 text-[#202B26] border-[#202B26]/20';
      case 'Private University':
        return 'bg-[#F2C94C]/18 text-[#7C5B06] border-[#F2C94C]/40';
      case 'Federal Polytechnic':
      case 'State Polytechnic':
      case 'Private Polytechnic':
        return 'bg-emerald-50 text-[#0B8050] border-emerald-200';
      default:
        return 'bg-slate-100 text-[#202B26] border-slate-200';
    }
  };

  return (
    <section
      id="institution-directory"
      className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 pb-2"
    >
      <div className="bg-white rounded-2xl border border-[#075B3B]/15 shadow-sm overflow-hidden">
        {/* Official National Header Banner */}
        <div className="bg-gradient-to-r from-[#202B26] via-[#075B3B] to-[#0B8050] px-4 sm:px-6 py-5 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 bg-white/12 border border-[#F2C94C]/45 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase text-[#F2C94C]">
                <Globe className="w-3.5 h-3.5" />
                NIGERIA CAMPUS MARKET — NATIONAL NETWORK
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                NIGERIA UNIVERSITY &amp; POLYTECHNIC MARKETPLACE
              </h2>
              <p className="text-xs sm:text-sm text-emerald-50/90 font-medium">
                Buy. Sell. Connect. Grow Across Nigerian Campuses. Switch between{' '}
                {institutions.length} verified Nigerian Universities, Polytechnics &amp; Colleges of Education.
              </p>
            </div>

            {activeInstitution && (
              <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 backdrop-blur-sm">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#F2C94C]">
                    Active Campus Marketplace
                  </p>
                  <p className="text-sm font-extrabold text-white truncate max-w-[260px]">
                    {activeInstitution.name}
                  </p>
                  <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0 text-[#F2C94C]" />
                    <span className="truncate">
                      {selectedCampus || activeInstitution.campus} · {activeInstitution.state} State
                    </span>
                  </p>
                </div>
                {onOpenFullModal && (
                  <button
                    type="button"
                    onClick={onOpenFullModal}
                    className="shrink-0 px-3.5 py-2 rounded-lg bg-[#F2C94C] hover:bg-[#E0B43B] text-[#202B26] text-xs font-extrabold transition shadow-sm cursor-pointer"
                  >
                    Switch Campus
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-4 sm:p-5 bg-[#F4F7F5] border-b border-gray-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-[#075B3B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search university, polytechnic, acronym (e.g. FUWUKARI, UNILAG, ABU) or city..."
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-300 focus:border-[#075B3B] focus:ring-2 focus:ring-[#075B3B]/20 rounded-xl text-sm text-[#202B26] placeholder:text-gray-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#202B26]"
                  aria-label="Clear institution search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="md:col-span-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as InstitutionType | 'all')}
                aria-label="Filter by institution type"
                className="w-full px-3 py-2.5 bg-white border border-gray-300 focus:border-[#075B3B] rounded-xl text-sm font-semibold text-[#202B26] outline-none"
              >
                {INSTITUTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                aria-label="Filter by Nigerian state"
                className="w-full px-3 py-2.5 bg-white border border-gray-300 focus:border-[#075B3B] rounded-xl text-sm font-semibold text-[#202B26] outline-none"
              >
                <option value="all">All States in Nigeria</option>
                {INSTITUTION_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#202B26]/80">
            <span>
              Showing <strong className="text-[#075B3B]">{displayedInstitutions.length}</strong> of{' '}
              <strong>{filteredInstitutions.length}</strong> verified Nigerian institutions
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {selectedInstitutionId !== DEFAULT_INSTITUTION_ID && (
                <button
                  type="button"
                  onClick={() => onSelectInstitution(DEFAULT_INSTITUTION_ID, 'Main Campus (Wukari)')}
                  className="text-xs font-bold text-[#075B3B] hover:text-[#0B8050] underline cursor-pointer"
                >
                  Reset to Default (FUWUKARI)
                </button>
              )}
              {(searchQuery || typeFilter !== 'all' || stateFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setStateFilter('all');
                  }}
                  className="text-xs font-semibold text-gray-600 hover:text-[#202B26] px-2 py-1 rounded bg-white border border-gray-200 cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Institutions Grid */}
        <div className="p-4 sm:p-5">
          {filteredInstitutions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <GraduationCap className="w-10 h-10 text-[#075B3B]/40 mx-auto mb-2" />
              <p className="font-bold text-[#202B26]">No matching institution found</p>
              <p className="text-xs text-gray-500 mt-1">
                Try another university name, acronym, or reset filters above.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {displayedInstitutions.map((inst) => {
                  const isActive = inst.id === selectedInstitutionId;
                  const chosenCampus =
                    campusSelectionMap[inst.id] ||
                    (isActive ? selectedCampus : '') ||
                    inst.campus ||
                    inst.campuses[0];

                  return (
                    <div
                      key={inst.id}
                      className={`rounded-xl border p-3.5 flex flex-col justify-between transition ${
                        isActive
                          ? 'border-[#075B3B] bg-[#075B3B]/[0.04] ring-2 ring-[#075B3B]/20 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-[#075B3B]/50 hover:shadow-sm'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${typeBadgeTone(
                              inst.type
                            )}`}
                          >
                            {inst.type}
                          </span>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#075B3B]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ACTIVE
                            </span>
                          ) : inst.id === DEFAULT_INSTITUTION_ID ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7C5B06] bg-[#F2C94C]/20 px-1.5 py-0.5 rounded">
                              <Sparkles className="w-3 h-3" /> Home
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <h3 className="font-extrabold text-sm text-[#202B26] leading-snug line-clamp-2">
                            {inst.name}
                          </h3>
                          <p className="text-xs font-bold text-[#075B3B] mt-0.5">{inst.shortName}</p>
                        </div>

                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#075B3B] shrink-0" />
                          <span className="truncate">
                            {inst.location}, {inst.state} State
                          </span>
                        </p>

                        {inst.campuses.length > 1 ? (
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                              Campus
                            </label>
                            <select
                              value={chosenCampus}
                              onChange={(e) => {
                                const nextCampus = e.target.value;
                                setCampusSelectionMap((prev) => ({
                                  ...prev,
                                  [inst.id]: nextCampus
                                }));
                                if (isActive) {
                                  onSelectInstitution(inst.id, nextCampus);
                                }
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-[#F4F7F5] border border-gray-200 rounded-lg font-medium text-[#202B26] outline-none focus:border-[#075B3B]"
                            >
                              {inst.campuses.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{inst.campus}</span>
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectInstitution(inst.id, chosenCampus)}
                        className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isActive
                            ? 'bg-[#075B3B] text-white'
                            : 'bg-[#F4F7F5] hover:bg-[#075B3B] text-[#202B26] hover:text-white border border-gray-200 hover:border-[#075B3B]'
                        }`}
                      >
                        {isActive ? 'Viewing Campus Marketplace' : 'Open Campus Marketplace'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredInstitutions.length > 8 &&
                !searchQuery.trim() &&
                typeFilter === 'all' &&
                stateFilter === 'all' && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAll((prev) => !prev)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075B3B]/10 hover:bg-[#075B3B]/15 text-[#075B3B] font-extrabold text-xs sm:text-sm border border-[#075B3B]/25 transition cursor-pointer"
                    >
                      {showAll ? (
                        <>
                          Show Fewer Institutions <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Explore All {filteredInstitutions.length} Universities &amp; Polytechnics{' '}
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

interface InstitutionSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions: Institution[];
  selectedInstitutionId: string;
  selectedCampus: string;
  onSelectInstitution: (institutionId: string, campus: string) => void;
}

export const InstitutionSwitcherModal: React.FC<InstitutionSwitcherModalProps> = ({
  isOpen,
  onClose,
  institutions,
  selectedInstitutionId,
  selectedCampus,
  onSelectInstitution
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<InstitutionType | 'all'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [campusMap, setCampusMap] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return institutions.filter((inst) => {
      if (typeFilter !== 'all' && inst.type !== typeFilter) return false;
      if (stateFilter !== 'all' && inst.state !== stateFilter) return false;
      if (!q) return true;
      return (
        inst.name.toLowerCase().includes(q) ||
        inst.shortName.toLowerCase().includes(q) ||
        inst.state.toLowerCase().includes(q) ||
        inst.location.toLowerCase().includes(q)
      );
    });
  }, [institutions, searchQuery, typeFilter, stateFilter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-[#075B3B]/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#202B26] text-white px-5 py-4 flex items-center justify-between gap-3 border-b-2 border-[#F2C94C]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#F2C94C]">
              NIGERIA CAMPUS MARKET NATIONAL NETWORK
            </p>
            <h3 className="text-lg font-extrabold">Select Your University or Polytechnic</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="Close institution selector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-[#F4F7F5] border-b border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-[#075B3B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search institution name, acronym, city..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 focus:border-[#075B3B] rounded-xl text-sm text-[#202B26] outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as InstitutionType | 'all')}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-[#202B26] outline-none"
            >
              {INSTITUTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-[#202B26] outline-none"
            >
              <option value="all">All States</option>
              {INSTITUTION_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((inst) => {
            const isSelected = inst.id === selectedInstitutionId;
            const campus =
              campusMap[inst.id] ||
              (isSelected ? selectedCampus : '') ||
              inst.campus ||
              inst.campuses[0];
            return (
              <div
                key={inst.id}
                className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 transition ${
                  isSelected
                    ? 'border-[#075B3B] bg-[#075B3B]/5 ring-2 ring-[#075B3B]/20'
                    : 'border-gray-200 hover:border-[#075B3B]/50 bg-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F4F7F5] text-[#075B3B] border border-[#075B3B]/20">
                      {inst.type}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {inst.state} State
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#202B26]">{inst.name}</h4>
                  <p className="text-xs text-gray-600">
                    {inst.shortName} · {inst.location}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {inst.campuses.length > 1 ? (
                    <select
                      value={campus}
                      onChange={(e) =>
                        setCampusMap((prev) => ({ ...prev, [inst.id]: e.target.value }))
                      }
                      className="flex-1 px-2.5 py-1.5 text-xs bg-[#F4F7F5] border border-gray-200 rounded-lg text-[#202B26] outline-none"
                    >
                      {inst.campuses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex-1 text-xs text-gray-500 truncate">{campus}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectInstitution(inst.id, campus);
                      onClose();
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#075B3B] text-white'
                        : 'bg-[#F2C94C] hover:bg-[#E0B43B] text-[#202B26]'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
