'use client';

import { useState } from 'react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { CmsImage } from '@/components/ui/cms-image';

interface GalleryImage {
  src: string;
  caption: string;
}

interface MapGalleryProps {
  images: GalleryImage[];
}

export function MapGallery({ images }: MapGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const lightboxImages = images.map((img) => ({ src: img.src, alt: img.caption }));

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {images.map((item, i) => (
          <button
            key={i}
            className="group relative overflow-hidden rounded-lg border bg-muted cursor-zoom-in text-left"
            onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
          >
            <div className="relative aspect-[4/3]">
              <CmsImage
                src={item.src}
                alt={item.caption}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
                fallbackText="Image unavailable"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full">
                  View
                </span>
              </div>
            </div>
            {item.caption && (
              <div className="p-2 text-center">
                <p className="text-sm font-medium">{item.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

interface MapOverlayViewerProps {
  src: string;
  alt: string;
}

export function MapOverlayViewer({ src, alt }: MapOverlayViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-zoom-in w-full group"
        onClick={() => setOpen(true)}
      >
        <CmsImage
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="400px"
          fallbackText="Map unavailable"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full">
            View Full Size
          </span>
        </div>
      </button>
      <ImageLightbox
        images={[{ src, alt }]}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

interface HeroImageViewerProps {
  src: string;
  alt: string;
  children: React.ReactNode;
}

export function HeroImageViewer({ src, alt, children }: HeroImageViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative aspect-[21/9] w-full cursor-zoom-in" onClick={() => setOpen(true)}>
        {children}
      </div>
      <ImageLightbox
        images={[{ src, alt }]}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
