/**
 * Nigeria data-optimized in-browser image compression utilities.
 * Pre-processes images using HTML5 Canvas before Firebase Storage upload:
 * - Resizes large images (> 1MB) to max width 1024px with quality 0.7
 * - Converts to standard JPEG
 * - Enforces max final target size 800KB
 * - Rejects files exceeding 3MB after compression
 */

export interface CompressedImageResult {
  blob: Blob;
  file: File;
  dataUrl: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Validates if the selected file is an allowed image format (JPG, PNG, WebP)
 */
export function isValidImageFormat(file: File): boolean {
  if (!file) return false;
  const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExts = ['jpg', 'jpeg', 'png', 'webp'];
  return validMimes.includes(file.type.toLowerCase()) || (!!ext && validExts.includes(ext));
}

/**
 * Compresses an image in the browser before upload to Firebase Storage.
 */
export async function compressImageBeforeUpload(file: File): Promise<CompressedImageResult> {
  if (!isValidImageFormat(file)) {
    throw new Error('Only JPG, PNG, and WebP images are allowed.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image for compression.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // If file size > 1MB, resize to max width 1024px
        const isOver1MB = file.size > 1024 * 1024;
        const maxDimension = isOver1MB ? 1024 : 1280;

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
          reject(new Error('Could not initialize canvas context for compression.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Target initial quality: 0.7 if > 1MB, otherwise 0.8
        let quality = isOver1MB ? 0.7 : 0.8;

        const toBlobCallback = (blob: Blob | null) => {
          if (!blob) {
            reject(new Error('Canvas image compression failed.'));
            return;
          }

          // If blob is still larger than 800KB and quality can be reduced, reduce quality
          if (blob.size > 800 * 1024 && quality > 0.5) {
            quality = Math.max(0.5, quality - 0.15);
            canvas.toBlob(toBlobCallback, 'image/jpeg', quality);
            return;
          }

          // Strict limit: If still > 3MB after compress, show exact requested error
          if (blob.size > 3 * 1024 * 1024) {
            reject(new Error('Photo too large, please use smaller photo or screenshot'));
            return;
          }

          const cleanBaseName = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 40);
          const compressedFileName = `${cleanBaseName || 'photo'}.jpg`;

          const compressedFile = new File([blob], compressedFileName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          // Also obtain dataUrl for instantaneous thumbnail preview
          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          resolve({
            blob,
            file: compressedFile,
            dataUrl,
            size: blob.size,
            width,
            height
          });
        };

        canvas.toBlob(toBlobCallback, 'image/jpeg', quality);
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Legacy wrapper for backward compatibility
 */
export async function fileToPersistentDataUrl(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.7
): Promise<string> {
  const result = await compressImageBeforeUpload(file);
  return result.dataUrl;
}
