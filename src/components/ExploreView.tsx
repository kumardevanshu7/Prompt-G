import React, { useState } from 'react';
import type { PromptItem } from '../types/prompt';
import {
  ArrowUpRight,
  Copy,
  Check,
  Sparkles,
  Layers,
  Compass,
  Search,
} from 'lucide-react';
import { getLabelBadgeClass } from '../utils/labelColors';

interface ExploreViewProps {
  prompts: PromptItem[];
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  onCardClick: (item: PromptItem) => void;
  onCopyPrompt: (promptText: string, title: string) => void;
  onToggleUsed: (id: string, isUsed: boolean) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  prompts,
  categories: _categories,
  activeCategory,
  onSelectCategory,
  onCardClick,
  onCopyPrompt,
  onToggleUsed,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, item: PromptItem) => {
    e.stopPropagation();
    onCopyPrompt(item.prompt, item.title);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = (e: React.MouseEvent, item: PromptItem) => {
    e.stopPropagation();
    if (!item.isUsed) {
      onToggleUsed(item.id, true);
    }
  };

  return (
    <div className="space-y-4 pt-2 pb-20 animate-in fade-in duration-200 max-w-4xl mx-auto px-1">
      {/* Explore Header */}
      <div className="flex items-center justify-between px-1 border-b border-zinc-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-sm">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
              <span>Explore Prompts</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                {prompts.length}
              </span>
            </h1>
            <p className="text-xs text-zinc-500">
              List view • Left pic, title & right go-to-page arrow
            </p>
          </div>
        </div>

        {activeCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
          >
            Show all
          </button>
        )}
      </div>

      {/* Prompts List View */}
      {prompts.length === 0 ? (
        <div className="py-16 text-center text-zinc-400 bg-white rounded-3xl border border-zinc-200/80 p-8 shadow-xs">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-30 text-zinc-400" />
          <p className="text-sm font-semibold text-zinc-600">No prompts found</p>
          <p className="text-xs text-zinc-400 mt-1">Try switching categories or clearing search</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {prompts.map((item) => {
            const hasImages = item.images && item.images.length > 0;
            const thumbnail = hasImages ? item.images[0] : null;
            const totalImages = item.images ? item.images.length : 0;
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onCardClick(item)}
                className="group relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-[#fafaf8] border border-zinc-200/80 hover:border-zinc-300 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.995]"
              >
                {/* 1. Left Side: Pic Thumbnail */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-zinc-200/70 shadow-xs flex items-center justify-center">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      <Sparkles className="w-5 h-5 text-amber-400 opacity-60" />
                    </div>
                  )}

                  {/* Multi-image badge */}
                  {totalImages > 1 && (
                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold">
                      <Layers className="w-2.5 h-2.5" />
                      <span>{totalImages}</span>
                    </div>
                  )}
                </div>

                {/* 2. Middle: Title & Tags */}
                <div className="min-w-0 flex-1 pr-1">
                  {/* Title */}
                  <h3 className="font-bold text-sm sm:text-base text-zinc-900 group-hover:text-black line-clamp-1 leading-snug">
                    {item.title}
                  </h3>

                  {/* Description / snippet if available */}
                  {item.description ? (
                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 font-normal leading-tight">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5 font-normal font-mono opacity-80 leading-tight">
                      {item.prompt}
                    </p>
                  )}

                  {/* Labels and Social Status */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {/* Social Status Indicator */}
                    {item.enableCheckmark && (
                      item.isUsed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/70">
                          <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                          <span>Used</span>
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleToggleStatus(e, item)}
                          title="Click to mark as Used (Yes)"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-200/70 transition-colors cursor-pointer"
                        >
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                          </span>
                          <span>Pending (No)</span>
                        </button>
                      )
                    )}

                    {/* Tags */}
                    {item.labels && item.labels.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full ${getLabelBadgeClass(tag, 'pill')}`}
                      >
                        #{tag}
                      </span>
                    ))}

                    {item.labels && item.labels.length > 3 && (
                      <span className="text-[10px] text-zinc-400 font-medium">
                        +{item.labels.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Right Side: Quick Copy + Go to page icon */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Quick Copy Button */}
                  <button
                    onClick={(e) => handleCopy(e, item)}
                    aria-label={isCopied ? 'Copied' : 'Copy prompt'}
                    title={isCopied ? 'Copied to clipboard' : 'Quick Copy Prompt'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Go to page icon (as requested by user) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick(item);
                    }}
                    aria-label="Go to prompt details"
                    title="Go to prompt page"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900 group-hover:bg-black text-white flex items-center justify-center transition-all shadow-xs group-hover:shadow-md cursor-pointer active:scale-95"
                  >
                    <ArrowUpRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
