import React from 'react';
import {
  ShieldCheck,
  Clock,
  Sparkles,
  MapPin,
  Heart,
  MessageCircle,
  HelpCircle,
  Store
} from 'lucide-react';
import { Category } from '../types.js';

interface FooterProps {
  categories: Category[];
  onSelectCategory: (catId: string) => void;
  onOpenSellModal: () => void;
  onOpenSafetyModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  categories,
  onSelectCategory,
  onOpenSellModal,
  onOpenSafetyModal
}) => {
  return (
    <footer className="bg-[#1C1917] text-white pt-12 pb-8 border-t border-gray-800 text-xs">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pb-10 border-b border-gray-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F68B1F]/20 text-[#F68B1F] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">7-Day Fresh Listings</h4>
              <p className="text-gray-400 text-xs mt-0.5">
                All posts expire after 168 hours to ensure stock is active and available.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Direct WhatsApp Deals</h4>
              <p className="text-gray-400 text-xs mt-0.5">
                Chat directly with sellers on WhatsApp with zero middleman deductions.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Scam Prevention</h4>
              <p className="text-gray-400 text-xs mt-0.5">
                Strict safety advice: physical inspection before payment, zero advance delivery fees.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#F68B1F] flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">100% Free Listing</h4>
              <p className="text-gray-400 text-xs mt-0.5">
                Post your phones, fashion, cars, and groceries for free across Nigeria.
              </p>
            </div>
          </div>
        </div>

        {/* Middle Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 py-10 border-b border-gray-800">
          {/* Brand Info */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#F68B1F] flex items-center justify-center font-black text-white text-sm">
                ZM
              </div>
              <span className="font-black text-xl tracking-tight text-white">
                ZANGA<span className="text-[#F68B1F]">MARKET</span>
              </span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-sm mb-4">
              Shop More. Save More. Sell to Everyone. ZangaMarket is Nigeria's next-generation e-commerce marketplace connecting buyers and sellers directly on WhatsApp.
            </p>
            <div className="text-[11px] text-gray-500 space-y-1">
              <p>Physical Presence: Ikeja (Lagos) • Wuse 2 (Abuja) • Port Harcourt (Rivers)</p>
              <p>Built for high performance across Nigerian mobile networks.</p>
            </div>
          </div>

          {/* Popular Categories */}
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-gray-200 mb-3">
              Popular Categories
            </h5>
            <ul className="space-y-2 text-gray-400">
              {categories.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onSelectCategory(c.id)}
                    className="hover:text-[#F68B1F] transition text-left"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* More Categories */}
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-gray-200 mb-3">
              More Departments
            </h5>
            <ul className="space-y-2 text-gray-400">
              {categories.slice(6, 12).map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onSelectCategory(c.id)}
                    className="hover:text-[#F68B1F] transition text-left"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Safety & Sellers */}
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-gray-200 mb-3">
              Trust & Selling
            </h5>
            <ul className="space-y-2 text-gray-400">
              <li>
                <button onClick={onOpenSellModal} className="hover:text-[#F68B1F] transition font-semibold text-[#F68B1F]">
                  Post a Free Product
                </button>
              </li>
              <li>
                <button onClick={onOpenSafetyModal} className="hover:text-[#F68B1F] transition">
                  Buyer Safety Guidelines
                </button>
              </li>
              <li>
                <button onClick={onOpenSafetyModal} className="hover:text-[#F68B1F] transition">
                  Prohibited Items Policy
                </button>
              </li>
              <li>
                <button onClick={onOpenSafetyModal} className="hover:text-[#F68B1F] transition">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={onOpenSafetyModal} className="hover:text-[#F68B1F] transition">
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <p>© 2026 NaijaMart Nigeria. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Always inspect items before paying • Never transfer upfront transport fares • Deal safely
          </p>
        </div>
      </div>
    </footer>
  );
};
