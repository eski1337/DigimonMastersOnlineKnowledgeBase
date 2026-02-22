'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

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
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-contain p-0 transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-orange-500/90 text-white px-3 py-1 rounded-full text-sm font-semibold">
            Click to enlarge
          </div>
        </div>
      </button>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <button
            onClick={() => setShowModal(false)}
            className="absolute top-4 right-4 text-white hover:text-orange-500 transition-colors p-2 bg-black/50 rounded-full"
            aria-label="Close"
          >
            <X size={32} />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <Image
              src={imageUrl}
              alt={alt}
              width={1200}
              height={1200}
              className="object-contain w-full h-full"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/70 px-4 py-2 rounded-full">
            Click anywhere to close
          </div>
        </div>
      )}
    </>
  );
}
