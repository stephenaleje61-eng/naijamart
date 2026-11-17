import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Ban
} from 'lucide-react';

interface SafetyModalProps {
  onClose: () => void;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'safety' | 'prohibited' | 'terms' | 'privacy'>('safety');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-3xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[88vh] flex flex-col text-[#10251D]">
        {/* Green Header */}
        <div className="bg-[#087443] border-b-4 border-[#D4A62A] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4A62A] flex items-center justify-center text-[#10251D]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                NIGERIA CAMPUS MARKET — Campus Safe Trading Guidelines
              </h3>
              <p className="text-[11px] text-white/90">Campus Buyer, Accommodation &amp; Delivery Safety Charter</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#065D36] border border-white/25 hover:border-[#D4A62A] flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="bg-[#F4F8F5] border-b border-[#E5E7EB] px-5 flex items-center gap-2 overflow-x-auto shrink-0 py-2.5 text-xs font-bold">
          {[
            { id: 'safety', label: 'Buyer Scam Protection' },
            { id: 'prohibited', label: 'Prohibited Items' },
            { id: 'terms', label: 'Terms of Use' },
            { id: 'privacy', label: 'Privacy Policy' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#087443] text-[#D4A62A] font-black'
                  : 'text-[#555555] hover:text-[#10251D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-[#333333] space-y-4 leading-relaxed bg-white">
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#FFFDF2] border border-[#D4A62A] rounded-2xl">
                <h4 className="font-black text-sm mb-1 flex items-center gap-1.5 text-[#10251D]">
                  <AlertTriangle className="w-4 h-4 text-[#087443]" />
                  Important FUWUKARI Marketplace Notice
                </h4>
                <p className="text-[#333333]">
                  NIGERIA CAMPUS MARKET connects students, sellers, agents, and campus riders directly across Nigerian institutions.{' '}
                  <strong className="text-[#087443]">Always inspect products and lodges physically before paying any money.</strong>
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    n: 1,
                    title: 'Zero Advance Inspection or Delivery Fees',
                    desc: 'Never transfer "inspection fees", "fuel money", or "booking deposits" before physically inspecting a product, room, or hostel.'
                  },
                  {
                    n: 2,
                    title: 'Meet in Busy Campus Locations',
                    desc: 'Arrange pickups at FUWUKARI Main Gate, Lecture Hall corridors, New Site, or crowded public areas during daytime hours.'
                  },
                  {
                    n: 3,
                    title: 'Verify Electronics & Accommodation Thoroughly',
                    desc: 'Check phone IMEI numbers (*#06#), iCloud/Google lock status, battery health, and receipts. For accommodation, confirm landlord identity and inspect water, light, and security.'
                  },
                  {
                    n: 4,
                    title: 'Report Suspicious Listings Immediately',
                    desc: 'Use the Report button on any suspicious product or Wukari Agent listing so platform moderators can review and remove bad actors.'
                  }
                ].map((item) => (
                  <div
                    key={item.n}
                    className="p-3.5 bg-[#F4F8F5] rounded-xl border border-[#E5E7EB] flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#087443] text-[#D4A62A] font-black flex items-center justify-center shrink-0 text-xs">
                      {item.n}
                    </div>
                    <div>
                      <strong className="block text-[#10251D] font-bold mb-0.5">{item.title}</strong>
                      <span>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'prohibited' && (
            <div className="space-y-3">
              <h4 className="font-black text-sm text-[#10251D] flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-[#087443]" />
                Prohibited Items on NIGERIA CAMPUS MARKET
              </h4>
              <p>The following items and posts are strictly banned across FUWUKARI campus:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#333333]">
                <li>Weapons, firearms, ammunition, and restricted tactical gear.</li>
                <li>Illicit drugs, narcotics, and unapproved controlled substances.</li>
                <li>Stolen phones, laptops, or devices with activation/iCloud locks.</li>
                <li>Fake or misleading product photos that do not represent the actual item for sale.</li>
                <li>Fraudulent accommodation postings or fake agency fee demands.</li>
                <li>Ponzi schemes, crypto investment scams, and exam malpractice materials.</li>
              </ul>
              <p className="text-[11px] text-[#087443] font-black mt-3 p-3 bg-[#F4F8F5] rounded-xl border border-[#087443]/25">
                Accounts posting prohibited listings are suspended and removed permanently.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-black text-sm text-[#10251D]">NIGERIA CAMPUS MARKET Terms of Use</h4>
              <p>
                1. <strong className="text-[#10251D]">Genuine Listings Only:</strong> Every product, student request, accommodation listing, and Okada rider entry must come from a real user with accurate contact details and genuine photos.
              </p>
              <p>
                2. <strong className="text-[#10251D]">Persistent Real Records:</strong> Listings remain active in the database until sold, fulfilled, updated, or deleted by the owner or an administrator.
              </p>
              <p>
                3. <strong className="text-[#10251D]">Direct Campus Deals:</strong> Buyers and sellers are responsible for verifying item condition, payment, and meetup safety on campus.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-black text-sm text-[#10251D]">Privacy Policy</h4>
              <p>
                NIGERIA CAMPUS MARKET stores only the details needed for your campus marketplace profile and listings: display name, matriculation number (where applicable), email/phone, WhatsApp contact, and uploaded item photos.
              </p>
              <p>
                Contact details attached to public listings are displayed so genuine FUWUKARI buyers, students, or agents can reach you. We never sell student information to advertisers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
