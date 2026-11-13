import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  ShieldCheck,
  Heart,
  Share2,
  AlertTriangle,
  Store,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MessageCircle,
  ShoppingCart,
  AlertCircle,
  Star
} from 'lucide-react';
import { Product } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import { triggerWhatsAppChat, recordProductView, reportProduct } from '../services/api.js';
import { ProductImage } from './ProductImage.js';
import { getValidProductImages } from '../utils/productImages.js';
import { DirectChatTarget } from './FriendsPage.js';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenStorefront?: (sellerId: string) => void;
  onAddToCart?: (product: Product) => void;
  onStartDirectChat?: (target: DirectChatTarget) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenStorefront,
  onAddToCart,
  onStartDirectChat
}) => {
  const { isFavourite, toggleFavourite } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Suspected fraudulent listing');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportingLoading, setReportingLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setActiveImageIndex(0);
      setReportError(null);
      recordProductView(product.id);
    }
  }, [product?.id]);

  if (!product) return null;

  const favourited = isFavourite(product.id);

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const buildWhatsAppHref = (): string | null => {
    const raw = (product.whatsappNumber || '').trim();
    if (!raw) return null;
    let cleaned = raw.replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (!cleaned.startsWith('234')) cleaned = '234' + cleaned;
    const text = encodeURIComponent(
      `Hello ${product.sellerName || product.shopName}, I found your item "${product.title}" (${formatNaira(product.price)}) on FU MARKET. Is it still available?`
    );
    return `https://wa.me/${cleaned}?text=${text}`;
  };

  const handleWhatsAppClick = () => {
    triggerWhatsAppChat(product.id).catch(() => {});
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportingLoading(true);
    setReportError(null);
    try {
      await reportProduct(product.id, {
        reason: reportReason,
        details: reportDetails
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportDetails('');
      }, 2200);
    } catch (err: any) {
      setReportError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setReportingLoading(false);
    }
  };

  const images = getValidProductImages(product.images, product.imageUrl);
  const whatsappHref = buildWhatsAppHref();
  const locationDisplay = product.city || product.state || 'FUWUKARI Campus';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#111111]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111] shadow-md flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div className="p-4 sm:p-6 bg-[#F5F5F5] flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E5E7EB]">
            <div>
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-[#E5E7EB] flex items-center justify-center">
                <ProductImage
                  src={images[activeImageIndex]}
                  alt={product.title}
                  category={product.categoryId}
                  className="w-full h-full object-contain"
                  loading="eager"
                />

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      className="absolute left-2 w-8 h-8 rounded-full bg-white/95 border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111] shadow flex items-center justify-center transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 w-8 h-8 rounded-full bg-white/95 border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111] shadow flex items-center justify-center transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                <span className="absolute top-3 left-3 bg-[#0B6B3A] text-[#F2B90D] text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow">
                  {product.condition === 'new' ? 'Brand New' : 'Direct Used'}
                </span>
              </div>

              {images.length > 1 && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition bg-white ${
                        activeImageIndex === idx
                          ? 'border-[#0B6B3A] scale-105'
                          : 'border-[#E5E7EB] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <ProductImage src={img} alt="thumbnail" category={product.categoryId} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E5E7EB] text-xs">
              <button
                type="button"
                onClick={() => toggleFavourite(product.id)}
                className={`flex items-center gap-1.5 font-bold transition ${
                  favourited ? 'text-[#0B6B3A]' : 'text-[#555555] hover:text-[#0B6B3A]'
                }`}
              >
                <Heart className={`w-4 h-4 ${favourited ? 'fill-[#F2B90D] text-[#F2B90D]' : ''}`} />
                {favourited ? 'Saved in Favourites' : 'Save to Favourites'}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 font-semibold text-[#555555] hover:text-[#0B6B3A] transition"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-[#0B6B3A]" /> : <Share2 className="w-4 h-4" />}
                {copiedLink ? 'Link Copied!' : 'Share Listing'}
              </button>
            </div>
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="p-6 flex flex-col justify-between bg-white">
            <div>
              <div className="flex items-center justify-between text-xs text-[#555555] mb-2">
                <span className="bg-[#F5F5F5] border border-[#0B6B3A]/25 text-[#0B6B3A] font-black px-2.5 py-0.5 rounded-full capitalize">
                  {product.categoryId.replace(/-/g, ' ')}
                </span>
                <span className="text-[11px]">
                  Listed: {new Date(product.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-black text-[#111111] leading-snug mb-3">
                {product.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 mb-4 bg-[#F5F5F5] p-3.5 rounded-2xl border border-[#E5E7EB]">
                <span className="px-3 py-1 rounded-xl bg-[#0B6B3A] text-[#F2B90D] text-2xl sm:text-3xl font-black">
                  {formatNaira(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-[#666666] line-through">
                    {formatNaira(product.originalPrice)}
                  </span>
                )}
                {discountPercent && (
                  <span className="bg-[#F2B90D] text-[#111111] text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#111111]" />
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="p-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E7EB]">
                  <span className="text-[#555555] block text-[10px] uppercase font-bold">Campus Location</span>
                  <div className="flex items-center gap-1 font-bold text-[#111111] mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0B6B3A] shrink-0" />
                    <span className="truncate">{locationDisplay}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E7EB]">
                  <span className="text-[#555555] block text-[10px] uppercase font-bold">Stock Available</span>
                  <span className="font-bold text-[#111111] block mt-0.5">
                    {product.quantity} {product.quantity === 1 ? 'unit' : 'units available'}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-bold text-[#555555] uppercase tracking-wider mb-1">
                  Product Description
                </h4>
                <div className="text-xs sm:text-sm text-[#222222] whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto pr-1">
                  {product.description}
                </div>
              </div>

              {/* Seller Profile Card */}
              <div className="p-3.5 rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] mb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#0B6B3A] text-[#F2B90D] font-black text-sm flex items-center justify-center shrink-0">
                      {(product.sellerName || product.shopName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-black text-sm text-[#111111] truncate">
                        <span className="truncate">{product.sellerName || product.shopName}</span>
                        <ShieldCheck className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                      </div>
                      <span className="text-[11px] text-[#555555] block truncate">
                        {product.shopName} • {locationDisplay}
                      </span>
                    </div>
                  </div>

                  {onOpenStorefront && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenStorefront(product.sellerId);
                      }}
                      className="text-xs font-black text-[#0B6B3A] hover:underline flex items-center gap-1 shrink-0"
                    >
                      <Store className="w-3.5 h-3.5" />
                      View Store
                    </button>
                  )}
                </div>
              </div>

              {/* FUWUKARI Buyer Safety Notice */}
              <div className="p-2.5 rounded-xl bg-[#F5F5F5] border border-[#0B6B3A]/30 text-[11px] text-[#333333] flex items-start gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-[#0B6B3A] shrink-0 mt-0.5" />
                <p>
                  <strong className="font-black text-[#0B6B3A]">FUWUKARI Safe Meetup:</strong> Meet sellers in open campus areas. Inspect goods thoroughly before transferring any money.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  className="w-full py-3.5 px-6 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs sm:text-sm rounded-2xl active:scale-95 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <MessageCircle className="w-4 h-4 text-[#F2B90D]" />
                  <span>Chat on WhatsApp</span>
                </a>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onAddToCart && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(product);
                      onClose();
                    }}
                    className="py-3 px-4 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs rounded-2xl active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                )}

                {onStartDirectChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartDirectChat({
                        id: product.sellerId,
                        name: product.sellerName || product.shopName
                      });
                    }}
                    className="py-3 px-4 bg-[#F5F5F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#111111] font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-[#0B6B3A]" />
                    <span>In-App Chat</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#555555] px-1 pt-1">
                <span className="font-mono">
                  {product.whatsappNumber ? `Contact: ${product.whatsappNumber}` : 'Direct in-app chat enabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="text-[#111111] hover:text-[#0B6B3A] flex items-center gap-1 font-bold underline"
                >
                  <AlertTriangle className="w-3 h-3 text-[#F2B90D]" />
                  Report Listing
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Listing Submodal */}
        {showReportModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 p-6 flex flex-col justify-center items-center">
            <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-xl border border-[#E5E7EB] text-[#111111]">
              <h3 className="text-base font-black text-[#111111] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#F2B90D]" />
                Report Listing on FU MARKET
              </h3>
              <p className="text-xs text-[#555555] mb-4">
                Help keep the FUWUKARI student marketplace safe from scams or misleading items.
              </p>

              {reportError && (
                <div className="mb-3 p-3 bg-[#FFF8DB] border border-[#F2B90D] text-[#111111] rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#111111] shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}

              {reportSuccess ? (
                <div className="p-4 bg-[#F5F5F5] border border-[#0B6B3A] text-[#0B6B3A] rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  Thank you! Your report has been submitted to FU MARKET moderators.
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1">Reason</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full text-xs p-2.5 bg-[#F5F5F5] border border-[#E5E7EB] text-[#111111] rounded-xl outline-none focus:border-[#0B6B3A]"
                    >
                      <option value="Suspected fraudulent listing">Suspected fraudulent / scam listing</option>
                      <option value="Asking for upfront deposit or delivery fee">Asking for upfront deposit or delivery fee</option>
                      <option value="Counterfeit or stolen item">Counterfeit or stolen item</option>
                      <option value="Incorrect price or photo">Incorrect price or false photo</option>
                      <option value="Prohibited or illegal merchandise">Prohibited or illegal merchandise</option>
                      <option value="Invalid phone number">Invalid phone number</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1">Details &amp; Evidence</label>
                    <textarea
                      required
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Please provide details of what happened..."
                      className="w-full text-xs p-2.5 bg-[#F5F5F5] border border-[#E5E7EB] text-[#111111] rounded-xl outline-none focus:border-[#0B6B3A]"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#555555] hover:text-[#111111] rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reportingLoading}
                      className="px-4 py-2 text-xs font-black bg-[#111111] hover:bg-[#14532D] text-white rounded-xl disabled:opacity-50"
                    >
                      {reportingLoading ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
