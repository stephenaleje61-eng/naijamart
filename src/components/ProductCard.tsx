import React from 'react';
import {
  Heart,
  MapPin,
  MessageCircle,
  ShoppingCart,
  Star,
  User as UserIcon
} from 'lucide-react';
import { Product } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { triggerWhatsAppChat } from '../services/api.js';
import { ProductImage } from './ProductImage.js';
import { getProductDisplayImage, getValidProductImages } from '../utils/productImages.js';
import { DirectChatTarget } from './FriendsPage.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';

interface ProductCardProps {
  product: Product;
  onOpenDetail: (product: Product) => void;
  onOpenStorefront?: (sellerId: string) => void;
  onAddToCart?: (product: Product) => void;
  onStartDirectChat?: (target: DirectChatTarget) => void;
}

export const formatNaira = (amount: number): string => {
  return '₦' + Number(amount || 0).toLocaleString('en-NG');
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenDetail,
  onOpenStorefront,
  onAddToCart,
  onStartDirectChat
}) => {
  const { isFavourite, toggleFavourite } = useAuth();
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
      `Hello ${product.sellerName || product.shopName || ''}, I saw your "${product.title}" (${formatNaira(product.price)}) on NIGERIA CAMPUS MARKET. Is it still available?`
    );
    return `https://wa.me/${cleaned}?text=${text}`;
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerWhatsAppChat(product.id).catch(() => {});
  };

  const handleFavouriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavourite(product.id);
  };

  const primaryImage = getProductDisplayImage(product.images, product.imageUrl);
  const allValidImages = getValidProductImages(product.images, product.imageUrl);
  const whatsappHref = buildWhatsAppHref();
  const locationDisplay = product.city
    ? product.city
    : product.state || 'FUWUKARI Campus';
  const sellerDisplay = product.sellerName || product.shopName || 'FUWUKARI Student';

  return (
    <div
      onClick={() => onOpenDetail(product)}
      className="group bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] hover:border-[#087443] shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer"
    >
      {/* Product Image Container */}
      <div className="relative aspect-square w-full bg-[#F4F8F5] overflow-hidden">
        <ProductImage
          src={primaryImage}
          fallbackSrcs={allValidImages}
          alt={product.title}
          category={product.categoryId}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Top Left Badges: Gold Discount + Condition */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          {discountPercent && (
            <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-[#10251D]" />
              -{discountPercent}%
            </span>
          )}

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm ${
              product.condition === 'new'
                ? 'bg-[#087443] text-[#D4A62A]'
                : 'bg-white text-[#10251D] border border-[#E5E7EB]'
            }`}
          >
            {product.condition === 'new' ? 'New' : 'Used'}
          </span>
        </div>

        {/* Save / Favourite Button (Gold accent, zero red) */}
        <button
          type="button"
          onClick={handleFavouriteClick}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 border border-[#E5E7EB] hover:border-[#087443] active:scale-95 flex items-center justify-center shadow-sm transition z-10"
          title={favourited ? 'Remove from Saved' : 'Save Item'}
        >
          <Heart
            className={`w-4 h-4 transition ${
              favourited ? 'fill-[#D4A62A] text-[#D4A62A]' : 'text-[#555555] hover:text-[#087443]'
            }`}
          />
        </button>
      </div>

      {/* Product Details */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          {/* Product Name in Black */}
          <h3 className="text-xs sm:text-sm font-bold text-[#10251D] line-clamp-2 leading-snug mb-2">
            {product.title}
          </h3>

          {/* Price in Gold on Green Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#087443] text-[#D4A62A] text-sm sm:text-base font-black tracking-tight shadow-xs">
              {formatNaira(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-[#666666] line-through font-medium">
                {formatNaira(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Location (e.g. Hostel A, 100L) & Seller Name */}
          <div className="space-y-1 pt-2 border-t border-[#F4F8F5] text-[11px] text-[#444444]">
            <div className="flex items-center gap-1 truncate" title={locationDisplay}>
              <MapPin className="w-3 h-3 text-[#087443] shrink-0" />
              <span className="truncate font-semibold text-[#10251D]">{locationDisplay}</span>
            </div>

            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenStorefront) onOpenStorefront(product.sellerId);
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-[#555555] hover:text-[#087443] truncate"
                title={sellerDisplay}
              >
                <UserIcon className="w-3 h-3 text-[#087443] shrink-0" />
                <span className="truncate">{sellerDisplay}</span>
              </button>
            </div>
            <CeoVerifiedBadge
              verified={Boolean(product.sellerProfile?.ceoVerified || product.sellerProfile?.isVerified)}
              entityIds={[product.sellerId]}
              variant="compact"
              className="mt-1"
            />
          </div>
        </div>

        {/* Actions: Chat on WhatsApp in Green + Buy / Cart in Gold */}
        <div className="space-y-1.5 pt-1">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className="w-full py-2 px-3 bg-[#087443] hover:bg-[#065D36] text-white font-bold text-xs rounded-xl active:scale-95 transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>Chat on WhatsApp</span>
            </a>
          ) : onStartDirectChat ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartDirectChat({
                  id: product.sellerId,
                  name: sellerDisplay
                });
              }}
              className="w-full py-2 px-3 bg-[#087443] hover:bg-[#065D36] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>Message Seller</span>
            </button>
          ) : null}

          {onAddToCart && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="flex-1 py-1.5 px-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black text-[11px] rounded-xl active:scale-95 transition flex items-center justify-center gap-1"
              >
                <ShoppingCart className="w-3 h-3" />
                <span>Add to Cart</span>
              </button>
              {whatsappHref && onStartDirectChat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartDirectChat({
                      id: product.sellerId,
                      name: sellerDisplay
                    });
                  }}
                  className="py-1.5 px-2.5 bg-[#F4F8F5] hover:bg-[#E5E7EB] text-[#10251D] border border-[#E5E7EB] font-bold text-[11px] rounded-xl transition"
                  title="In-App Chat"
                >
                  Chat
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
