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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-3xl bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#1C1C1C] border-b border-[#333333] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFFFFF]/15 border border-[#FFFFFF]/40 flex items-center justify-center text-[#FFFFFF]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">FU MARKET — FUWUKARI Safe Trading Guidelines</h3>
              <p className="text-[11px] text-[#BDBDBD]">Campus Buyer, Accommodation &amp; Delivery Safety Charter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-[#BDBDBD] hover:text-white" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="bg-[#1C1C1C] border-b border-[#333333] px-5 flex items-center gap-2 overflow-x-auto shrink-0 py-2.5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('safety')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'safety' ? 'bg-[#FFFFFF] text-black' : 'text-[#BDBDBD] hover:text-white'
            }`}
          >
            Buyer Scam Protection
          </button>
          <button
            onClick={() => setActiveTab('prohibited')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'prohibited' ? 'bg-[#FFFFFF] text-black' : 'text-[#BDBDBD] hover:text-white'
            }`}
          >
            Prohibited Items
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'terms' ? 'bg-[#FFFFFF] text-black' : 'text-[#BDBDBD] hover:text-white'
            }`}
          >
            Terms of Use
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'privacy' ? 'bg-[#FFFFFF] text-black' : 'text-[#BDBDBD] hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-[#BDBDBD] space-y-4 leading-relaxed">
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1C1C1C] border border-[#FFFFFF]/40 rounded-2xl">
                <h4 className="font-bold text-sm mb-1 flex items-center gap-1.5 text-[#FFFFFF]">
                  <AlertTriangle className="w-4 h-4" />
                  Important FUWUKARI Marketplace Notice
                </h4>
                <p className="text-[#BDBDBD]">
                  FU MARKET connects students, sellers, agents, and campus Okada riders directly in Wukari. <strong className="text-white">Always inspect products and lodges physically before paying any money.</strong>
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-[#1C1C1C] rounded-xl border border-[#333333] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FFFFFF]/20 text-[#FFFFFF] font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <strong className="block text-white font-bold mb-0.5">Zero Advance Inspection or Delivery Fees</strong>
                    Never transfer &ldquo;inspection fees&rdquo;, &ldquo;fuel money&rdquo;, or &ldquo;booking deposits&rdquo; before physically inspecting a product, room, or hostel.
                  </div>
                </div>

                <div className="p-3.5 bg-[#1C1C1C] rounded-xl border border-[#333333] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FFFFFF]/20 text-[#FFFFFF] font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <strong className="block text-white font-bold mb-0.5">Meet in Busy Campus Locations</strong>
                    Arrange pickups at FUWUKARI Main Gate, Lecture Hall corridors, New Site, or crowded public areas during daytime hours.
                  </div>
                </div>

                <div className="p-3.5 bg-[#1C1C1C] rounded-xl border border-[#333333] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FFFFFF]/20 text-[#FFFFFF] font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <strong className="block text-white font-bold mb-0.5">Verify Electronics &amp; Accommodation Thoroughly</strong>
                    Check phone IMEI numbers (*#06#), iCloud/Google lock status, battery health, and receipts. For accommodation, confirm landlord identity and inspect water, light, and security.
                  </div>
                </div>

                <div className="p-3.5 bg-[#1C1C1C] rounded-xl border border-[#333333] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FFFFFF]/20 text-[#FFFFFF] font-bold flex items-center justify-center shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <strong className="block text-white font-bold mb-0.5">Report Suspicious Listings Immediately</strong>
                    Use the Report button on any suspicious product or Wukari Agent listing so platform moderators can review and remove bad actors.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prohibited' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-red-400" />
                Prohibited Items on FU MARKET
              </h4>
              <p>The following items and posts are strictly banned across FUWUKARI campus:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#BDBDBD]">
                <li>Weapons, firearms, ammunition, and restricted tactical gear.</li>
                <li>Illicit drugs, narcotics, and unapproved controlled substances.</li>
                <li>Stolen phones, laptops, or devices with activation/iCloud locks.</li>
                <li>Fake or misleading product photos that do not represent the actual item for sale.</li>
                <li>Fraudulent accommodation postings or fake agency fee demands.</li>
                <li>Ponzi schemes, crypto investment scams, and exam malpractice materials.</li>
              </ul>
              <p className="text-[11px] text-red-400 font-semibold mt-3">
                Accounts posting prohibited listings are suspended and removed permanently.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-sm text-white">FU MARKET Terms of Use</h4>
              <p>
                1. <strong className="text-white">Genuine Listings Only:</strong> Every product, student request, accommodation listing, and Okada rider entry must come from a real user with accurate contact details and genuine photos.
              </p>
              <p>
                2. <strong className="text-white">Persistent Real Records:</strong> Listings remain active in the database until sold, fulfilled, updated, or deleted by the owner or an administrator.
              </p>
              <p>
                3. <strong className="text-white">Direct Campus Deals:</strong> Buyers and sellers are responsible for verifying item condition, payment, and meetup safety on campus.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-sm text-white">Privacy Policy</h4>
              <p>
                FU MARKET stores only the details needed for your campus marketplace profile and listings: display name, matriculation number (where applicable), email/phone, WhatsApp contact, and uploaded item photos.
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
