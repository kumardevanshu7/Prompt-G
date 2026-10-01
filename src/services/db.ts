import type { PromptItem } from '../types/prompt';
import {
  fetchFirebasePrompts,
  insertFirebasePrompt,
  updateFirebasePrompt,
  deleteFirebasePrompt,
  subscribeFirebasePrompts,
} from './firebase';
import { uploadImageToSupabase, deleteImagesFromSupabase } from './supabase';

export interface UploadableImage {
  file?: File;
  url?: string;
}

export const fetchAllPrompts = async (userId: string): Promise<PromptItem[]> => {
  return await fetchFirebasePrompts(userId);
};

/**
 * Saves a new prompt, preserving exact image sequence and providing upload progress.
 */
export const saveNewPrompt = async (
  item: Omit<PromptItem, 'id' | 'created_at' | 'images'>,
  imagesToProcess: UploadableImage[] = [],
  onProgress?: (current: number, total: number) => void
): Promise<PromptItem> => {
  const finalUrls: string[] = [];
  const filesToUpload = imagesToProcess.filter((img) => img.file);
  let uploadedCount = 0;

  // Process images strictly in the order arranged by the user
  for (let i = 0; i < imagesToProcess.length; i++) {
    const img = imagesToProcess[i];
    if (img.file) {
      uploadedCount++;
      onProgress?.(uploadedCount, filesToUpload.length);
      const uploadedUrl = await uploadImageToSupabase(img.file);
      finalUrls.push(uploadedUrl);
    } else if (img.url) {
      finalUrls.push(img.url);
    }
  }

  const promptToSave = {
    ...item,
    images: finalUrls,
  };

  return await insertFirebasePrompt(promptToSave);
};

export const removePromptById = async (id: string, imageUrls: string[] = []): Promise<void> => {
  // 1. Delete files from Supabase Storage so no orphan images remain
  if (imageUrls && imageUrls.length > 0) {
    try {
      await deleteImagesFromSupabase(imageUrls);
    } catch (err) {
      console.warn('Failed to delete images from Supabase Storage:', err);
    }
  }

  // 2. Delete prompt document from Firestore
  await deleteFirebasePrompt(id);
};

export const updatePromptStatus = async (
  id: string,
  updates: Partial<PromptItem>
): Promise<void> => {
  await updateFirebasePrompt(id, updates);
};

/**
 * Real-time listener: Returns parsed PromptItem[] directly from Firestore.
 */
export const subscribeToPromptChanges = (
  userId: string,
  onUpdate: (prompts: PromptItem[]) => void
): (() => void) => {
  return subscribeFirebasePrompts(userId, onUpdate);
};
