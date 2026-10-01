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
  const envUrl = url || localStorage.getItem('promptg_supabase_url') || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envKey = anonKey || localStorage.getItem('promptg_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

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

  // Generate unique file path
  const fileExt = file.name.split('.').pop() || 'png';
  const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '');
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
): Promise<void> => {
  if (!imageUrls || imageUrls.length === 0) return;
  const client = customClient || getSupabaseClient();
  if (!client) return;

  for (const url of imageUrls) {
    if (!url || typeof url !== 'string') continue;

    for (const bucket of BUCKET_NAMES) {
      const regex = new RegExp(`/${bucket}/(.+)$`);
      const match = url.match(regex);
      if (match && match[1]) {
        const filePath = decodeURIComponent(match[1]);
        try {
          await client.storage.from(bucket).remove([filePath]);
        } catch (err) {
          console.warn(`Could not delete image ${filePath} from Supabase bucket ${bucket}:`, err);
        }
      }
    }
  }
};
