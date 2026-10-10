import React, { useState, useMemo } from 'react';
import type { PromptItem } from '../types/prompt';
import {
  FolderKanban,
  LayoutGrid,
  List,
  Sparkles,
  Send,
  Layers,
  Copy,
  Check,
  ArrowUpRight,
  Maximize2,
} from 'lucide-react';
import { PromptCard } from './PromptCard';
import { getLabelBadgeClass, getLabelIcon } from '../utils/labelColors';
import { ImagePreviewModal } from './ImagePreviewModal';
import { copyToClipboard } from '../utils/clipboard';
import { useBackHandler } from '../hooks/useBackHandler';

export const getPublishType = (p: PromptItem): 'direct' | 'unreleased' => {
  if (p.publishCategory === 'unreleased') return 'unreleased';
  if (p.publishCategory === 'direct') return 'direct';
  if (p.labels?.some((l) => l.toLowerCase() === 'unreleased')) return 'unreleased';
  return 'direct';
};

interface CategoriesViewProps {
  prompts: PromptItem[];
  onCardClick: (item: PromptItem) => void;
  onCopyPrompt: (promptText: string, title: string) => void;
  onToggleUsed?: (id: string, isUsed: boolean) => void;
  searchQuery?: string;
}

type SubCategory = 'all' | 'direct' | 'unreleased';
type ViewMode = 'card' | 'list';

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  prompts,
  onCardClick,
  onCopyPrompt,
  onToggleUsed,
  searchQuery = '',
}) => {
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<PromptItem | null>(null);

  // Step-by-step back handler for preview lightbox on mobile
  useBackHandler(previewPrompt !== null, () => setPreviewPrompt(null), 'categories-preview');

  // Filter only published / used prompts
  const publishedPrompts = useMemo(() => {
    return prompts.filter((p) => p.isUsed === true);
  }, [prompts]);

  // Compute counts using unified getPublishType helper
  const directPrompts = useMemo(() => {
    return publishedPrompts.filter((p) => getPublishType(p) === 'direct');
  }, [publishedPrompts]);

  const unreleasedPrompts = useMemo(() => {
    return publishedPrompts.filter((p) => getPublishType(p) === 'unreleased');
  }, [publishedPrompts]);

  // Filter by selected sub-category
  const filteredPrompts = useMemo(() => {
    if (selectedSubCategory === 'direct') return directPrompts;
    if (selectedSubCategory === 'unreleased') return unreleasedPrompts;
    return publishedPrompts;
  }, [selectedSubCategory, directPrompts, unreleasedPrompts, publishedPrompts]);

  const handleCopy = async (e: React.MouseEvent, item: PromptItem) => {
    e.stopPropagation();
    const success = await copyToClipboard(item.prompt);
    if (success) {
      setCopiedId(item.id);
      onCopyPrompt(item.prompt, item.title);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-5 pt-1 pb-24 animate-in fade-in duration-200">
      {/* ── Top Categories Control Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
              <span>Published Categories</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                {filteredPrompts.length}
              </span>
            </h1>
            <p className="text-xs text-zinc-500">
              Direct feed & Unreleased published collections
            </p>
          </div>
        </div>

        {/* View Switcher: Card View vs Horizontal List View */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-2xl border border-zinc-200 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'card'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            title="Card View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
            title="Explore List View"
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* ── Sub-Categories Tabs: All / Direct / Unreleased ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* All Published */}
        <button
          onClick={() => setSelectedSubCategory('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedSubCategory === 'all'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          <span>All Published</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedSubCategory === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {publishedPrompts.length}
          </span>
        </button>

        {/* Direct Subcategory */}
        <button
          onClick={() => setSelectedSubCategory('direct')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedSubCategory === 'direct'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          <Send className="w-3 h-3" />
          <span>Direct</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedSubCategory === 'direct'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            {directPrompts.length}
          </span>
        </button>

        {/* Unreleased Subcategory (Light Blue) */}
        <button
          onClick={() => setSelectedSubCategory('unreleased')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedSubCategory === 'unreleased'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
          }`}
        >
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>Unreleased</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedSubCategory === 'unreleased'
                ? 'bg-white/25 text-white'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {unreleasedPrompts.length}
          </span>
        </button>
      </div>

      {/* ── Content: Empty State vs Cards vs List View ── */}
      {filteredPrompts.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-zinc-200/80 p-8 shadow-xs max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">
            {searchQuery
              ? 'No matching prompts found in Categories'
              : `No prompts in ${selectedSubCategory === 'all' ? 'Categories' : selectedSubCategory} yet`}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? 'Try modifying your search query or switching to All Prompts.'
              : 'Prompts marked as Live Published (🟢 Green) will appear here categorized under Direct or Unreleased.'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        /* ── View Mode 1: Grid of Cards ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {filteredPrompts.map((item) => (
            <PromptCard
              key={item.id}
              item={item}
              onCardClick={onCardClick}
              onCopyPrompt={onCopyPrompt}
              onToggleUsed={onToggleUsed}
            />
          ))}
        </div>
      ) : (
        /* ── View Mode 2: Explore Style Horizontal List View ── */
        <div className="space-y-2.5 max-w-4xl mx-auto">
          {filteredPrompts.map((item) => {
            const hasImages = item.images && item.images.length > 0;
            const thumbnail = hasImages ? item.images[0] : null;
            const totalImages = item.images ? item.images.length : 0;
            const isCopied = copiedId === item.id;
            const isUnreleased = getPublishType(item) === 'unreleased';

            return (
              <div
                key={item.id}
                onClick={() => onCardClick(item)}
                className="group relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-[#fafaf8] border border-zinc-200/80 hover:border-zinc-300 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.995]"
              >
                {/* 1. Left: Pic Thumbnail */}
                <div
                  onClick={(e) => {
                    if (thumbnail) {
                      e.stopPropagation();
                      setPreviewPrompt(item);
                    }
                  }}
                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-zinc-200/70 shadow-xs flex items-center justify-center cursor-zoom-in group/thumb"
                  title="Click to preview picture"
                >
                  {thumbnail ? (
                    <>
                      <img
                        src={thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300 select-none"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity pointer-events-none">
                        <Maximize2 className="w-4 h-4 drop-shadow" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      <Sparkles className="w-5 h-5 text-amber-400 opacity-60" />
                    </div>
                  )}

                  {totalImages > 1 && (
                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold pointer-events-none">
                      <Layers className="w-2.5 h-2.5" />
                      <span>{totalImages}</span>
                    </div>
                  )}
                </div>

                {/* 2. Middle: Title, Sub-category tag, labels */}
                <div className="min-w-0 flex-1 pr-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-zinc-900 group-hover:text-black line-clamp-1 leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  {item.description ? (
                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 font-normal leading-tight">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5 font-mono opacity-80 leading-tight">
                      {item.prompt}
                    </p>
                  )}

                  {/* Sub-category pill & Labels */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {/* Direct vs Unreleased Pill */}
                    {isUnreleased ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                        <span>Unreleased</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Send className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Direct</span>
                      </span>
                    )}

                    {/* Tags */}
                    {item.labels &&
                      item.labels.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getLabelBadgeClass(
                            tag,
                            'pill'
                          )}`}
                        >
                          {getLabelIcon(tag) && <span>{getLabelIcon(tag)}</span>}
                          <span>#{tag}</span>
                        </span>
                      ))}

                    {item.labels && item.labels.length > 3 && (
                      <span className="text-[10px] text-zinc-400 font-medium">
                        +{item.labels.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Right: Copy & Go-to-Page icon */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleCopy(e, item)}
                    aria-label={isCopied ? 'Copied' : 'Copy prompt'}
                    title={isCopied ? 'Copied' : 'Copy Prompt'}
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

      {/* Full-size Image Preview Lightbox */}
      <ImagePreviewModal
        isOpen={previewPrompt !== null}
        images={previewPrompt?.images ?? []}
        title={previewPrompt?.title}
        onClose={() => setPreviewPrompt(null)}
      />
    </div>
  );
};
