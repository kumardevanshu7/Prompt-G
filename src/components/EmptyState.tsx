import React from 'react';
import { Plus, Sparkles, Image as ImageIcon } from 'lucide-react';

interface EmptyStateProps {
  onOpenAddModal: () => void;
  isSearchingOrFiltered: boolean;
  onClearFilters: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenAddModal,
  isSearchingOrFiltered,
  onClearFilters,
}) => {
  if (isSearchingOrFiltered) {
    return (
      <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-zinc-800 mb-1">No matching prompts found</h3>
        <p className="text-sm text-zinc-500 max-w-sm mb-5">
          Try searching for different keywords or clear the active label filter.
        </p>
        <button
          onClick={onClearFilters}
          className="px-6 py-2.5 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  return (
    <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 shadow-inner">
          <ImageIcon className="w-10 h-10 stroke-[1.5]" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-amber-400 text-zinc-900 flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-2">
        Your Prompt Vault is Empty
      </h3>
      <p className="text-xs sm:text-sm text-zinc-500 max-w-md mb-6 leading-relaxed">
        Save your AI prompts here with visual 9:16 cards, up to 5 image uploads, and custom tags.
      </p>

      <button
        onClick={onOpenAddModal}
        className="px-7 py-3.5 rounded-full bg-zinc-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-lg shadow-zinc-900/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        <span>Add Your First Prompt</span>
      </button>
    </div>
  );
};
