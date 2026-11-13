import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask
} from 'firebase/storage';
import { app } from './firebase.js';
import { compressImageBeforeUpload, isValidImageFormat } from '../utils/imagePersistence.js';
import activeFirebaseConfig from './firebaseConfig.js';

// Initialize Firebase Storage instance
let storageInstance: ReturnType<typeof getStorage> | null = null;
try {
  if (activeFirebaseConfig.storageBucket) {
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

export type StorageFolder = 'products' | 'riders' | 'hub_chats' | 'hux' | 'requests';

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  timeoutMs?: number;
  folder?: StorageFolder;
  ownerId?: string;
  onTaskCreated?: (task: UploadTask) => void;
  allowPersistentFallback?: boolean;
}

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  previewUrl: string;
  fileName: string;
  isFirebaseStorage: boolean;
  warning?: string;
}

function sanitizePathSegment(value: string, fallback: string): string {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 48);
  return cleaned || fallback;
}

function isBucketUnprovisionedError(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code === 'storage/unknown' ||
    code === 'storage/bucket-not-found' ||
    code === 'storage/project-not-found' ||
    message.includes('404') ||
    message.includes('Not Found')
  );
}

/**
 * Parses Firebase Storage errors into actionable, exact user messages.
 */
export function formatStorageErrorMessage(error: any): string {
  const code = String(error?.code || '');
  const message = String(error?.message || error || 'Unknown error');

  if (code === 'storage/canceled') {
    return 'Upload cancelled.';
  }

  if (isBucketUnprovisionedError(error)) {
    return 'Storage not enabled. Go to Firebase Console > Storage > Get Started > Start in test mode';
  }

  if (code === 'storage/unauthorized' || code === 'storage/permission-denied') {
    return 'Upload failed: Permission denied by storage rules. Please verify Firebase Storage rules.';
  }

  if (code === 'storage/quota-exceeded') {
    return `Upload failed: Storage quota exceeded for project ${activeFirebaseConfig.projectId || 'zangamarket1'}.`;
  }

  if (
    code === 'storage/retry-limit-exceeded' ||
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('network')
  ) {
    return 'Upload failed: Network timeout. Please check your internet connection and retry.';
  }

  return `Upload failed: ${message} - Please check internet or enable Storage`;
}

/**
 * Uploads an image to Firebase Storage with canvas pre-compression, 30s timeout,
 * unique owner-scoped paths, progress callback, and real cancel/retry error handling.
 */
export async function uploadImageToFirebaseStorage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    onProgress,
    timeoutMs = 30000,
    folder = 'products',
    ownerId,
    onTaskCreated,
    allowPersistentFallback = true
  } = options;

  if (!isValidImageFormat(file)) {
    throw new Error('Only JPG, JPEG, PNG, and WebP images are allowed.');
  }

  // 1. In-browser compression (>1MB -> 1024px, quality 0.7 JPEG, target <=800KB, reject >3MB)
  if (onProgress) onProgress(5);
  const compressed = await compressImageBeforeUpload(file);
  if (onProgress) onProgress(15);

  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  const cleanOriginalName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const uniqueFileName = `${timestamp}_${rand}_${cleanOriginalName || 'photo'}.jpg`;
  const ownerSegment = sanitizePathSegment(ownerId || '', 'anonymous');
  const storagePath = `${folder}/${ownerSegment}/${uniqueFileName}`;

  let storage: ReturnType<typeof getStorage>;
  try {
    storage = getStorageInstance();
  } catch (initErr: any) {
    const msg = 'Storage not enabled. Go to Firebase Console > Storage > Get Started > Start in test mode';
    if (allowPersistentFallback) {
      console.warn('[Firebase Storage] Unavailable, using compressed image fallback:', initErr?.message);
      if (onProgress) onProgress(100);
      return {
        downloadUrl: compressed.dataUrl,
        storagePath: `inline/${storagePath}`,
        previewUrl: compressed.dataUrl,
        fileName: uniqueFileName,
        isFirebaseStorage: false,
        warning: msg
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
    let timedOut = false;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

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

    // Enforce 30-second timeout and cancel task if exceeded
    timeoutTimer = setTimeout(() => {
      if (!isSettled) {
        timedOut = true;
        isSettled = true;
        try {
          uploadTask.cancel();
        } catch {
          // ignore
        }
        cleanup();
        reject(new Error('Upload failed: Operation timed out (>30s). Check your internet connection and click Retry.'));
      }
    }, timeoutMs);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (isSettled) return;
        const total = snapshot.totalBytes || compressed.file.size || 1;
        const rawPercent = (snapshot.bytesTransferred / total) * 100;
        const mapped = Math.min(95, Math.max(15, Math.round(15 + rawPercent * 0.8)));
        if (onProgress) {
          onProgress(mapped);
        }
      },
      (error) => {
        cleanup();
        if (isSettled || timedOut) return;
        isSettled = true;

        console.error('[Firebase Storage Upload Error]:', error);

        // User explicitly cancelled -> ALWAYS reject immediately, never silently fallback
        if (error?.code === 'storage/canceled') {
          reject(new Error('Upload cancelled by user.'));
          return;
        }

        // Permission, quota, or network retry-limit errors -> ALWAYS reject with clear message
        if (
          error?.code === 'storage/unauthorized' ||
          error?.code === 'storage/permission-denied' ||
          error?.code === 'storage/quota-exceeded' ||
          error?.code === 'storage/retry-limit-exceeded'
        ) {
          reject(new Error(formatStorageErrorMessage(error)));
          return;
        }

        // Only if the Firebase Storage bucket itself is unprovisioned (404 / bucket-not-found)
        // allow saving the compressed image (<800KB) so students aren't stuck if Console Storage hasn't clicked Get Started.
        if (allowPersistentFallback && isBucketUnprovisionedError(error)) {
          const msg = formatStorageErrorMessage(error);
          console.warn('[Firebase Storage] Bucket not enabled in Console yet. Saving compressed image (<800KB).');
          if (onProgress) onProgress(100);
          resolve({
            downloadUrl: compressed.dataUrl,
            storagePath: `inline/${storagePath}`,
            previewUrl: compressed.dataUrl,
            fileName: uniqueFileName,
            isFirebaseStorage: false,
            warning: msg
          });
          return;
        }

        reject(new Error(formatStorageErrorMessage(error)));
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
          reject(new Error(formatStorageErrorMessage(urlErr)));
        }
      }
    );
  });
}

/**
 * Uploads product photo to products/{sellerId}/{uniqueFileName}
 */
export async function uploadProductPhoto(
  file: File,
  sellerId = 'seller',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'products',
    ownerId: sellerId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
  return result.downloadUrl;
}

/**
 * Uploads bike rider photo to riders/{userId}/{uniqueFileName}
 */
export async function uploadRiderPhoto(
  file: File,
  userId = 'rider',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'riders',
    ownerId: userId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
  return result.downloadUrl;
}

/**
 * Uploads chat attachment photo to hub_chats/{userId}/{uniqueFileName}
 */
export async function uploadHubChatPhoto(
  file: File,
  userId = 'user',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'hub_chats',
    ownerId: userId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
  return result.downloadUrl;
}

/**
 * Uploads campus housing photo to hux/{userId}/{uniqueFileName}
 */
export async function uploadHuxPhoto(
  file: File,
  userId = 'user',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'hux',
    ownerId: userId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
  return result.downloadUrl;
}

/**
 * Uploads student request photo to requests/{userId}/{uniqueFileName}
 */
export async function uploadRequestPhoto(
  file: File,
  userId = 'user',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'requests',
    ownerId: userId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
  return result.downloadUrl;
}
