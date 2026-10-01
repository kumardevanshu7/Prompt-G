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
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full shadow-2xl bg-zinc-900 text-white text-sm font-medium border border-zinc-700/60 animate-in fade-in slide-in-from-bottom-4 duration-200">
      {type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
      {type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
      {type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-zinc-400 hover:text-white text-xs px-1"
        >
          ✕
        </button>
      )}
    </div>
  );
};
