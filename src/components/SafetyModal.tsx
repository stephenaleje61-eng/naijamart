import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Lock,
  PhoneCall,
  CheckCircle2,
  Ban
} from 'lucide-react';

interface SafetyModalProps {
  onClose: () => void;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'safety' | 'prohibited' | 'terms' | 'privacy'>('safety');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#1C1917] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#008751] flex items-center justify-center text-white font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Trust, Safety & Legal Center</h3>
              <p className="text-[11px] text-gray-400">Nigeria Safe Online Marketplace Standards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 flex items-center gap-2 overflow-x-auto shrink-0 py-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('safety')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'safety' ? 'bg-[#F68B1F] text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Buyer Scam Protection
          </button>
          <button
            onClick={() => setActiveTab('prohibited')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'prohibited' ? 'bg-[#F68B1F] text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Prohibited Items
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'terms' ? 'bg-[#F68B1F] text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'privacy' ? 'bg-[#F68B1F] text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Privacy Policy
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-gray-700 space-y-4 leading-relaxed">
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900">
                <h4 className="font-bold text-sm mb-1 flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Important Marketplace Notice
                </h4>
                <p>
                  NaijaMart is a free direct-connection platform connecting Nigerian buyers and sellers over WhatsApp. <strong>NaijaMart does not handle escrow or guarantee transactions when parties deal directly.</strong> Always observe the safety rules below:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <strong className="block text-gray-900 font-bold mb-0.5">Never Send Advance Delivery Fees</strong>
                    Do not make upfront bank transfers, commit money, or "fuel money" for delivery before seeing the seller in person. Legitimate Nigerian sellers allow inspection before payment.
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <strong className="block text-gray-900 font-bold mb-0.5">Meet in Public, Well-Lit Places</strong>
                    Always arrange pick-ups at open, populated public venues — shopping malls, fuel stations, banks, or police stations. Never meet in secluded locations or isolated private residences.
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <strong className="block text-gray-900 font-bold mb-0.5">Inspect Gadgets and Goods Thoroughly</strong>
                    For phones and laptops: check IMEI numbers (*#06#), check iCloud/Google account lock status, test camera, battery health, and run diagnostic tests before transferring funds.
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <strong className="block text-gray-900 font-bold mb-0.5">Beware of Unrealistic Prices</strong>
                    If an iPhone 15 Pro Max is listed for ₦150,000, it is almost certainly a scam or counterfeit device. If an offer sounds too good to be true, it always is.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prohibited' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-red-600" />
                Prohibited Items on NaijaMart
              </h4>
              <p>The following items are strictly prohibited under Nigerian law and marketplace policies:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
                <li>Firearms, ammunition, military apparel, and security equipment.</li>
                <li>Narcotics, illicit prescription medications, and prohibited chemical substances.</li>
                <li>Counterfeit banknotes, forged documents, and pirated media.</li>
                <li>Stolen property or devices with iCloud/activation locks.</li>
                <li>Human organs, endangered wildlife, and restricted botanical species.</li>
                <li>Multi-level marketing (MLM), Ponzi schemes, crypto investment schemes, and "get-rich-quick" offers.</li>
              </ul>
              <p className="text-[11px] text-red-600 font-semibold mt-3">
                Any merchant posting prohibited items will have their listing removed immediately, account banned, and IP details forwarded to regulatory authorities.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-sm text-gray-900">Terms of Service</h4>
              <p>
                1. <strong>Direct Communication:</strong> NaijaMart provides the catalog index and links directly to seller WhatsApp numbers. NaijaMart is not a party to the physical trade, delivery, or monetary settlement between parties.
              </p>
              <p>
                2. <strong>7-Day Listing Expiration:</strong> All listings remain live for precisely 168 hours (7 days) from publication. Upon expiration, listings are automatically and permanently deleted from active search and storage.
              </p>
              <p>
                3. <strong>Mandatory Genuine Photos:</strong> Sellers must own and upload legitimate photographs of the actual items being sold. Stock or false manufacturer images used to mislead buyers constitute grounds for immediate termination.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-sm text-gray-900">Privacy Policy</h4>
              <p>
                NaijaMart values your privacy. We collect minimal personal data: name, email, phone number, and seller location to facilitate marketplace listings.
              </p>
              <p>
                Seller WhatsApp numbers and locations are published publicly on product listings as intended for marketplace inquiries. We never sell buyer or seller personal information to third-party ad networks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
