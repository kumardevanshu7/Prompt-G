import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PromptItem, UserProfile } from '../types/prompt';
import type { UploadableImage } from '../services/db';
import {
  ArrowLeft,
  Edit3,
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
  ShieldCheck,
  Eye,
  EyeOff,
  ListOrdered,
  AlignLeft,
  Maximize2,
  Plus,
  Upload,
  Loader2,
  Tag,
  AlertCircle,
  KeyRound,
  X,
  ChevronDown,
  Cpu,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { getLabelBadgeClass, getLabelIcon } from '../utils/labelColors';
import { compressImage, isHeicFile } from '../utils/imageCompressor';
import { ImagePreviewModal } from './ImagePreviewModal';

export interface EditPicItem {
  id: string;
  src: string;
  file?: File;
  isExisting?: boolean;
}

interface PromptDetailModalProps {
  item: PromptItem | null;
  onClose: () => void;
  onDelete: (id: string, images?: string[]) => Promise<void>;
  onUpdatePrompt?: (
    id: string,
    updates: Partial<Omit<PromptItem, 'id' | 'created_at'>>,
    imagesToProcess?: UploadableImage[],
    oldImageUrls?: string[],
    onProgress?: (current: number, total: number) => void
  ) => Promise<void>;
  onCopyPrompt: (promptText: string, title: string) => void;
  onSelectLabel?: (label: string) => void;
  userProfile?: UserProfile | null;
  onOpenSecurityModal?: () => void;
  onToggleUsed?: (id: string, isUsed: boolean) => void;
  onToggleEnableTracking?: (id: string, enable: boolean) => void;
  existingLabels?: string[];
  existingDescriptions?: string[];
}

const MAX_IMAGES = 5;

export const PromptDetailModal: React.FC<PromptDetailModalProps> = ({
  item,
  onClose,
  onDelete,
  onUpdatePrompt,
  onCopyPrompt,
  onSelectLabel,
  userProfile,
  onOpenSecurityModal,
  onToggleUsed,
  onToggleEnableTracking,
  existingLabels = [],
  existingDescriptions = [],
}) => {
  // Gallery & View State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Delete State
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteSecurityInput, setDeleteSecurityInput] = useState('');
  const [showDeleteAnswer, setShowDeleteAnswer] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit Security & Edit Mode State
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showEditAuthModal, setShowEditAuthModal] = useState(false);
  const [editSecurityInput, setEditSecurityInput] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSecurityError, setEditSecurityError] = useState<string | null>(null);

  // Edit Form Fields
  const [editTitle, setEditTitle] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDescMode, setEditDescMode] = useState<'text' | 'steps'>('text');
  const [editSteps, setEditSteps] = useState<string[]>(['', '']);
  const [showEditPrevDesc, setShowEditPrevDesc] = useState(false);
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [editCurrentLabelInput, setEditCurrentLabelInput] = useState('');
  const [editEnableCheckmark, setEditEnableCheckmark] = useState(false);
  const [editIsUsed, setEditIsUsed] = useState(false);
  const [editPublishCategory, setEditPublishCategory] = useState<'direct' | 'unreleased'>('direct');

  // Model & Bypass difficulty edit state
  const DEFAULT_MODELS = ['Nano Pro', 'Nano 2.1', 'Both'];
  const [customModels, setCustomModels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('promptg_custom_models');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [editModelUsed, setEditModelUsed] = useState<string>('Nano Pro');
  const [isAddingModel, setIsAddingModel] = useState<boolean>(false);
  const [newModelInput, setNewModelInput] = useState<string>('');
  const [editModelBypass, setEditModelBypass] = useState<Record<string, 'easily_pass' | 'difficult_to_bypass'>>({
    'Nano Pro': 'easily_pass',
    'Nano 2.1': 'easily_pass',
  });

  const [editPics, setEditPics] = useState<EditPicItem[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editPicsRef = useRef<EditPicItem[]>([]);
  editPicsRef.current = editPics;

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      editPicsRef.current.forEach((p) => {
        if (p.file && p.src.startsWith('blob:')) {
          URL.revokeObjectURL(p.src);
        }
      });
    };
  }, []);

  // Reset states when item changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setCopied(false);
    setShowConfirmDelete(false);
    setDeleteSecurityInput('');
    setShowDeleteAnswer(false);
    setDeleteError(null);
    setIsEditingMode(false);
    setShowEditAuthModal(false);
    setEditSecurityInput('');
    setEditSecurityError(null);
  }, [item?.id]);

  // Sync edit form fields when entering edit mode or item changes
  const initEditForm = useCallback((promptItem: PromptItem) => {
    setEditTitle(promptItem.title || '');
    setEditPrompt(promptItem.prompt || '');
    setEditLabels(promptItem.labels || []);
    setEditEnableCheckmark(Boolean(promptItem.enableCheckmark));
    setEditIsUsed(Boolean(promptItem.isUsed));
    setEditPublishCategory(promptItem.publishCategory || 'direct');
    setEditModelUsed(promptItem.modelUsed || 'Nano Pro');
    setEditModelBypass(
      promptItem.modelBypass || {
        'Nano Pro': 'easily_pass',
        'Nano 2.1': 'easily_pass',
      }
    );

    const rawDesc = promptItem.description || '';
    setEditDescription(rawDesc);

    // Auto-detect if description is in numbered / bullet steps format
    const lines = rawDesc.split('\n').map((l) => l.trim()).filter(Boolean);
    const isStepList = lines.length > 1 && lines.every((l) => /^(\d+[\.\)]|[-•*])\s+/.test(l));
    if (isStepList) {
      setEditDescMode('steps');
      setEditSteps(lines.map((l) => l.replace(/^(\d+[\.\)]|[-•*])\s+/, '')));
    } else {
      setEditDescMode('text');
      setEditSteps(lines.length > 0 ? lines : ['', '']);
    }

    // Initialize pics with existing URLs
    const initialPics: EditPicItem[] = (promptItem.images || []).map((url, i) => ({
      id: `existing-${i}-${Date.now()}`,
      src: url,
      isExisting: true,
    }));
    setEditPics(initialPics);
    setEditError(null);
  }, []);

  // Close on Escape key (if not actively deleting or saving)
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting && !isSavingEdit) {
        if (isPreviewOpen) {
          setIsPreviewOpen(false);
          return;
        }
        if (showEditAuthModal) {
          setShowEditAuthModal(false);
        } else if (isEditingMode) {
          setIsEditingMode(false);
        } else if (showConfirmDelete) {
          setShowConfirmDelete(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, isDeleting, isSavingEdit, isPreviewOpen, showEditAuthModal, isEditingMode, showConfirmDelete, onClose]);

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

  // ── Delete Handlers ──
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

    if (deleteSecurityInput.trim().toLowerCase() !== userProfile.securityAnswer.trim().toLowerCase()) {
      setDeleteError('Incorrect secret answer. Prompt cannot be deleted.');
      return;
    }

    await handleDelete();
  };

  // ── Edit Security Verification ──
  const handleTriggerEdit = () => {
    // If security passkey is configured, require one-time password check
    if (userProfile?.securityQuestion && userProfile?.securityAnswer) {
      setEditSecurityInput('');
      setEditSecurityError(null);
      setShowEditAuthModal(true);
    } else {
      // No security protection set up yet, enter edit mode directly
      initEditForm(item);
      setIsEditingMode(true);
    }
  };

  const handleVerifyEditPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.securityAnswer) return;

    if (editSecurityInput.trim().toLowerCase() !== userProfile.securityAnswer.trim().toLowerCase()) {
      setEditSecurityError('Incorrect security password / passkey! Verification failed.');
      return;
    }

    setShowEditAuthModal(false);
    initEditForm(item);
    setIsEditingMode(true);
  };

  // ── Edit Form Logic ──
  const handleEditStepChange = (idx: number, val: string) => {
    const updated = [...editSteps];
    updated[idx] = val;
    setEditSteps(updated);
    const compiled = updated
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');
    setEditDescription(compiled);
  };

  const handleAddEditStep = () => {
    setEditSteps((prev) => [...prev, '']);
  };

  const handleRemoveEditStep = (idx: number) => {
    if (editSteps.length <= 1) {
      setEditSteps(['']);
      setEditDescription('');
      return;
    }
    const updated = editSteps.filter((_, i) => i !== idx);
    setEditSteps(updated);
    const compiled = updated
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');
    setEditDescription(compiled);
  };

  const switchToStepsMode = () => {
    setEditDescMode('steps');
    if (editDescription.trim()) {
      const lines = editDescription.split('\n').map((l) => l.trim()).filter(Boolean);
      const cleaned = lines.map((l) => l.replace(/^(\d+[\.\)]|[-•*])\s+/, ''));
      setEditSteps(cleaned.length > 0 ? cleaned : ['', '']);
    } else {
      setEditSteps(['', '']);
    }
  };

  const switchToTextMode = () => {
    setEditDescMode('text');
  };

  const cleanupEditBlobs = useCallback((picsList: EditPicItem[]) => {
    picsList.forEach((p) => {
      if (p.file && p.src.startsWith('blob:')) {
        URL.revokeObjectURL(p.src);
      }
    });
  }, []);

  const handleAddEditLabel = () => {
    const raw = editCurrentLabelInput.trim();
    if (!raw) return;

    const parts = raw
      .split(',')
      .map((s) => s.trim().replace(/^#+/, ''))
      .filter((s) => s.length > 0);

    const updated = [...editLabels];
    parts.forEach((tag) => {
      const lower = tag.toLowerCase();
      if (!updated.some((l) => l.toLowerCase() === lower)) {
        updated.push(tag);
      }
    });

    setEditLabels(updated);
    setEditCurrentLabelInput('');
  };

  const handleRemoveEditLabel = (lblToRemove: string) => {
    setEditLabels(editLabels.filter((l) => l !== lblToRemove));
  };

  const handleAddCustomModel = () => {
    const trimmed = newModelInput.trim();
    if (!trimmed) return;
    if (!DEFAULT_MODELS.includes(trimmed) && !customModels.includes(trimmed)) {
      const updated = [...customModels, trimmed];
      setCustomModels(updated);
      try {
        localStorage.setItem('promptg_custom_models', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save custom model:', err);
      }
    }
    setEditModelUsed(trimmed);
    setIsAddingModel(false);
    setNewModelInput('');
  };

  const handleSetEditBypass = (modelName: string, difficulty: 'easily_pass' | 'difficult_to_bypass') => {
    setEditModelBypass((prev) => ({
      ...prev,
      [modelName]: difficulty,
    }));
  };

  const MAX_RAW_FILE_SIZE_MB = 25;
  const MAX_FINAL_FILE_SIZE_MB = 10;

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const remainingSlots = MAX_IMAGES - editPics.length;

    if (remainingSlots <= 0) {
      setEditError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    const filesToProcess = selectedFiles.slice(0, remainingSlots);
    const newItems: EditPicItem[] = [];

    for (const file of filesToProcess) {
      // 1. Detect and cleanly reject unsupported iPhone HEIC/HEIF files
      if (isHeicFile(file)) {
        setEditError(`"${file.name}" is an iPhone HEIC/HEIF photo. Browsers cannot decode raw HEIC photos. Please choose a JPG, PNG, or WebP photo.`);
        continue;
      }

      // 2. Validate file type
      if (!file.type.startsWith('image/')) {
        setEditError(`"${file.name}" is not a supported image file.`);
        continue;
      }

      // 3. Validate raw file size before compression (up to 25MB)
      if (file.size > MAX_RAW_FILE_SIZE_MB * 1024 * 1024) {
        setEditError(`"${file.name}" exceeds the ${MAX_RAW_FILE_SIZE_MB}MB raw file limit.`);
        continue;
      }

      try {
        const compressed = await compressImage(file);

        // 4. Validate post-compression size (must fit within 10MB)
        if (compressed.size > MAX_FINAL_FILE_SIZE_MB * 1024 * 1024) {
          setEditError(`"${file.name}" exceeds ${MAX_FINAL_FILE_SIZE_MB}MB even after compression.`);
          continue;
        }

        const objUrl = URL.createObjectURL(compressed);
        newItems.push({
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          src: objUrl,
          file: compressed,
          isExisting: false,
        });
      } catch (err) {
        console.error('Failed to compress image:', err);
        if (file.size > MAX_FINAL_FILE_SIZE_MB * 1024 * 1024) {
          setEditError(`"${file.name}" exceeds the ${MAX_FINAL_FILE_SIZE_MB}MB size limit.`);
          continue;
        }
        const objUrl = URL.createObjectURL(file);
        newItems.push({
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          src: objUrl,
          file,
          isExisting: false,
        });
      }
    }

    setEditPics((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePic = (idToRemove: string) => {
    setEditPics((prev) => {
      const removed = prev.find((p) => p.id === idToRemove);
      if (removed?.file && removed.src.startsWith('blob:')) {
        URL.revokeObjectURL(removed.src);
      }
      return prev.filter((p) => p.id !== idToRemove);
    });
  };

  const handleCancelEdit = () => {
    cleanupEditBlobs(editPics);
    setIsEditingMode(false);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setEditError('Title is required');
      return;
    }
    if (!editPrompt.trim()) {
      setEditError('Prompt text is required');
      return;
    }
    if (editPics.length === 0) {
      setEditError('Please keep at least 1 image.');
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);
      setSaveProgress('Updating prompt...');

      const uploadableImages: UploadableImage[] = editPics.map((p) => ({
        file: p.file,
        url: p.file ? undefined : p.src,
      }));

      let finalLabels = [...editLabels];
      if (editEnableCheckmark && editIsUsed) {
        if (editPublishCategory === 'unreleased') {
          if (!finalLabels.some((l) => l.toLowerCase() === 'unreleased')) {
            finalLabels.push('unreleased');
          }
        } else if (editPublishCategory === 'direct') {
          finalLabels = finalLabels.filter((l) => l.toLowerCase() !== 'unreleased');
        }
      }

      if (onUpdatePrompt) {
        await onUpdatePrompt(
          item.id,
          {
            title: editTitle.trim(),
            description: editDescription.trim(),
            prompt: editPrompt.trim(),
            labels: finalLabels,
            enableCheckmark: editEnableCheckmark,
            isUsed: editEnableCheckmark ? editIsUsed : false,
            publishCategory: editEnableCheckmark && editIsUsed ? editPublishCategory : (null as any),
            modelUsed: editModelUsed,
            modelBypass: editModelBypass,
          },
          uploadableImages,
          item.images || [],
          (current, total) => {
            setSaveProgress(`Uploading images (${current}/${total})...`);
          }
        );
      }

      setIsEditingMode(false);
    } catch (err: unknown) {
      console.error('Failed to update prompt:', err);
      setEditError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSavingEdit(false);
      setSaveProgress(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-detail-title"
      data-lenis-prevent
      className="fixed inset-0 z-50 bg-[#fbfbf9] overflow-y-auto overscroll-contain h-[100dvh] w-full flex flex-col select-auto animate-in fade-in duration-200"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* ── Top Page Navigation Bar ── */}
      <header className="sticky top-0 z-30 bg-[#fbfbf9]/95 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-xs">
        {/* Left: Back to Prompts Page Button */}
        <button
          onClick={onClose}
          disabled={isDeleting || isSavingEdit}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-zinc-200/90 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-800 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          title="Back to Prompts"
          aria-label="Back to Prompts"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-700" />
          <span>Back</span>
        </button>

        {/* Center: Breadcrumb / View Title */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-zinc-500 truncate max-w-xs md:max-w-md">
          <span className="flex items-center gap-1.5 text-zinc-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Prompt Details
          </span>
          <span>/</span>
          <span className="text-zinc-950 font-bold truncate">{item.title}</span>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {!isEditingMode ? (
            <>
              {/* Edit Button */}
              <button
                onClick={handleTriggerEdit}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 hover:bg-black active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="Edit this prompt"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                <span>Edit</span>
              </button>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800'
                }`}
                title="Copy prompt text"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-zinc-600" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Delete Trigger */}
              <button
                onClick={() => setShowConfirmDelete(true)}
                disabled={isDeleting}
                className="p-2 rounded-full bg-white border border-zinc-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-zinc-600 transition-colors cursor-pointer disabled:opacity-50"
                title="Delete prompt"
                aria-label="Delete prompt"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Cancel Edit */}
              <button
                onClick={handleCancelEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-full bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              {/* Save Changes */}
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Main Page Content ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {isEditingMode ? (
          /* ========================================================= */
          /*                     EDIT MODE FORM                         */
          /* ========================================================= */
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-zinc-200/90 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-zinc-900">Edit Prompt</h2>
                  <p className="text-xs text-zinc-500">Update prompt details, instructions, tags, and images</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>

            {editError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{editError}</span>
              </div>
            )}

            {saveProgress && (
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                <span>{saveProgress}</span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Cyberpunk Neon Portrait"
                className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-sm font-semibold transition-all"
              />
            </div>

            {/* Description / Steps Mode Switcher */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Description / Instructions
                </label>
                <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/80">
                  <button
                    type="button"
                    onClick={switchToTextMode}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      editDescMode === 'text'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <AlignLeft className="w-3 h-3" />
                    <span>Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={switchToStepsMode}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      editDescMode === 'steps'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <ListOrdered className="w-3 h-3" />
                    <span>Steps</span>
                  </button>
                </div>
              </div>

              {/* Previous Descriptions Suggestion Picker */}
              {existingDescriptions.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEditPrevDesc(!showEditPrevDesc)}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 font-semibold cursor-pointer py-0.5"
                  >
                    <span>Use previous description</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showEditPrevDesc && (
                    <div className="absolute left-0 top-full mt-1 w-full max-h-48 overflow-y-auto bg-white rounded-2xl border border-zinc-200 shadow-lg p-2 z-20 space-y-1">
                      {existingDescriptions.map((desc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setEditDescription(desc);
                            setShowEditPrevDesc(false);
                            const lines = desc.split('\n').map((l) => l.trim()).filter(Boolean);
                            const isStepList = lines.length > 1 && lines.every((l) => /^(\d+[\.\)]|[-•*])\s+/.test(l));
                            if (isStepList) {
                              setEditDescMode('steps');
                              setEditSteps(lines.map((l) => l.replace(/^(\d+[\.\)]|[-•*])\s+/, '')));
                            }
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-zinc-50 text-xs text-zinc-700 truncate cursor-pointer"
                        >
                          {desc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editDescMode === 'steps' ? (
                <div className="space-y-2 p-3.5 bg-zinc-50/80 rounded-2xl border border-zinc-200/80">
                  {editSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => handleEditStepChange(idx, e.target.value)}
                        placeholder={`Step ${idx + 1}...`}
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEditStep(idx)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Remove step"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddEditStep}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-950 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>
              ) : (
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add details, camera settings, or workflow guidelines..."
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-xs font-medium leading-relaxed transition-all resize-y"
                />
              )}
            </div>

            {/* AI Prompt Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center justify-between">
                <span>Prompt Text <span className="text-rose-500">*</span></span>
                <span className="text-[11px] text-zinc-400 font-mono">{editPrompt.length} chars</span>
              </label>
              <textarea
                rows={5}
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="The exact prompt to generate this image..."
                className="w-full p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs sm:text-sm leading-relaxed border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all resize-y"
              />
            </div>

            {/* Labels / Tags */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-600" />
                <span>Tags / Labels</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editCurrentLabelInput}
                  onChange={(e) => setEditCurrentLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEditLabel();
                    }
                  }}
                  placeholder="e.g. unreleased, gemini, portrait"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={handleAddEditLabel}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Add Tag
                </button>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {editLabels.map((lbl) => (
                  <span
                    key={lbl}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getLabelBadgeClass(
                      lbl,
                      'pill'
                    )}`}
                  >
                    {getLabelIcon(lbl) && <span>{getLabelIcon(lbl)}</span>}
                    <span>#{lbl}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEditLabel(lbl)}
                      className="hover:opacity-75 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Existing Labels Suggestion Chips */}
              {existingLabels.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] text-zinc-400 font-medium mb-1">Suggested:</p>
                  <div className="flex flex-wrap gap-1">
                    {existingLabels.slice(0, 8).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => {
                          if (!editLabels.includes(lbl)) {
                            setEditLabels([...editLabels, lbl]);
                          }
                        }}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-100 cursor-pointer ${
                          editLabels.includes(lbl) ? 'opacity-40 pointer-events-none' : ''
                        }`}
                      >
                        +{lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Social Upload Tracking Options */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editEnableCheckmark}
                  onChange={(e) => setEditEnableCheckmark(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 accent-zinc-900 cursor-pointer"
                />
                <span className="text-xs font-bold text-zinc-900">
                  Enable Social Upload Status Tracking (🔴 Red / 🟢 Green Dot)
                </span>
              </label>

              {editEnableCheckmark && (
                <div className="pl-6 flex items-center gap-4 text-xs font-semibold text-zinc-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      checked={!editIsUsed}
                      onChange={() => setEditIsUsed(false)}
                      className="accent-rose-500 cursor-pointer"
                    />
                    <span className="text-rose-700 font-bold">🔴 Pending Upload (No)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      checked={editIsUsed}
                      onChange={() => setEditIsUsed(true)}
                      className="accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-emerald-800 font-bold">🟢 Uploaded & Used (Yes)</span>
                  </label>
                </div>
              )}

              {/* Sub-category selector if marked as used */}
              {editEnableCheckmark && editIsUsed && (
                <div className="pl-6 pt-2 border-t border-zinc-200/60 flex items-center gap-3">
                  <span className="text-[11px] font-bold text-zinc-600">Category:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-800">
                    <input
                      type="radio"
                      name="editPubCategory"
                      checked={editPublishCategory === 'direct'}
                      onChange={() => setEditPublishCategory('direct')}
                      className="accent-zinc-900 cursor-pointer"
                    />
                    <span>Direct</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-blue-700">
                    <input
                      type="radio"
                      name="editPubCategory"
                      checked={editPublishCategory === 'unreleased'}
                      onChange={() => setEditPublishCategory('unreleased')}
                      className="accent-blue-600 cursor-pointer"
                    />
                    <span>Unreleased</span>
                  </label>
                </div>
              )}
            </div>

            {/* Model Selection & Bypass Success Ratio */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-600" />
                    <span>Which model is used?</span>
                  </label>
                  {!isAddingModel && (
                    <button
                      type="button"
                      onClick={() => setIsAddingModel(true)}
                      className="text-xs font-bold text-zinc-800 hover:text-black flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Model</span>
                    </button>
                  )}
                </div>

                {/* Model Pills */}
                <div className="flex flex-wrap gap-2">
                  {[...DEFAULT_MODELS, ...customModels].map((m) => {
                    const isSelected = editModelUsed === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEditModelUsed(m)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 text-white shadow-xs'
                            : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {m === 'Both' ? 'Both (Nano Pro & 2.1)' : m}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Model Field */}
                {isAddingModel && (
                  <div className="flex items-center gap-2 mt-2.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={newModelInput}
                      onChange={(e) => setNewModelInput(e.target.value)}
                      placeholder="New model name (e.g. Flux, SDXL)..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-zinc-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomModel}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingModel(false);
                        setNewModelInput('');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-200 text-zinc-700 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Success Ratio / Bypass Difficulty Selector */}
              <div className="pt-3 border-t border-zinc-200/80 space-y-2">
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Success Ratio / Bypass Difficulty
                </label>

                {editModelUsed === 'Both' ? (
                  <div className="space-y-2">
                    {/* Nano Pro */}
                    <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-800">Nano Pro:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetEditBypass('Nano Pro', 'easily_pass')}
                          className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            (editModelBypass['Nano Pro'] || 'easily_pass') === 'easily_pass'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          ✓ Easily Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetEditBypass('Nano Pro', 'difficult_to_bypass')}
                          className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            editModelBypass['Nano Pro'] === 'difficult_to_bypass'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          ⚠ Difficult to Bypass
                        </button>
                      </div>
                    </div>

                    {/* Nano 2.1 */}
                    <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-800">Nano 2.1:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetEditBypass('Nano 2.1', 'easily_pass')}
                          className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            (editModelBypass['Nano 2.1'] || 'easily_pass') === 'easily_pass'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          ✓ Easily Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetEditBypass('Nano 2.1', 'difficult_to_bypass')}
                          className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            editModelBypass['Nano 2.1'] === 'difficult_to_bypass'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          ⚠ Difficult to Bypass
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Single Model Selected */
                  <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-800">{editModelUsed}:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetEditBypass(editModelUsed, 'easily_pass')}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          (editModelBypass[editModelUsed] || 'easily_pass') === 'easily_pass'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        ✓ Easily Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetEditBypass(editModelUsed, 'difficult_to_bypass')}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          editModelBypass[editModelUsed] === 'difficult_to_bypass'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        ⚠ Difficult to Bypass
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Images Manager */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Images ({editPics.length}/{MAX_IMAGES})
                </label>
                {editPics.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs font-bold text-zinc-800 hover:text-black cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleFilesSelected}
                className="hidden"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {editPics.map((pic, idx) => (
                  <div
                    key={pic.id}
                    className="relative aspect-9-16 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200 group/pic shadow-xs"
                  >
                    <img src={pic.src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePic(pic.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-md"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold">
                      #{idx + 1}
                    </span>
                  </div>
                ))}

                {editPics.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-9-16 rounded-2xl border-2 border-dashed border-zinc-300 hover:border-zinc-500 bg-zinc-50/50 hover:bg-zinc-100 flex flex-col items-center justify-center p-3 text-zinc-500 transition-all cursor-pointer"
                  >
                    <Upload className="w-5 h-5 mb-1.5 text-zinc-400" />
                    <span className="text-[11px] font-bold text-zinc-600">Add Pic</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSavingEdit}
                className="px-5 py-2.5 rounded-full border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex items-center gap-2 px-7 py-2.5 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /*                     PAGE VIEW (DISPLAY)                   */
          /* ========================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Image Stage (Original Aspect Ratio & Lightbox) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[440px] bg-zinc-950 rounded-3xl p-3 sm:p-4 border border-zinc-900 shadow-xl flex flex-col items-center relative select-none">
                <div className="relative w-full flex items-center justify-center rounded-2xl overflow-hidden bg-zinc-900/95 min-h-[320px] max-h-[550px]">
                  {totalImages > 0 ? (
                    <div
                      onClick={() => setIsPreviewOpen(true)}
                      className="relative w-full h-full flex items-center justify-center cursor-zoom-in group/img py-2"
                      title="Click to view original full size"
                    >
                      <img
                        src={images[currentImageIndex]}
                        alt={item.title}
                        className="w-auto h-auto max-w-full max-h-[520px] object-contain rounded-xl select-none group-hover/img:scale-[1.01] transition-transform duration-200"
                      />

                      {/* Full preview pill badge */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 hover:bg-black text-white text-[11px] font-bold backdrop-blur-md opacity-90 transition-opacity shadow-sm pointer-events-none">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Full Preview</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-12 text-zinc-500">
                      <Sparkles className="w-12 h-12 mx-auto mb-2 text-amber-400 opacity-60" />
                      <p className="text-xs font-semibold">No image attached</p>
                    </div>
                  )}

                  {/* Multi-image indicators */}
                  {totalImages > 1 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold pointer-events-none shadow-md">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{currentImageIndex + 1}/{totalImages}</span>
                    </div>
                  )}

                  {/* Left & Right navigation arrows */}
                  {totalImages > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages)}
                        aria-label="Previous image"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev + 1) % totalImages)}
                        aria-label="Next image"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails rail */}
                {totalImages > 1 && (
                  <div className="flex items-center gap-2 mt-3.5 overflow-x-auto max-w-full px-1 py-1">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        aria-label={`View image ${idx + 1}`}
                        className={`w-12 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                          idx === currentImageIndex
                            ? 'border-white scale-105 shadow-md ring-2 ring-white/30'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Editorial Prompt Details */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-6">
              {/* Meta & Tags Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-zinc-100">
                {/* Labels / Brand Tags (Supports #unreleased in light blue) */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {item.labels && item.labels.length > 0 ? (
                    item.labels.map((lbl) => (
                      <button
                        key={lbl}
                        onClick={() => {
                          onSelectLabel?.(lbl);
                          onClose();
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${getLabelBadgeClass(
                          lbl,
                          'pill'
                        )}`}
                      >
                        {getLabelIcon(lbl) && <span>{getLabelIcon(lbl)}</span>}
                        <span>#{lbl}</span>
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400 font-medium">Uncategorized</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}</span>
                </div>
              </div>

              {/* Title */}
              <div>
                <h1
                  id="prompt-detail-title"
                  className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight leading-tight"
                >
                  {item.title}
                </h1>
              </div>

              {/* Social Upload Status Banner */}
              {item.enableCheckmark ? (
                item.isUsed ? (
                  /* Completed / Uploaded (Green) */
                  <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-950">Published & Used</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.publishCategory === 'unreleased'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : 'bg-emerald-200/90 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {item.publishCategory === 'unreleased' ? 'Unreleased' : 'Direct'}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          {item.publishCategory === 'unreleased'
                            ? 'Saved under Unreleased collection in Categories.'
                            : 'Live published directly to Instagram feed.'}
                        </p>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span>Completed</span>
                    </div>
                  </div>
                ) : (
                  /* Pending / Not Uploaded (Red) */
                  <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex h-3.5 w-3.5 shrink-0 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 shadow-xs" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-rose-950">Pending Upload</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200/90 text-rose-900 border border-rose-300">
                            No
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          Rough prompt ready — not yet uploaded to Instagram.
                        </p>
                      </div>
                    </div>

                    {onToggleUsed && (
                      <button
                        onClick={() => onToggleUsed(item.id, true)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Mark as Used (Yes)</span>
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* Option to turn on social tracking */
                onToggleEnableTracking && (
                  <div className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Social Status Tracking</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Enable red/green dot tracking for Instagram upload status.
                      </p>
                    </div>
                    <button
                      onClick={() => onToggleEnableTracking(item.id, true)}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      + Enable Tracking
                    </button>
                  </div>
                )
              )}

              {/* Model Used & Bypass Difficulty Badges */}
              {item.modelUsed && (
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-bold shrink-0">
                      <Cpu className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Model Used</span>
                      <span className="text-xs font-black text-zinc-900">
                        {item.modelUsed === 'Both' ? 'Both (Nano Pro & 2.1)' : item.modelUsed}
                      </span>
                    </div>
                  </div>

                  {/* Bypass Difficulty Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {item.modelUsed === 'Both' ? (
                      <>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs ${
                          (item.modelBypass?.['Nano Pro'] || 'easily_pass') === 'easily_pass'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border border-amber-300'
                        }`}>
                          <span>Nano Pro:</span>
                          <span className="font-extrabold">
                            {(item.modelBypass?.['Nano Pro'] || 'easily_pass') === 'easily_pass' ? '✓ Easily Pass' : '⚠ Difficult to Bypass'}
                          </span>
                        </span>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs ${
                          (item.modelBypass?.['Nano 2.1'] || 'easily_pass') === 'easily_pass'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border border-amber-300'
                        }`}>
                          <span>Nano 2.1:</span>
                          <span className="font-extrabold">
                            {(item.modelBypass?.['Nano 2.1'] || 'easily_pass') === 'easily_pass' ? '✓ Easily Pass' : '⚠ Difficult to Bypass'}
                          </span>
                        </span>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs ${
                        (item.modelBypass?.[item.modelUsed] || 'easily_pass') === 'easily_pass'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-300'
                      }`}>
                        <span>Bypass:</span>
                        <span className="font-extrabold">
                          {(item.modelBypass?.[item.modelUsed] || 'easily_pass') === 'easily_pass' ? '✓ Easily Pass' : '⚠ Difficult to Bypass'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Description / Step-by-Step Instructions */}
              {item.description && (() => {
                const lines = item.description.split('\n').map((l) => l.trim()).filter(Boolean);
                const isStepList = lines.length > 1 && lines.every((l) => /^(\d+[\.\)]|[-•*])\s+/.test(l));

                if (isStepList) {
                  return (
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 uppercase tracking-wider">
                        <ListOrdered className="w-4 h-4 text-zinc-700" />
                        <span>Steps / How to Use</span>
                      </div>
                      <div className="space-y-2 pt-1">
                        {lines.map((line, idx) => {
                          const cleanText = line.replace(/^(\d+[\.\)]|[-•*])\s+/, '');
                          return (
                            <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-800 font-medium">
                              <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
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
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Description</span>
                    <p className="text-sm text-zinc-700 leading-relaxed font-normal whitespace-pre-line">
                      {item.description}
                    </p>
                  </div>
                );
              })()}

              {/* Full AI Prompt Box */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Full Prompt
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {item.prompt.length} chars
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs sm:text-sm leading-relaxed border border-zinc-800 shadow-inner select-text max-h-64 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{item.prompt}</p>
                </div>
              </div>

              {/* Delete Confirmation Form / Danger Area */}
              {showConfirmDelete && (
                <div className="pt-2 animate-in fade-in duration-150">
                  {userProfile?.securityQuestion && userProfile?.securityAnswer ? (
                    <form onSubmit={handleSecurityDelete} className="p-4 bg-rose-50/90 rounded-2xl border border-rose-200 space-y-3">
                      <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                        <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Security Check: {userProfile.securityQuestion}</span>
                      </div>
                      <div className="relative">
                        <input
                          type={showDeleteAnswer ? 'text' : 'password'}
                          value={deleteSecurityInput}
                          onChange={(e) => {
                            setDeleteSecurityInput(e.target.value);
                            setDeleteError(null);
                          }}
                          placeholder="Type secret answer to delete"
                          autoFocus
                          disabled={isDeleting}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-rose-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDeleteAnswer(!showDeleteAnswer)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 cursor-pointer"
                        >
                          {showDeleteAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {deleteError && <p className="text-[11px] font-bold text-rose-600">{deleteError}</p>}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowConfirmDelete(false);
                            setDeleteSecurityInput('');
                            setDeleteError(null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-white text-zinc-700 text-xs font-bold border border-zinc-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!deleteSecurityInput.trim() || isDeleting}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Verify & Delete'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Delete Protection Recommended</span>
                      </div>
                      <p className="text-xs text-amber-800">
                        Set up a security question in settings to protect prompts from accidental deletion.
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
                  )}
                </div>
              )}

              {/* Bottom Large Action Bar */}
              <div className="pt-4 border-t border-zinc-100 flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm transition-all shadow-md cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
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
                  onClick={handleTriggerEdit}
                  className="flex items-center gap-1.5 py-3.5 px-5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-sm border border-amber-200 transition-colors cursor-pointer"
                  title="Edit prompt"
                >
                  <Edit3 className="w-4 h-4 text-amber-700" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Security Password Verification Modal for Edit ── */}
      {showEditAuthModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-tight">Security Check Required</h3>
                  <p className="text-[11px] text-zinc-500">One-time password / secret passkey to edit</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditAuthModal(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold">Security Question:</span>
              <p className="font-semibold text-amber-950 mt-0.5">{userProfile?.securityQuestion}</p>
            </div>

            <form onSubmit={handleVerifyEditPassword} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Secret Answer / Passkey <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editSecurityInput}
                    onChange={(e) => {
                      setEditSecurityInput(e.target.value);
                      setEditSecurityError(null);
                    }}
                    placeholder="Enter your secret passkey..."
                    autoFocus
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {editSecurityError && (
                  <p className="text-[11px] font-bold text-rose-600">{editSecurityError}</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditAuthModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editSecurityInput.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Verify & Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lightbox Image Zoom Modal ── */}
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
