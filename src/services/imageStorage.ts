import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask
} from 'firebase/storage';
import { app, auth } from './firebase.js';
import { compressImageBeforeUpload, isValidImageFormat } from '../utils/imagePersistence.js';
import activeFirebaseConfig from './firebaseConfig.js';

// Initialize Firebase Storage instance with bounded retry windows (instead of 10m defaults)
let storageInstance: ReturnType<typeof getStorage> | null = null;
try {
  if (activeFirebaseConfig.storageBucket) {
    storageInstance = getStorage(app);
    storageInstance.maxUploadRetryTime = 15000;
    storageInstance.maxOperationRetryTime = 10000;
  }
} catch (err) {
  console.warn('[Firebase Storage] Init warning:', err);
}

export function getStorageInstance() {
  if (!storageInstance) {
    storageInstance = getStorage(app);
    storageInstance.maxUploadRetryTime = 15000;
    storageInstance.maxOperationRetryTime = 10000;
  }
  return storageInstance;
}

export type StorageFolder = 'products' | 'riders' | 'hub_chats' | 'hux' | 'requests';
export type UploadStage = 'compressing' | 'uploading' | 'retrying' | 'finalizing';

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  onStageChange?: (stage: UploadStage, attempt?: number, maxAttempts?: number) => void;
  timeoutMs?: number;
  maxRetries?: number;
  folder?: StorageFolder;
  ownerId?: string;
  onTaskCreated?: (task: UploadTask) => void;
  signal?: AbortSignal;
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
    code === 'storage/bucket-not-found' ||
    code === 'storage/project-not-found' ||
    message.includes('bucket-not-found') ||
    message.includes('NoSuchBucket') ||
    message.includes('Not enabled') ||
    message.includes('404')
  );
}

function isPermanentUploadError(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === 'storage/canceled' ||
    code === 'storage/unauthorized' ||
    code === 'storage/permission-denied' ||
    code === 'storage/quota-exceeded' ||
    code === 'storage/invalid-argument' ||
    code === 'storage/invalid-checksum' ||
    isBucketUnprovisionedError(error) ||
    message.includes('cancelled') ||
    message.includes('canceled') ||
    message.includes('only jpg') ||
    message.includes('over 3mb') ||
    message.includes('too large')
  );
}

/**
 * Probes whether the configured Firebase Storage bucket actually exists.
 * Google returns HTTP 404 only when the bucket has not been created/enabled yet
 * (an active bucket returns 200 or 403). Cached briefly per bucket per session.
 */
const bucketCheckCache = new Map<string, { exists: boolean; checkedAt: number }>();

async function checkStorageBucketProvisioned(bucket: string): Promise<boolean | null> {
  if (!bucket) return false;
  const cached = bucketCheckCache.get(bucket);
  if (cached && Date.now() - cached.checkedAt < 60000) {
    return cached.exists;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o`, {
      method: 'GET',
      signal: controller.signal
    });
    const exists = res.status !== 404;
    bucketCheckCache.set(bucket, { exists, checkedAt: Date.now() });
    return exists;
  } catch {
    // Offline or DNS failure -> unknown (treat as transient network issue)
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function isValidFirebaseDownloadUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://firebasestorage.googleapis.com/') ||
    trimmed.startsWith('https://storage.googleapis.com/')
  );
}

/**
 * Parses Firebase Storage errors into actionable, exact user messages.
 */
export function formatStorageErrorMessage(error: any): string {
  const code = String(error?.code || '');
  const message = String(error?.message || error || 'Unknown error');
  const bucket = activeFirebaseConfig.storageBucket || `${activeFirebaseConfig.projectId || 'zangamarket1'}.firebasestorage.app`;

  if (code === 'storage/canceled' || message.toLowerCase().includes('cancelled') || message.toLowerCase().includes('canceled')) {
    return 'Upload cancelled.';
  }

  if (isBucketUnprovisionedError(error)) {
    return `Firebase Storage bucket (${bucket}) is not enabled yet. Open Firebase Console > Storage > Get Started, then retry.`;
  }

  if (code === 'storage/unauthorized' || code === 'storage/permission-denied') {
    return 'Upload failed: Permission denied by Firebase Storage rules. Please verify Storage rules allow image uploads.';
  }

  if (code === 'storage/quota-exceeded') {
    return `Upload failed: Storage quota exceeded for project ${activeFirebaseConfig.projectId || 'zangamarket1'}.`;
  }

  if (
    code === 'storage/retry-limit-exceeded' ||
    code === 'storage/unknown' ||
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('timed out') ||
    message.toLowerCase().includes('network')
  ) {
    return 'Upload failed due to a network issue or unreachable storage server. Please check your connection and click Retry.';
  }

  return message.startsWith('Upload failed:') ? message : `Upload failed: ${message}`;
}

function waitWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Upload cancelled.'));
      return;
    }
    const timer = setTimeout(() => {
      if (signal && onAbort) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Upload cancelled.'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * Executes a single isolated Firebase Storage uploadBytesResumable attempt with
 * inactivity stall detection and zero-byte bucket reachability checks.
 */
async function executeSingleUploadAttempt(params: {
  storage: ReturnType<typeof getStorage>;
  storagePath: string;
  file: File;
  timeoutMs: number;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  onStageChange?: (stage: UploadStage, attempt?: number, maxAttempts?: number) => void;
  onTaskCreated?: (task: UploadTask) => void;
}): Promise<string> {
  const { storage, storagePath, file, timeoutMs, signal, onProgress, onStageChange, onTaskCreated } = params;

  if (signal?.aborted) {
    throw new Error('Upload cancelled.');
  }

  const bucket = activeFirebaseConfig.storageBucket || storage.app.options.storageBucket || '';
  const fileRef = ref(storage, storagePath);
  const metadata = {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000'
  };

  return new Promise<string>((resolve, reject) => {
    let isSettled = false;
    let lastProgressAt = Date.now();
    let maxBytesTransferred = 0;
    let inactivityTimer: ReturnType<typeof setInterval> | null = null;
    let zeroByteCheckTimer: ReturnType<typeof setTimeout> | null = null;

    const uploadTask = uploadBytesResumable(fileRef, file, metadata);
    if (onTaskCreated) {
      onTaskCreated(uploadTask);
    }

    const cleanup = () => {
      if (inactivityTimer) {
        clearInterval(inactivityTimer);
        inactivityTimer = null;
      }
      if (zeroByteCheckTimer) {
        clearTimeout(zeroByteCheckTimer);
        zeroByteCheckTimer = null;
      }
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const cancelTaskSafely = () => {
      try {
        uploadTask.cancel();
      } catch {
        // Ignore if task already terminated
      }
    };

    const fail = (err: Error) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      reject(err);
    };

    const onAbort = () => {
      cancelTaskSafely();
      const cancelErr: any = new Error('Upload cancelled.');
      cancelErr.code = 'storage/canceled';
      fail(cancelErr);
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    // Fast-fail if upload never moves past 0 bytes because the bucket does not exist (404/CORS)
    zeroByteCheckTimer = setTimeout(async () => {
      if (isSettled || maxBytesTransferred > 0) return;
      const bucketExists = await checkStorageBucketProvisioned(bucket);
      if (isSettled || maxBytesTransferred > 0) return;
      if (bucketExists === false) {
        cancelTaskSafely();
        const notFoundErr: any = new Error(
          `Firebase Storage bucket (${bucket}) is not enabled yet (404 Not Found).`
        );
        notFoundErr.code = 'storage/bucket-not-found';
        fail(notFoundErr);
      }
    }, 3500);

    // Stall / inactivity detection: resets whenever bytesTransferred increases
    inactivityTimer = setInterval(() => {
      if (isSettled) return;
      const idleMs = Date.now() - lastProgressAt;
      if (idleMs >= timeoutMs) {
        cancelTaskSafely();
        const timeoutErr: any = new Error('Upload timed out due to stalled connection.');
        timeoutErr.code = 'storage/retry-limit-exceeded';
        fail(timeoutErr);
      }
    }, 1000);

    let lastReportedPct = 10;

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (isSettled) return;
        const total = snapshot.totalBytes || file.size || 1;
        if (snapshot.bytesTransferred > maxBytesTransferred) {
          maxBytesTransferred = snapshot.bytesTransferred;
          lastProgressAt = Date.now();
        }
        const rawRatio = Math.min(1, Math.max(0, snapshot.bytesTransferred / total));
        const mapped = Math.min(95, Math.max(lastReportedPct, Math.round(10 + rawRatio * 85)));
        lastReportedPct = mapped;
        onStageChange?.('uploading');
        onProgress?.(mapped);
      },
      async (error: any) => {
        if (isSettled) return;

        // If Firebase threw storage/unknown or retry-limit-exceeded, check whether bucket exists (404 vs network)
        if (error?.code === 'storage/unknown' || error?.code === 'storage/retry-limit-exceeded') {
          const bucketExists = await checkStorageBucketProvisioned(bucket);
          if (bucketExists === false) {
            const notFoundErr: any = new Error(
              `Firebase Storage bucket (${bucket}) is not enabled yet (404 Not Found).`
            );
            notFoundErr.code = 'storage/bucket-not-found';
            fail(notFoundErr);
            return;
          }
        }

        fail(error);
      },
      async () => {
        if (isSettled) return;
        try {
          onStageChange?.('finalizing');
          onProgress?.(98);
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (!isValidFirebaseDownloadUrl(downloadUrl)) {
            throw new Error('Firebase returned an invalid download URL.');
          }
          if (signal?.aborted) {
            const cancelErr: any = new Error('Upload cancelled.');
            cancelErr.code = 'storage/canceled';
            fail(cancelErr);
            return;
          }
          isSettled = true;
          cleanup();
          onProgress?.(100);
          resolve(downloadUrl);
        } catch (urlErr: any) {
          fail(urlErr);
        }
      }
    );
  });
}

/**
 * Uploads an image to Firebase Storage with:
 * - Pre-compression & validation
 * - Genuine 0%-100% progress tracking (never 100% before getDownloadURL resolves)
 * - Automatic exponential-backoff retry for transient failures
 * - AbortSignal cancellation & per-upload isolation
 */
export async function uploadImageToFirebaseStorage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    onProgress,
    onStageChange,
    timeoutMs = 25000,
    maxRetries = 2,
    folder = 'products',
    ownerId,
    onTaskCreated,
    signal
  } = options;

  if (signal?.aborted) {
    throw new Error('Upload cancelled.');
  }

  if (!isValidImageFormat(file)) {
    throw new Error('Only JPG, JPEG, PNG, and WebP images are allowed.');
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('No internet connection. Please reconnect and try again.');
  }

  // 1. Compress in browser once before attempting network upload
  onStageChange?.('compressing');
  onProgress?.(2);
  const compressed = await compressImageBeforeUpload(file, {
    signal,
    includeDataUrl: false
  });
  if (signal?.aborted) {
    throw new Error('Upload cancelled.');
  }
  onProgress?.(10);

  // Use authenticated Firebase UID when signed in so storage.rules (request.auth.uid == sellerId) always matches
  const effectiveOwner = auth.currentUser?.uid || ownerId || 'anonymous';
  const ownerSegment = sanitizePathSegment(effectiveOwner, 'anonymous');

  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  const cleanOriginalName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const uniqueFileName = `${timestamp}_${rand}_${cleanOriginalName || 'photo'}.jpg`;
  const storagePath = `${folder}/${ownerSegment}/${uniqueFileName}`;

  const storage = getStorageInstance();

  // Quick fail if bucket doesn't exist before entering retries
  const bucket = activeFirebaseConfig.storageBucket || storage.app.options.storageBucket || '';
  const initialBucketCheck = await checkStorageBucketProvisioned(bucket);
  if (initialBucketCheck === false) {
    const err: any = new Error(
      `Firebase Storage bucket (${bucket}) is not enabled yet (404 Not Found).`
    );
    err.code = 'storage/bucket-not-found';
    throw new Error(formatStorageErrorMessage(err));
  }

  let lastError: any = null;
  const totalAttempts = Math.max(1, maxRetries + 1);

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    if (signal?.aborted) {
      throw new Error('Upload cancelled.');
    }

    if (attempt > 1) {
      const backoffMs = Math.min(4000, 1000 * Math.pow(2, attempt - 2));
      onStageChange?.('retrying', attempt - 1, maxRetries);
      onProgress?.(10);
      await waitWithAbort(backoffMs, signal);
    }

    onStageChange?.('uploading', attempt, totalAttempts);

    try {
      const downloadUrl = await executeSingleUploadAttempt({
        storage,
        storagePath,
        file: compressed.file,
        timeoutMs,
        signal,
        onProgress,
        onStageChange,
        onTaskCreated
      });

      return {
        downloadUrl,
        storagePath,
        previewUrl: downloadUrl,
        fileName: uniqueFileName,
        isFirebaseStorage: true
      };
    } catch (err: any) {
      lastError = err;
      if (signal?.aborted || isPermanentUploadError(err)) {
        break;
      }
      console.warn(`[Firebase Storage] Attempt ${attempt}/${totalAttempts} failed (${err?.code || err?.message}).`);
    }
  }

  throw new Error(formatStorageErrorMessage(lastError));
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
    allowPersistentFallback: false
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
    onTaskCreated
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
    onTaskCreated
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
    onTaskCreated
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
    onTaskCreated
  });
  return result.downloadUrl;
}
