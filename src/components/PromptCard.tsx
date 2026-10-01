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
  Clock,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { getLabelBadgeClass } from '../utils/labelColors';

interface PromptCardProps {
  item: PromptItem;
  onCardClick: (item: PromptItem) => void;
  onCopyPrompt: (promptText: string, title: string) => void;
  onToggleUsed?: (id: string, isUsed: boolean) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  item,
  onCardClick,
  onCopyPrompt,
  onToggleUsed,
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

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    // One-way: Once marked green (used), it cannot be reverted to red
    if (item.isUsed) return;
    if (onToggleUsed) {
      onToggleUsed(item.id, true);
    }
  };

  // Determine card border style if checkmark tracking is active (outline only, NO picture tint)
  const isPendingCheck = item.enableCheckmark && !item.isUsed;
  const isUsedCheck = item.enableCheckmark && item.isUsed;

  const cardBorderClass = isPendingCheck
    ? 'border-2 border-rose-500 ring-2 ring-rose-500/25 shadow-lg shadow-rose-500/15'
    : isUsedCheck
    ? 'border border-emerald-500/60 shadow-sm shadow-emerald-500/10'
    : 'border border-zinc-200/70 shadow-sm';

  return (
    <div className="group flex flex-col w-full">
      {/* 9:16 Aspect Ratio Main Card */}
      <div
        onClick={() => onCardClick(item)}
        className={`relative aspect-9-16 w-full rounded-[28px] overflow-hidden transition-all duration-300 bg-zinc-900 cursor-pointer transform hover:-translate-y-1 hover:shadow-xl ${cardBorderClass}`}
      >
        {/* Image Slideshow / Preview (pure image, no red tint overlay) */}
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

        {/* Top Badges (Only Status Badge on left, and Images count on right. No hashtag labels at top) */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10 pointer-events-none gap-2">
          {/* Left: Red / Green Dot Status Label */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {item.enableCheckmark && (
              item.isUsed ? (
                /* Once Used, it stays Green (One-way) */
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-md backdrop-blur-md border bg-black/75 border-emerald-500/60 text-emerald-200"
                  title="Status: Used & Uploaded (Yes)"
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-sm shadow-emerald-400" />
                  </span>
                  <span>Used (Yes)</span>
                </div>
              ) : (
                /* Clickable Pending (No) Button */
                <button
                  onClick={handleToggleStatus}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-md cursor-pointer transition-all active:scale-95 backdrop-blur-md border bg-black/80 border-rose-500/60 text-rose-200 hover:bg-black/95"
                  title="Click to mark as Used (Yes)"
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-sm shadow-rose-500" />
                  </span>
                  <span>Pending (No)</span>
                </button>
              )
            )}
          </div>

          {/* Right: Multiple Images Indicator */}
          <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
            {totalImages > 1 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold tracking-wide shadow-sm">
                <Layers className="w-3 h-3" />
                <span>{currentImageIndex + 1}/{totalImages}</span>
              </div>
            )}
          </div>
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

        {/* Bottom Image Overlay (All tags grouped here at bottom above title) */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-white z-10 flex flex-col justify-end">
          {/* All Category Tags at Bottom */}
          {item.labels && item.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {item.labels.map((l) => (
                <span
                  key={l}
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${getLabelBadgeClass(l, 'card')}`}
                >
                  #{l}
                </span>
              ))}
            </div>
          )}

          {/* Title (Short/line-clamp-1, other details show inside modal) */}
          <h3 className="font-bold text-base md:text-lg leading-tight line-clamp-1 drop-shadow-sm">
            {item.title}
          </h3>

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

      {/* Button Directly Under/Outside the Card: "Copy Prompt" and Quick Action */}
      <div className="mt-2.5 px-1 flex items-center gap-2">
        <button
          onClick={handleCopy}
          aria-label={copied ? 'Prompt Copied' : 'Copy Prompt'}
          title={copied ? 'Copied to clipboard' : 'Copy prompt to clipboard'}
          className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-900 hover:bg-black text-white hover:shadow-md active:scale-95'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="hidden sm:inline truncate">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 opacity-80 shrink-0" />
              <span className="hidden sm:inline truncate">Copy Prompt</span>
            </>
          )}
        </button>

        {/* Quick Check-Mark Button: Red Timer (Pending) -> Green Tick (Used) */}
        {item.enableCheckmark && (
          item.isUsed ? (
            /* Green Tick once used (stays green) */
            <div
              aria-label="Used & Uploaded"
              title="Status: Used & Uploaded (Yes)"
              className="p-2.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-xs shrink-0"
            >
              <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            </div>
          ) : (
            /* Red Timer button when pending (tap to mark as used) */
            <button
              onClick={handleToggleStatus}
              aria-label="Mark as Used (Yes)"
              title="Click to mark as Used (Yes)"
              className="p-2.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 transition-all cursor-pointer font-bold active:scale-95 shadow-xs shrink-0"
            >
              <Clock className="w-4 h-4 text-rose-600" />
            </button>
          )
        )}

        {/* Detail Button */}
        <button
          onClick={() => onCardClick(item)}
          aria-label="View prompt details"
          className="p-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer shrink-0"
          title="Open prompt details"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
