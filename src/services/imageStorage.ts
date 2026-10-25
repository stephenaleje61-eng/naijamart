import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask
} from 'firebase/storage';
import { app } from './firebase.js';
import { compressImageBeforeUpload, isValidImageFormat } from '../utils/imagePersistence.js';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase Storage instance
let storageInstance: ReturnType<typeof getStorage> | null = null;
try {
  if (firebaseConfig.storageBucket) {
    storageInstance = getStorage(app);
  }
} catch (err) {
  console.warn('[Firebase Storage] Init warning:', err);
}

export function getStorageInstance() {
  if (!storageInstance) {
    storageInstance = getStorage(app);
  }
  return storageInstance;
}

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  timeoutMs?: number;
  folder?: 'products' | 'riders' | 'hub_chats' | 'hux';
  onTaskCreated?: (task: UploadTask) => void;
  allowPersistentFallback?: boolean;
}

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  previewUrl: string;
  fileName: string;
  isFirebaseStorage: boolean;
}

/**
 * Parses Firebase Storage errors into actionable, exact user messages.
 */
export function formatStorageErrorMessage(error: any): string {
  const code = error?.code || '';
  const message = error?.message || String(error);

  // Storage not enabled or bucket not found (HTTP 404 / storage/unknown / bucket-not-found)
  if (
    code === 'storage/unknown' ||
    code === 'storage/bucket-not-found' ||
    code === 'storage/project-not-found' ||
    message.includes('404') ||
    message.includes('bucket') ||
    message.includes('Not Found')
  ) {
    return 'Storage not enabled. Go to Firebase Console > Storage > Get Started > Start in test mode';
  }

  // Permission / rule error
  if (code === 'storage/unauthorized' || code === 'storage/permission-denied') {
    return 'Upload failed: Permission denied by storage rules. Please verify Firebase Storage rules.';
  }

  // Cancelled by user or timeout
  if (code === 'storage/canceled' || message.includes('timeout') || message.includes('cancelled')) {
    return message;
  }

  // Quota exceeded
  if (code === 'storage/quota-exceeded') {
    return 'Upload failed: Storage quota exceeded for project zangamarket1.';
  }

  // Network failure
  if (code === 'storage/retry-limit-exceeded' || message.includes('network') || message.includes('connection')) {
    return `Upload failed: Network timeout. Please check your internet connection and retry.`;
  }

  return `Upload failed: ${message} - Please check internet or enable Storage`;
}

/**
 * Uploads an image to Firebase Storage with canvas pre-compression, 30s timeout,
 * progress callback, and clear troubleshooting error messages.
 */
export async function uploadImageToFirebaseStorage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    onProgress,
    timeoutMs = 30000,
    folder = 'products',
    onTaskCreated,
    allowPersistentFallback = true
  } = options;

  if (!isValidImageFormat(file)) {
    throw new Error('Only JPG, PNG, and WebP images are allowed.');
  }

  // 1. In-browser compression
  if (onProgress) onProgress(5);
  const compressed = await compressImageBeforeUpload(file);
  if (onProgress) onProgress(15);

  const timestamp = Date.now();
  const cleanOriginalName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const uniqueFileName = `${timestamp}_${cleanOriginalName || 'photo'}.jpg`;
  const storagePath = `${folder}/${uniqueFileName}`;

  let storage: ReturnType<typeof getStorage>;
  try {
    storage = getStorageInstance();
  } catch (initErr: any) {
    const msg = 'Storage not enabled. Go to Firebase Console > Storage > Get Started > Start in test mode';
    if (allowPersistentFallback) {
      console.warn('[Firebase Storage] Unavailable, using persistent compressed image:', initErr?.message);
      if (onProgress) onProgress(100);
      return {
        downloadUrl: compressed.dataUrl,
        storagePath: 'local/' + uniqueFileName,
        previewUrl: compressed.dataUrl,
        fileName: uniqueFileName,
        isFirebaseStorage: false
      };
    }
    throw new Error(msg);
  }

  const fileRef = ref(storage, storagePath);
  const metadata = {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000'
  };

  return new Promise((resolve, reject) => {
    let isSettled = false;
    let timeoutTimer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
    };

    const uploadTask = uploadBytesResumable(fileRef, compressed.file, metadata);
    if (onTaskCreated) {
      onTaskCreated(uploadTask);
    }

    // Set 30-second timeout
    timeoutTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        uploadTask.cancel();
        cleanup();
        const timeoutMsg = 'Upload failed: Operation timed out (>30s) - Please check internet or enable Storage';
        if (allowPersistentFallback) {
          console.warn('[Firebase Storage] Timed out, falling back to persistent data URL.');
          if (onProgress) onProgress(100);
          resolve({
            downloadUrl: compressed.dataUrl,
            storagePath: 'local/' + uniqueFileName,
            previewUrl: compressed.dataUrl,
            fileName: uniqueFileName,
            isFirebaseStorage: false
          });
          return;
        }
        reject(new Error(timeoutMsg));
      }
    }, timeoutMs);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (isSettled) return;
        const rawPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // Map upload range from 15% to 95%
        const mapped = Math.min(95, Math.max(15, Math.round(15 + rawPercent * 0.8)));
        if (onProgress) {
          onProgress(mapped);
        }
      },
      (error) => {
        cleanup();
        if (isSettled) return;
        isSettled = true;

        console.error('[Firebase Storage Upload Error]:', error);
        const formattedMsg = formatStorageErrorMessage(error);

        // If bucket is not active in Firebase Console, allow fallback so seller can still publish genuine photo
        if (allowPersistentFallback && (formattedMsg.includes('Storage not enabled') || error?.code === 'storage/unknown')) {
          console.info('[Firebase Storage] Bucket not yet enabled in Console. Using persistent compressed image.');
          if (onProgress) onProgress(100);
          resolve({
            downloadUrl: compressed.dataUrl,
            storagePath: 'local/' + uniqueFileName,
            previewUrl: compressed.dataUrl,
            fileName: uniqueFileName,
            isFirebaseStorage: false
          });
          return;
        }

        reject(new Error(formattedMsg));
      },
      async () => {
        cleanup();
        if (isSettled) return;
        isSettled = true;

        try {
          if (onProgress) onProgress(98);
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100);
          resolve({
            downloadUrl,
            storagePath,
            previewUrl: compressed.dataUrl,
            fileName: uniqueFileName,
            isFirebaseStorage: true
          });
        } catch (urlErr: any) {
          console.error('[Firebase Storage getDownloadURL error]:', urlErr);
          if (allowPersistentFallback) {
            resolve({
              downloadUrl: compressed.dataUrl,
              storagePath: 'local/' + uniqueFileName,
              previewUrl: compressed.dataUrl,
              fileName: uniqueFileName,
              isFirebaseStorage: false
            });
            return;
          }
          reject(new Error(formatStorageErrorMessage(urlErr)));
        }
      }
    );
  });
}

/**
 * Uploads product photo to products/{timestamp}_{filename}
 */
export async function uploadProductPhoto(
  file: File,
  _sellerId = 'seller',
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'products',
    onProgress,
    allowPersistentFallback: true
  });
  return result.downloadUrl;
}

/**
 * Uploads bike rider photo to riders/{timestamp}_{filename}
 */
export async function uploadRiderPhoto(
  file: File,
  _userId = 'rider',
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'riders',
    onProgress,
    allowPersistentFallback: true
  });
  return result.downloadUrl;
}

/**
 * Uploads chat attachment photo to hub_chats/{timestamp}_{filename}
 */
export async function uploadHubChatPhoto(
  file: File,
  _userId = 'user',
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'hub_chats',
    onProgress,
    allowPersistentFallback: true
  });
  return result.downloadUrl;
}

/**
 * Uploads campus housing photo to hux/{timestamp}_{filename}
 */
export async function uploadHuxPhoto(
  file: File,
  _userId = 'user',
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'hux',
    onProgress,
    allowPersistentFallback: true
  });
  return result.downloadUrl;
}
