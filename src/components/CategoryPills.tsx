import React from 'react';

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

        {categories.map((cat) => {
          const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
          const count = counts[cat] ?? counts[cat.toLowerCase()];

          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/10'
                  : 'bg-[#ecebee] text-zinc-600 hover:bg-[#e4e3e6] hover:text-zinc-900'
              }`}
            >
              #{cat} {count !== undefined && <span className="opacity-70 text-xs ml-1">({count})</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
