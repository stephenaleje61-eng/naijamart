import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  Heart,
  Share2,
  AlertTriangle,
  Phone,
  Store,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MessageCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Product } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import { triggerWhatsAppChat, recordProductView, reportProduct } from '../services/api.js';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenStorefront?: (sellerId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenStorefront
}) => {
  const { isFavourite, toggleFavourite } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Suspected fraudulent listing');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportingLoading, setReportingLoading] = useState(false);
  const [clickCount, setClickCount] = useState<number>(product?.whatsappClicks || 0);

  useEffect(() => {
    if (product) {
      setActiveImageIndex(0);
      setClickCount(product.whatsappClicks || 0);
      // Increment view in background
      recordProductView(product.id);
    }
  }, [product?.id]);

  if (!product) return null;

  const favourited = isFavourite(product.id);

  // Expiration calculation
  const now = Date.now();
  const expiresTime = new Date(product.expiresAt).getTime();
  const remainingMs = Math.max(0, expiresTime - now);
  const remainingHours = Math.floor(remainingMs / (1000 * 3600));
  const remainingDays = Math.floor(remainingHours / 24);

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleWhatsAppClick = async () => {
    try {
      const res = await triggerWhatsAppChat(product.id);
      setClickCount(prev => prev + 1);
      window.open(res.link, '_blank');
    } catch {
      let cleaned = product.whatsappNumber.replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
      const text = encodeURIComponent(
        `Hello ${product.shopName}, I found your product "${product.title}" (₦${product.price.toLocaleString()}) on NaijaMart. Is it still available?`
      );
      window.open(`https://wa.me/${cleaned}?text=${text}`, '_blank');
    }
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
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setReportingLoading(false);
    }
  };

  const images = product.images && product.images.length > 0 ? product.images : [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-black shadow-md flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div className="p-4 sm:p-6 bg-gray-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200">
            <div>
              {/* Main Image with Navigation */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white shadow-inner flex items-center justify-center">
                <img
                  src={images[activeImageIndex]}
                  alt={product.title}
                  className="w-full h-full object-contain"
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      className="absolute left-2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Condition Pill */}
                <span className="absolute top-3 left-3 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {product.condition === 'new' ? 'Brand New' : 'Direct Used'}
                </span>

                {/* Expiration warning banner */}
                <span className="absolute bottom-3 left-3 bg-red-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Expires strictly in {remainingDays}d {remainingHours % 24}h (7-Day Rule)</span>
                </span>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                        activeImageIndex === idx ? 'border-[#F68B1F] scale-105' : 'border-gray-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Share & Favourite row */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 text-xs">
              <button
                onClick={() => toggleFavourite(product.id)}
                className={`flex items-center gap-1.5 font-bold transition ${
                  favourited ? 'text-red-600' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${favourited ? 'fill-red-600' : ''}`} />
                {favourited ? 'Saved in Favourites' : 'Save to Favourites'}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 font-semibold text-gray-600 hover:text-[#F68B1F] transition"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                {copiedLink ? 'Link Copied!' : 'Share Listing'}
              </button>
            </div>
          </div>

          {/* Right Column: Product Info & Direct WhatsApp CTA */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              {/* Category & Status */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span className="bg-orange-50 text-[#E07A15] font-bold px-2.5 py-0.5 rounded-full capitalize">
                  {product.categoryId.replace('-', ' ')}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span>Listed: {new Date(product.createdAt).toLocaleDateString()}</span>
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black text-[#222222] leading-snug mb-3">
                {product.title}
              </h2>

              {/* Price & Discount */}
              <div className="flex items-baseline gap-3 mb-4 bg-orange-50/60 p-3.5 rounded-2xl border border-orange-100">
                <span className="text-2xl sm:text-3xl font-black text-[#222222]">
                  {formatNaira(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatNaira(product.originalPrice)}
                  </span>
                )}
                {discountPercent && (
                  <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Location & Quantity */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Location</span>
                  <div className="flex items-center gap-1 font-semibold text-gray-800 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#F68B1F]" />
                    <span>{product.city}, {product.state}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Quantity In Stock</span>
                  <span className="font-semibold text-gray-800 block mt-0.5">
                    {product.quantity} {product.quantity === 1 ? 'unit' : 'units available'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Product Description
                </h4>
                <div className="text-xs sm:text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto pr-1">
                  {product.description}
                </div>
              </div>

              {/* Seller Profile Card */}
              <div className="p-3.5 rounded-2xl border border-gray-200 bg-white shadow-sm mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#F68B1F]/20 text-[#E07A15] font-black text-sm flex items-center justify-center shrink-0">
                      {product.shopName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-sm text-[#222222]">
                        <span>{product.shopName}</span>
                        <span title="Verified NaijaMart Seller">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500">
                        Seller: {product.sellerName} • {product.state}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onOpenStorefront) {
                        onClose();
                        onOpenStorefront(product.sellerId);
                      }
                    }}
                    className="text-xs font-bold text-[#F68B1F] hover:text-[#E07A15] flex items-center gap-1 hover:underline"
                  >
                    <Store className="w-3.5 h-3.5" />
                    View Store
                  </button>
                </div>
              </div>

              {/* Nigerian Buyer Safety Notice */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong className="font-bold">Deal Safe in Nigeria:</strong> Meet seller in a public place. Inspect goods physically before paying. Never send upfront transport or commitment fees!
                </p>
              </div>
            </div>

            {/* MANDATORY PROMINENT GREEN WHATSAPP BUTTON (Prompt Requirement 6) */}
            <div className="space-y-2">
              <button
                onClick={handleWhatsAppClick}
                className="w-full py-3.5 px-6 bg-[#25D366] hover:bg-[#20BA5C] text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition flex items-center justify-center gap-2.5"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>CHAT WITH SELLER ON WHATSAPP</span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                <span className="font-mono">
                  WhatsApp Contact: {product.whatsappNumber}
                </span>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Report Listing
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Listing Submodal */}
        {showReportModal && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 p-6 flex flex-col justify-center items-center">
            <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Report this Listing to NaijaMart
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Help keep the Nigerian marketplace safe from scammers and counterfeits.
              </p>

              {reportSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  Thank you! Your report has been submitted to NaijaMart Trust & Safety moderators.
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Reason</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-300 rounded-xl outline-none"
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
                    <label className="block text-xs font-bold text-gray-700 mb-1">Details & Evidence</label>
                    <textarea
                      required
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Please provide details of what happened..."
                      className="w-full text-xs p-2.5 border border-gray-300 rounded-xl outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reportingLoading}
                      className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50"
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
