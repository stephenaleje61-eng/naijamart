import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  ShieldCheck,
  MessageCircle,
  Share2,
  CheckCircle2,
  Package
} from 'lucide-react';
import { Product, SellerProfile } from '../types.js';
import { fetchSellerStorefront } from '../services/api.js';
import { ProductCard } from './ProductCard.js';
import { DirectChatTarget } from './FriendsPage.js';

interface SellerStorefrontModalProps {
  sellerId: string | null;
  onClose: () => void;
  onOpenProductDetail: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onStartDirectChat?: (target: DirectChatTarget) => void;
}

export const SellerStorefrontModal: React.FC<SellerStorefrontModalProps> = ({
  sellerId,
  onClose,
  onOpenProductDetail,
  onAddToCart,
  onStartDirectChat
}) => {
  const [seller, setSeller] = useState<(SellerProfile & { totalListings: number }) | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    setLoadError(null);
    fetchSellerStorefront(sellerId)
      .then((data) => {
        setSeller(data.seller);
        setProducts(data.products || []);
      })
      .catch((err) => {
        console.warn('[Storefront] Unable to load storefront:', err.message);
        setLoadError(err.message || 'Unable to load storefront.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sellerId]);

  if (!sellerId) return null;

  const handleShareStorefront = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const buildWhatsAppHref = (): string | null => {
    const raw = seller?.whatsappNumber?.trim();
    if (!raw) return null;
    let cleaned = raw.replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (!cleaned.startsWith('234')) cleaned = '234' + cleaned;
    const shopName = seller?.shopName || 'Store';
    const msg = encodeURIComponent(
      `Hello ${shopName}, I found your storefront on FU MARKET (FUWUKARI). I would like to make an enquiry.`
    );
    return `https://wa.me/${cleaned}?text=${msg}`;
  };

  const whatsappHref = buildWhatsAppHref();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-5xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[90vh] flex flex-col text-[#111111]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-[#14532D] border border-white/25 hover:border-[#F2B90D] text-white shadow-md flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Green Storefront Banner */}
        <div className="relative h-44 sm:h-52 bg-[#0B6B3A] border-b-4 border-[#F2B90D] overflow-hidden shrink-0">
          {seller?.coverImage && (
            <img
              src={seller.coverImage}
              alt="Cover"
              className="w-full h-full object-cover opacity-20"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#14532D]/95 via-[#0B6B3A]/60 to-transparent" />

          {/* Seller Branding Overlay */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#F2B90D] border-2 border-white shadow-xl flex items-center justify-center text-[#111111] font-black text-2xl shrink-0 overflow-hidden">
                {seller?.shopLogo ? (
                  <img src={seller.shopLogo} alt={seller?.shopName || 'Store'} className="w-full h-full object-cover" />
                ) : (
                  seller?.shopName ? seller.shopName.charAt(0).toUpperCase() : 'W'
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    {seller?.shopName || 'Campus Seller Store'}
                  </h1>
                  {seller?.isVerified && (
                    <span className="bg-[#F2B90D] text-[#111111] text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-white/90 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#F2B90D]" />
                    {seller?.city || 'Wukari'}, {seller?.state || 'Taraba'}
                  </span>
                  <span>•</span>
                  <span>{products.length} Active Listings</span>
                </div>
              </div>
            </div>

            {/* Direct Contact CTAs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleShareStorefront}
                className="px-3.5 py-2 bg-[#14532D] hover:bg-black/30 border border-white/25 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-[#F2B90D]" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Share Shop'}</span>
              </button>

              {onStartDirectChat && seller?.userId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartDirectChat({
                      id: seller.userId,
                      name: seller.shopName || 'Seller'
                    });
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-[#F5F5F5] text-[#0B6B3A] font-black text-xs rounded-xl flex items-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message In App</span>
                </button>
              )}

              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#F5F5F5]">
          {seller?.description && (
            <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] text-xs sm:text-sm text-[#333333] mb-6">
              <strong className="block text-[#111111] font-black mb-1">About this Seller:</strong>
              <p className="leading-relaxed">{seller.description}</p>
              {seller.address && (
                <p className="text-xs text-[#555555] mt-2 font-medium">
                  Location Details: {seller.address}
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0B6B3A]" />
                All Products from {seller?.shopName || 'Seller'} ({products.length})
              </h3>
              <span className="text-xs text-[#0B6B3A] font-bold">FU MARKET • Campus Store</span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-[#555555]">
                Loading storefront catalog...
              </div>
            ) : loadError ? (
              <div className="py-12 px-6 text-center bg-[#FFF8DB] rounded-2xl border-2 border-[#111111] text-xs text-[#111111]">
                <p className="font-black text-sm mb-1">Storefront Notice</p>
                <p>{loadError}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-[#E5E7EB] text-xs text-[#555555]">
                This seller currently has no active products.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {products.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onOpenDetail={(p) => {
                      onClose();
                      onOpenProductDetail(p);
                    }}
                    onAddToCart={onAddToCart}
                    onStartDirectChat={(target) => {
                      onClose();
                      onStartDirectChat?.(target);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
