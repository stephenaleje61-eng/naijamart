import React from 'react';
import {
  Heart,
  MapPin,
  Clock,
  ShieldCheck,
  Flame,
  MessageCircle
} from 'lucide-react';
import { Product } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { triggerWhatsAppChat } from '../services/api.js';
import { ProductImage } from './ProductImage.js';
import { getProductDisplayImage, getValidProductImages } from '../utils/productImages.js';

interface ProductCardProps {
  product: Product;
  onOpenDetail: (product: Product) => void;
  onOpenStorefront?: (sellerId: string) => void;
}

export const formatNaira = (amount: number): string => {
  return '₦' + Number(amount || 0).toLocaleString('en-NG');
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenDetail,
  onOpenStorefront
}) => {
  const { isFavourite, toggleFavourite } = useAuth();
  const favourited = isFavourite(product.id);

  // Calculate discount percentage
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await triggerWhatsAppChat(product.id);
      window.open(res.link, '_blank');
    } catch {
      // Fallback direct link
      let cleaned = product.whatsappNumber.replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
      const text = encodeURIComponent(`Hello, I saw your product "${product.title}" on NaijaMart. Is it available?`);
      window.open(`https://wa.me/${cleaned}?text=${text}`, '_blank');
    }
  };

  const handleFavouriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavourite(product.id);
  };

  const primaryImage = getProductDisplayImage(product.images, product.imageUrl);
  const allValidImages = getValidProductImages(product.images, product.imageUrl);

  return (
    <div
      onClick={() => onOpenDetail(product)}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-200/80 hover:border-[#F68B1F]/60 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Product Image Container */}
      <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
        <ProductImage
          src={primaryImage}
          fallbackSrcs={allValidImages}
          alt={product.title}
          category={product.categoryId}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Floating Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          {/* Discount Pill */}
          {discountPercent && (
            <span className="bg-[#E02424] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
              -{discountPercent}%
            </span>
          )}

          {/* Condition Pill */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
              product.condition === 'new'
                ? 'bg-blue-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {product.condition === 'new' ? 'Brand New' : 'Direct Used'}
          </span>
        </div>

        {/* Favourite Button */}
        <button
          onClick={handleFavouriteClick}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:scale-110 active:scale-95 flex items-center justify-center transition z-10"
          title={favourited ? 'Remove from Saved' : 'Save Item'}
        >
          <Heart
            className={`w-4 h-4 transition ${
              favourited ? 'fill-red-500 text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
          />
        </button>

        {/* Permanent Active Listing Badge */}
        <div className="absolute bottom-2 left-2 z-10">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-sm bg-black/70 text-emerald-300"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Active Listing</span>
          </span>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 className="text-xs sm:text-sm font-semibold text-[#222222] line-clamp-2 leading-snug group-hover:text-[#F68B1F] transition mb-1.5">
            {product.title}
          </h3>

          {/* Price Row */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-base sm:text-lg font-black text-[#222222]">
              {formatNaira(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-gray-500 line-through">
                {formatNaira(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Location & Seller Shop Name */}
          <div className="flex items-center justify-between text-[11px] text-gray-600 mb-3 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-1 truncate max-w-[130px]" title={`${product.city}, ${product.state}`}>
              <MapPin className="w-3 h-3 text-[#F68B1F] shrink-0" />
              <span className="truncate">{product.city}, {product.state}</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenStorefront) onOpenStorefront(product.sellerId);
              }}
              className="text-[11px] font-medium text-gray-600 hover:text-[#F68B1F] truncate max-w-[100px] text-right"
              title={product.shopName}
            >
              {product.shopName}
            </button>
          </div>
        </div>

        {/* Action Button: Chat with Seller on WhatsApp (WhatsApp Green #25D366) */}
        <button
          onClick={handleWhatsAppClick}
          className="w-full py-2 px-3 bg-[#25D366] hover:bg-[#20BA5C] text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
        >
          <MessageCircle className="w-3.5 h-3.5 fill-current" />
          <span>Chat on WhatsApp</span>
        </button>
      </div>
    </div>
  );
};
