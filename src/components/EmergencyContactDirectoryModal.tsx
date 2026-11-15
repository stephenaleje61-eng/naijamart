import React, { useMemo, useState } from 'react';
import {
  X,
  Phone,
  ShieldAlert,
  HeartPulse,
  Flame,
  Shield,
  Users,
  Siren,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search
} from 'lucide-react';
import { EmergencyContact, EmergencyDepartment } from '../types.js';
import {
  EMERGENCY_DEPARTMENT_OPTIONS,
  buildEmergencyCallHref
} from '../services/emergencyCentre.js';

export type DirectoryFilter =
  | 'all'
  | 'security'
  | 'student_affairs'
  | 'health_centre'
  | 'fire_rescue'
  | 'police'
  | 'local_emergency'
  | 'medical'
  | 'fire'
  | 'local';

interface EmergencyContactDirectoryModalProps {
  contacts: EmergencyContact[];
  initialFilter?: DirectoryFilter;
  onClose: () => void;
  onReportEmergency?: (defaultCategory?: string) => void;
}

function normalizeFilter(filter?: DirectoryFilter): 'all' | EmergencyDepartment {
  if (!filter || filter === 'all') return 'all';
  if (filter === 'medical') return 'health_centre';
  if (filter === 'fire') return 'fire_rescue';
  if (filter === 'local') return 'local_emergency';
  return filter;
}

function getDepartmentIcon(dept: EmergencyDepartment) {
  switch (dept) {
    case 'security':
      return <ShieldAlert className="w-4 h-4" />;
    case 'student_affairs':
      return <Users className="w-4 h-4" />;
    case 'health_centre':
      return <HeartPulse className="w-4 h-4" />;
    case 'fire_rescue':
      return <Flame className="w-4 h-4" />;
    case 'police':
      return <Shield className="w-4 h-4" />;
    default:
      return <Siren className="w-4 h-4" />;
  }
}

export const EmergencyContactDirectoryModal: React.FC<EmergencyContactDirectoryModalProps> = ({
  contacts,
  initialFilter = 'all',
  onClose,
  onReportEmergency
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<'all' | EmergencyDepartment>(() =>
    normalizeFilter(initialFilter)
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contacts.filter((c) => {
      if (selectedDepartment !== 'all' && c.department !== selectedDepartment) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.operatingHours.toLowerCase().includes(q)
      );
    });
  }, [contacts, selectedDepartment, searchQuery]);

  const groupedSections = useMemo(() => {
    const depts =
      selectedDepartment === 'all'
        ? EMERGENCY_DEPARTMENT_OPTIONS
        : EMERGENCY_DEPARTMENT_OPTIONS.filter((d) => d.id === selectedDepartment);

    return depts.map((dept) => ({
      ...dept,
      items: filteredContacts.filter((c) => c.department === dept.id)
    }));
  }, [filteredContacts, selectedDepartment]);

  const contextReportCategory =
    selectedDepartment === 'health_centre'
      ? 'Medical emergency'
      : selectedDepartment === 'fire_rescue'
      ? 'Fire incident'
      : selectedDepartment === 'security' || selectedDepartment === 'police'
      ? 'Security threat'
      : undefined;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col text-[#111111]">
        {/* Deep Navy Emergency Header */}
        <div className="bg-[#0F1E3D] text-white p-5 flex items-center justify-between gap-3 shrink-0 border-b border-[#1E3A6E]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-black tracking-tight text-white">
                {selectedDepartment === 'health_centre'
                  ? 'Medical Assistance & Health Centre Contacts'
                  : selectedDepartment === 'fire_rescue'
                  ? 'Fire Emergency & Rescue Contacts'
                  : 'Campus Emergency Contact Directory'}
              </h2>
              <p className="text-xs text-white/80">
                FUWUKARI &amp; Wukari Emergency Directory · Call verified lines directly when urgent
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close directory"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context Guidance Strip */}
        <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-5 py-3 space-y-3 shrink-0">
          {selectedDepartment === 'health_centre' && (
            <div className="p-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#7F1D1D] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-black">Medical Emergency First Steps</p>
                <p className="text-[#991B1B] mt-0.5">
                  Call a verified University Health Centre or local ambulance contact immediately. Keep airways clear and stay with the person until medical staff arrive.
                </p>
              </div>
              {onReportEmergency && (
                <button
                  type="button"
                  onClick={() => onReportEmergency('Medical emergency')}
                  className="min-h-[44px] px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black rounded-xl shrink-0 transition"
                >
                  Log Medical Incident
                </button>
              )}
            </div>
          )}

          {selectedDepartment === 'fire_rescue' && (
            <div className="p-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#7F1D1D] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-black">Fire Incident Evacuation Steps</p>
                <p className="text-[#991B1B] mt-0.5">
                  Move everyone out of the building immediately, alert neighbours, switch off electrical mains only if safe, stay low under smoke, and dial Fire &amp; Rescue directly.
                </p>
              </div>
              {onReportEmergency && (
                <button
                  type="button"
                  onClick={() => onReportEmergency('Fire incident')}
                  className="min-h-[44px] px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black rounded-xl shrink-0 transition"
                >
                  Log Fire Incident
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search department, phone number, or service..."
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-white border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs font-medium text-[#111111] outline-none"
              />
            </div>
            {onReportEmergency && selectedDepartment !== 'health_centre' && selectedDepartment !== 'fire_rescue' && (
              <button
                type="button"
                onClick={() => onReportEmergency(contextReportCategory)}
                className="min-h-[44px] px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black rounded-xl transition shrink-0"
              >
                Report an Emergency Online
              </button>
            )}
          </div>

          {/* Department Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedDepartment('all')}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedDepartment === 'all'
                  ? 'bg-[#0F1E3D] text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#334155] hover:border-[#0F1E3D]'
              }`}
            >
              All Departments ({contacts.length})
            </button>
            {EMERGENCY_DEPARTMENT_OPTIONS.map((dept) => {
              const count = contacts.filter((c) => c.department === dept.id).length;
              const active = selectedDepartment === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDepartment(dept.id)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
                    active
                      ? 'bg-[#0F1E3D] text-white'
                      : 'bg-white border border-[#E5E7EB] text-[#334155] hover:border-[#0F1E3D]'
                  }`}
                >
                  {getDepartmentIcon(dept.id)}
                  <span>{dept.shortLabel}</span>
                  <span className="tabular-nums opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact Directory Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6 bg-[#FFFFFF]">
          {contacts.length === 0 ? (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-8 text-center max-w-xl mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0F1E3D] text-white flex items-center justify-center mx-auto">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-[#0F1E3D]">
                No Emergency Contacts Published Yet
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                FU MARKET strictly displays verified, real emergency numbers configured by the platform administrator rather than unverified or placeholder numbers. Once university security, health centre, fire service, or student affairs lines are verified, they will appear here with direct call buttons.
              </p>
              {onReportEmergency && (
                <button
                  type="button"
                  onClick={() => onReportEmergency(contextReportCategory)}
                  className="min-h-[44px] px-5 py-2.5 bg-[#0F1E3D] hover:bg-[#16294F] text-white text-xs font-black rounded-xl transition"
                >
                  Submit Incident Note to Help Centre
                </button>
              )}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-8 text-center text-xs text-[#475569]">
              No contacts matched your selected department or search query.
            </div>
          ) : (
            groupedSections
              .filter((section) => section.items.length > 0 || selectedDepartment !== 'all')
              .map((section) => (
                <section key={section.id} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                    <h3 className="text-sm font-black text-[#0F1E3D] flex items-center gap-2">
                      <span className="text-[#0B6B3A]">{getDepartmentIcon(section.id)}</span>
                      <span>{section.label}</span>
                    </h3>
                    <span className="text-[11px] font-bold text-[#64748B] tabular-nums">
                      {section.items.length} contact{section.items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {section.items.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B]">
                      No verified or pending contact numbers added yet under {section.label}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {section.items.map((contact) => {
                        const callHref = buildEmergencyCallHref(contact.phone);
                        return (
                          <div
                            key={contact.id}
                            className="p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-black text-sm text-[#0F1E3D] leading-snug">
                                  {contact.name}
                                </h4>
                                {contact.verified ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[#0B6B3A] text-[10px] font-black shrink-0">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-[10px] font-black shrink-0">
                                    <AlertTriangle className="w-3 h-3" />
                                    Unverified
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#475569] leading-relaxed">
                                {contact.description}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#334155] pt-1">
                                <span className="font-mono font-black text-[#0F1E3D] tabular-nums">
                                  {contact.phone}
                                </span>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 text-[#475569]">
                                  <Clock className="w-3 h-3 text-[#0F1E3D]" />
                                  {contact.operatingHours}
                                </span>
                              </div>
                            </div>

                            <a
                              href={callHref}
                              className={`min-h-[44px] w-full px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
                                contact.verified
                                  ? 'bg-[#0B6B3A] hover:bg-[#14532D] text-white'
                                  : 'bg-[#0F1E3D] hover:bg-[#16294F] text-white'
                              }`}
                            >
                              <Phone className="w-4 h-4" />
                              <span>Call {contact.phone}</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))
          )}
        </div>
      </div>
    </div>
  );
};
