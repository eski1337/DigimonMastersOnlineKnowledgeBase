'use client';

import { CmsImage } from '@/components/ui/cms-image';

interface MapCardImageProps {
  src: string;
  alt: string;
}

export function MapCardImage({ src, alt }: MapCardImageProps) {
  return (
    <CmsImage
      src={src}
      alt={alt}
      fill
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      fallbackText="No preview"
    />
  );
}
