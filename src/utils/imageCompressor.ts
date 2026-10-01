/**
 * Compresses an image file before upload using browser Canvas.
 * - Resizes if max dimension exceeds maxDimension (default: 1920px)
 * - Converts to image/jpeg or image/webp with 0.85 quality
 * - Keeps original file if compression isn't smaller or fails
 */
export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<File> {
  // If not an image or SVG/GIF (preserve animation/vector), return as-is
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  // If already under 800KB, no compression needed
  if (file.size < 800 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

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
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP or fallback to JPEG
        const outputMime = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, outputMime === 'image/webp' ? '.webp' : '.jpg'), {
                type: outputMime,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // Compressed was not smaller, resolve original
              resolve(file);
            }
          },
          outputMime,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
