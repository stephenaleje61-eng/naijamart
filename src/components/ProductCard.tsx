import React from 'react';
import {
  Heart,
  MapPin,
  MessageCircle,
  ShoppingCart
} from 'lucide-react';
import { Product } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { triggerWhatsAppChat } from '../services/api.js';
import { ProductImage } from './ProductImage.js';
import { getProductDisplayImage, getValidProductImages } from '../utils/productImages.js';
import { DirectChatTarget } from './FriendsPage.js';

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

  // Genuine discount percentage only when seller specified a higher originalPrice
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
      `Hello, I saw your product "${product.title}" (${formatNaira(product.price)}) on FU MARKET. Is it available?`
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

  return (
    <div
      onClick={() => onOpenDetail(product)}
      className="group bg-[#1C1C1C] rounded-2xl overflow-hidden border border-[#333333] hover:border-[#FFFFFF] shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Product Image Container */}
      <div className="relative aspect-square w-full bg-[#121212] overflow-hidden">
        <ProductImage
          src={primaryImage}
          fallbackSrcs={allValidImages}
          alt={product.title}
          category={product.categoryId}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Left Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          {discountPercent && (
            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md">
              -{discountPercent}%
            </span>
          )}

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm ${
              product.condition === 'new'
                ? 'bg-[#FFFFFF] text-black'
                : 'bg-[#121212]/90 border border-[#333333] text-white'
            }`}
          >
            {product.condition === 'new' ? 'New' : 'Used'}
          </span>
        </div>

        {/* Favourite Button */}
        <button
          onClick={handleFavouriteClick}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 border border-[#333333] hover:border-[#FFFFFF] active:scale-95 flex items-center justify-center transition z-10"
          title={favourited ? 'Remove from Saved' : 'Save Item'}
        >
          <Heart
            className={`w-4 h-4 transition ${
              favourited ? 'fill-red-500 text-red-500' : 'text-[#BDBDBD] hover:text-red-400'
            }`}
          />
        </button>
      </div>

      {/* Product Content Details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-[#FFFFFF] transition mb-1.5">
            {product.title}
          </h3>

          {/* Price Row */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-base sm:text-lg font-black text-[#FFFFFF]">
              {formatNaira(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-[#BDBDBD] line-through">
                {formatNaira(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Location & Seller Shop Name */}
          <div className="flex items-center justify-between text-[11px] text-[#BDBDBD] pt-1.5 border-t border-[#333333]">
            <div
              className="flex items-center gap-1 truncate max-w-[130px]"
              title={`${product.city}, ${product.state}`}
            >
              <MapPin className="w-3 h-3 text-[#FFFFFF] shrink-0" />
              <span className="truncate">
                {product.city}, {product.state}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenStorefront) onOpenStorefront(product.sellerId);
              }}
              className="text-[11px] font-medium text-[#BDBDBD] hover:text-[#FFFFFF] truncate max-w-[100px] text-right"
              title={product.shopName}
            >
              {product.shopName}
            </button>
          </div>
        </div>

        {/* Actions: Add to Cart + Direct Chat / WhatsApp */}
        <div className="space-y-1.5">
          {onAddToCart && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
              className="w-full py-2 px-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs rounded-xl active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Add to Cart</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            {onStartDirectChat && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartDirectChat({
                    id: product.sellerId,
                    name: product.shopName || product.sellerName
                  });
                }}
                className="flex-1 py-2 px-2.5 bg-[#121212] hover:bg-black border border-[#333333] hover:border-[#FFFFFF] text-white font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#FFFFFF]" />
                <span>In-App Chat</span>
              </button>
            )}

            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="flex-1 py-2 px-2.5 bg-[#25D366] hover:bg-[#20BA5C] text-black font-black text-[11px] rounded-xl active:scale-95 transition flex items-center justify-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
