import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Plus,
  Settings,
  Globe,
  MessageCircle,
  ExternalLink,
  Eye,
  RefreshCw,
  Loader2,
  MapPin,
  Building2
} from 'lucide-react';
import { Category, Institution, Product, UserSettingsDocument } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import {
  createProductListing,
  getApiBaseUrl,
  setApiBaseUrl
} from '../services/api.js';
import { auth, ensureGuestAuth } from '../services/firebase.js';
import { NIGERIA_STATES } from '../constants/states.js';
import { ALL_MARKETPLACE_CATEGORIES } from '../constants/categories.js';
import {
  DEFAULT_INSTITUTION_CAMPUS,
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  getInstitutionById
} from '../constants/institutions.js';
import { formatNaira } from './ProductCard.js';
import {
  uploadImageToFirebaseStorage,
  isValidFirebaseDownloadUrl,
  UploadStage
} from '../services/imageStorage.js';
import { isValidImageFormat, estimateJsonUtf8Bytes } from '../utils/imagePersistence.js';
import { getOrCreateGuestId } from '../utils/studentAuth.js';
import { ProductImage } from './ProductImage.js';

interface SellProductModalProps {
  categories: Category[];
  selectedInstitutionId?: string;
  selectedCampus?: string;
  institutions?: Institution[];
  userSettings?: UserSettingsDocument;
  onClose: () => void;
  onSuccess: () => void;
  onRequireAuth?: () => void;
  onViewProduct?: (product: Product) => void;
}

export interface PhotoSlot {
  id: string;
  fingerprint: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'retrying' | 'finalizing' | 'success' | 'error';
  retryAttempt?: number;
  maxRetries?: number;
  errorMessage?: string;
  downloadUrl?: string;
  isFallback?: boolean;
  warningMessage?: string;
}

const MAX_FALLBACK_IMAGE_BYTES = 750 * 1024; // Keeps total Firestore document well under 1 MiB limit

function isConfirmedPersistedImageUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (isValidFirebaseDownloadUrl(trimmed)) return true;
  return trimmed.startsWith('data:image/') && trimmed.includes(';base64,') && trimmed.length > 150;
}

function getFileFingerprint(file: File): string {
  return `${file.name.toLowerCase()}::${file.size}::${file.lastModified}`;
}

function isSlotActive(status: PhotoSlot['status']): boolean {
  return (
    status === 'compressing' ||
    status === 'uploading' ||
    status === 'retrying' ||
    status === 'finalizing'
  );
}

const CAMPUS_LOCATION_CHIPS = [
  'Hostel A, 100L',
  'Hostel B, 200L',
  'New Site',
  'Main Gate',
  'Behind LT',
  'Puje',
  'Bye Pass'
];

export const SellProductModal: React.FC<SellProductModalProps> = ({
  categories,
  selectedInstitutionId = '',
  selectedCampus = '',
  institutions = VERIFIED_NIGERIAN_INSTITUTIONS,
  userSettings,
  onClose,
  onSuccess,
  onRequireAuth,
  onViewProduct
}) => {
  const { user, sellerProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCategories = categories.length > 0 ? categories : ALL_MARKETPLACE_CATEGORIES;

  const initialInstId =
    selectedInstitutionId && selectedInstitutionId !== 'all'
      ? selectedInstitutionId
      : user?.institutionId && user.institutionId !== 'all'
      ? user.institutionId
      : DEFAULT_INSTITUTION_ID;
  const initialInst = getInstitutionById(initialInstId, institutions);

  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const [customBackendUrl, setCustomBackendUrl] = useState(getApiBaseUrl());

  const [institutionId, setInstitutionId] = useState(initialInst.id);
  const [campus, setCampus] = useState(
    userSettings?.marketplace?.defaultListingCampus ||
      selectedCampus ||
      user?.campus ||
      initialInst.campus ||
      DEFAULT_INSTITUTION_CAMPUS
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [category, setCategory] = useState(activeCategories[0]?.id || 'hostel-items');
  const [condition, setCondition] = useState<'new' | 'used'>(
    userSettings?.marketplace?.defaultListingCondition || 'new'
  );
  const [state, setState] = useState(
    userSettings?.marketplace?.defaultDeliveryState ||
      userSettings?.languageRegion?.state ||
      sellerProfile?.state ||
      user?.state ||
      initialInst.state ||
      ''
  );
  const [stateManuallyChanged, setStateManuallyChanged] = useState(false);
  const [city, setCity] = useState(
    userSettings?.marketplace?.defaultDeliveryCity ||
      userSettings?.languageRegion?.city ||
      sellerProfile?.city ||
      user?.city ||
      initialInst.location ||
      ''
  );
  const [whatsapp, setWhatsapp] = useState(
    sellerProfile?.whatsappNumber || user?.whatsappNumber || user?.phone || ''
  );
  const [quantity, setQuantity] = useState('1');
  const [guestSellerName, setGuestSellerName] = useState('');

  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);

  // Per-slot isolated concurrency, cancellation, and cleanup tracking
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const uploadTasksRef = useRef<Map<string, any>>(new Map());
  const inFlightSlotsRef = useRef<Set<string>>(new Set());
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  const hasActiveUploads = photoSlots.some((s) => isSlotActive(s.status));

  const cleanupSlotHandles = (slotId: string) => {
    const controller = abortControllersRef.current.get(slotId);
    if (controller) {
      try {
        controller.abort();
      } catch {
        // ignore
      }
      abortControllersRef.current.delete(slotId);
    }
    const task = uploadTasksRef.current.get(slotId);
    if (task && typeof task.cancel === 'function') {
      try {
        task.cancel();
      } catch {
        // ignore
      }
    }
    uploadTasksRef.current.delete(slotId);
    inFlightSlotsRef.current.delete(slotId);
  };

  const revokePreviewUrl = (url?: string) => {
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      previewUrlsRef.current.delete(url);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!user && !auth.currentUser) {
      ensureGuestAuth().catch(() => {});
    }
    return () => {
      mountedRef.current = false;
      for (const slotId of Array.from(abortControllersRef.current.keys())) {
        cleanupSlotHandles(slotId);
      }
      for (const url of Array.from(previewUrlsRef.current)) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }
      previewUrlsRef.current.clear();
    };
  }, [user]);

  const handleResetForm = () => {
    for (const slotId of Array.from(abortControllersRef.current.keys())) {
      cleanupSlotHandles(slotId);
    }
    photoSlots.forEach((s) => revokePreviewUrl(s.previewUrl));
    setTitle('');
    setDescription('');
    setPrice('');
    setOriginalPrice('');
    setCategory(activeCategories[0]?.id || 'hostel-items');
    setCondition('new');
    setQuantity('1');
    setPhotoSlots([]);
    setCreatedProduct(null);
    setErrorMessage('');
  };

  const uploadSingleSlot = async (slotId: string, file: File) => {
    // Prevent duplicate concurrent uploads on the same slot
    if (inFlightSlotsRef.current.has(slotId)) {
      return;
    }

    inFlightSlotsRef.current.add(slotId);
    const controller = new AbortController();
    abortControllersRef.current.set(slotId, controller);

    if (mountedRef.current) {
      setPhotoSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'compressing',
                progress: 0,
                retryAttempt: undefined,
                maxRetries: undefined,
                errorMessage: undefined,
                downloadUrl: undefined
              }
            : s
        )
      );
    }

    try {
      if (!user && !auth.currentUser) {
        await ensureGuestAuth();
      }

      const result = await uploadImageToFirebaseStorage(file, {
        folder: 'products',
        ownerId: user?.id || auth.currentUser?.uid || getOrCreateGuestId(),
        timeoutMs: 15000,
        maxRetries: 2,
        signal: controller.signal,
        allowPersistentFallback: true,
        onStageChange: (stage: UploadStage, attempt?: number, maxRetries?: number) => {
          if (!mountedRef.current || controller.signal.aborted) return;
          setPhotoSlots((prev) =>
            prev.map((s) =>
              s.id === slotId
                ? {
                    ...s,
                    status: stage,
                    retryAttempt: stage === 'retrying' ? attempt : undefined,
                    maxRetries: stage === 'retrying' ? maxRetries : undefined
                  }
                : s
            )
          );
        },
        onProgress: (pct) => {
          if (!mountedRef.current || controller.signal.aborted) return;
          setPhotoSlots((prev) =>
            prev.map((s) =>
              s.id === slotId
                ? {
                    ...s,
                    progress: Math.max(0, Math.min(100, pct))
                  }
                : s
            )
          );
        },
        onTaskCreated: (task) => {
          if (controller.signal.aborted) {
            try {
              task.cancel();
            } catch {
              // ignore
            }
            return;
          }
          uploadTasksRef.current.set(slotId, task);
        }
      });

      if (!isConfirmedPersistedImageUrl(result.downloadUrl)) {
        throw new Error('Upload did not produce a valid persistent image URL.');
      }

      if (!mountedRef.current || controller.signal.aborted) return;

      setPhotoSlots((prev) => {
        const existingFallbackBytes = prev
          .filter((s) => s.id !== slotId && s.status === 'success' && s.isFallback && s.downloadUrl)
          .reduce((sum, s) => sum + (s.downloadUrl?.length || 0), 0);

        const nextBytes = result.isFallback ? result.downloadUrl.length : 0;
        const exceedsDocCap = result.isFallback && existingFallbackBytes + nextBytes > MAX_FALLBACK_IMAGE_BYTES;

        if (exceedsDocCap) {
          return prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  status: 'error',
                  progress: 0,
                  downloadUrl: undefined,
                  isFallback: false,
                  retryAttempt: undefined,
                  maxRetries: undefined,
                  errorMessage:
                    'Firestore 1MB fallback limit reached (Storage bucket not enabled). Keep 1–2 compressed photos or enable Firebase Storage.'
                }
              : s
          );
        }

        return prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'success',
                progress: 100,
                downloadUrl: result.downloadUrl,
                isFallback: Boolean(result.isFallback),
                warningMessage: result.warning,
                retryAttempt: undefined,
                maxRetries: undefined,
                errorMessage: undefined
              }
            : s
        );
      });
    } catch (err: any) {
      if (!mountedRef.current) return;
      const errMsg =
        controller.signal.aborted || String(err?.message || '').toLowerCase().includes('cancelled')
          ? 'Upload cancelled.'
          : err?.message || 'Upload failed. Please check your internet and click Retry.';

      setPhotoSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'error',
                progress: 0,
                downloadUrl: undefined,
                isFallback: false,
                retryAttempt: undefined,
                maxRetries: undefined,
                errorMessage: errMsg
              }
            : s
        )
      );
    } finally {
      abortControllersRef.current.delete(slotId);
      uploadTasksRef.current.delete(slotId);
      inFlightSlotsRef.current.delete(slotId);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage('');
    const incoming = Array.from(files);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const remainingCapacity = 6 - photoSlots.length;
    if (remainingCapacity <= 0) {
      setErrorMessage('Maximum of 6 photographs reached. Remove a photo to add another.');
      return;
    }

    const existingFingerprints = new Set(
      photoSlots.filter((s) => s.status !== 'error').map((s) => s.fingerprint)
    );
    const batchFingerprints = new Set<string>();
    const acceptedFiles: { file: File; fingerprint: string }[] = [];
    let skippedDuplicates = 0;
    let invalidFormatCount = 0;

    for (const file of incoming) {
      if (!isValidImageFormat(file)) {
        invalidFormatCount++;
        continue;
      }
      const fp = getFileFingerprint(file);
      if (existingFingerprints.has(fp) || batchFingerprints.has(fp)) {
        skippedDuplicates++;
        continue;
      }
      batchFingerprints.add(fp);
      acceptedFiles.push({ file, fingerprint: fp });
    }

    if (invalidFormatCount > 0 && acceptedFiles.length === 0) {
      setErrorMessage('Only JPG, JPEG, PNG, and WebP images are allowed.');
      return;
    }

    if (acceptedFiles.length > remainingCapacity) {
      setErrorMessage(
        `You can upload a maximum of 6 photographs. You can add ${remainingCapacity} more.`
      );
      return;
    }

    if (acceptedFiles.length === 0) {
      if (skippedDuplicates > 0) {
        setErrorMessage('Selected photo is already in your upload list.');
      }
      return;
    }

    const notices: string[] = [];
    if (skippedDuplicates > 0) {
      notices.push(`${skippedDuplicates} duplicate photo(s) skipped.`);
    }
    if (invalidFormatCount > 0) {
      notices.push(`${invalidFormatCount} unsupported file(s) skipped (JPG, PNG, WebP only).`);
    }
    if (notices.length > 0) {
      setErrorMessage(notices.join(' '));
    }

    const newSlots: PhotoSlot[] = acceptedFiles.map(({ file, fingerprint }) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      return {
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        fingerprint,
        file,
        previewUrl,
        progress: 0,
        status: 'compressing'
      };
    });

    setPhotoSlots((prev) => [...prev, ...newSlots]);

    // Upload all newly selected images independently & concurrently
    void Promise.allSettled(newSlots.map((slot) => uploadSingleSlot(slot.id, slot.file)));
  };

  const handleCancelUpload = (slotId: string) => {
    cleanupSlotHandles(slotId);
    setPhotoSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              status: 'error',
              progress: 0,
              downloadUrl: undefined,
              retryAttempt: undefined,
              maxRetries: undefined,
              errorMessage: 'Upload cancelled.'
            }
          : s
      )
    );
  };

  const handleRetryUpload = (slotId: string) => {
    const slot = photoSlots.find((s) => s.id === slotId);
    if (!slot || inFlightSlotsRef.current.has(slotId) || slot.status === 'success') return;
    void uploadSingleSlot(slot.id, slot.file);
  };

  const handleRemoveSlot = (slotId: string) => {
    cleanupSlotHandles(slotId);
    setPhotoSlots((prev) => {
      const target = prev.find((s) => s.id === slotId);
      if (target) revokePreviewUrl(target.previewUrl);
      return prev.filter((s) => s.id !== slotId);
    });
  };

  const handleSaveBackendUrl = () => {
    setApiBaseUrl(customBackendUrl);
    setShowBackendConfig(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    if (user?.isSuspended) {
      setErrorMessage(
        `Your seller account has been suspended: ${user.suspensionReason || 'Violation of trust & safety policy'}.`
      );
      return;
    }

    if (photoSlots.some((s) => isSlotActive(s.status))) {
      setErrorMessage('Photographs are currently uploading. Please wait for all uploads to finish before publishing.');
      return;
    }

    if (photoSlots.some((s) => s.status === 'error')) {
      setErrorMessage('One or more photographs failed or were cancelled. Click Retry Upload or remove the failed photo.');
      return;
    }

    const successfulUrls = Array.from(
      new Set(
        photoSlots
          .filter((s) => s.status === 'success' && isConfirmedPersistedImageUrl(s.downloadUrl))
          .map((s) => s.downloadUrl!.trim())
      )
    );

    if (successfulUrls.length === 0) {
      setErrorMessage('Please upload at least 1 product photograph before publishing.');
      return;
    }

    if (!title.trim() || !description.trim() || !price) {
      setErrorMessage('Please fill out product name, description, and price.');
      return;
    }

    if (!whatsapp.trim() || whatsapp.replace(/[^0-9]/g, '').length < 10) {
      setErrorMessage('Please enter a valid Nigerian WhatsApp phone number.');
      return;
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setErrorMessage('Please enter a valid price in Nigerian Naira (₦).');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const effectiveSellerId = user?.id || auth.currentUser?.uid || getOrCreateGuestId();
      const effectiveSellerName = user?.name || guestSellerName.trim() || 'Campus Market Guest';
      const effectiveShopName =
        sellerProfile?.shopName ||
        (guestSellerName.trim()
          ? `${guestSellerName.trim()}'s Store`
          : user?.name
          ? `${user.name}'s Store`
          : 'Campus Guest Store');
      const productPayload = {
        title: title.trim(),
        price: numericPrice,
        description: description.trim(),
        state: state.trim(),
        city: city.trim(),
        institutionId,
        campus,
        whatsapp: whatsapp.trim(),
        whatsappNumber: whatsapp.trim(),
        category: category.trim(),
        categoryId: category.trim(),
        condition,
        quantity: Math.max(1, Number(quantity) || 1),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        images: successfulUrls,
        imageUrl: successfulUrls[0],
        sellerId: effectiveSellerId,
        sellerName: effectiveSellerName,
        shopName: effectiveShopName
      };

      const totalPayloadBytes = estimateJsonUtf8Bytes(productPayload);
      if (totalPayloadBytes >= 960 * 1024) {
        throw new Error(
          `Product data (${Math.round(totalPayloadBytes / 1024)} KB) exceeds Firestore's 1 MB document limit. Please keep only 1–2 compressed fallback photos or enable Firebase Storage.`
        );
      }

      const res = await createProductListing(productPayload);
      onSuccess();
      if (res && res.product) {
        setCreatedProduct(res.product);
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish listing. Please check Firebase connection.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const currentSellInst = getInstitutionById(institutionId, institutions);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#10251D]">
        {/* Official Emerald Green Header */}
        <div className="bg-[#087443] border-b-4 border-[#D4A62A] text-[#FFFFFF] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black text-[#FFFFFF]">
              Post Item for FREE on <span className="text-[#D4A62A]">NIGERIA CAMPUS MARKET</span>
            </h2>
            <p className="text-xs text-[#FFFFFF]/90">
              {currentSellInst.shortName} Campus Marketplace • Genuine photos &amp; direct WhatsApp chat
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBackendConfig(!showBackendConfig)}
              className="p-2 rounded-full bg-[#065D36] border border-white/25 hover:border-[#D4A62A] text-[#FFFFFF] transition"
              title="Configure Backend API URL"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#065D36] border border-white/25 hover:border-[#D4A62A] text-[#FFFFFF] flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showBackendConfig && (
          <div className="bg-[#F4F8F5] border-b border-[#E5E7EB] p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#10251D] mb-1">
              <Globe className="w-4 h-4 text-[#087443]" />
              <span>Backend API URL Configuration</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Leave blank for default /api"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrl(e.target.value)}
                className="flex-1 p-2 bg-white border border-[#E5E7EB] rounded-lg outline-none font-mono text-xs text-[#10251D]"
              />
              <button
                type="button"
                onClick={handleSaveBackendUrl}
                className="px-3 py-2 bg-[#087443] text-white font-black rounded-lg hover:bg-[#065D36]"
              >
                Save URL
              </button>
            </div>
          </div>
        )}

        {createdProduct ? (
          <div className="p-6 sm:p-8 space-y-6 text-center max-h-[85vh] overflow-y-auto bg-white">
            <div className="w-16 h-16 bg-[#087443] border-4 border-[#D4A62A] rounded-full flex items-center justify-center mx-auto text-[#D4A62A]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-black tracking-widest uppercase text-[#087443] bg-[#F4F8F5] border border-[#087443]/30 px-3 py-1 rounded-full">
                Saved Permanently on NIGERIA CAMPUS MARKET
              </span>
              <h3 className="text-2xl font-black text-[#10251D] mt-3">Product posted successfully!</h3>
              <p className="text-xs sm:text-sm text-[#555555] max-w-md mx-auto mt-1">
                Your genuine listing and uploaded photographs are now live for {currentSellInst.shortName || 'Nigerian campus'} students.
              </p>
            </div>

            <div className="bg-[#F4F8F5] border border-[#E5E7EB] rounded-2xl p-4 text-left flex items-center gap-4 max-w-lg mx-auto">
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-[#E5E7EB] shrink-0 bg-white">
                <ProductImage
                  src={createdProduct.images?.[0]}
                  alt={createdProduct.title}
                  category={createdProduct.categoryId}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A]">
                    {createdProduct.categoryId}
                  </span>
                  <span className="text-xs text-[#555555] capitalize">{createdProduct.condition}</span>
                </div>
                <h4 className="font-bold text-[#10251D] text-sm truncate mt-1">{createdProduct.title}</h4>
                <div className="inline-block px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A] text-sm font-black mt-0.5">
                  {formatNaira(createdProduct.price)}
                </div>
                <div className="text-xs text-[#555555] mt-0.5">
                  {createdProduct.city}, {createdProduct.state}
                </div>
              </div>
            </div>

            {createdProduct.moderationStatus === 'pending_review' ? (
              <div className="p-4 bg-[#FFFDF2] border border-[#D4A62A] rounded-2xl text-left max-w-lg mx-auto text-xs text-[#10251D] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#087443]" />
                  <span>Pending Administrator Review</span>
                </div>
                <p className="text-[#555555]">Flagged for routine safety check before public feed visibility.</p>
              </div>
            ) : (
              <div className="p-4 bg-[#F4F8F5] border border-[#087443]/40 rounded-2xl text-left max-w-lg mx-auto text-xs text-[#065D36] space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#087443]" />
                  <span>Live on NIGERIA CAMPUS MARKET</span>
                </div>
                <p>Your product is active and visible across the Nigerian student marketplace.</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onViewProduct) onViewProduct(createdProduct);
                  onClose();
                }}
                className="w-full sm:w-auto px-6 py-3 bg-[#087443] hover:bg-[#065D36] text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Eye className="w-4 h-4 text-[#D4A62A]" />
                <span>View Product</span>
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-5 py-3 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Post Another</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 text-[#555555] hover:text-[#10251D] font-bold text-xs sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto bg-white">
            {errorMessage && (
              <div className="p-3 bg-[#FFF8DB] border-2 border-[#10251D] rounded-xl text-xs text-[#10251D] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#10251D] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-black">Action Required:</strong>
                  <span className="break-words">{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Product Photographs */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-[#10251D] uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#087443]" />
                  Product Photo <span className="text-[#555555] font-normal">(Max 6 • JPG, PNG, WebP)</span>
                </label>
                <span className="text-[11px] text-[#087443] font-bold">
                  {photoSlots.length}/6 ({photoSlots.filter((s) => s.status === 'success').length} ready)
                </span>
              </div>

              <p className="text-[11px] text-[#555555] mb-3 leading-relaxed">
                Upload clear photos of your item. Images &gt;1MB are compressed automatically for fast campus upload.
              </p>

              {photoSlots.some((s) => s.isFallback && s.status === 'success') && (
                <div className="mb-3 p-2.5 bg-[#FFFDF2] border border-[#D4A62A] rounded-xl text-[11px] text-[#10251D] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
                  <span>
                    Firebase Storage bucket is not enabled yet — photo(s) saved safely via compact Firestore fallback (up to 1–2 compressed photos per item).
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                {photoSlots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-[#E5E7EB] bg-[#F4F8F5] flex flex-col justify-between"
                  >
                    <img
                      src={slot.previewUrl}
                      alt={`Product photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between">
                      {idx === 0 && (
                        <span className="bg-[#087443] text-[#D4A62A] text-[9px] font-black px-1.5 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="ml-auto w-6 h-6 rounded-full bg-[#10251D] hover:bg-[#065D36] text-white flex items-center justify-center shadow"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-[#10251D]/90 p-2 text-white">
                      {slot.status === 'success' && slot.downloadUrl && (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[#D4A62A]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{slot.isFallback ? 'Saved (Fallback)' : 'Uploaded (100%)'}</span>
                          </div>
                        </div>
                      )}

                      {isSlotActive(slot.status) && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-[#D4A62A]" />
                              {slot.status === 'compressing'
                                ? 'Optimizing'
                                : slot.status === 'retrying'
                                ? `Retrying (${slot.retryAttempt || 1}/${slot.maxRetries || 2})`
                                : slot.status === 'finalizing'
                                ? 'Confirming'
                                : 'Uploading'}
                            </span>
                            <span>{slot.progress}%</span>
                          </div>
                          <div className="w-full bg-white/25 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#D4A62A] h-full transition-all duration-300"
                              style={{ width: `${slot.progress}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancelUpload(slot.id)}
                            className="w-full py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[9px] font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {slot.status === 'error' && (
                        <div className="space-y-1">
                          <div
                            className="text-[10px] text-[#D4A62A] font-semibold line-clamp-2 leading-tight"
                            title={slot.errorMessage || 'Upload failed'}
                          >
                            {slot.errorMessage || 'Upload failed'}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRetryUpload(slot.id)}
                            className="w-full py-1 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] rounded text-[10px] font-black flex items-center justify-center gap-1"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Retry Upload</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {photoSlots.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#087443]/50 hover:border-[#087443] bg-[#F4F8F5] transition flex flex-col items-center justify-center p-3 text-center text-xs font-bold text-[#087443] cursor-pointer"
                  >
                    <Upload className="w-6 h-6 mb-1 text-[#087443]" />
                    <span className="font-black">Add Photo</span>
                    <span className="text-[9px] text-[#555555] font-normal mt-0.5">JPG, PNG, WebP</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {!user && (
              <div>
                <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                  Your Name / Shop Name <span className="text-[#555555] font-normal">(Optional • Guest Post)</span>
                </label>
                <input
                  type="text"
                  name="guestSellerName"
                  placeholder="e.g., Musa Gadgets or leave blank to post as Guest"
                  value={guestSellerName}
                  onChange={(e) => setGuestSellerName(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                Product Name <span className="text-[#087443]">*</span>
              </label>
              <input
                type="text"
                required
                name="title"
                placeholder="e.g., 6-Inch Student Mattress, HP Laptop, 3kg Gas Cylinder"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                  Category <span className="text-[#087443]">*</span>
                </label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none font-semibold"
                >
                  {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                  Condition <span className="text-[#087443]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition('new')}
                    className={`py-2.5 text-xs font-black rounded-xl border transition ${
                      condition === 'new'
                        ? 'bg-[#087443] border-[#087443] text-[#D4A62A]'
                        : 'bg-[#F4F8F5] border-[#E5E7EB] text-[#444444]'
                    }`}
                  >
                    Brand New
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('used')}
                    className={`py-2.5 text-xs font-black rounded-xl border transition ${
                      condition === 'used'
                        ? 'bg-[#087443] border-[#087443] text-[#D4A62A]'
                        : 'bg-[#F4F8F5] border-[#E5E7EB] text-[#444444]'
                    }`}
                  >
                    Fairly Used
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                  Price (₦) <span className="text-[#087443]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="15000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                  Old Price (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="20000"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none"
                />
              </div>
            </div>

            {/* Seller WhatsApp */}
            <div className="p-4 rounded-2xl bg-[#F4F8F5] border border-[#087443]/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-[#10251D] uppercase flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#087443]" />
                  <span>WhatsApp Number *</span>
                </label>
                {whatsapp.trim() && (
                  <a
                    href={`https://wa.me/234${whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-black text-[#087443] hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Test Link
                  </a>
                )}
              </div>
              <input
                type="tel"
                required
                name="whatsapp"
                placeholder="Enter active WhatsApp number (e.g. 0803...)"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full p-3 bg-white border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-sm font-bold font-mono text-[#10251D] outline-none"
              />
            </div>

            {/* Institution & Campus Selector */}
            <div className="bg-[#F4F8F5] border border-[#087443]/20 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#087443] uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" />
                <span>Institution &amp; Campus</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#10251D] mb-1">
                    University / Polytechnic <span className="text-[#087443]">*</span>
                  </label>
                  <select
                    value={institutionId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setInstitutionId(nextId);
                      const inst = getInstitutionById(nextId, institutions);
                      setCampus(inst.campus || inst.campuses[0] || DEFAULT_INSTITUTION_CAMPUS);
                      if (!stateManuallyChanged && inst.state) {
                        setState(inst.state);
                      }
                    }}
                    className="w-full p-2.5 text-xs sm:text-sm bg-white border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none"
                  >
                    {(institutions && institutions.length > 0
                      ? institutions
                      : VERIFIED_NIGERIAN_INSTITUTIONS
                    ).map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.shortName} — {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#10251D] mb-1">
                    Campus <span className="text-[#087443]">*</span>
                  </label>
                  <select
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-sm bg-white border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none"
                  >
                    {getInstitutionById(institutionId, institutions).campuses.map((camp) => (
                      <option key={camp} value={camp}>
                        {camp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Campus Location (Hostel & Level + State) */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                    Hostel / Campus Location <span className="text-[#087443]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="city"
                    placeholder="e.g. Campus Gate, Hostel A, Nsukka..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                    State <span className="text-[#087443]">*</span>
                  </label>
                  <select
                    name="state"
                    value={state}
                    required
                    onChange={(e) => {
                      setStateManuallyChanged(true);
                      setState(e.target.value);
                    }}
                    className="w-full p-3 text-xs sm:text-sm bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none"
                  >
                    <option value="">Select Nigerian State</option>
                    {NIGERIA_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#555555] flex items-center gap-1 mr-1">
                  <MapPin className="w-3 h-3 text-[#087443]" /> Quick pick:
                </span>
                {CAMPUS_LOCATION_CHIPS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setCity(loc)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                      city === loc
                        ? 'bg-[#087443] text-[#D4A62A] border-[#087443]'
                        : 'bg-[#F4F8F5] text-[#333333] border-[#E5E7EB] hover:border-[#087443]'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#10251D] uppercase tracking-wider mb-1">
                Description &amp; Specs <span className="text-[#087443]">*</span>
              </label>
              <textarea
                required
                rows={3}
                name="description"
                placeholder="Describe genuine condition, specifications, and where you can meet on campus..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-[#10251D] outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-[#555555] hover:text-[#10251D] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || hasActiveUploads}
                className="px-6 py-3 font-black text-xs sm:text-sm rounded-xl bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] flex items-center gap-2 shadow disabled:opacity-50 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-[#087443]" />
                <span>
                  {submitting
                    ? 'Publishing...'
                    : hasActiveUploads
                    ? 'Uploading Photos...'
                    : 'Publish Item for FREE'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
