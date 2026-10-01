import React, { useState, useEffect } from 'react';
import type { PromptItem, UserProfile } from '../types/prompt';
import {
  X,
  Copy,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Calendar,
  Sparkles,
  Lock,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { getLabelBadgeClass } from '../utils/labelColors';

interface PromptDetailModalProps {
  item: PromptItem | null;
  onClose: () => void;
  onDelete: (id: string, images?: string[]) => Promise<void>;
  onCopyPrompt: (promptText: string, title: string) => void;
  onSelectLabel?: (label: string) => void;
  userProfile?: UserProfile | null;
  onOpenSecurityModal?: () => void;
  onToggleUsed?: (id: string, isUsed: boolean) => void;
  onToggleEnableTracking?: (id: string, enable: boolean) => void;
}

export const PromptDetailModal: React.FC<PromptDetailModalProps> = ({
  item,
  onClose,
  onDelete,
  onCopyPrompt,
  onSelectLabel,
  userProfile,
  onOpenSecurityModal,
  onToggleUsed,
  onToggleEnableTracking,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [securityInput, setSecurityInput] = useState('');
  const [showDeleteAnswer, setShowDeleteAnswer] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reset state when opening different prompts
  useEffect(() => {
    setCurrentImageIndex(0);
    setCopied(false);
    setShowConfirmDelete(false);
    setSecurityInput('');
    setShowDeleteAnswer(false);
    setDeleteError(null);
  }, [item?.id]);

  // Close on Escape key
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, isDeleting, onClose]);

  if (!item) return null;

  const images = item.images && item.images.length > 0 ? item.images : [];
  const totalImages = images.length;

  const handleCopy = async () => {
    const success = await copyToClipboard(item.prompt);
    if (success) {
      setCopied(true);
      onCopyPrompt(item.prompt, item.title);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await onDelete(item.id, item.images);
      onClose();
    } catch (err: unknown) {
      console.error('Delete prompt failed:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete prompt');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSecurityDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.securityAnswer) return;

    if (securityInput.trim().toLowerCase() !== userProfile.securityAnswer.trim().toLowerCase()) {
      setDeleteError('Incorrect secret answer. Prompt cannot be deleted.');
      return;
    }

    await handleDelete();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div data-lenis-prevent className="relative w-full max-w-4xl bg-white rounded-[36px] shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col md:flex-row border border-zinc-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Close details"
          className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-zinc-100/90 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Column: 9:16 Image Display / Gallery */}
        <div className="w-full md:w-1/2 bg-zinc-950 flex flex-col items-center justify-center relative min-h-[380px] md:min-h-[560px] p-4">
          <div className="relative aspect-9-16 w-full max-w-[320px] rounded-[24px] overflow-hidden shadow-2xl border border-white/10 bg-zinc-900 flex items-center justify-center">
            {totalImages > 0 ? (
              <img
                src={images[currentImageIndex]}
                alt={item.title}
                className="w-full h-full object-cover select-none"
              />
            ) : (
              <div className="text-center p-6 text-zinc-500">
                <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-400" />
                <p className="text-xs">No image attached</p>
              </div>
            )}

            {/* Total Images Indicator */}
            {totalImages > 1 && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold">
                <Layers className="w-3 h-3" />
                <span>
                  {currentImageIndex + 1}/{totalImages}
                </span>
              </div>
            )}

            {/* Arrows for multi-image navigation */}
            {totalImages > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages)
                  }
                  aria-label="Previous image"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev + 1) % totalImages)
                  }
                  aria-label="Next image"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails row if multiple images */}
          {totalImages > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto max-w-full px-2 py-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === currentImageIndex
                      ? 'border-white scale-105 shadow-md'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Prompt Details & Action Buttons */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto bg-white">
          <div className="space-y-4">
            {/* Meta Row: Date */}
            <div className="flex items-center text-xs text-zinc-400 font-medium pr-10">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
              </span>
            </div>

            {/* Title */}
            <div>
              <h1 id="prompt-detail-title" className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                {item.title}
              </h1>
              {item.description && (
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed font-normal">
                  {item.description}
                </p>
              )}
            </div>

            {/* Social Upload Status Banner */}
            {item.enableCheckmark ? (
              item.isUsed ? (
                /* Completed State (Green) - One-way: once used, stays completed */
                <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-950">Uploaded & Used</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                          Yes
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700/90 mt-0.5">
                        This prompt has been posted to Instagram.
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-white/80 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Completed</span>
                  </div>
                </div>
              ) : (
                /* Pending State (Red) - Tap button to mark as Used (Yes) */
                <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200/90 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-3 w-3 shrink-0 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-xs" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-950">Pending Upload</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                          No
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700/90 mt-0.5">
                        Rough prompt not posted on Instagram yet.
                      </p>
                    </div>
                  </div>

                  {onToggleUsed && (
                    <button
                      onClick={() => onToggleUsed(item.id, true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Used (Yes)</span>
                    </button>
                  )}
                </div>
              )
            ) : (
              /* Option to enable tracking for existing prompts */
              onToggleEnableTracking && (
                <div className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900">Social Status Tracking</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Track whether this prompt is pending or uploaded to Instagram.
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleEnableTracking(item.id, true)}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    + Enable Tracking
                  </button>
                </div>
              )
            )}

            {/* Labels / Tags */}
            {item.labels && item.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.labels.map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => {
                      onSelectLabel?.(lbl);
                      onClose();
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${getLabelBadgeClass(
                      lbl,
                      'card'
                    )}`}
                  >
                    #{lbl}
                  </button>
                ))}
              </div>
            )}

            {/* Full AI Prompt Box */}
            <div className="mt-4 pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                  Full Prompt Text
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {item.prompt.length} chars
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-100 font-mono text-xs sm:text-sm leading-relaxed border border-zinc-800 shadow-inner relative select-text max-h-48 overflow-y-auto">
                <p className="whitespace-pre-wrap">{item.prompt}</p>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-6 mt-6 border-t border-zinc-100">
            {showConfirmDelete ? (
              userProfile?.securityQuestion && userProfile?.securityAnswer ? (
                /* Delete Protected with Secret Question / PIN */
                <form onSubmit={handleSecurityDelete} className="p-4 bg-rose-50/90 rounded-2xl border border-rose-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                    <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Security Check: {userProfile.securityQuestion}</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showDeleteAnswer ? 'text' : 'password'}
                      value={securityInput}
                      onChange={(e) => {
                        setSecurityInput(e.target.value);
                        setDeleteError(null);
                      }}
                      placeholder="Type your secret answer to delete"
                      autoFocus
                      disabled={isDeleting}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-rose-200 text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeleteAnswer(!showDeleteAnswer)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 cursor-pointer"
                      title={showDeleteAnswer ? 'Hide answer' : 'Show answer'}
                    >
                      {showDeleteAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {deleteError && (
                    <p className="text-[11px] font-bold text-rose-600">{deleteError}</p>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirmDelete(false);
                        setSecurityInput('');
                        setDeleteError(null);
                        setShowDeleteAnswer(false);
                      }}
                      disabled={isDeleting}
                      className="px-3.5 py-2 rounded-xl bg-white text-zinc-700 text-xs font-bold border border-zinc-200 hover:bg-zinc-50 cursor-pointer disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!securityInput.trim() || isDeleting}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeleting ? 'Deleting...' : 'Verify & Delete'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Protection not configured yet */
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Delete Protection Recommended</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed font-normal">
                    Set up a secret question in settings to protect prompts from accidental deletion.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-zinc-700 text-xs font-bold border border-zinc-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirmDelete(false);
                        onOpenSecurityModal?.();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
                    >
                      Set Up Protection
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Anyway'}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                      : 'bg-zinc-900 hover:bg-black text-white active:scale-98'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 opacity-80" />
                      <span>Copy Full Prompt</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="p-3 rounded-2xl bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 text-zinc-500 transition-colors cursor-pointer"
                  title="Delete prompt"
                  aria-label="Delete prompt"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
