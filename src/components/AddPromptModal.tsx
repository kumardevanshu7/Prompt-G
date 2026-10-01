import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Plus, Trash2, Sparkles, Tag, AlertCircle, Link, Loader2 } from 'lucide-react';
import type { PromptItem } from '../types/prompt';
import type { UploadableImage } from '../services/db';
import { compressImage } from '../utils/imageCompressor';
import { getLabelBadgeClass } from '../utils/labelColors';

export interface PicItem {
  id: string;
  src: string; // Blob ObjectURL or https URL
  file?: File;
}

interface AddPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    promptData: Omit<PromptItem, 'id' | 'created_at' | 'images'>,
    images: UploadableImage[],
    onProgress?: (current: number, total: number) => void
  ) => Promise<void>;
  existingLabels?: string[];
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 10;

export const AddPromptModal: React.FC<AddPromptModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingLabels = [],
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [pics, setPics] = useState<PicItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [currentLabelInput, setCurrentLabelInput] = useState('');
  const [enableCheckmark, setEnableCheckmark] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const picsRef = useRef<PicItem[]>([]);
  picsRef.current = pics;

  // Cleanup blob URLs to prevent memory leaks
  const cleanupBlobs = useCallback((items: PicItem[]) => {
    items.forEach((item) => {
      if (item.file && item.src.startsWith('blob:')) {
        URL.revokeObjectURL(item.src);
      }
    });
  }, []);

  // Reset form completely
  const resetForm = useCallback(() => {
    cleanupBlobs(picsRef.current);
    setTitle('');
    setDescription('');
    setPrompt('');
    setPics([]);
    setUrlInput('');
    setLabels([]);
    setCurrentLabelInput('');
    setEnableCheckmark(false);
    setError(null);
    setUploadProgress(null);
  }, [cleanupBlobs]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    if (isSubmitting) return; // Prevent closing while upload in progress
    resetForm();
    onClose();
  }, [isSubmitting, resetForm, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleModalClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, handleModalClose]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      cleanupBlobs(picsRef.current);
    };
  }, [cleanupBlobs]);

  if (!isOpen) return null;

  // Handle file selection with limits and compression
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incomingFiles = Array.from(e.target.files);
    if (incomingFiles.length === 0) return;

    setError(null);

    // Check count limit
    const availableSlots = MAX_IMAGES - pics.length;
    if (availableSlots <= 0) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const filesToProcess = incomingFiles.slice(0, availableSlots);
    if (incomingFiles.length > availableSlots) {
      setError(`Only ${availableSlots} more image(s) could be added (max ${MAX_IMAGES}).`);
    }

    const newPics: PicItem[] = [];

    for (const file of filesToProcess) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not a supported image file.`);
        continue;
      }

      // Validate size (10MB max)
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
        continue;
      }

      try {
        // Compress image before creating preview/uploading
        const compressed = await compressImage(file);
        const objectUrl = URL.createObjectURL(compressed);
        newPics.push({
          id: crypto.randomUUID(),
          src: objectUrl,
          file: compressed,
        });
      } catch {
        // Fallback to original file
        const objectUrl = URL.createObjectURL(file);
        newPics.push({
          id: crypto.randomUUID(),
          src: objectUrl,
          file,
        });
      }
    }

    setPics((prev) => [...prev, ...newPics]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add image via validated HTTPS Web URL
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('https://')) {
      setError('Only secure HTTPS image URLs are supported.');
      return;
    }

    if (pics.length >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    setPics((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        src: trimmed,
      },
    ]);
    setUrlInput('');
    setError(null);
  };

  // Remove single image and revoke its blob URL
  const handleRemoveImage = (idToRemove: string) => {
    setPics((prev) => {
      const target = prev.find((p) => p.id === idToRemove);
      if (target?.file && target.src.startsWith('blob:')) {
        URL.revokeObjectURL(target.src);
      }
      return prev.filter((p) => p.id !== idToRemove);
    });
  };

  // Add labels with comma-split and normalization
  const handleAddLabel = () => {
    const raw = currentLabelInput.trim();
    if (!raw) return;

    // Support comma-separated tags ("cyberpunk, neon, anime")
    const parts = raw
      .split(',')
      .map((s) => s.trim().replace(/^#+/, ''))
      .filter((s) => s.length > 0);

    const updated = [...labels];
    parts.forEach((tag) => {
      const lower = tag.toLowerCase();
      if (!updated.some((l) => l.toLowerCase() === lower)) {
        updated.push(tag);
      }
      if (lower === 'instagram' || lower === 'insta') {
        setEnableCheckmark(true);
      }
    });

    setLabels(updated);
    setCurrentLabelInput('');
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddLabel();
    }
  };

  const handleRemoveLabel = (tagToRemove: string) => {
    setLabels(labels.filter((l) => l !== tagToRemove));
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter the prompt text');
      return;
    }
    if (pics.length === 0) {
      setError('Please add at least 1 image (up to 5 supported)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setUploadProgress('Preparing upload...');

      // Transform pics preserving exact sequence
      const uploadableList: UploadableImage[] = pics.map((p) => ({
        file: p.file,
        url: p.file ? undefined : p.src,
      }));

      await onSave(
        {
          title: title.trim(),
          description: description.trim(),
          prompt: prompt.trim(),
          labels: labels.length > 0 ? labels : ['Prompt'],
          enableCheckmark,
          isUsed: false, // Default is "No" (Pending) as requested by user
        },
        uploadableList,
        (current, total) => {
          setUploadProgress(`Uploading image ${current} of ${total}...`);
        }
      );

      // Clean up and close on success
      resetForm();
      onClose();
    } catch (err: unknown) {
      console.error('Error in AddPromptModal onSave:', err);
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleModalClose();
        }
      }}
    >
      <div data-lenis-prevent className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-zinc-100 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-100 bg-[#fbfbf9] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="add-prompt-title" className="text-base font-bold text-zinc-900 leading-tight">
                Add New Prompt
              </h2>
              <p className="text-xs text-zinc-500">Save AI prompt text with up to 5 visual card images</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-zinc-200/70 hover:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Title */}
          <div>
            <label htmlFor="prompt-title" className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="prompt-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cyberpunk Samurai in Neon Rain"
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-base sm:text-sm font-medium transition-all disabled:opacity-60"
            />
          </div>

          {/* 2. Short Description */}
          <div>
            <label htmlFor="prompt-desc" className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Short Description
            </label>
            <input
              id="prompt-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dramatic portrait with volumetric neon lighting and wet reflections..."
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-base sm:text-sm font-medium transition-all disabled:opacity-60"
            />
          </div>

          {/* 3. Prompt (The Core AI text) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="prompt-text" className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Full AI Prompt <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                {prompt.length} characters
              </span>
            </div>
            <textarea
              id="prompt-text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Paste your Midjourney, Flux, Stable Diffusion, or ChatGPT prompt here..."
              disabled={isSubmitting}
              className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-base sm:text-sm font-mono leading-relaxed transition-all resize-none disabled:opacity-60"
            />
          </div>

          {/* 4. Images Section (Ordered list with max 5) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Images (Up to {MAX_IMAGES}) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-zinc-500 font-medium">
                {pics.length} of {MAX_IMAGES} added
              </span>
            </div>

            {/* Visual Previews in 9:16 cards strictly preserving sequence */}
            {pics.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70">
                {pics.map((pic, idx) => (
                  <div key={pic.id} className="relative aspect-9-16 rounded-xl overflow-hidden shadow-sm group border border-zinc-200 bg-zinc-900">
                    <img
                      src={pic.src}
                      alt={`Upload preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                      #{idx + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(pic.id)}
                      disabled={isSubmitting}
                      aria-label={`Remove image ${idx + 1}`}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Area (Disabled if reached MAX_IMAGES) */}
            {pics.length < MAX_IMAGES && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="image-file-input"
                  multiple
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="image-file-input"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-zinc-300 hover:border-zinc-800 bg-[#fbfbf9] hover:bg-zinc-50 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-200/80 flex items-center justify-center text-zinc-700">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-zinc-900">
                      Click to choose images from device
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      JPG, PNG, WebP up to 10MB each (Auto-compressed)
                    </p>
                  </div>
                </label>

                {/* Or paste HTTPS image URL */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Or paste secure HTTPS image URL..."
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-base sm:text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all disabled:opacity-60"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddUrl();
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    disabled={!urlInput.trim() || isSubmitting}
                    className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Checklist / Usage Tracker (Instagram / Socials) */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex -space-x-1 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </span>
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Social Status (🔴 Red / 🟢 Green Dot)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  Instagram / Socials
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">
                Starts with <span className="text-rose-600 font-bold">🔴 Red Dot [Pending / No]</span> and light red card. Tap anytime to mark <span className="text-emerald-600 font-bold">🟢 Green Dot [Used / Yes]</span>.
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={enableCheckmark}
              onClick={() => setEnableCheckmark(!enableCheckmark)}
              disabled={isSubmitting}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enableCheckmark ? 'bg-rose-600' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  enableCheckmark ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 6. Labels / Tags */}
          <div>
            <label htmlFor="prompt-tags" className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Labels / Tags
            </label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  id="prompt-tags"
                  type="text"
                  value={currentLabelInput}
                  onChange={(e) => setCurrentLabelInput(e.target.value)}
                  onKeyDown={handleLabelKeyDown}
                  placeholder="e.g. Instagram, Snap, Portrait (type comma or press Enter)"
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-base sm:text-xs font-medium transition-all disabled:opacity-60"
                />
              </div>
              <button
                type="button"
                onClick={handleAddLabel}
                disabled={!currentLabelInput.trim() || isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Existing tags to quick-select */}
            {existingLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase py-0.5 mr-1">Suggestions:</span>
                {existingLabels.slice(0, 8).map((tag) => {
                  const isPicked = labels.some((l) => l.toLowerCase() === tag.toLowerCase());
                  const pillClass = getLabelBadgeClass(tag, 'pill');
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (!isPicked) {
                          setLabels([...labels, tag]);
                          if (tag.toLowerCase() === 'instagram' || tag.toLowerCase() === 'insta') {
                            setEnableCheckmark(true);
                          }
                        }
                      }}
                      disabled={isSubmitting || isPicked}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors cursor-pointer disabled:opacity-40 ${pillClass}`}
                    >
                      +{tag}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Tags Display */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {labels.map((lbl) => {
                  const tagStyle = getLabelBadgeClass(lbl, 'card');
                  return (
                    <span
                      key={lbl}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs ${tagStyle}`}
                    >
                      #{lbl}
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(lbl)}
                        disabled={isSubmitting}
                        aria-label={`Remove label ${lbl}`}
                        className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
            <div className="text-xs text-zinc-500 font-medium">
              {uploadProgress ? (
                <span className="text-zinc-900 font-semibold flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-800" />
                  {uploadProgress}
                </span>
              ) : (
                <span>* Required fields</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
