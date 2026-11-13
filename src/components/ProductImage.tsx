import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Laptop,
  Shirt,
  Briefcase,
  Sparkles,
  Utensils,
  Tv,
  Apple,
  Car,
  HardHat,
  Zap,
  Wrench,
  Package,
  RefreshCw,
  ImageOff,
  Loader2
} from 'lucide-react';
import { isValidImageUrl } from '../utils/productImages.js';

interface ProductImageProps {
  src?: string | null;
  fallbackSrcs?: (string | null | undefined)[];
  alt: string;
  className?: string;
  category?: string;
  loading?: 'lazy' | 'eager';
  onClick?: (e: React.MouseEvent) => void;
}

const MAX_RETRIES = 3;

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  fallbackSrcs = [],
  alt,
  className = 'w-full h-full object-cover',
  category,
  loading = 'lazy',
  onClick
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Compile all candidate sources in priority order
  const candidateSources = React.useMemo(() => {
    const list: string[] = [];
    if (src && isValidImageUrl(src)) {
      list.push(src.trim());
    }
    if (Array.isArray(fallbackSrcs)) {
      for (const fallback of fallbackSrcs) {
        if (fallback && isValidImageUrl(fallback) && !list.includes(fallback.trim())) {
          list.push(fallback.trim());
        }
      }
    }
    return list;
  }, [src, fallbackSrcs]);

  // Reset states whenever primary src or candidate sources change
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
    setIsRetrying(false);
    setCurrentSourceIndex(0);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [src, candidateSources.length]);

  const activeSrc = candidateSources[currentSourceIndex] || null;

  // Construct source with optional retry cache-buster if needed (not on data URLs)
  const computeDisplaySrc = () => {
    if (!activeSrc) return null;

    if (retryCount > 0 && !activeSrc.startsWith('data:')) {
      const sep = activeSrc.includes('?') ? '&' : '?';
      return `${activeSrc}${sep}_r=${retryCount}_${Date.now()}`;
    }
    return activeSrc;
  };

  const displaySrc = computeDisplaySrc();

  // Retry handler with exponential backoff and rate-limit guard
  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRetrying || retryCount >= MAX_RETRIES) return;

    setIsRetrying(true);

    // Calculate sensible exponential backoff delay (800ms, 1500ms, 2500ms)
    const delay = Math.min(800 * Math.pow(1.6, retryCount), 2500);

    retryTimerRef.current = setTimeout(() => {
      // If there's another candidate source available, try it first
      if (currentSourceIndex + 1 < candidateSources.length) {
        setCurrentSourceIndex(prev => prev + 1);
      }
      setRetryCount(prev => prev + 1);
      setHasError(false);
      setIsLoading(true);
      setIsRetrying(false);
    }, delay);
  };

  // Image load error handler: tries next fallback before declaring permanent error
  const handleImageError = () => {
    setIsLoading(false);

    // If there is an untried fallback source, attempt loading it next
    if (currentSourceIndex + 1 < candidateSources.length) {
      setCurrentSourceIndex(prev => prev + 1);
      setIsLoading(true);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  // Category Icon Resolver for neutral placeholders
  const renderCategoryIcon = () => {
    const cat = (category || '').toLowerCase();
    const props = { className: 'w-10 h-10 text-gray-400 stroke-1' };

    if (cat.includes('phone') || cat.includes('tablet')) return <Smartphone {...props} />;
    if (cat.includes('computer') || cat.includes('laptop')) return <Laptop {...props} />;
    if (cat.includes('fashion') || cat.includes('cloth')) return <Shirt {...props} />;
    if (cat.includes('shoe') || cat.includes('bag')) return <Briefcase {...props} />;
    if (cat.includes('beauty')) return <Sparkles {...props} />;
    if (cat.includes('kitchen')) return <Utensils {...props} />;
    if (cat.includes('appliance') || cat.includes('tv')) return <Tv {...props} />;
    if (cat.includes('food') || cat.includes('grocer')) return <Apple {...props} />;
    if (cat.includes('vehicle') || cat.includes('auto') || cat.includes('car')) return <Car {...props} />;
    if (cat.includes('building')) return <HardHat {...props} />;
    if (cat.includes('generator') || cat.includes('solar')) return <Zap {...props} />;
    if (cat.includes('service') || cat.includes('job')) return <Wrench {...props} />;
    return <Package {...props} />;
  };

  // If no source is provided or image failed to load, display neutral category placeholder
  if (!displaySrc || hasError) {
    const isRetryExhausted = retryCount >= MAX_RETRIES;

    return (
      <div
        onClick={onClick}
        className={`w-full h-full bg-[#121212] flex flex-col items-center justify-center p-4 text-center select-none relative ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-[#1C1C1C] border border-[#333333] flex items-center justify-center mb-2">
          {renderCategoryIcon()}
        </div>
        <span className="text-[11px] font-bold text-white line-clamp-1 max-w-[90%] px-1">
          {alt || 'Product Listing'}
        </span>
        <span className="text-[10px] text-[#BDBDBD] mt-0.5 flex items-center gap-1 font-medium">
          <ImageOff className="w-3 h-3 text-[#BDBDBD]" />
          {hasError ? 'Photo unavailable' : 'No photo uploaded'}
        </span>

        {hasError && (
          <div className="mt-2 flex flex-col items-center">
            {!isRetryExhausted ? (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-[10px] font-bold text-[#FFFFFF] bg-[#1C1C1C] hover:bg-[#333333] disabled:opacity-60 px-2.5 py-1 rounded-md border border-[#FFFFFF]/40 flex items-center gap-1 transition"
                title="Retry loading photo"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Retry ({MAX_RETRIES - retryCount} left)</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[9px] text-[#BDBDBD] italic">
                Photo could not be loaded
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#121212]" onClick={onClick}>
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#1C1C1C] to-[#121212] animate-pulse" />
      )}
      <img
        src={displaySrc}
        alt={alt}
        loading={loading}
        onLoad={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onError={handleImageError}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
    </div>
  );
};
