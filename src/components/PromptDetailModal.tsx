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
  ListOrdered,
  Maximize2,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { getLabelBadgeClass } from '../utils/labelColors';
import { ImagePreviewModal } from './ImagePreviewModal';

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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

        {/* Left Column: Original Aspect Ratio Image Gallery (Uncropped) */}
        <div className="w-full md:w-1/2 bg-zinc-950 flex flex-col items-center justify-center relative p-3 sm:p-5 md:p-6 min-h-[260px] md:min-h-[520px] select-none">
          <div className="relative w-full max-w-[420px] max-h-[48vh] md:max-h-[70vh] flex items-center justify-center rounded-[20px] md:rounded-[24px] overflow-hidden bg-zinc-900/90 border border-white/10 shadow-2xl p-1 md:p-1.5">
            {totalImages > 0 ? (
              <div
                onClick={() => setIsPreviewOpen(true)}
                className="relative w-full h-full flex items-center justify-center cursor-zoom-in group/img"
                title="Click to preview full-screen"
              >
                <img
                  src={images[currentImageIndex]}
                  alt={item.title}
                  className="w-auto h-auto max-w-full max-h-[46vh] md:max-h-[68vh] object-contain select-none rounded-xl group-hover/img:scale-[1.01] transition-transform duration-200"
                />

                {/* Click to Preview Indicator Badge */}
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 hover:bg-black/90 text-white text-[10px] font-bold backdrop-blur-md opacity-85 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity shadow-sm pointer-events-none">
                  <Maximize2 className="w-3 h-3" />
                  <span>Full Preview</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-zinc-500">
                <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-400" />
                <p className="text-xs">No image attached</p>
              </div>
            )}

            {/* Total Images Indicator */}
            {totalImages > 1 && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold pointer-events-none shadow-md">
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
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev + 1) % totalImages)
                  }
                  aria-label="Next image"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
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
                  className={`w-12 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
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
              {item.description && (() => {
                const lines = item.description.split('\n').map((l) => l.trim()).filter(Boolean);
                const isStepList = lines.length > 1 && lines.every((l) => /^(\d+[\.\)]|[-•*])\s+/.test(l));

                if (isStepList) {
                  return (
                    <div className="mt-3 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 uppercase tracking-wider">
                        <ListOrdered className="w-3.5 h-3.5 text-zinc-700" />
                        <span>Steps / How to Use</span>
                      </div>
                      <div className="space-y-1.5 pt-0.5">
                        {lines.map((line, idx) => {
                          const cleanText = line.replace(/^(\d+[\.\)]|[-•*])\s+/, '');
                          return (
                            <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 font-medium">
                              <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed flex-1 pt-0.5">{cleanText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return (
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed font-normal whitespace-pre-line">
                    {item.description}
                  </p>
                );
              })()}
            </div>

            {/* Social Upload Status Banner */}
            {item.enableCheckmark ? (
              item.isUsed ? (
                /* Completed State (Green) - One-way: once used, stays completed */
                <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-950">Uploaded & Used</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300/60">
                          Yes
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700/90 mt-0.5 leading-tight">
                        This prompt has been posted to Instagram.
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/90 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span>Completed</span>
                  </div>
                </div>
              ) : (
                /* Pending State (Red) - Tap button to mark as Used (Yes) */
                <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50/90 border border-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-3 w-3 shrink-0 ml-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-xs" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-950">Pending Upload</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-900 border border-rose-300/60">
                          No
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700/90 mt-0.5 leading-tight">
                        Rough prompt not posted on Instagram yet.
                      </p>
                    </div>
                  </div>

                  {onToggleUsed && (
                    <button
                      onClick={() => onToggleUsed(item.id, true)}
                      className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Mark Used (Yes)</span>
                    </button>
                  )}
                </div>
              )
            ) : (
              /* Option to enable tracking for existing prompts */
              onToggleEnableTracking && (
                <div className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-900">Social Status Tracking</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                      Track whether this prompt is pending or uploaded to Instagram.
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleEnableTracking(item.id, true)}
                    className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
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

      {/* Full-screen Lightbox Image Preview Modal */}
      <ImagePreviewModal
        isOpen={isPreviewOpen}
        images={images}
        initialIndex={currentImageIndex}
        title={item.title}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
