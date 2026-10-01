import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-22 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-xl bg-zinc-950/95 text-white text-xs font-semibold border border-white/10 backdrop-blur-xl max-w-[92vw] whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200">
      {type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
      {type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
      {type === 'info' && <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
      <span className="truncate">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss toast"
          className="ml-1 text-zinc-400 hover:text-white text-xs px-1 cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );
};
