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
  AlertCircle
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
      `Hello ${product.shopName}, I found your product "${product.title}" (${formatNaira(product.price)}) on FU MARKET. Is it still available?`
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] text-[#BDBDBD] hover:text-white shadow-md flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div className="p-4 sm:p-6 bg-[#1C1C1C] flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#333333]">
            <div>
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black border border-[#333333] flex items-center justify-center">
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
                      onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      className="absolute left-2 w-8 h-8 rounded-full bg-black/70 border border-[#333333] hover:border-[#FFFFFF] text-white flex items-center justify-center transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 w-8 h-8 rounded-full bg-black/70 border border-[#333333] hover:border-[#FFFFFF] text-white flex items-center justify-center transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                <span className="absolute top-3 left-3 bg-[#FFFFFF] text-black text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {product.condition === 'new' ? 'Brand New' : 'Direct Used'}
                </span>
              </div>

              {images.length > 1 && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                        activeImageIndex === idx
                          ? 'border-[#FFFFFF] scale-105'
                          : 'border-[#333333] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <ProductImage src={img} alt="thumbnail" category={product.categoryId} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#333333] text-xs">
              <button
                onClick={() => toggleFavourite(product.id)}
                className={`flex items-center gap-1.5 font-bold transition ${
                  favourited ? 'text-red-400' : 'text-[#BDBDBD] hover:text-red-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${favourited ? 'fill-red-500 text-red-500' : ''}`} />
                {favourited ? 'Saved in Favourites' : 'Save to Favourites'}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 font-semibold text-[#BDBDBD] hover:text-[#FFFFFF] transition"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                {copiedLink ? 'Link Copied!' : 'Share Listing'}
              </button>
            </div>
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-[#BDBDBD] mb-2">
                <span className="bg-[#FFFFFF]/15 border border-[#FFFFFF]/40 text-[#FFFFFF] font-bold px-2.5 py-0.5 rounded-full capitalize">
                  {product.categoryId.replace('-', ' ')}
                </span>
                <span className="text-[11px]">
                  Listed: {new Date(product.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug mb-3">{product.title}</h2>

              <div className="flex items-baseline gap-3 mb-4 bg-[#1C1C1C] p-3.5 rounded-2xl border border-[#333333]">
                <span className="text-2xl sm:text-3xl font-black text-[#FFFFFF]">
                  {formatNaira(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-[#BDBDBD] line-through">
                    {formatNaira(product.originalPrice)}
                  </span>
                )}
                {discountPercent && (
                  <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-md">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="p-2.5 rounded-xl bg-[#1C1C1C] border border-[#333333]">
                  <span className="text-[#BDBDBD] block text-[10px] uppercase font-bold">Location</span>
                  <div className="flex items-center gap-1 font-semibold text-white mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#FFFFFF]" />
                    <span>
                      {product.city}, {product.state}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#1C1C1C] border border-[#333333]">
                  <span className="text-[#BDBDBD] block text-[10px] uppercase font-bold">Quantity In Stock</span>
                  <span className="font-semibold text-white block mt-0.5">
                    {product.quantity} {product.quantity === 1 ? 'unit' : 'units available'}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                  Product Description
                </h4>
                <div className="text-xs sm:text-sm text-white/90 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto pr-1">
                  {product.description}
                </div>
              </div>

              {/* Seller Profile Card */}
              <div className="p-3.5 rounded-2xl border border-[#333333] bg-[#1C1C1C] mb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#FFFFFF]/20 text-[#FFFFFF] font-black text-sm flex items-center justify-center shrink-0">
                      {(product.shopName || product.sellerName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-white truncate">
                        <span className="truncate">{product.shopName}</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                      <span className="text-[11px] text-[#BDBDBD] block truncate">
                        Seller: {product.sellerName} • {product.city}, {product.state}
                      </span>
                    </div>
                  </div>

                  {onOpenStorefront && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenStorefront(product.sellerId);
                      }}
                      className="text-xs font-bold text-[#FFFFFF] hover:underline flex items-center gap-1 shrink-0"
                    >
                      <Store className="w-3.5 h-3.5" />
                      View Store
                    </button>
                  )}
                </div>
              </div>

              {/* FUWUKARI Buyer Safety Notice */}
              <div className="p-2.5 rounded-xl bg-[#1C1C1C] border border-[#FFFFFF]/30 text-[11px] text-[#BDBDBD] flex items-start gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                <p>
                  <strong className="font-bold text-white">FUWUKARI Safe Meetup:</strong> Meet sellers in open campus areas. Inspect goods thoroughly before transferring any money.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {onAddToCart && (
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product);
                    onClose();
                  }}
                  className="w-full py-3 px-6 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs sm:text-sm rounded-2xl active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>ADD TO CART &amp; REVIEW ORDER</span>
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onStartDirectChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartDirectChat({
                        id: product.sellerId,
                        name: product.shopName || product.sellerName
                      });
                    }}
                    className="py-3 px-4 bg-[#1C1C1C] hover:bg-black border border-[#333333] hover:border-[#FFFFFF] text-white font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-[#FFFFFF]" />
                    <span>Chat Seller In App</span>
                  </button>
                )}

                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWhatsAppClick}
                    className="py-3 px-4 bg-[#25D366] hover:bg-[#20BA5C] text-black font-black text-xs rounded-2xl active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Seller</span>
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#BDBDBD] px-1 pt-1">
                <span className="font-mono">
                  {product.whatsappNumber ? `Contact: ${product.whatsappNumber}` : 'Direct in-app chat enabled'}
                </span>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
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
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-30 p-6 flex flex-col justify-center items-center">
            <div className="max-w-md w-full bg-[#121212] p-6 rounded-2xl shadow-xl border border-[#333333]">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Report Listing on FU MARKET
              </h3>
              <p className="text-xs text-[#BDBDBD] mb-4">
                Help keep the FUWUKARI student marketplace safe from scams or misleading items.
              </p>

              {reportError && (
                <div className="mb-3 p-3 bg-red-950/60 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}

              {reportSuccess ? (
                <div className="p-4 bg-emerald-950/60 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  Thank you! Your report has been submitted to FU MARKET moderators.
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Reason</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full text-xs p-2.5 bg-[#1C1C1C] border border-[#333333] text-white rounded-xl outline-none focus:border-[#FFFFFF]"
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
                    <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Details &amp; Evidence</label>
                    <textarea
                      required
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Please provide details of what happened..."
                      className="w-full text-xs p-2.5 bg-[#1C1C1C] border border-[#333333] text-white rounded-xl outline-none focus:border-[#FFFFFF]"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#BDBDBD] hover:text-white rounded-xl"
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
