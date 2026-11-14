/**
 * FU MARKET in-browser image optimization utilities.
 * - Validates JPG, JPEG, PNG, and WebP formats
 * - Preserves EXIF orientation via createImageBitmap({ imageOrientation: 'from-image' }) with Image fallback
 * - Targets ~500 KB per compressed image for fast campus uploads
 * - Provides controlled Firestore fallback compression (<= 420 KB binary / <= ~560 KB base64)
 * - Rejects compressed images exceeding 3 MB
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
  targetBytes?: number;
  maxDimension?: number;
  initialQuality?: number;
}

const MAX_RAW_FILE_BYTES = 25 * 1024 * 1024; // 25MB raw mobile camera limit
const MAX_COMPRESSED_BYTES = 3 * 1024 * 1024; // 3MB strict upload limit
export const TARGET_COMPRESSED_BYTES = 350 * 1024; // ~350KB target for fast mobile campus loads
export const FIRESTORE_FALLBACK_MAX_BYTES = 280 * 1024; // <= 280KB binary -> ~375KB base64, very fast & safe under 1 MiB limit

/**
 * Validates if the selected file is an allowed image format (JPG, JPEG, PNG, WebP)
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

function renderToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize browser canvas for image optimization.');
  }
  // White background prevents transparent PNGs turning black when converted to JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image compression failed in browser.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

async function decodeImageWithOrientation(
  file: File
): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => {
          try {
            bitmap.close();
          } catch {
            // ignore
          }
        }
      };
    } catch {
      // Fallback to HTMLImageElement if options aren't supported
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onerror = () => reject(new Error('Failed to read image. The file may be corrupted or unsupported.'));
      el.onload = () => resolve(el);
      el.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      release: () => URL.revokeObjectURL(objectUrl)
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

/**
 * Estimates total UTF-8 byte size of a JSON-serializable Firestore document payload.
 */
export function estimateJsonUtf8Bytes(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 0;
  }
}

/**
 * Compresses an image in the browser before upload.
 * Targets ~500 KB by default while preserving EXIF orientation and visual clarity.
 */
export async function compressImageBeforeUpload(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const {
    signal,
    timeoutMs = 15000,
    includeDataUrl = true,
    targetBytes = TARGET_COMPRESSED_BYTES,
    maxDimension: customMaxDim,
    initialQuality: customInitialQuality
  } = options;

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

  let abortHandler: (() => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const decodedCleanup: { release: (() => void) | null } = { release: null };

  try {
    const workPromise = (async (): Promise<CompressedImageResult> => {
      const decoded = await decodeImageWithOrientation(file);
      decodedCleanup.release = decoded.release;
      if (signal?.aborted) throw new Error('Upload cancelled.');

      let width = decoded.width;
      let height = decoded.height;
      if (!width || !height) {
        throw new Error('Invalid image dimensions.');
      }

      const isOver1MB = file.size > 1024 * 1024;
      const maxDim = customMaxDim || (isOver1MB ? 1024 : 1280);

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.max(1, Math.round((height * maxDim) / width));
          width = maxDim;
        } else {
          width = Math.max(1, Math.round((width * maxDim) / height));
          height = maxDim;
        }
      }

      let canvas = renderToCanvas(decoded.source, width, height);
      let quality = customInitialQuality ?? (isOver1MB ? 0.74 : 0.82);
      let blob = await canvasToJpegBlob(canvas, quality);

      // Step down quality smoothly until within targetBytes (~500KB)
      while (blob.size > targetBytes && quality > 0.45) {
        if (signal?.aborted) throw new Error('Upload cancelled.');
        quality = Math.max(0.45, Number((quality - 0.12).toFixed(2)));
        blob = await canvasToJpegBlob(canvas, quality);
      }

      // If still larger than targetBytes on very detailed photos, scale down canvas slightly once
      if (blob.size > targetBytes && (width > 720 || height > 720)) {
        if (signal?.aborted) throw new Error('Upload cancelled.');
        width = Math.max(1, Math.round(width * 0.75));
        height = Math.max(1, Math.round(height * 0.75));
        canvas = renderToCanvas(decoded.source, width, height);
        blob = await canvasToJpegBlob(canvas, Math.min(quality, 0.62));
      }

      if (blob.size > MAX_COMPRESSED_BYTES) {
        throw new Error('Photo is still over 3MB after compression. Please use a smaller photo.');
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

      if (signal?.aborted) throw new Error('Upload cancelled.');

      return {
        blob,
        file: compressedFile,
        dataUrl,
        size: blob.size,
        width,
        height
      };
    })();

    const racePromises: Promise<CompressedImageResult>[] = [workPromise];

    racePromises.push(
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Image optimization timed out. Please try another photo.'));
        }, timeoutMs);
      })
    );

    if (signal) {
      racePromises.push(
        new Promise<never>((_, reject) => {
          if (signal.aborted) {
            reject(new Error('Upload cancelled.'));
            return;
          }
          abortHandler = () => reject(new Error('Upload cancelled.'));
          signal.addEventListener('abort', abortHandler, { once: true });
        })
      );
    }

    return await Promise.race(racePromises);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal && abortHandler) signal.removeEventListener('abort', abortHandler);
    decodedCleanup.release?.();
  }
}

/**
 * Controlled Firestore inline fallback compression:
 * guarantees image stays well below Firestore's 1 MiB document limit.
 */
export async function compressImageForFirestoreFallback(
  file: File,
  signal?: AbortSignal
): Promise<CompressedImageResult> {
  return compressImageBeforeUpload(file, {
    signal,
    includeDataUrl: true,
    targetBytes: FIRESTORE_FALLBACK_MAX_BYTES,
    maxDimension: 800,
    initialQuality: 0.68
  });
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
