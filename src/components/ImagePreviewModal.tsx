import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, Layers } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  title,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Sync initial index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
    }
  }, [isOpen, initialIndex, images.length]);

  const total = images.length;

  const handlePrev = useCallback(() => {
    if (total > 1) {
      setCurrentIndex((prev) => (prev - 1 + total) % total);
    }
  }, [total]);

  const handleNext = useCallback(() => {
    if (total > 1) {
      setCurrentIndex((prev) => (prev + 1) % total);
    }
  }, [total]);

  // Keyboard navigation: Escape to close, Arrows to navigate
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentSrc = images[currentIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image Preview"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between p-3 sm:p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between text-white py-2 px-1 z-10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {title && (
            <h2 className="text-sm sm:text-base font-bold text-zinc-100 truncate max-w-[200px] sm:max-w-md">
              {title}
            </h2>
          )}
          {total > 1 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm shrink-0">
              <Layers className="w-3 h-3" />
              <span>
                {currentIndex + 1} / {total}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Open full image in new tab */}
          {currentSrc && (
            <a
              href={currentSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              title="Open original image in new tab"
              aria-label="Open original image in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage (100% Uncropped, Original Aspect Ratio) */}
      <div
        className="relative w-full flex-1 flex items-center justify-center min-h-0 my-auto p-1"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <img
          key={currentSrc}
          src={currentSrc}
          alt={title ? `${title} preview ${currentIndex + 1}` : `Preview ${currentIndex + 1}`}
          className="max-h-[75vh] sm:max-h-[82vh] max-w-[95vw] sm:max-w-[85vw] w-auto h-auto object-contain select-none rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        />

        {/* Previous Button */}
        {total > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous image"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-xs active:scale-90 border border-white/15"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {total > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next image"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-xs active:scale-90 border border-white/15"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (if multiple images) */}
      {total > 1 && (
        <div className="w-full max-w-md flex items-center justify-center gap-2 py-2 px-3 overflow-x-auto shrink-0 z-10">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Jump to image ${idx + 1}`}
              className={`relative w-11 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                idx === currentIndex
                  ? 'border-white scale-105 shadow-md shadow-white/20'
                  : 'border-white/20 opacity-50 hover:opacity-90'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
