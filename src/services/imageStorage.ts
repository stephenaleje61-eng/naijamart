import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask
} from 'firebase/storage';
import { app, auth } from './firebase.js';
import {
  compressImageBeforeUpload,
  compressImageForFirestoreFallback,
  isValidImageFormat
} from '../utils/imagePersistence.js';
import activeFirebaseConfig from './firebaseConfig.js';

function configureStorageLimits(instance: ReturnType<typeof getStorage>) {
  instance.maxUploadRetryTime = 15000;
  instance.maxOperationRetryTime = 10000;
  return instance;
}

// Track resolved working Storage bucket (handles .firebasestorage.app vs .appspot.com cleanly)
const bucketCheckCache = new Map<string, { exists: boolean; checkedAt: number }>();

function getCandidateBuckets(): string[] {
  const projectId = activeFirebaseConfig.projectId || 'zangamarket1';
  const configured = activeFirebaseConfig.storageBucket || `${projectId}.firebasestorage.app`;
  const candidates = [
    configured,
    `${projectId}.firebasestorage.app`,
    `${projectId}.appspot.com`
  ];
  return Array.from(new Set(candidates.filter(Boolean)));
}

async function checkStorageBucketProvisioned(bucket: string): Promise<boolean | null> {
  if (!bucket) return false;
  const cached = bucketCheckCache.get(bucket);
  if (cached && Date.now() - cached.checkedAt < 60000) {
    return cached.exists;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
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

export async function resolveWorkingStorageBucket(): Promise<{
  bucket: string;
  provisioned: boolean | null;
}> {
  const candidates = getCandidateBuckets();
  let unknownResult: string | null = null;

  for (const candidate of candidates) {
    const status = await checkStorageBucketProvisioned(candidate);
    if (status === true) {
      return { bucket: candidate, provisioned: true };
    }
    if (status === null && !unknownResult) {
      unknownResult = candidate;
    }
  }

  if (unknownResult) {
    return { bucket: unknownResult, provisioned: null };
  }

  return { bucket: candidates[0], provisioned: false };
}

export function getStorageInstance(bucketOverride?: string) {
  if (bucketOverride && bucketOverride !== activeFirebaseConfig.storageBucket) {
    return configureStorageLimits(getStorage(app, `gs://${bucketOverride}`));
  }
  return configureStorageLimits(getStorage(app));
}

export type StorageFolder =
  | 'products'
  | 'riders'
  | 'hub_chats'
  | 'hux'
  | 'requests'
  | 'events'
  | 'sport_updates'
  | 'general_announcements'
  | 'advertisements'
  | 'ad_logos'
  | 'ad_requests'
  | 'services'
  | 'emergency_reports'
  | 'lost_and_found'
  | 'ceo_verification_logos'
  | 'food'
  | 'books'
  | 'deals'
  | 'agent_kyc'
  | 'avatars'
  | 'scam_evidence'
  | 'student_posts'
  | 'student_verifications'
  | 'appeal_evidence';
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
  isFallback?: boolean;
  payloadBytes?: number;
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
    message.includes('404 Not Found')
  );
}

function isFallbackEligibleError(error: any): boolean {
  const code = String(error?.code || '');
  return (
    isBucketUnprovisionedError(error) ||
    code === 'storage/unauthorized' ||
    code === 'storage/permission-denied' ||
    code === 'storage/unauthenticated'
  );
}

function isPermanentUploadError(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === 'storage/canceled' ||
    code === 'storage/unauthorized' ||
    code === 'storage/permission-denied' ||
    code === 'storage/unauthenticated' ||
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

export function isValidFirebaseDownloadUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://firebasestorage.googleapis.com/') ||
    trimmed.startsWith('https://storage.googleapis.com/')
  );
}

/**
 * Parses Firebase Storage errors into exact, developer- & user-clear messages including the Firebase error code.
 */
export function formatStorageErrorMessage(error: any): string {
  const code = String(error?.code || '');
  const message = String(error?.message || error || 'Unknown error');
  const bucket = activeFirebaseConfig.storageBucket || `${activeFirebaseConfig.projectId || 'zangamarket1'}.firebasestorage.app`;

  if (code === 'storage/canceled' || message.toLowerCase().includes('cancelled') || message.toLowerCase().includes('canceled')) {
    return 'Upload cancelled.';
  }

  if (isBucketUnprovisionedError(error)) {
    return `[${code || 'storage/bucket-not-found'}] Firebase Storage bucket (${bucket}) is not enabled yet in Firebase Console > Storage > Get Started.`;
  }

  if (code === 'storage/unauthorized' || code === 'storage/permission-denied' || code === 'storage/unauthenticated') {
    return `[${code}] Permission denied by Firebase Storage rules. Ensure Anonymous/Google Auth & Storage rules are published.`;
  }

  if (code === 'storage/quota-exceeded') {
    return `[${code}] Storage quota exceeded for project ${activeFirebaseConfig.projectId || 'zangamarket1'}.`;
  }

  if (
    code === 'storage/retry-limit-exceeded' ||
    code === 'storage/unknown' ||
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('timed out') ||
    message.toLowerCase().includes('network')
  ) {
    return `[${code || 'storage/network-timeout'}] Upload timed out or server unreachable. Please check your connection and tap Retry.`;
  }

  return code ? `[${code}] ${message}` : `Upload failed: ${message}`;
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

async function executeSingleUploadAttempt(params: {
  storage: ReturnType<typeof getStorage>;
  bucket: string;
  storagePath: string;
  file: File;
  timeoutMs: number;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  onStageChange?: (stage: UploadStage, attempt?: number, maxAttempts?: number) => void;
  onTaskCreated?: (task: UploadTask) => void;
}): Promise<string> {
  const { storage, bucket, storagePath, file, timeoutMs, signal, onProgress, onStageChange, onTaskCreated } = params;

  if (signal?.aborted) {
    throw new Error('Upload cancelled.');
  }

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
        // Ignore
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

    // Fast-fail if upload stalls at 0 bytes because the bucket does not exist (404)
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

    // 15s inactivity/stall timeout detection
    inactivityTimer = setInterval(() => {
      if (isSettled) return;
      const idleMs = Date.now() - lastProgressAt;
      if (idleMs >= timeoutMs) {
        cancelTaskSafely();
        const timeoutErr: any = new Error(`Upload timed out after ${Math.round(timeoutMs / 1000)}s due to stalled connection.`);
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
 * - ~500 KB EXIF-preserving browser compression
 * - Automatic bucket resolution (.firebasestorage.app vs .appspot.com)
 * - 15-second stall timeout + AbortSignal cancellation + retries
 * - Controlled compressed base64 fallback ONLY when allowPersistentFallback is true & Storage is unprovisioned/blocked
 */
export async function uploadImageToFirebaseStorage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    onProgress,
    onStageChange,
    timeoutMs = 15000,
    maxRetries = 2,
    folder = 'products',
    ownerId,
    onTaskCreated,
    signal,
    allowPersistentFallback = false
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

  // 1. Compress in browser once (~500KB target, preserving EXIF orientation)
  onStageChange?.('compressing');
  onProgress?.(5);
  const compressed = await compressImageBeforeUpload(file, {
    signal,
    includeDataUrl: false
  });
  if (signal?.aborted) {
    throw new Error('Upload cancelled.');
  }
  onProgress?.(10);

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

  const { bucket, provisioned } = await resolveWorkingStorageBucket();
  const storage = getStorageInstance(bucket);

  const buildFallbackResult = async (reasonErr: any): Promise<UploadResult> => {
    onStageChange?.('finalizing');
    onProgress?.(85);
    const fallbackCompressed = await compressImageForFirestoreFallback(file, signal);
    if (!fallbackCompressed.dataUrl) {
      throw new Error(formatStorageErrorMessage(reasonErr));
    }
    onProgress?.(100);
    return {
      downloadUrl: fallbackCompressed.dataUrl,
      storagePath: `firestore-fallback/${ownerSegment}/${uniqueFileName}`,
      previewUrl: fallbackCompressed.dataUrl,
      fileName: uniqueFileName,
      isFirebaseStorage: false,
      isFallback: true,
      payloadBytes: fallbackCompressed.dataUrl.length,
      warning: `${formatStorageErrorMessage(reasonErr)} Used compact Firestore fallback (${Math.round(fallbackCompressed.size / 1024)} KB).`
    };
  };

  if (provisioned === false) {
    const bucketErr: any = new Error(
      `Firebase Storage bucket (${bucket}) is not enabled yet (404 Not Found).`
    );
    bucketErr.code = 'storage/bucket-not-found';
    if (allowPersistentFallback) {
      return await buildFallbackResult(bucketErr);
    }
    throw new Error(formatStorageErrorMessage(bucketErr));
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
        bucket,
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
        isFirebaseStorage: true,
        isFallback: false
      };
    } catch (err: any) {
      lastError = err;
      if (signal?.aborted || isPermanentUploadError(err)) {
        break;
      }
      console.warn(`[Firebase Storage] Attempt ${attempt}/${totalAttempts} failed (${err?.code || err?.message}).`);
    }
  }

  if (allowPersistentFallback && lastError && isFallbackEligibleError(lastError)) {
    return await buildFallbackResult(lastError);
  }

  throw new Error(formatStorageErrorMessage(lastError));
}

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

export async function uploadEventPosterPhoto(
  file: File,
  ceoId = 'ceo',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadResult> {
  return uploadImageToFirebaseStorage(file, {
    folder: 'events',
    ownerId: ceoId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
}

export async function uploadAnnouncementPhoto(
  file: File,
  folder: 'sport_updates' | 'general_announcements',
  userId = 'user',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadResult> {
  return uploadImageToFirebaseStorage(file, {
    folder,
    ownerId: userId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
}

export async function uploadAdvertisementImage(
  file: File,
  ownerId = 'advertiser',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadResult> {
  return uploadImageToFirebaseStorage(file, {
    folder: 'advertisements',
    ownerId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
}

export async function uploadAdLogoImage(
  file: File,
  ownerId = 'advertiser',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadResult> {
  return uploadImageToFirebaseStorage(file, {
    folder: 'ad_logos',
    ownerId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
}

export async function uploadAdRequestAttachment(
  file: File,
  ownerId = 'requester',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadResult> {
  return uploadImageToFirebaseStorage(file, {
    folder: 'ad_requests',
    ownerId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
}

export async function uploadServicePhoto(
  file: File,
  providerId = 'provider',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadResult> {
  return uploadImageToFirebaseStorage(file, {
    folder: 'services',
    ownerId: providerId,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
}

export async function uploadEmergencyAttachment(
  file: File,
  reporterUid = 'reporter',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadResult> {
  return uploadImageToFirebaseStorage(file, {
    folder: 'emergency_reports',
    ownerId: reporterUid,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
}

export async function uploadLostFoundPhoto(
  file: File,
  reporterUid = 'reporter',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadResult> {
  return uploadImageToFirebaseStorage(file, {
    folder: 'lost_and_found',
    ownerId: reporterUid,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
}

export async function uploadCeoVerificationLogo(
  file: File,
  ceoUid = 'ceo',
  onProgress?: (percent: number) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadResult> {
  return uploadImageToFirebaseStorage(file, {
    folder: 'ceo_verification_logos',
    ownerId: ceoUid,
    onProgress,
    onTaskCreated,
    allowPersistentFallback: true
  });
}



