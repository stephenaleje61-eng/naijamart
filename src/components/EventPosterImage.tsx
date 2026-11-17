import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface EventPosterImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export const EventPosterImage: React.FC<EventPosterImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover'
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-[#10251D] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#087443] text-[#D4A62A] flex items-center justify-center mb-2 shadow-md">
          <Sparkles className="w-6 h-6" />
        </div>
        <span className="text-xs font-black tracking-wide uppercase text-[#D4A62A]">
          NIGERIA CAMPUS MARKET Celebration
        </span>
        <span className="text-[11px] text-white/75 mt-1 line-clamp-1 max-w-[200px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
