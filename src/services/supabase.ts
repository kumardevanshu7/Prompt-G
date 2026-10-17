import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// User's bucket in Supabase dashboard is 'promptG-images' (fallback to 'prompt-images')
export const BUCKET_NAMES = ['promptG-images', 'prompt-images'] as const;
export const DEFAULT_BUCKET = 'promptG-images';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export const DEFAULT_SUPABASE_URL = 'https://kgsuvwatfwjxeomjvtvr.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_Bs8yqiPxgL-lYDeykdDOhw_gvMyJd92';

export const getSupabaseClient = (url?: string, anonKey?: string): SupabaseClient | null => {
  const envUrl = url || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envKey = anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  if (!envUrl || !envKey) {
    return null;
  }

  if (!cachedClient || cachedUrl !== envUrl || cachedKey !== envKey) {
    try {
      cachedClient = createClient(envUrl, envKey);
      cachedUrl = envUrl;
      cachedKey = envKey;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return cachedClient;
};

/**
 * Uploads an image file to Supabase Storage.
 * Tries 'promptG-images' (user's actual bucket) first, with fallback to 'prompt-images'.
 * Returns the public CDN URL for the image from the successful bucket.
 */
export const uploadImageToSupabase = async (
  file: File,
  customClient?: SupabaseClient | null
): Promise<string> => {
  const client = customClient || getSupabaseClient();

  if (!client) {
    throw new Error('Supabase Storage is not configured.');
  }

  // Generate clean, standard file extension based on MIME type first, then file.name
  let cleanExt = 'jpg';
  if (file.type === 'image/webp') cleanExt = 'webp';
  else if (file.type === 'image/png') cleanExt = 'png';
  else if (file.type === 'image/jpeg') cleanExt = 'jpg';
  else if (file.type === 'image/gif') cleanExt = 'gif';
  else if (file.name.includes('.')) {
    const rawExt = file.name.split('.').pop() || 'jpg';
    cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  }
  const fileName = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
  const filePath = `uploads/${fileName}`;

  let successfulBucket = '';
  let lastErrorMessage = '';

  // Try candidate bucket names
  for (const bucket of BUCKET_NAMES) {
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '31536000',
        upsert: true,
      });

    if (!uploadError) {
      successfulBucket = bucket;
      break;
    }

    lastErrorMessage = uploadError.message;
    if (!uploadError.message.toLowerCase().includes('not found')) {
      break;
    }
  }

  if (!successfulBucket) {
    throw new Error(`Storage upload failed: ${lastErrorMessage || 'Bucket not found'}`);
  }

  const { data } = client.storage.from(successfulBucket).getPublicUrl(filePath);
  return data.publicUrl;
};

/**
 * Deletes images from Supabase Storage given an array of public CDN URLs.
 * Extracts the file path and calls remove() on the bucket.
 */
export const deleteImagesFromSupabase = async (
  imageUrls: string[],
  customClient?: SupabaseClient | null
): Promise<{ deleted: number; failed: number }> => {
  if (!imageUrls || imageUrls.length === 0) return { deleted: 0, failed: 0 };
  const client = customClient || getSupabaseClient();
  if (!client) return { deleted: 0, failed: 0 };

  // Group paths by bucket
  const bucketPaths: Record<string, string[]> = {};
  BUCKET_NAMES.forEach((b) => (bucketPaths[b] = []));

  for (const rawUrl of imageUrls) {
    if (!rawUrl || typeof rawUrl !== 'string') continue;

    for (const bucket of BUCKET_NAMES) {
      const marker = `/${bucket}/`;
      const idx = rawUrl.indexOf(marker);
      if (idx !== -1) {
        // Strip query string and hashes
        const pathPart = rawUrl.substring(idx + marker.length).split('?')[0].split('#')[0];
        const filePath = decodeURIComponent(pathPart);
        if (filePath && !bucketPaths[bucket].includes(filePath)) {
          bucketPaths[bucket].push(filePath);
        }
        break;
      }
    }
  }

  let totalDeleted = 0;
  let totalFailed = 0;

  // Batch delete in chunks of 50
  for (const [bucket, paths] of Object.entries(bucketPaths)) {
    if (paths.length === 0) continue;

    const chunkSize = 50;
    for (let i = 0; i < paths.length; i += chunkSize) {
      const chunk = paths.slice(i, i + chunkSize);
      try {
        const { data, error } = await client.storage.from(bucket).remove(chunk);
        if (error) {
          console.warn(`Supabase delete error on ${bucket}:`, error.message);
          totalFailed += chunk.length;
        } else {
          totalDeleted += (data?.length ?? chunk.length);
        }
      } catch (err) {
        console.warn(`Network error deleting images from ${bucket}:`, err);
        totalFailed += chunk.length;
      }
    }
  }

  return { deleted: totalDeleted, failed: totalFailed };
};
