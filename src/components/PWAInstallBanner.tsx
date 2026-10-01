import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallBannerProps {
  onInstalled?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onInstalled }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone / installed mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 2 days)
    const dismissedAt = localStorage.getItem('promptg_pwa_dismissed');
    if (dismissedAt) {
      const diffDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (diffDays < 2) return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      onInstalled?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
        setIsInstalled(true);
        onInstalled?.();
      }
    } catch (err) {
      console.error('PWA install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('promptg_pwa_dismissed', Date.now().toString());
  };

  if (isInstalled || !isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="Install App"
      className="fixed bottom-24 sm:bottom-22 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-zinc-900/95 backdrop-blur-xl text-white rounded-3xl p-4 shadow-2xl border border-zinc-700/60 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/favicon-32x32.png"
            alt="Prompt G"
            className="w-10 h-10 rounded-2xl bg-black p-1 shadow-md object-contain shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold leading-tight">Install Prompt G App</h4>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[9px] font-black uppercase">
                App / APK
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
              Fast full-screen mobile experience with instant access
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-zinc-800">
        <button
          onClick={handleInstallClick}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Now</span>
        </button>
        <button
          onClick={handleDismiss}
          className="px-3.5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          Maybe Later
        </button>
      </div>
    </aside>
  );
};
