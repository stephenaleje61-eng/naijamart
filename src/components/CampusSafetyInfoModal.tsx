import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { CAMPUS_SAFETY_TOPICS } from '../services/emergencyCentre.js';

interface CampusSafetyInfoModalProps {
  onClose: () => void;
  onOpenContacts?: () => void;
  onReportSecurityConcern?: () => void;
}

export const CampusSafetyInfoModal: React.FC<CampusSafetyInfoModalProps> = ({
  onClose,
  onOpenContacts,
  onReportSecurityConcern
}) => {
  const [expandedTopicId, setExpandedTopicId] = useState<string>(
    CAMPUS_SAFETY_TOPICS[0]?.id || 'personal-safety'
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-3xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col text-[#111111]">
        {/* Header */}
        <div className="bg-[#0F1E3D] text-white p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0B6B3A] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black">
                Campus Safety Information
              </h2>
              <p className="text-xs text-white/80">
                Practical safety tips, scam protection, and emergency procedures for the FUWUKARI community
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close safety guide"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Topic Jump Bar */}
        <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-5 py-2.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {CAMPUS_SAFETY_TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setExpandedTopicId(topic.id)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                expandedTopicId === topic.id
                  ? 'bg-[#0F1E3D] text-white'
                  : 'bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#0F1E3D]'
              }`}
            >
              {topic.title}
            </button>
          ))}
        </div>

        {/* Topics Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {CAMPUS_SAFETY_TOPICS.map((topic) => {
            const isOpen = expandedTopicId === topic.id;
            return (
              <div
                key={topic.id}
                className={`rounded-2xl border transition ${
                  isOpen
                    ? 'border-[#0F1E3D] bg-[#F8FAFC]'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTopicId(isOpen ? '' : topic.id)
                  }
                  className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <h3 className="text-sm font-black text-[#0F1E3D]">{topic.title}</h3>
                    <p className="text-xs text-[#475569] mt-0.5">{topic.summary}</p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-[#0F1E3D] shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#64748B] shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-[#E2E8F0] space-y-2">
                    {topic.points.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-[#1E293B] leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        {(onOpenContacts || onReportSecurityConcern) && (
          <div className="p-4 bg-[#F8FAFC] border-t border-[#E5E7EB] flex flex-wrap items-center justify-end gap-2 shrink-0">
            {onReportSecurityConcern && (
              <button
                type="button"
                onClick={onReportSecurityConcern}
                className="min-h-[44px] px-4 py-2 bg-white border border-[#CBD5E1] hover:border-[#0F1E3D] text-[#0F1E3D] text-xs font-black rounded-xl transition"
              >
                Report a Security Concern
              </button>
            )}
            {onOpenContacts && (
              <button
                type="button"
                onClick={onOpenContacts}
                className="min-h-[44px] px-4 py-2 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black rounded-xl transition"
              >
                View Emergency Contacts
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
