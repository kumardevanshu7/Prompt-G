import React from 'react';
import {
  Sparkles, ArrowRight, FolderOpen, Zap, Copy,
  LayoutGrid, Tag, LogIn, Smartphone, Vault,
  Palette, Star,
} from 'lucide-react';

interface WelcomeScreenProps {
  onGoogleSignIn: () => void;
  isLoading?: boolean;
}

const TICKER_ITEMS = [
  { Icon: FolderOpen,  text: 'Organize Prompts' },
  { Icon: Zap,         text: 'Instant Cloud Sync' },
  { Icon: Copy,        text: 'One-Click Copy' },
  { Icon: LayoutGrid,  text: 'Visual Card Gallery' },
  { Icon: Tag,         text: 'Labels & Filters' },
  { Icon: LogIn,       text: 'Google Sign-In' },
  { Icon: Smartphone,  text: 'Works on Mobile' },
  { Icon: Vault,       text: 'AI Prompt Vault' },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGoogleSignIn,
  isLoading = false,
}) => {
  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto bg-[#f5f5f0] flex flex-col select-none font-sans">

      {/* ── NAVBAR ── */}
      <nav className="w-full flex items-center justify-between px-6 sm:px-12 py-4 sm:py-5 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/apple-touch-icon.png"
            alt="Prompt G"
            className="w-8 h-8 rounded-xl shadow-sm object-cover"
          />
          <span className="text-base font-extrabold text-zinc-900 tracking-tight">
            Prompt<span className="text-amber-500">G</span>
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
            Beta
          </span>
        </div>

        {/* Auth Button */}
        <button
          onClick={onGoogleSignIn}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-60 active:scale-95"
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign in with Google</span>
              <ArrowRight className="w-3 h-3" />
            </>
          )}
        </button>
      </nav>

      {/* ── HERO SECTION ── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-12 py-6 sm:py-0">

        {/* Eyebrow badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zinc-200/80 text-xs font-semibold text-zinc-600 shadow-sm mb-5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Your AI Prompt Gallery, Synced Everywhere</span>
        </div>

        {/* ── HERO HEADLINE ── */}
        <h1 className="text-[42px] sm:text-6xl lg:text-7xl font-black text-zinc-900 tracking-tighter leading-none mb-4 max-w-3xl">
          Save
          <span className="inline-flex items-center justify-center mx-2 align-middle">
            <span className="inline-flex items-center gap-2 bg-amber-400/20 px-3 py-1 rounded-2xl border border-amber-300">
              <Palette className="w-7 h-7 sm:w-9 sm:h-9 text-amber-500" />
              <Star className="w-7 h-7 sm:w-9 sm:h-9 text-amber-400" />
            </span>
          </span>
          Your Best <br className="hidden sm:block" />
          <span className="relative inline-flex items-center gap-3">
            AI Prompts
            <span className="hidden sm:inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-400 text-white shadow-lg ml-1">
              <Copy className="w-5 h-5" />
            </span>
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-sm sm:text-base text-zinc-500 max-w-md leading-relaxed mb-8">
          Prompt G helps creators save, organize and instantly copy their best AI prompts — with visual 9:16 cards synced across phone and laptop in real time.
        </p>

        {/* CTA Button */}
        <button
          onClick={onGoogleSignIn}
          disabled={isLoading}
          className="px-8 py-4 rounded-full bg-zinc-900 hover:bg-black text-white text-sm font-bold shadow-xl shadow-zinc-900/20 cursor-pointer transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign in with Google</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

      </main>

      {/* ── BOTTOM TICKER STRIP ── */}
      <div className="w-full px-5 sm:px-12 pb-5 sm:pb-6 shrink-0">
        <div className="w-full rounded-2xl sm:rounded-3xl bg-amber-400 py-3.5 overflow-hidden">
          <div className="flex animate-[ticker_18s_linear_infinite] whitespace-nowrap">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-0 shrink-0">
                {TICKER_ITEMS.map(({ Icon, text }, j) => (
                  <React.Fragment key={j}>
                    <span className="flex items-center gap-2 text-zinc-900 font-bold text-xs sm:text-sm tracking-tight px-5">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {text}
                    </span>
                    <span className="text-zinc-900/30 font-black text-base select-none">·</span>
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
