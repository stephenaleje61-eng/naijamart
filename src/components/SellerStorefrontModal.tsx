import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  MapPin,
  ShieldCheck,
  MessageCircle,
  Phone,
  Share2,
  CheckCircle2,
  ExternalLink,
  Package
} from 'lucide-react';
import { Product, SellerProfile } from '../types.js';
import { fetchSellerStorefront } from '../services/api.js';
import { ProductCard } from './ProductCard.js';
import { formatWhatsAppLink } from '../../server/routes/products.js';

interface SellerStorefrontModalProps {
  sellerId: string | null;
  onClose: () => void;
  onOpenProductDetail: (product: Product) => void;
}

export const SellerStorefrontModal: React.FC<SellerStorefrontModalProps> = ({
  sellerId,
  onClose,
  onOpenProductDetail
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
        console.warn('[Storefront] Notification while loading storefront:', err.message);
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

  const handleGeneralWhatsAppChat = () => {
    if (!seller) return;
    const phone = seller.whatsappNumber || '08031234567';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (!cleaned.startsWith('234')) cleaned = '234' + cleaned;
    const shopName = seller.shopName || 'Store';
    const msg = encodeURIComponent(`Hello ${shopName}, I found your storefront on NaijaMart. I would like to make an enquiry!`);
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-black shadow-md flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Storefront Banner */}
        <div className="relative h-44 sm:h-52 bg-gradient-to-r from-[#1C1917] via-[#2D2A26] to-[#1C1917] overflow-hidden shrink-0">
          {seller?.coverImage && (
            <img
              src={seller.coverImage}
              alt="Cover"
              className="w-full h-full object-cover opacity-35"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

          {/* Seller Branding Overlay */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#E07A15] to-[#F68B1F] border-2 border-white/60 shadow-xl flex items-center justify-center text-white font-black text-2xl shrink-0 overflow-hidden">
                {seller?.shopLogo ? (
                  <img src={seller.shopLogo} alt={seller?.shopName || 'Store'} className="w-full h-full object-cover" />
                ) : (
                  (seller?.shopName ? seller.shopName.charAt(0).toUpperCase() : 'S')
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black">{seller?.shopName || 'Shop Storefront'}</h1>
                  {seller?.isVerified && (
                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#F68B1F]" />
                    {seller?.city || 'Nigeria'}, {seller?.state || 'Verified'}
                  </span>
                  <span>•</span>
                  <span>{products.length} Active Listings</span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Contact CTA */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareStorefront}
                className="px-3.5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Share Shop'}</span>
              </button>

              <button
                onClick={handleGeneralWhatsAppChat}
                className="px-4 py-2 bg-[#25D366] hover:bg-[#20BA5C] text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Chat Store on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Shop Bio */}
          {seller?.description && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs sm:text-sm text-gray-700 mb-6">
              <strong className="block text-gray-900 font-bold mb-1">About this Store:</strong>
              <p className="leading-relaxed">{seller.description}</p>
              {seller.address && (
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  Physical Store Address: {seller.address}
                </p>
              )}
            </div>
          )}

          {/* Products from this seller */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#F68B1F]" />
                All Products from {seller?.shopName || 'Store'} ({products.length})
              </h3>
              <span className="text-xs text-gray-500 font-mono">
                Direct WhatsApp Deals • 7-Day Stock
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-gray-500">
                Loading storefront catalog...
              </div>
            ) : loadError ? (
              <div className="py-12 px-6 text-center bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800">
                <p className="font-semibold text-sm mb-1">Storefront Notice</p>
                <p>{loadError}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-500">
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
