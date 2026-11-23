import React from 'react';
import {
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  ShoppingCart,
  Tag,
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
    : product.state || 'Campus Pickup';
  const sellerDisplay = product.sellerName || product.shopName || 'Campus Seller';

  return (
    <div
      onClick={() => onOpenDetail(product)}
      className="group bg-[#FFFFFF] rounded-xl overflow-hidden border border-[#EEEEEE] hover:border-[#F68B1F] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer"
    >
      {/* Square Non-Distorted Product Photo */}
      <div className="relative aspect-square w-full bg-[#F7F7F7] overflow-hidden">
        <ProductImage
          src={primaryImage}
          fallbackSrcs={allValidImages}
          alt={product.title}
          category={product.categoryId}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Top Left Badges: Orange Discount + Condition */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          {discountPercent && (
            <span className="bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs inline-flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5" />
              -{discountPercent}%
            </span>
          )}

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ${
              product.condition === 'new'
                ? 'bg-[#222222] text-[#FFFFFF]'
                : 'bg-[#FFFFFF]/95 text-[#303030] border border-[#EEEEEE]'
            }`}
          >
            {product.condition === 'new' ? 'New' : 'Used'}
          </span>
        </div>

        {/* Save / Wishlist Button */}
        <button
          type="button"
          onClick={handleFavouriteClick}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#FFFFFF]/95 border border-[#EEEEEE] hover:border-[#F68B1F] active:scale-95 flex items-center justify-center shadow-xs transition z-10 cursor-pointer"
          title={favourited ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-label={favourited ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            className={`w-4 h-4 transition ${
              favourited ? 'fill-[#FF6A00] text-[#FF6A00]' : 'text-[#303030]/70 hover:text-[#FF6A00]'
            }`}
          />
        </button>
      </div>

      {/* Product Details */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-[#222222] group-hover:text-[#FF6A00] transition-colors line-clamp-2 leading-snug mb-1.5">
            {product.title}
          </h3>

          {/* Price in Naira */}
          <div className="flex flex-wrap items-baseline gap-1.5 mb-2">
            <span className="text-base sm:text-lg font-black text-[#222222] tracking-tight">
              {formatNaira(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[11px] text-[#303030]/55 line-through font-medium">
                {formatNaira(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Campus Location & Seller Meta */}
          <div className="space-y-1 pt-2 border-t border-[#EEEEEE] text-[11px] text-[#303030]/80">
            <div className="flex items-center gap-1 truncate" title={locationDisplay}>
              <MapPin className="w-3 h-3 text-[#FF6A00] shrink-0" />
              <span className="truncate font-semibold text-[#303030]">{locationDisplay}</span>
            </div>

            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenStorefront) onOpenStorefront(product.sellerId);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#303030]/80 hover:text-[#FF6A00] truncate cursor-pointer"
                title={sellerDisplay}
              >
                <UserIcon className="w-3 h-3 text-[#F68B1F] shrink-0" />
                <span className="truncate">{sellerDisplay}</span>
              </button>
              <CeoVerifiedBadge
                verified={Boolean(product.sellerProfile?.ceoVerified || product.sellerProfile?.isVerified)}
                entityIds={[product.sellerId]}
                variant="compact"
              />
            </div>
          </div>
        </div>

        {/* Actions: View Product Primary CTA + Quick Cart / Chat */}
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(product);
            }}
            className="w-full py-2 px-3 bg-[#F68B1F] hover:bg-[#FF6A00] text-[#FFFFFF] font-black text-xs rounded-xl active:scale-95 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Product</span>
          </button>

          <div className="flex items-center gap-1.5">
            {onAddToCart && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="flex-1 py-1.5 px-2.5 bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] font-bold text-[11px] rounded-xl active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <ShoppingCart className="w-3 h-3 text-[#F68B1F]" />
                <span>Add to Cart</span>
              </button>
            )}

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="py-1.5 px-2.5 bg-[#F7F7F7] hover:bg-[#FFF4EB] text-[#303030] hover:text-[#FF6A00] border border-[#EEEEEE] hover:border-[#F68B1F] font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1"
                title="Chat on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#FF6A00]" />
                {!onAddToCart && <span>WhatsApp</span>}
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
                className="py-1.5 px-2.5 bg-[#F7F7F7] hover:bg-[#FFF4EB] text-[#303030] hover:text-[#FF6A00] border border-[#EEEEEE] hover:border-[#F68B1F] font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                title="Message Seller"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#FF6A00]" />
                {!onAddToCart && <span>Chat</span>}
              </button>
            ) : null}

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
                className="py-1.5 px-2.5 bg-[#F7F7F7] hover:bg-[#FFF4EB] text-[#303030] hover:text-[#FF6A00] border border-[#EEEEEE] hover:border-[#F68B1F] font-bold text-[11px] rounded-xl transition cursor-pointer"
                title="In-App Chat"
              >
                Chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
