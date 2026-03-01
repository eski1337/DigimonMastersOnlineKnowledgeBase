'use client';

import { useState } from 'react';
import { CmsImage } from '@/components/ui/cms-image';
import { ImageLightbox } from '@/components/ui/image-lightbox';

interface ImageModalProps {
  imageUrl: string;
  alt: string;
}

export function ImageModal({ imageUrl, alt }: ImageModalProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Image Button */}
      <button 
        onClick={() => setShowModal(true)}
        className="block relative w-full h-full group cursor-pointer"
        title="Click to view full size"
      >
        <CmsImage
          src={imageUrl}
          alt={alt}
          fill
          className="object-contain p-0 transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          fallbackText="No image"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-orange-500/90 text-white px-3 py-1 rounded-full text-sm font-semibold">
            Click to enlarge
          </div>
        </div>
      </button>

      <ImageLightbox
        images={[{ src: imageUrl, alt }]}
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
