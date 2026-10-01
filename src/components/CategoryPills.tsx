import React from 'react';
import { getLabelBadgeClass } from '../utils/labelColors';

interface CategoryPillsProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  counts?: Record<string, number>;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  counts = {},
}) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-center gap-2.5 min-w-max px-1">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/10'
              : 'bg-[#ecebee] text-zinc-600 hover:bg-[#e4e3e6] hover:text-zinc-900'
          }`}
        >
          All Prompts {counts['all'] !== undefined && `(${counts['all']})`}
        </button>

        {/* Category: Red Dot Pending (No) */}
        {(counts['__pending'] ?? 0) > 0 && (
          <button
            onClick={() => onSelectCategory('__pending')}
            className={`px-4 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeCategory === '__pending'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 ring-2 ring-rose-400/50'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80'
            }`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-sm shadow-rose-500" />
            </span>
            <span>Pending (No)</span>
            <span className="opacity-80 text-xs">({counts['__pending']})</span>
          </button>
        )}

        {/* Category: Green Dot Used (Yes) */}
        {(counts['__used'] ?? 0) > 0 && (
          <button
            onClick={() => onSelectCategory('__used')}
            className={`px-4 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeCategory === '__used'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400/50'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
            }`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-sm shadow-emerald-500" />
            </span>
            <span>Used (Yes)</span>
            <span className="opacity-80 text-xs">({counts['__used']})</span>
          </button>
        )}

        {categories.map((cat) => {
          const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
          const count = counts[cat] ?? counts[cat.toLowerCase()];
          const colorClass = getLabelBadgeClass(cat, isActive ? 'activePill' : 'pill');

          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${colorClass}`}
            >
              #{cat} {count !== undefined && <span className="opacity-70 text-xs ml-1">({count})</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
