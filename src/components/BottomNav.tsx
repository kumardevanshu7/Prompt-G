import React from 'react';
import { Home, Compass, Plus, FolderKanban, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'categories' | 'labels' | 'analytics';
  onTabChange: (tab: 'home' | 'categories' | 'labels' | 'analytics') => void;
  onOpenAddModal: () => void;
  publishedCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
  publishedCount = 0,
}) => {
  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto flex items-center justify-around px-3 sm:px-6 py-2 rounded-full bg-white/95 backdrop-blur-xl shadow-xl border border-zinc-200/80 max-w-[380px] w-full transition-all"
      >
        {/* Home */}
        <button
          onClick={() => onTabChange('home')}
          aria-label="Home"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'home' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Categories */}
        <button
          onClick={() => onTabChange('categories')}
          aria-label="Categories"
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'categories' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <FolderKanban className={`w-5 h-5 ${activeTab === 'categories' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">Categories</span>
          {publishedCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        {/* Central Add (+) Button */}
        <button
          onClick={onOpenAddModal}
          aria-label="Add new prompt"
          className="flex items-center justify-center w-11 h-11 -my-2 rounded-full bg-zinc-900 text-white shadow-lg shadow-zinc-900/25 hover:bg-black hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Add New Prompt"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Explore */}
        <button
          onClick={() => onTabChange('labels')}
          aria-label="Explore labels"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'labels' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Compass className={`w-5 h-5 ${activeTab === 'labels' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">Explore</span>
        </button>

        {/* Analytics */}
        <button
          onClick={() => onTabChange('analytics')}
          aria-label="Analytics"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'analytics' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === 'analytics' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">Stats</span>
        </button>
      </nav>
    </div>
  );
};
