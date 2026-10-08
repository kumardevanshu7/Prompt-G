import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, LogIn, LogOut, X, Settings } from 'lucide-react';
import type { UserProfile } from '../types/prompt';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddModal: () => void;
  onOpenSecurityModal: () => void;
  userProfile: UserProfile | null;
  onGoogleSignIn: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenSecurityModal,
  userProfile,
  onGoogleSignIn,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu]);

  return (
    <header className="w-full pt-4 pb-2 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Top Brand & Profile Row */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Brand Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-bold shadow-sm">
          <img src="/favicon-32x32.png" alt="Prompt G" className="w-4 h-4 rounded-md object-contain" />
          <span>Prompt<span className="text-amber-400">G</span> Vault</span>
        </div>

        {/* Right: Quick Add + User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Add Prompt Button (Top bar for desktop/tablet) */}
          <button
            onClick={onOpenAddModal}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prompt</span>
          </button>

          {/* User Profile or Google Sign In */}
          {userProfile ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white border border-zinc-200/80 hover:border-zinc-300 shadow-xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900"
                aria-expanded={showUserMenu}
                aria-haspopup="true"
                aria-label="User profile menu"
              >
                {userProfile.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={userProfile.name}
                    className="w-6 h-6 rounded-full object-cover border border-zinc-200"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black">
                    {userProfile.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-xs font-bold text-zinc-800 max-w-[90px] truncate">
                  {userProfile.name}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-zinc-100 py-1.5 z-40 animate-in fade-in duration-150">
                  <div className="px-4 py-2 border-b border-zinc-100">
                    <p className="text-xs font-bold text-zinc-900 truncate">{userProfile.name}</p>
                    {userProfile.email && (
                      <p className="text-[10px] text-zinc-400 truncate">{userProfile.email}</p>
                    )}
                  </div>

                  {/* Settings (Security & Reset App) */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenSecurityModal();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                  >
                    <Settings className="w-4 h-4 text-zinc-700 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-900">Settings</span>
                      <span className="text-[10px] text-zinc-400">
                        Security & Reset App
                      </span>
                    </div>
                  </button>

                  {/* Sign Out */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-semibold transition-colors border-t border-zinc-100"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Headline */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
          Discover <br />
          <span className="text-zinc-900">Your Next Prompt</span>
        </h1>
      </div>

      {/* Search Bar Row */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search prompts, keywords, styles..."
            className="w-full pl-11 pr-10 py-3 sm:py-3.5 rounded-full bg-zinc-100/90 hover:bg-zinc-100 focus:bg-white border border-transparent focus:border-zinc-300 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all placeholder:text-zinc-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-300 hover:bg-zinc-400 text-zinc-700 flex items-center justify-center cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Mobile quick Add (+) button */}
        <button
          onClick={onOpenAddModal}
          className="sm:hidden w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-md cursor-pointer active:scale-95"
          title="Add Prompt"
          aria-label="Add new prompt"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
