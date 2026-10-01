import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Plus, Trash2, Sparkles, Tag, AlertCircle, Link, Loader2, ChevronDown, ListOrdered, AlignLeft } from 'lucide-react';
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
  existingDescriptions?: string[];
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 10;

export const AddPromptModal: React.FC<AddPromptModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingLabels = [],
  existingDescriptions = [],
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descMode, setDescMode] = useState<'text' | 'steps'>('text');
  const [steps, setSteps] = useState<string[]>(['', '']);
  const [showPrevDesc, setShowPrevDesc] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [pics, setPics] = useState<PicItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [currentLabelInput, setCurrentLabelInput] = useState('');
  const [enableCheckmark, setEnableCheckmark] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadPercentage, setUploadPercentage] = useState<number>(0);
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

  // Step builder handlers
  const handleStepChange = (idx: number, val: string) => {
    const updated = [...steps];
    updated[idx] = val;
    setSteps(updated);
    const compiled = updated
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');
    setDescription(compiled);
  };

  const handleAddStep = () => {
    setSteps((prev) => [...prev, '']);
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 1) {
      setSteps(['']);
      setDescription('');
      return;
    }
    const updated = steps.filter((_, i) => i !== idx);
    setSteps(updated);
    const compiled = updated
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');
    setDescription(compiled);
  };

  const switchToStepsMode = () => {
    setDescMode('steps');
    if (description.trim()) {
      const lines = description
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const parsed = lines.map((l) => l.replace(/^(\d+[\.\)]|[-•*])\s+/, ''));
      if (parsed.length > 0) {
        setSteps(parsed);
        return;
      }
    }
    if (steps.length === 0 || (steps.length === 1 && !steps[0])) {
      setSteps(['', '']);
    }
  };

  const switchToTextMode = () => {
    setDescMode('text');
  };

  // Reset form completely
  const resetForm = useCallback(() => {
    cleanupBlobs(picsRef.current);
    setTitle('');
    setDescription('');
    setDescMode('text');
    setSteps(['', '']);
    setPrompt('');
    setPics([]);
    setUrlInput('');
    setLabels([]);
    setCurrentLabelInput('');
    setEnableCheckmark(false);
    setShowPrevDesc(false);
    setError(null);
    setUploadProgress(null);
    setUploadPercentage(0);
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
      setUploadPercentage(15);

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
          const pct = total > 0 ? Math.round(15 + (current / total) * 75) : 80;
          setUploadPercentage(pct);
          setUploadProgress(`Image ${current} of ${total}`);
        }
      );

      setUploadPercentage(100);
      setUploadProgress('Saved successfully!');

      // Clean up and close on success
      resetForm();
      onClose();
    } catch (err: unknown) {
      console.error('Error in AddPromptModal onSave:', err);
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
      setUploadPercentage(0);
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
            <img
              src="/apple-touch-icon.png"
              alt="Prompt G"
              className="w-8 h-8 rounded-xl shadow-xs object-cover border border-zinc-200/80"
            />
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

          {/* 2. Short Description OR Steps (Points) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-2">
                <label htmlFor="prompt-desc" className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  {descMode === 'steps' ? 'Steps (How to Use)' : 'Short Description'}
                </label>

                {/* Mode Switcher: Paragraph vs Steps */}
                <div className="flex items-center p-0.5 rounded-lg bg-zinc-200/80 border border-zinc-300/70 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={switchToTextMode}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      descMode === 'text'
                        ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <AlignLeft className="w-3 h-3" />
                    <span>Paragraph</span>
                  </button>
                  <button
                    type="button"
                    onClick={switchToStepsMode}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      descMode === 'steps'
                        ? 'bg-zinc-900 text-white shadow-2xs font-bold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <ListOrdered className="w-3 h-3" />
                    <span>Steps (Points)</span>
                  </button>
                </div>
              </div>

              {existingDescriptions && existingDescriptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPrevDesc(!showPrevDesc)}
                  disabled={isSubmitting}
                  className="self-start sm:self-auto text-[11px] font-semibold text-zinc-600 hover:text-zinc-950 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Previous ({existingDescriptions.length})</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showPrevDesc ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Mode 1: Paragraph / Text */}
            {descMode === 'text' ? (
              <textarea
                id="prompt-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dramatic portrait with volumetric neon lighting and wet reflections..."
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-base sm:text-sm font-medium transition-all disabled:opacity-60 resize-none"
              />
            ) : (
              /* Mode 2: Step-by-Step Points */
              <div className="space-y-2 p-3 rounded-2xl bg-zinc-50/80 border border-zinc-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block px-0.5">
                  Enter step-by-step instructions on how to use this prompt:
                </span>
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(idx, e.target.value)}
                      placeholder={
                        idx === 0
                          ? 'e.g. Open Midjourney or ChatGPT'
                          : idx === 1
                          ? 'e.g. Paste prompt and attach reference image'
                          : idx === 2
                          ? 'e.g. Set aspect ratio --ar 9:16 and generate'
                          : `Step ${idx + 1}...`
                      }
                      disabled={isSubmitting}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm font-medium transition-all disabled:opacity-60"
                    />
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleAddStep}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-200/80 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {steps.filter((s) => s.trim()).length} step(s) ready
                  </span>
                </div>
              </div>
            )}

            {/* Quick dropdown/chips of previous descriptions */}
            {showPrevDesc && existingDescriptions && existingDescriptions.length > 0 && (
              <div className="mt-2 p-3 rounded-2xl bg-zinc-100/95 border border-zinc-200/90 max-h-48 overflow-y-auto space-y-1.5 animate-in fade-in duration-150 shadow-inner">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block px-0.5">
                  Tap to reuse previous description or steps:
                </span>
                <div className="flex flex-col gap-1.5">
                  {existingDescriptions.map((desc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDescription(desc);
                        setShowPrevDesc(false);
                        const lines = desc.split('\n').map((l) => l.trim()).filter(Boolean);
                        const isSteps = lines.length > 1 && lines.every((l) => /^(\d+[\.\)]|[-•*])\s+/.test(l));
                        if (isSteps) {
                          setDescMode('steps');
                          setSteps(lines.map((l) => l.replace(/^(\d+[\.\)]|[-•*])\s+/, '')));
                        } else {
                          setDescMode('text');
                        }
                      }}
                      className="text-left text-xs bg-white hover:bg-zinc-900 hover:text-white text-zinc-800 px-3.5 py-2 rounded-xl border border-zinc-200/90 transition-all cursor-pointer truncate shadow-2xs font-normal"
                      title={desc}
                    >
                      {desc}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

          {/* 5. Instagram / Social Tracking Option */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs shrink-0" />
                <span className="text-xs font-bold text-zinc-900">
                  Track Instagram Upload Status
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">
                Starts with <span className="text-rose-600 font-semibold">🔴 Red Dot (Pending)</span> on card. Tap anytime to mark <span className="text-emerald-600 font-semibold">🟢 Green Dot (Used)</span>.
              </p>
            </div>

            {/* Clean Toggle Switch */}
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
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
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
          <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Progress / Status on Left */}
            <div className="min-w-0 flex-1">
              {isSubmitting ? (
                <div className="flex flex-col gap-1.5 max-w-full sm:max-w-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-800">
                    <span className="flex items-center gap-1.5 truncate">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900 shrink-0" />
                      <span className="truncate">{uploadProgress || 'Saving prompt...'}</span>
                    </span>
                    <span className="text-xs font-bold text-zinc-900 ml-2 font-mono shrink-0">
                      {uploadPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                      style={{ width: `${uploadPercentage}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className="text-xs text-zinc-400 font-medium hidden sm:inline">* Required fields</span>
              )}
            </div>

            {/* Buttons on Right */}
            <div className="flex items-center gap-2.5 justify-end shrink-0">
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
                className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving ({uploadPercentage}%)</span>
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
