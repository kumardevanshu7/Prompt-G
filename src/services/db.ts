import type { PromptItem } from '../types/prompt';
import {
  fetchFirebasePrompts,
  insertFirebasePrompt,
  updateFirebasePrompt,
  deleteFirebasePrompt,
  deleteAllFirebasePrompts,
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
  // 1. Delete prompt document from Firestore FIRST
  await deleteFirebasePrompt(id);

  // 2. Delete files from Supabase Storage SECOND so document deletion is guaranteed
  if (imageUrls && imageUrls.length > 0) {
    try {
      await deleteImagesFromSupabase(imageUrls);
    } catch (err) {
      console.warn('Failed to delete images from Supabase Storage:', err);
    }
  }
};

export const updatePromptStatus = async (
  id: string,
  updates: Partial<PromptItem>
): Promise<void> => {
  await updateFirebasePrompt(id, updates);
};

/**
 * Updates an existing prompt document in Firestore.
 * Handles uploading new images, updating Firestore, and cleaning up removed images.
 */
export const updateExistingPrompt = async (
  id: string,
  updates: Partial<Omit<PromptItem, 'id' | 'created_at'>>,
  imagesToProcess?: UploadableImage[],
  oldImageUrls?: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Partial<PromptItem>> => {
  let finalUrls: string[] | undefined = undefined;
  const newlyUploadedUrls: string[] = [];

  try {
    if (imagesToProcess !== undefined) {
      finalUrls = [];
      const filesToUpload = imagesToProcess.filter((img) => img.file);
      let uploadedCount = 0;

      for (let i = 0; i < imagesToProcess.length; i++) {
        const img = imagesToProcess[i];
        if (img.file) {
          uploadedCount++;
          onProgress?.(uploadedCount, filesToUpload.length);
          const uploadedUrl = await uploadImageToSupabase(img.file);
          newlyUploadedUrls.push(uploadedUrl);
          finalUrls.push(uploadedUrl);
        } else if (img.url) {
          finalUrls.push(img.url);
        }
      }
    }

    const payload: Partial<PromptItem> = {
      ...updates,
      ...(finalUrls !== undefined ? { images: finalUrls } : {}),
    };

    // 1. Update Firestore document FIRST
    await updateFirebasePrompt(id, payload);

    // 2. Delete any old images that were removed SECOND (only after doc write succeeds)
    if (imagesToProcess !== undefined && oldImageUrls && oldImageUrls.length > 0) {
      const removedUrls = oldImageUrls.filter((oldUrl) => !finalUrls!.includes(oldUrl));
      if (removedUrls.length > 0) {
        try {
          await deleteImagesFromSupabase(removedUrls);
        } catch (err) {
          console.warn('Failed to delete removed images from Supabase Storage:', err);
        }
      }
    }

    return payload;
  } catch (err) {
    // If upload or firestore write failed midway, clean up newly uploaded orphan images
    if (newlyUploadedUrls.length > 0) {
      try {
        await deleteImagesFromSupabase(newlyUploadedUrls);
      } catch (cleanupErr) {
        console.warn('Failed to clean up newly uploaded orphan images:', cleanupErr);
      }
    }
    throw err;
  }
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

/**
 * DANGER: Deletes ALL prompts (Firestore) and ALL images (Supabase Storage) for the user.
 * This is irreversible. Calls onProgress(deleted, total) so UI can show progress.
 */
export const resetAllUserData = async (
  userId: string,
  onProgress?: (deleted: number, total: number) => void
): Promise<void> => {
  // Step 1: Delete all Firestore docs, collecting image URLs
  const allImageUrls = await deleteAllFirebasePrompts(userId);

  // Step 2: Batch delete all images from Supabase Storage
  const total = allImageUrls.length;
  if (total > 0) {
    await deleteImagesFromSupabase(allImageUrls);
  }
  onProgress?.(total, total);
};

