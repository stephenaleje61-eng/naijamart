import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Laptop,
  Shirt,
  Utensils,
  BookOpen,
  BedDouble,
  Flame,
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
// Remember already decoded/loaded URLs across tab/category switches to prevent flashing
const loadedImageUrls = new Set<string>();

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  fallbackSrcs = [],
  alt,
  className = 'w-full h-full object-cover',
  category,
  loading = 'lazy',
  onClick
}) => {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

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

  const candidateKey = candidateSources.join('|');
  const activeSrc = candidateSources[currentSourceIndex] || null;

  const displaySrc = React.useMemo(() => {
    if (!activeSrc) return null;
    if (retryCount > 0 && retryNonce > 0 && !activeSrc.startsWith('data:')) {
      const sep = activeSrc.includes('?') ? '&' : '?';
      return `${activeSrc}${sep}_r=${retryCount}_${retryNonce}`;
    }
    return activeSrc;
  }, [activeSrc, retryCount, retryNonce]);

  const [isLoading, setIsLoading] = useState(() => {
    if (!displaySrc) return false;
    if (displaySrc.startsWith('data:') || loadedImageUrls.has(displaySrc)) return false;
    return true;
  });

  useEffect(() => {
    setHasError(false);
    setRetryCount(0);
    setRetryNonce(0);
    setIsRetrying(false);
    setCurrentSourceIndex(0);
    const first = candidateSources[0];
    const alreadyReady = Boolean(first && (first.startsWith('data:') || loadedImageUrls.has(first)));
    setIsLoading(Boolean(first) && !alreadyReady);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [candidateKey]);

  useEffect(() => {
    if (!displaySrc) {
      setIsLoading(false);
      return;
    }
    if (displaySrc.startsWith('data:') || loadedImageUrls.has(displaySrc)) {
      setIsLoading(false);
      return;
    }
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      loadedImageUrls.add(displaySrc);
      setIsLoading(false);
    }
  }, [displaySrc]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRetrying || retryCount >= MAX_RETRIES) return;

    setIsRetrying(true);
    const delay = Math.min(600 * Math.pow(1.5, retryCount), 2000);

    retryTimerRef.current = setTimeout(() => {
      if (currentSourceIndex + 1 < candidateSources.length) {
        setCurrentSourceIndex((prev) => prev + 1);
      }
      setRetryCount((prev) => prev + 1);
      setRetryNonce(Date.now());
      setHasError(false);
      setIsLoading(true);
      setIsRetrying(false);
    }, delay);
  };

  const handleImageError = () => {
    setIsLoading(false);

    if (currentSourceIndex + 1 < candidateSources.length) {
      setCurrentSourceIndex((prev) => prev + 1);
      setIsLoading(true);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  const renderCategoryIcon = () => {
    const cat = (category || '').toLowerCase();
    const props = { className: 'w-10 h-10 text-[#0B6B3A] stroke-1.5' };

    if (cat.includes('hostel')) return <BedDouble {...props} />;
    if (cat.includes('textbook') || cat.includes('book') || cat.includes('past')) return <BookOpen {...props} />;
    if (cat.includes('food')) return <Utensils {...props} />;
    if (cat.includes('electronic') || cat.includes('phone')) return <Smartphone {...props} />;
    if (cat.includes('computer') || cat.includes('laptop')) return <Laptop {...props} />;
    if (cat.includes('fashion') || cat.includes('cloth')) return <Shirt {...props} />;
    if (cat.includes('gas') || cat.includes('cook')) return <Flame {...props} />;
    return <Package {...props} />;
  };

  if (!displaySrc || hasError) {
    const isRetryExhausted = retryCount >= MAX_RETRIES;

    return (
      <div
        onClick={onClick}
        className={`w-full h-full bg-[#F5F5F5] flex flex-col items-center justify-center p-4 text-center select-none relative ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center mb-2 shadow-xs">
          {renderCategoryIcon()}
        </div>
        <span className="text-[11px] font-bold text-[#111111] line-clamp-1 max-w-[90%] px-1">
          {alt || 'FU MARKET Item'}
        </span>
        <span className="text-[10px] text-[#555555] mt-0.5 flex items-center gap-1 font-medium">
          <ImageOff className="w-3 h-3 text-[#555555]" />
          {hasError ? 'Photo unavailable' : 'No photo uploaded'}
        </span>

        {hasError && (
          <div className="mt-2 flex flex-col items-center">
            {!isRetryExhausted ? (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-[10px] font-bold text-white bg-[#0B6B3A] hover:bg-[#14532D] disabled:opacity-60 px-2.5 py-1 rounded-md flex items-center gap-1 transition"
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
              <span className="text-[9px] text-[#666666] italic">
                Photo could not be loaded
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#F5F5F5]" onClick={onClick}>
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#F5F5F5] via-[#E5E7EB] to-[#F5F5F5] animate-pulse" />
      )}
      <img
        key={displaySrc}
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => {
          loadedImageUrls.add(displaySrc);
          setIsLoading(false);
          setHasError(false);
        }}
        onError={handleImageError}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
      />
    </div>
  );
};
