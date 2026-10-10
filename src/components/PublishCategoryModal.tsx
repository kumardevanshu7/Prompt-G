import React, { useState } from 'react';
import { X, Send, Sparkles, Check, ArrowRight } from 'lucide-react';

interface PublishCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptTitle?: string;
  onConfirm: (category: 'direct' | 'unreleased') => Promise<void> | void;
}

export const PublishCategoryModal: React.FC<PublishCategoryModalProps> = ({
  isOpen,
  onClose,
  promptTitle = '',
  onConfirm,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'direct' | 'unreleased'>('direct');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (cat: 'direct' | 'unreleased') => {
    try {
      setIsSubmitting(true);
      await onConfirm(cat);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div data-lenis-prevent className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-zinc-200/90 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 leading-tight">
                Publish Destination
              </h3>
              <p className="text-xs text-zinc-500">
                Choose destination category for this published prompt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {promptTitle && (
          <div className="px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200/80">
            <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Prompt</p>
            <p className="text-xs font-bold text-zinc-800 truncate mt-0.5">{promptTitle}</p>
          </div>
        )}

        {/* 2 Category Selection Cards */}
        <div className="space-y-3">
          {/* Option 1: Direct */}
          <div
            onClick={() => setSelectedCategory('direct')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedCategory === 'direct'
                ? 'border-zinc-900 bg-zinc-50/80 shadow-sm ring-1 ring-zinc-900/10'
                : 'border-zinc-200 hover:border-zinc-300 bg-white'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedCategory === 'direct'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              <Send className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-zinc-900">Direct</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Main Feed
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                Live published directly to Instagram feed, story, or main social channels.
              </p>
            </div>
          </div>

          {/* Option 2: Unreleased */}
          <div
            onClick={() => setSelectedCategory('unreleased')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedCategory === 'unreleased'
                ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-500/20'
                : 'border-zinc-200 hover:border-zinc-300 bg-white'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedCategory === 'unreleased'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-zinc-900">Unreleased</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Light Blue Tag
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                Published as unreleased / scheduled / exclusive prompt for future release.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSelect(selectedCategory)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <span>{isSubmitting ? 'Publishing...' : 'Confirm & Save'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
