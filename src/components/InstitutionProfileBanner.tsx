import React from 'react';
import { Building2, Compass, GraduationCap, MapPin, RefreshCw } from 'lucide-react';
import { Institution } from '../types.js';

interface InstitutionProfileBannerProps {
  institution: Institution;
  activeCampus: string;
  onChangeCampus: (campus: string) => void;
  onOpenInstitutionDirectory: () => void;
  onOpenNationwideSearch: () => void;
}

export const InstitutionProfileBanner: React.FC<InstitutionProfileBannerProps> = ({
  institution,
  activeCampus,
  onChangeCampus,
  onOpenInstitutionDirectory,
  onOpenNationwideSearch
}) => {
  const accentPrimary = institution.primaryColor || '#222222';
  const accentSecondary = institution.secondaryColor || '#FF6A00';

  return (
    <section
      aria-label="Active Campus Profile"
      className="bg-[#FFFFFF] border-b border-[#EEEEEE] shadow-2xs"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-3.5">
        <div
          className="rounded-xl border border-[#EEEEEE] bg-[#F7F7F7] overflow-hidden"
          style={
            institution.bannerUrl
              ? {
                  backgroundImage: `linear-gradient(to right, rgba(34,34,34,0.88), rgba(246,139,31,0.82)), url(${institution.bannerUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : undefined
          }
        >
          <div className="px-3.5 sm:px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Institution Crest & Identity */}
            <div className="flex items-center gap-3 min-w-0">
              {institution.logoUrl ? (
                <img
                  src={institution.logoUrl}
                  alt={`${institution.shortName} crest`}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border border-[#F68B1F]/60 bg-white shrink-0"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm border border-[#F68B1F]/50 shrink-0"
                  style={{ background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})` }}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span
                    className={`text-xs font-extrabold tracking-tight truncate ${
                      institution.bannerUrl ? 'text-white' : 'text-[#222222]'
                    }`}
                  >
                    {institution.name} ({institution.shortName})
                  </span>
                  <span
                    className={`text-[11px] font-medium ${
                      institution.bannerUrl ? 'text-slate-200' : 'text-[#303030]/70'
                    }`}
                  >
                    · {institution.type}
                  </span>
                </div>
                <p
                  className={`text-xs mt-0.5 flex items-center gap-1.5 truncate ${
                    institution.bannerUrl ? 'text-slate-200' : 'text-[#303030]/75'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
                  <span className="truncate">
                    {institution.description
                      ? institution.description
                      : `${institution.location}, ${institution.state} State`}
                  </span>
                </p>
              </div>
            </div>

            {/* Campus Selector & Quick Controls */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {institution.campuses && institution.campuses.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white border border-[#EEEEEE] rounded-lg px-2.5 py-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
                  <select
                    value={activeCampus}
                    onChange={(e) => onChangeCampus(e.target.value)}
                    aria-label="Select active campus"
                    className="text-xs font-semibold text-[#222222] bg-transparent focus:outline-none max-w-[175px]"
                  >
                    <option value="all">All {institution.shortName} Campuses</option>
                    {institution.campuses.map((campus) => (
                      <option key={campus} value={campus}>
                        {campus}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={onOpenInstitutionDirectory}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#EEEEEE] hover:border-[#F68B1F] text-xs font-bold text-[#222222] flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>Switch Campus</span>
              </button>

              <button
                type="button"
                onClick={onOpenNationwideSearch}
                className="px-3 py-1.5 rounded-lg bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-white" />
                <span>Nationwide Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
