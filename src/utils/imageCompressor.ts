/**
 * Checks whether a given file is an Apple HEIC/HEIF photo.
 * Standard web browsers cannot decode raw HEIC photos via canvas.
 */
export function isHeicFile(file: File): boolean {
  if (!file) return false;
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return (
    mime === 'image/heic' ||
    mime === 'image/heif' ||
    mime.includes('heic') ||
    mime.includes('heif') ||
    /\.(heic|heif)$/i.test(name)
  );
}

/**
 * Compresses an image file before upload using browser Canvas.
 * - Uses memory-efficient URL.createObjectURL instead of data URLs
 * - Preserves transparency for PNG/WebP/AVIF inputs
 * - Verifies real blob type returned by browser (guards against WebP fallback to PNG in Safari)
 * - Resizes if max dimension exceeds maxDimension (default: 1920px)
 * - Keeps original file if compression isn't smaller or fails
 */
export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<File> {
  // If not an image or SVG/GIF (preserve animation/vector), or HEIC, return as-is
  if (
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml' ||
    isHeicFile(file)
  ) {
    return file;
  }

  // If already under 800KB, no compression needed
  if (file.size < 800 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      resolve(file);
      return;
    }

    const img = new Image();

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    img.onload = () => {
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (!width || !height) {
        cleanup();
        resolve(file);
        return;
      }

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Preserve transparency for PNG, WebP, or AVIF formats; otherwise JPEG
      const hasAlpha =
        file.type === 'image/png' ||
        file.type === 'image/webp' ||
        file.type === 'image/avif';
      const targetMime = hasAlpha ? 'image/webp' : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob && blob.size < file.size) {
            // Check actual type returned (e.g. older Safari returns PNG if WebP is unsupported)
            const actualMime = blob.type || targetMime;
            let ext = '.jpg';
            if (actualMime === 'image/webp') ext = '.webp';
            else if (actualMime === 'image/png') ext = '.png';

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ext),
              {
                type: actualMime,
                lastModified: Date.now(),
              }
            );
            resolve(compressedFile);
          } else {
            // Compressed was not smaller, resolve original
            resolve(file);
          }
        },
        targetMime,
        quality
      );
    };

    img.onerror = () => {
      cleanup();
      resolve(file);
    };

    img.src = objectUrl;
  });
}
