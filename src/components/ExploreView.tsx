import React, { useRef } from 'react';
import type { PromptItem } from '../types/prompt';
import { PromptCard } from './PromptCard';
import { ChevronLeft, ChevronRight, Compass, Sparkles } from 'lucide-react';
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

interface HorizontalRowProps {
  title: string;
  count?: number;
  badge?: React.ReactNode;
  items: PromptItem[];
  onCardClick: (item: PromptItem) => void;
  onCopyPrompt: (promptText: string, title: string) => void;
  onToggleUsed: (id: string, isUsed: boolean) => void;
}

const HorizontalRow: React.FC<HorizontalRowProps> = ({
  title,
  count,
  badge,
  items,
  onCardClick,
  onCopyPrompt,
  onToggleUsed,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="space-y-3 py-2">
      {/* Row Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {badge}
          <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>{title}</span>
            {count !== undefined && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                {count}
              </span>
            )}
          </h2>
        </div>

        {/* Scroll Controls (Desktop) */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            aria-label={`Scroll ${title} left`}
            className="w-8 h-8 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label={`Scroll ${title} right`}
            className="w-8 h-8 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Card Track */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 px-1 -mx-1"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="w-[70vw] xs:w-[240px] sm:w-[260px] md:w-[275px] shrink-0 snap-start"
          >
            <PromptCard
              item={item}
              onCardClick={onCardClick}
              onCopyPrompt={onCopyPrompt}
              onToggleUsed={onToggleUsed}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export const ExploreView: React.FC<ExploreViewProps> = ({
  prompts,
  categories,
  activeCategory,
  onSelectCategory,
  onCardClick,
  onCopyPrompt,
  onToggleUsed,
}) => {
  // 1. Pending Prompts
  const pendingPrompts = prompts.filter((p) => p.enableCheckmark && !p.isUsed);

  // 2. Used Prompts
  const usedPrompts = prompts.filter((p) => p.enableCheckmark && p.isUsed);

  // 3. Prompts grouped by label
  const categoryGroups = categories.map((cat) => ({
    name: cat,
    items: prompts.filter((p) =>
      p.labels?.some((l) => l.toLowerCase() === cat.toLowerCase())
    ),
  }));

  // If a specific filter is active, highlight or focus it
  const isFiltered = activeCategory !== 'all';
  const filteredList = isFiltered
    ? activeCategory === '__pending'
      ? pendingPrompts
      : activeCategory === '__used'
      ? usedPrompts
      : prompts.filter((p) =>
          p.labels?.some((l) => l.toLowerCase() === activeCategory.toLowerCase())
        )
    : prompts;

  return (
    <div className="space-y-6 pt-2 pb-8 animate-in fade-in duration-200">
      {/* Explore Header */}
      <div className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-sm">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight">
              Explore Prompts (Horizontal Reels)
            </h1>
            <p className="text-xs text-zinc-500">
              Swipe horizontally through your visual prompts & collections
            </p>
          </div>
        </div>

        {isFiltered && (
          <button
            onClick={() => onSelectCategory('all')}
            className="self-start sm:self-auto text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
          >
            Show all reels
          </button>
        )}
      </div>

      {/* When a specific category is filtered, show that reel prominently */}
      {isFiltered ? (
        <HorizontalRow
          title={
            activeCategory === '__pending'
              ? '🔴 Pending Uploads'
              : activeCategory === '__used'
              ? '🟢 Uploaded to Instagram'
              : `#${activeCategory}`
          }
          count={filteredList.length}
          items={filteredList}
          onCardClick={onCardClick}
          onCopyPrompt={onCopyPrompt}
          onToggleUsed={onToggleUsed}
        />
      ) : (
        <>
          {/* Main All Prompts Reel */}
          <HorizontalRow
            title="All Prompts Reel"
            count={prompts.length}
            badge={<Sparkles className="w-4 h-4 text-amber-500" />}
            items={prompts}
            onCardClick={onCardClick}
            onCopyPrompt={onCopyPrompt}
            onToggleUsed={onToggleUsed}
          />

          {/* Pending Uploads Row (if any) */}
          {pendingPrompts.length > 0 && (
            <HorizontalRow
              title="Pending Upload (No)"
              count={pendingPrompts.length}
              badge={
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </span>
              }
              items={pendingPrompts}
              onCardClick={onCardClick}
              onCopyPrompt={onCopyPrompt}
              onToggleUsed={onToggleUsed}
            />
          )}

          {/* Used Prompts Row (if any) */}
          {usedPrompts.length > 0 && (
            <HorizontalRow
              title="Uploaded to Instagram (Yes)"
              count={usedPrompts.length}
              badge={
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              }
              items={usedPrompts}
              onCardClick={onCardClick}
              onCopyPrompt={onCopyPrompt}
              onToggleUsed={onToggleUsed}
            />
          )}

          {/* Category Rows */}
          {categoryGroups.map((group) => {
            if (group.items.length === 0) return null;
            const badgeClass = getLabelBadgeClass(group.name, 'pill');
            return (
              <HorizontalRow
                key={group.name}
                title={`#${group.name}`}
                count={group.items.length}
                badge={
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeClass}`}>
                    #{group.name}
                  </span>
                }
                items={group.items}
                onCardClick={onCardClick}
                onCopyPrompt={onCopyPrompt}
                onToggleUsed={onToggleUsed}
              />
            );
          })}
        </>
      )}
    </div>
  );
};
