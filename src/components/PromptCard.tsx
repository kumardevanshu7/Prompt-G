import React, { useState } from 'react';
import type { PromptItem } from '../types/prompt';
import {
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface PromptCardProps {
  item: PromptItem;
  onCardClick: (item: PromptItem) => void;
  onCopyPrompt: (promptText: string, title: string) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  item,
  onCardClick,
  onCopyPrompt,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const images = item.images && item.images.length > 0 ? item.images : [];
  const totalImages = images.length;

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % totalImages);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(item.prompt);
    if (success) {
      setCopied(true);
      onCopyPrompt(item.prompt, item.title);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group flex flex-col w-full">
      {/* 9:16 Aspect Ratio Main Card */}
      <div
        onClick={() => onCardClick(item)}
        className="relative aspect-9-16 w-full rounded-[28px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-zinc-900 cursor-pointer border border-zinc-200/70 transform hover:-translate-y-1"
      >
        {/* Image Slideshow / Preview */}
        {totalImages > 0 ? (
          <img
            src={images[currentImageIndex]}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-white">
            <Sparkles className="w-8 h-8 text-amber-400 mb-2 opacity-80" />
            <span className="text-xs font-bold text-zinc-300 line-clamp-2">{item.title}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10 pointer-events-none">
          {/* Label Tag */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {item.labels && item.labels.length > 0 && (
              <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium tracking-wide">
                #{item.labels[0]}
              </div>
            )}
          </div>

          {/* Multiple Images Indicator */}
          {totalImages > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold tracking-wide pointer-events-auto">
              <Layers className="w-3 h-3" />
              <span>{currentImageIndex + 1}/{totalImages}</span>
            </div>
          )}
        </div>

        {/* Multi-image navigation buttons (visible on hover & on touch) */}
        {totalImages > 1 && (
          <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between z-20 pointer-events-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={handlePrevImage}
              aria-label="Previous image"
              className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center transition-all cursor-pointer shadow"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImage}
              aria-label="Next image"
              className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center transition-all cursor-pointer shadow"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bottom Image Overlay (Title, short description) */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-white z-10 flex flex-col justify-end">
          {/* Tags */}
          {item.labels && item.labels.length > 1 && (
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-[11px] text-zinc-300 truncate">
                {item.labels.slice(1, 3).map(l => `#${l}`).join(' ')}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-bold text-base md:text-lg leading-tight line-clamp-1 drop-shadow-sm">
            {item.title}
          </h3>

          {/* Short description */}
          {item.description && (
            <p className="text-xs text-zinc-200/90 line-clamp-2 mt-1 leading-snug drop-shadow-sm font-normal">
              {item.description}
            </p>
          )}

          {/* Multi-image indicator dots */}
          {totalImages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-2.5">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Button Directly Under/Outside the Card: "Copy Prompt" */}
      <div className="mt-2.5 px-1 flex items-center gap-2">
        <button
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-900 hover:bg-black text-white hover:shadow-md active:scale-95'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 opacity-80" />
              <span>Copy Prompt</span>
            </>
          )}
        </button>

        <button
          onClick={() => onCardClick(item)}
          aria-label="View prompt details"
          className="p-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
          title="Open prompt details"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
