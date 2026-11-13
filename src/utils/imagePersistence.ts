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

export interface CompressImageOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  includeDataUrl?: boolean;
}

const MAX_RAW_FILE_BYTES = 25 * 1024 * 1024; // 25MB raw mobile camera limit
const MAX_COMPRESSED_BYTES = 3 * 1024 * 1024; // 3MB strict upload limit
const TARGET_COMPRESSED_BYTES = 800 * 1024; // 800KB target for fast campus uploads

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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to encode image preview.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses an image in the browser before upload to Firebase Storage.
 * Uses ObjectURL decoding with timeout and AbortSignal cancellation so it never hangs.
 */
export async function compressImageBeforeUpload(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const { signal, timeoutMs = 15000, includeDataUrl = true } = options;

  if (signal?.aborted) {
    throw new Error('Upload cancelled.');
  }

  if (!isValidImageFormat(file)) {
    throw new Error('Only JPG, JPEG, PNG, and WebP images are allowed.');
  }

  if (file.size <= 0) {
    throw new Error('Selected image file is empty or corrupted.');
  }

  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error('Photo file is too large (max 25MB). Please choose a smaller image.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<CompressedImageResult>((resolve, reject) => {
      let settled = false;

      const cleanupListeners = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
      };

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanupListeners();
        reject(err);
      };

      const onAbort = () => {
        fail(new Error('Upload cancelled.'));
      };

      if (signal) {
        if (signal.aborted) {
          fail(new Error('Upload cancelled.'));
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }

      const timeoutId = setTimeout(() => {
        fail(new Error('Image optimization timed out. Please try another photo.'));
      }, timeoutMs);

      const img = new Image();
      img.onerror = () => {
        fail(new Error('Failed to read image. The file may be corrupted or unsupported.'));
      };

      img.onload = () => {
        if (settled) return;

        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            fail(new Error('Invalid image dimensions.'));
            return;
          }

          // Resize images > 1MB to max 1024px, others to max 1280px
          const isOver1MB = file.size > 1024 * 1024;
          const maxDimension = isOver1MB ? 1024 : 1280;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.max(1, Math.round((height * maxDimension) / width));
              width = maxDimension;
            } else {
              width = Math.max(1, Math.round((width * maxDimension) / height));
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            fail(new Error('Could not initialize browser canvas for image optimization.'));
            return;
          }

          // White background prevents transparent PNGs turning black when converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          let quality = isOver1MB ? 0.72 : 0.82;

          const finishWithBlob = async (blob: Blob | null) => {
            if (settled) return;
            if (!blob) {
              fail(new Error('Image compression failed in browser.'));
              return;
            }

            if (blob.size > TARGET_COMPRESSED_BYTES && quality > 0.5) {
              quality = Math.max(0.45, Number((quality - 0.15).toFixed(2)));
              canvas.toBlob(finishWithBlob, 'image/jpeg', quality);
              return;
            }

            if (blob.size > MAX_COMPRESSED_BYTES) {
              fail(new Error('Photo is still over 3MB after compression. Please use a smaller photo.'));
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

            let dataUrl = '';
            if (includeDataUrl) {
              try {
                dataUrl = await blobToDataUrl(blob);
              } catch {
                dataUrl = '';
              }
            }

            if (settled) return;
            settled = true;
            cleanupListeners();
            resolve({
              blob,
              file: compressedFile,
              dataUrl,
              size: blob.size,
              width,
              height
            });
          };

          canvas.toBlob(finishWithBlob, 'image/jpeg', quality);
        } catch (err: any) {
          fail(new Error(err?.message || 'Image optimization failed.'));
        }
      };

      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Legacy wrapper for backward compatibility
 */
export async function fileToPersistentDataUrl(
  file: File,
  _maxWidth = 1024,
  _maxHeight = 1024,
  _quality = 0.7
): Promise<string> {
  const result = await compressImageBeforeUpload(file, { includeDataUrl: true });
  return result.dataUrl;
}
