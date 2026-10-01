import React from 'react';
import { Home, Compass, Plus } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'labels';
  onTabChange: (tab: 'home' | 'labels') => void;
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
}) => {
  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto flex items-center justify-around px-6 py-2 rounded-full bg-white/95 backdrop-blur-xl shadow-xl border border-zinc-200/80 max-w-[260px] w-full transition-all"
      >
        {/* Home */}
        <button
          onClick={() => onTabChange('home')}
          aria-label="Home"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all cursor-pointer ${
            activeTab === 'home' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Central Add (+) Button */}
        <button
          onClick={onOpenAddModal}
          aria-label="Add new prompt"
          className="flex items-center justify-center w-11 h-11 -my-2 rounded-full bg-zinc-900 text-white shadow-lg shadow-zinc-900/25 hover:bg-black hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Add New Prompt"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Labels / Explore */}
        <button
          onClick={() => onTabChange('labels')}
          aria-label="Explore labels"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all cursor-pointer ${
            activeTab === 'labels' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Compass className={`w-5 h-5 ${activeTab === 'labels' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">Explore</span>
        </button>
      </nav>
    </div>
  );
};
