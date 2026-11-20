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
import { Product, ProductReview, SellerFollower } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import { triggerWhatsAppChat, recordProductView, reportProduct } from '../services/api.js';
import { ProductImage } from './ProductImage.js';
import { getValidProductImages } from '../utils/productImages.js';
import { DirectChatTarget } from './FriendsPage.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';
import { shouldShowTargetPhone } from '../utils/privacy.js';
import {
  submitProductReview,
  subscribeToProductReviews,
  subscribeToSellerFollowers,
  toggleFollowSeller
} from '../services/campusEcosystem.js';

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
  const { user, firebaseUser, isFavourite, toggleFavourite } = useAuth();
  const currentUid = firebaseUser?.uid || user?.id;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Suspected fraudulent listing');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportingLoading, setReportingLoading] = useState(false);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [followers, setFollowers] = useState<SellerFollower[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setActiveImageIndex(0);
      setReportError(null);
      setReviewFeedback(null);
      recordProductView(product.id);
      const u1 = subscribeToProductReviews(product.id, setReviews);
      const u2 = product.sellerId
        ? subscribeToSellerFollowers(product.sellerId, setFollowers)
        : () => {};
      return () => {
        u1();
        u2();
      };
    }
  }, [product?.id, product?.sellerId]);

  if (!product) return null;

  const favourited = isFavourite(product.id);

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const canShowSellerPhone = product.sellerProfile?.privacy
    ? shouldShowTargetPhone(
        {
          id: product.sellerId,
          institutionId: product.institutionId,
          privacy: product.sellerProfile.privacy
        },
        currentUid
      )
    : true;

  const buildWhatsAppHref = (): string | null => {
    if (!canShowSellerPhone) return null;
    const raw = (product.whatsappNumber || '').trim();
    if (!raw) return null;
    let cleaned = raw.replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (!cleaned.startsWith('234')) cleaned = '234' + cleaned;
    const text = encodeURIComponent(
      `Hello ${product.sellerName || product.shopName}, I found your item "${product.title}" (${formatNaira(product.price)}) on NIGERIA CAMPUS MARKET. Is it still available?`
    );
    return `https://wa.me/${cleaned}?text=${text}`;
  };

  const isFollowingSeller = Boolean(currentUid && followers.some((f) => f.followerUid === currentUid));
  const avgRating =
    reviews.length > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : null;

  const handleToggleFollow = async () => {
    if (!currentUid) {
      setReviewFeedback('Sign in to follow sellers.');
      return;
    }
    await toggleFollowSeller({
      followerUid: currentUid,
      followerName: user?.name,
      sellerId: product.sellerId,
      sellerName: product.sellerName || product.shopName,
      institutionId: product.institutionId,
      currentlyFollowing: isFollowingSeller
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) {
      setReviewFeedback('Sign in to submit a verified buyer review.');
      return;
    }
    setReviewSubmitting(true);
    setReviewFeedback(null);
    try {
      await submitProductReview({
        productId: product.id,
        sellerId: product.sellerId,
        reviewerId: currentUid,
        reviewerName: user?.name || 'Student Buyer',
        institutionId: product.institutionId,
        rating: reviewRating,
        comment: reviewText
      });
      setReviewText('');
      setReviewFeedback('Review published!');
    } catch (err: any) {
      setReviewFeedback(err?.message || 'Could not submit review.');
    } finally {
      setReviewSubmitting(false);
    }
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
  const locationDisplay = [product.city, product.state].filter(Boolean).join(', ') || 'Nigeria Campus';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#10251D]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-[#F4F8F5] border border-[#E5E7EB] hover:border-[#087443] text-[#10251D] shadow-md flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div className="p-4 sm:p-6 bg-[#F4F8F5] flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E5E7EB]">
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
                      className="absolute left-2 w-8 h-8 rounded-full bg-white/95 border border-[#E5E7EB] hover:border-[#087443] text-[#10251D] shadow flex items-center justify-center transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 w-8 h-8 rounded-full bg-white/95 border border-[#E5E7EB] hover:border-[#087443] text-[#10251D] shadow flex items-center justify-center transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                <span className="absolute top-3 left-3 bg-[#087443] text-[#D4A62A] text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow">
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
                          ? 'border-[#087443] scale-105'
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
                  favourited ? 'text-[#087443]' : 'text-[#555555] hover:text-[#087443]'
                }`}
              >
                <Heart className={`w-4 h-4 ${favourited ? 'fill-[#D4A62A] text-[#D4A62A]' : ''}`} />
                {favourited ? 'Saved in Favourites' : 'Save to Favourites'}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 font-semibold text-[#555555] hover:text-[#087443] transition"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-[#087443]" /> : <Share2 className="w-4 h-4" />}
                {copiedLink ? 'Link Copied!' : 'Share Listing'}
              </button>
            </div>
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="p-6 flex flex-col justify-between bg-white">
            <div>
              <div className="flex items-center justify-between text-xs text-[#555555] mb-2">
                <span className="bg-[#F4F8F5] border border-[#087443]/25 text-[#087443] font-black px-2.5 py-0.5 rounded-full capitalize">
                  {product.categoryId.replace(/-/g, ' ')}
                </span>
                <span className="text-[11px]">
                  Listed: {new Date(product.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-black text-[#10251D] leading-snug mb-3">
                {product.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 mb-4 bg-[#F4F8F5] p-3.5 rounded-2xl border border-[#E5E7EB]">
                <span className="px-3 py-1 rounded-xl bg-[#087443] text-[#D4A62A] text-2xl sm:text-3xl font-black">
                  {formatNaira(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-[#666666] line-through">
                    {formatNaira(product.originalPrice)}
                  </span>
                )}
                {discountPercent && (
                  <span className="bg-[#D4A62A] text-[#10251D] text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#10251D]" />
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="p-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB]">
                  <span className="text-[#555555] block text-[10px] uppercase font-bold">Campus Location</span>
                  <div className="flex items-center gap-1 font-bold text-[#10251D] mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                    <span className="truncate">{locationDisplay}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB]">
                  <span className="text-[#555555] block text-[10px] uppercase font-bold">Stock Available</span>
                  <span className="font-bold text-[#10251D] block mt-0.5">
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
              <div className="p-3.5 rounded-2xl border border-[#E5E7EB] bg-[#F4F8F5] mb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#087443] text-[#D4A62A] font-black text-sm flex items-center justify-center shrink-0">
                      {(product.sellerName || product.shopName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 font-black text-sm text-[#10251D]">
                        <span className="truncate">{product.sellerName || product.shopName}</span>
                        <CeoVerifiedBadge
                          verified={Boolean(product.sellerProfile?.ceoVerified || product.sellerProfile?.isVerified)}
                          entityIds={[product.sellerId]}
                          variant="compact"
                        />
                      </div>
                      <span className="text-[11px] text-[#555555] block truncate">
                        {product.shopName} • {locationDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition ${
                        isFollowingSeller
                          ? 'bg-[#087443] text-white border-[#087443]'
                          : 'bg-white text-[#087443] border-[#087443]/30 hover:border-[#087443]'
                      }`}
                    >
                      {isFollowingSeller ? 'Following' : 'Follow'} ({followers.length})
                    </button>
                    {onOpenStorefront && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenStorefront(product.sellerId);
                        }}
                        className="text-xs font-black text-[#087443] hover:underline flex items-center gap-1"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Store</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reviews & Ratings */}
              <div className="p-3.5 rounded-2xl border border-[#E5E7EB] bg-white mb-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-[#10251D] flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#D4A62A] text-[#D4A62A]" />
                    {avgRating !== null ? `${avgRating} (${reviews.length} review${reviews.length > 1 ? 's' : ''})` : 'No reviews yet'}
                  </span>
                </div>
                {reviewFeedback && (
                  <div className="text-[11px] font-bold text-[#087443]">{reviewFeedback}</div>
                )}
                <form onSubmit={handleSubmitReview} className="flex flex-col sm:flex-row gap-2 text-xs">
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    aria-label="Star Rating"
                    className="p-2 bg-[#F4F8F5] border border-[#E5E7EB] rounded-lg font-bold"
                  >
                    <option value={5}>5 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={2}>2 Stars</option>
                    <option value={1}>1 Star</option>
                  </select>
                  <input
                    type="text"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write an honest buyer review..."
                    className="flex-1 p-2 bg-[#F4F8F5] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#087443]"
                  />
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-3 py-2 bg-[#087443] text-white font-black rounded-lg shrink-0"
                  >
                    {reviewSubmitting ? '...' : 'Post'}
                  </button>
                </form>
                {reviews.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pt-1">
                    {reviews.slice(0, 5).map((r) => (
                      <div key={r.id} className="text-[11px] bg-[#F4F8F5] p-2 rounded-lg">
                        <div className="font-bold text-[#10251D]">
                          {r.reviewerName} &bull; {'★'.repeat(r.rating)}
                        </div>
                        <div className="text-[#444444]">{r.comment}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campus Buyer Safety Notice */}
              <div className="p-2.5 rounded-xl bg-[#F4F8F5] border border-[#087443]/30 text-[11px] text-[#333333] flex items-start gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
                <p>
                  <strong className="font-black text-[#087443]">Campus Safe Meetup:</strong> Meet sellers in open campus areas. Inspect goods thoroughly before transferring any money.
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
                  className="w-full py-3.5 px-6 bg-[#087443] hover:bg-[#065D36] text-white font-black text-xs sm:text-sm rounded-2xl active:scale-95 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4A62A]" />
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
                    className="py-3 px-4 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black text-xs rounded-2xl active:scale-95 transition flex items-center justify-center gap-2"
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
                    className="py-3 px-4 bg-[#F4F8F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#10251D] font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-[#087443]" />
                    <span>In-App Chat</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#555555] px-1 pt-1">
                <span className="font-mono">
                  {canShowSellerPhone && product.whatsappNumber
                    ? `Contact: ${product.whatsappNumber}`
                    : 'Direct in-app chat enabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="text-[#10251D] hover:text-[#087443] flex items-center gap-1 font-bold underline"
                >
                  <AlertTriangle className="w-3 h-3 text-[#D4A62A]" />
                  Report Listing
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Listing Submodal */}
        {showReportModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 p-6 flex flex-col justify-center items-center">
            <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-xl border border-[#E5E7EB] text-[#10251D]">
              <h3 className="text-base font-black text-[#10251D] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#D4A62A]" />
                Report Listing on NIGERIA CAMPUS MARKET
              </h3>
              <p className="text-xs text-[#555555] mb-4">
                Help keep the NIGERIA CAMPUS MARKET marketplace safe from scams or misleading items.
              </p>

              {reportError && (
                <div className="mb-3 p-3 bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#10251D] shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}

              {reportSuccess ? (
                <div className="p-4 bg-[#F4F8F5] border border-[#087443] text-[#087443] rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  Thank you! Your report has been submitted to NIGERIA CAMPUS MARKET moderators.
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1">Reason</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full text-xs p-2.5 bg-[#F4F8F5] border border-[#E5E7EB] text-[#10251D] rounded-xl outline-none focus:border-[#087443]"
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
                      className="w-full text-xs p-2.5 bg-[#F4F8F5] border border-[#E5E7EB] text-[#10251D] rounded-xl outline-none focus:border-[#087443]"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#555555] hover:text-[#10251D] rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reportingLoading}
                      className="px-4 py-2 text-xs font-black bg-[#10251D] hover:bg-[#065D36] text-white rounded-xl disabled:opacity-50"
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
