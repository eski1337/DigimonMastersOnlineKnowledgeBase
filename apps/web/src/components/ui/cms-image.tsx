'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image, { type ImageProps } from 'next/image';
import { ImageOff } from 'lucide-react';

const MAX_RETRIES = 3;

interface CmsImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  fallbackIcon?: React.ReactNode;
  fallbackText?: string;
  enableRetry?: boolean;
  showLoadingShimmer?: boolean;
  fadeIn?: boolean;
}

export function CmsImage({
  fallbackIcon,
  fallbackText,
  enableRetry = true,
  showLoadingShimmer = true,
  fadeIn = true,
  className = '',
  alt,
  ...props
}: CmsImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleError = useCallback(() => {
    if (!enableRetry || retryCount >= MAX_RETRIES) {
      setFailed(true);
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
    timerRef.current = setTimeout(() => {
      setRetryCount((c) => c + 1);
    }, delay);
  }, [retryCount, enableRetry]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  if (failed) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-muted/50 text-muted-foreground">
        <div className="flex flex-col items-center gap-1">
          {fallbackIcon || <ImageOff className="h-6 w-6 opacity-40" />}
          {fallbackText && <span className="text-xs opacity-60">{fallbackText}</span>}
        </div>
      </div>
    );
  }

  const src = retryCount > 0 && typeof props.src === 'string'
    ? `${props.src}${props.src.includes('?') ? '&' : '?'}_r=${retryCount}`
    : props.src;

  const fadeClass = fadeIn
    ? `transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`
    : '';

  return (
    <>
      {showLoadingShimmer && !loaded && (
        <div className="absolute inset-0 bg-muted/30 animate-pulse rounded-inherit" />
      )}
      <Image
        {...props}
        key={retryCount}
        src={src}
        alt={alt}
        className={`${className} ${fadeClass}`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  );
}
