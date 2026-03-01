'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ImageOff, RotateCw } from 'lucide-react';

interface LightboxImage {
  src: string;
  alt: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, open, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  // Reset load/error state on image change
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setRetryKey(0);
  }, [index, open]);

  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose, prev, next]);

  if (!open || images.length === 0) return null;

  const safeIndex = Math.min(Math.max(0, index), images.length - 1);
  const current = images[safeIndex];

  const imgSrc = retryKey > 0
    ? `${current.src}${current.src.includes('?') ? '&' : '?'}_r=${retryKey}`
    : current.src;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 text-white/70 text-sm font-medium">
          {safeIndex + 1} / {images.length}
        </div>
      )}

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Loading spinner */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="h-10 w-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center gap-3 text-white/70" onClick={(e) => e.stopPropagation()}>
          <ImageOff className="h-12 w-12 opacity-50" />
          <p className="text-sm">Failed to load image</p>
          <button
            onClick={() => { setError(false); setLoaded(false); setRetryKey((k) => k + 1); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm"
          >
            <RotateCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Image */}
      {!error && (
        <div
          className="relative max-w-[90vw] max-h-[85vh] w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            key={`${safeIndex}-${retryKey}`}
            src={imgSrc}
            alt={current.alt}
            fill
            className={`object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            sizes="90vw"
            priority
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </div>
      )}

      {/* Caption */}
      {current.alt && loaded && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/50 px-4 py-2 rounded-full">
          {current.alt}
        </div>
      )}
    </div>
  );
}
