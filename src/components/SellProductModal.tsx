import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Clock,
  ShieldCheck,
  Plus,
  Settings,
  Globe,
  MessageCircle,
  Phone,
  ExternalLink,
  Eye,
  Check,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Category, Product } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import {
  createProductListing,
  getApiBaseUrl,
  setApiBaseUrl
} from '../services/api.js';
import { NIGERIA_STATES } from '../constants/states.js';
import { formatNaira } from './ProductCard.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { isValidImageFormat } from '../utils/imagePersistence.js';
import { ProductImage } from './ProductImage.js';

interface SellProductModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
  onRequireAuth: () => void;
  onViewProduct?: (product: Product) => void;
}

export interface PhotoSlot {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  downloadUrl?: string;
  task?: any;
}

export const SellProductModal: React.FC<SellProductModalProps> = ({
  categories,
  onClose,
  onSuccess,
  onRequireAuth,
  onViewProduct
}) => {
  const { user, sellerProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backend URL configuration setting (for Render or self-hosted backend)
  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const [customBackendUrl, setCustomBackendUrl] = useState(getApiBaseUrl());

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'phones-tablets');
  const [condition, setCondition] = useState<'new' | 'used'>('new');
  const [state, setState] = useState(sellerProfile?.state || user?.state || 'Lagos');
  const [city, setCity] = useState(sellerProfile?.city || user?.city || 'Ikeja');
  const [whatsapp, setWhatsapp] = useState(
    sellerProfile?.whatsappNumber || user?.whatsappNumber || user?.phone || '08012345678'
  );
  const [quantity, setQuantity] = useState('1');

  // Photo Slots State (immediate thumbnail previews, 0-100% progress, retry & remove)
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);

  const handleResetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setOriginalPrice('');
    setCategory(categories[0]?.id || 'phones-tablets');
    setCondition('new');
    setQuantity('1');
    setPhotoSlots([]);
    setCreatedProduct(null);
    setErrorMessage('');
  };

  // Upload a single photo slot with 30s timeout, canvas compression, and real progress
  const uploadSingleSlot = async (slotId: string, file: File) => {
    setPhotoSlots(prev =>
      prev.map(s => (s.id === slotId ? { ...s, status: 'compressing', progress: 10, errorMessage: undefined } : s))
    );

    try {
      const result = await uploadImageToFirebaseStorage(file, {
        folder: 'products',
        timeoutMs: 30000,
        onProgress: (pct) => {
          setPhotoSlots(prev =>
            prev.map(s => (s.id === slotId ? { ...s, progress: pct, status: 'uploading' } : s))
          );
        },
        onTaskCreated: (task) => {
          setPhotoSlots(prev =>
            prev.map(s => (s.id === slotId ? { ...s, task } : s))
          );
        },
        allowPersistentFallback: true
      });

      setPhotoSlots(prev =>
        prev.map(s =>
          s.id === slotId
            ? {
                ...s,
                status: 'success',
                progress: 100,
                downloadUrl: result.downloadUrl,
                previewUrl: result.previewUrl || s.previewUrl
              }
            : s
        )
      );
    } catch (err: any) {
      console.error('[Upload slot error]:', err);
      setPhotoSlots(prev =>
        prev.map(s =>
          s.id === slotId
            ? {
                ...s,
                status: 'error',
                errorMessage: err.message || 'Upload failed. Please check internet or enable Storage.'
              }
            : s
        )
      );
    }
  };

  // Handle image files selection: immediate thumbnails & one-by-one sequential upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage('');
    const incoming = Array.from(files);

    if (photoSlots.length + incoming.length > 6) {
      setErrorMessage(`You can upload a maximum of 6 photographs. You currently have ${photoSlots.length}.`);
      return;
    }

    // Validate format: JPG, PNG, WEBP only
    for (const file of incoming) {
      if (!isValidImageFormat(file)) {
        setErrorMessage('Only JPG, PNG, and WebP images are allowed.');
        return;
      }
    }

    // 1. Immediately create preview thumbnails for all selected files
    const newSlots: PhotoSlot[] = incoming.map(file => ({
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'compressing'
    }));

    setPhotoSlots(prev => [...prev, ...newSlots]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 2. Upload one by one sequentially (not all at once)
    setIsProcessingQueue(true);
    for (const slot of newSlots) {
      await uploadSingleSlot(slot.id, slot.file);
    }
    setIsProcessingQueue(false);
  };

  const handleRetryUpload = async (slotId: string) => {
    const slot = photoSlots.find(s => s.id === slotId);
    if (!slot) return;
    await uploadSingleSlot(slot.id, slot.file);
  };

  const handleRemoveSlot = (slotId: string) => {
    setPhotoSlots(prev => {
      const target = prev.find(s => s.id === slotId);
      if (target?.task && typeof target.task.cancel === 'function') {
        try { target.task.cancel(); } catch {}
      }
      return prev.filter(s => s.id !== slotId);
    });
  };

  const handleSaveBackendUrl = () => {
    setApiBaseUrl(customBackendUrl);
    setShowBackendConfig(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('You must be signed in as a registered seller to post products on NaijaMart.');
      onRequireAuth();
      return;
    }

    if (user.isSuspended) {
      setErrorMessage(`Your seller account has been suspended: ${user.suspensionReason || 'Violation of trust & safety policy'}. Contact support.`);
      return;
    }

    // Check if any photograph is still uploading
    if (photoSlots.some(s => s.status === 'compressing' || s.status === 'uploading') || isProcessingQueue) {
      setErrorMessage('Photographs are currently uploading. Please wait for upload to complete before publishing.');
      return;
    }

    // Check if any slot has an error
    const failedSlots = photoSlots.filter(s => s.status === 'error');
    if (failedSlots.length > 0) {
      setErrorMessage('One or more photographs failed to upload. Please retry them or click remove on the failed photo.');
      return;
    }

    const successfulUrls = photoSlots
      .filter(s => s.status === 'success' && s.downloadUrl)
      .map(s => s.downloadUrl!);

    if (successfulUrls.length === 0) {
      setErrorMessage('Please upload at least 1 genuine photograph of your product before publishing.');
      return;
    }

    if (!title.trim() || !description.trim() || !price) {
      setErrorMessage('Please fill out product title, description, and price.');
      return;
    }

    if (title.trim().length < 3) {
      setErrorMessage('Product title is too short. Please provide a clear, descriptive name (minimum 3 characters).');
      return;
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setErrorMessage('Please enter a valid price in Nigerian Naira (₦).');
      return;
    }

    if (numericPrice > 1000000000) {
      setErrorMessage('Price is suspiciously high. Please verify the amount in Naira.');
      return;
    }

    setSubmitting(true);

    try {
      const productPayload = {
        title: title.trim(),
        price: numericPrice,
        description: description.trim(),
        state: state.trim(),
        city: city.trim(),
        whatsapp: whatsapp.trim(),
        whatsappNumber: whatsapp.trim(),
        category: category.trim(),
        categoryId: category.trim(),
        condition,
        quantity: Math.max(1, Number(quantity) || 1),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        images: successfulUrls,
        imageUrl: successfulUrls[0]
      };

      console.log('[Publish Product] Submitting listing with genuine images:', successfulUrls.length);
      const res = await createProductListing(productPayload);
      console.log('[Publish Product] Response received:', res);

      onSuccess();
      if (res && res.product) {
        setCreatedProduct(res.product);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('[Publish Product Error]:', err);
      setErrorMessage(err.message || 'Failed to publish listing. Please check backend connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#F68B1F] to-[#FFA03A] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black">Publish Product on NaijaMart</h2>
            <p className="text-xs text-white/90">
              Reach thousands of buyers in Nigeria • Direct WhatsApp chats
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBackendConfig(!showBackendConfig)}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              title="Configure Backend API URL (e.g. Render)"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Backend URL Config Panel (Collapsible) */}
        {showBackendConfig && (
          <div className="bg-gray-100 border-b border-gray-300 p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-gray-800 mb-1">
              <Globe className="w-4 h-4 text-[#F68B1F]" />
              <span>Backend API URL Configuration (Render / Live Server)</span>
            </div>
            <p className="text-gray-600 mb-2">
              Default is relative <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">/api</code>. To connect directly to your Render backend, enter e.g. <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">https://your-backend.onrender.com</code>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="https://your-app.onrender.com (or leave empty for default)"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrl(e.target.value)}
                className="flex-1 p-2 bg-white border border-gray-300 rounded-lg outline-none font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleSaveBackendUrl}
                className="px-3 py-2 bg-[#F68B1F] text-white font-bold rounded-lg hover:bg-[#E07A15]"
              >
                Save URL
              </button>
            </div>
          </div>
        )}

        {createdProduct ? (
          <div className="p-6 sm:p-8 space-y-6 text-center max-h-[85vh] overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-black tracking-widest uppercase text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                Saved Permanently to Database
              </span>
              <h3 className="text-2xl font-black text-gray-900 mt-2">Product posted successfully!</h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mt-1">
                Your listing details, price in Naira (₦), and photographs have been committed to the marketplace database.
              </p>
            </div>

            {/* Product summary card */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left flex items-center gap-4 max-w-lg mx-auto shadow-sm">
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shrink-0 bg-white">
                <ProductImage
                  src={createdProduct.images?.[0]}
                  alt={createdProduct.title}
                  category={createdProduct.categoryId}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-[#F68B1F]">
                    {createdProduct.categoryId}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500 capitalize">{createdProduct.condition} condition</span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm truncate mt-1">{createdProduct.title}</h4>
                <div className="text-lg font-black text-[#F68B1F] mt-0.5">
                  {formatNaira(createdProduct.price)}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <span>{createdProduct.city}, {createdProduct.state}</span>
                </div>
              </div>
            </div>

            {/* Moderation Status Feedback */}
            {createdProduct.moderationStatus === 'pending_review' ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left max-w-lg mx-auto text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pending Administrator Review</span>
                </div>
                <p className="leading-relaxed">
                  Our anti-fraud watchdog flagged this item for safety verification ({createdProduct.moderationFlags?.join(', ') || 'routine check'}). It will appear in public marketplace search once an administrator approves it.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-left max-w-lg mx-auto text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Live &amp; Visible Across Nigeria</span>
                </div>
                <p className="leading-relaxed">
                  Your listing is active and publicly visible to shoppers on the homepage, category pages, and search feeds. Buyers can message your WhatsApp directly.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onViewProduct) {
                    onViewProduct(createdProduct);
                  }
                  onClose();
                }}
                className="w-full sm:w-auto px-6 py-3 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
              >
                <Eye className="w-4 h-4" />
                <span>View Product in Marketplace</span>
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Post Another Product</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 text-gray-500 hover:text-gray-800 font-bold text-xs sm:text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 7-Day Expiration Policy Warning Banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F68B1F] shrink-0" />
              <span>
                <strong>Automatic 7-Day Listing:</strong> All products automatically expire in 168 hours (7 days) to maintain active stock.
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="block font-bold">Error publishing product:</strong>
                <span className="break-all">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* 4. PRODUCT IMAGES UPLOAD SECTION */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#F68B1F]" />
                Product Photographs <span className="text-gray-500 font-normal">(Max 6 • JPG, PNG, WebP)</span>
              </label>
              <span className="text-[11px] text-gray-500 font-medium">
                {photoSlots.length}/6 photos ({photoSlots.filter(s => s.status === 'success').length} ready)
              </span>
            </div>

            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              Upload genuine photographs of your actual item. Photos larger than 1MB are automatically optimized in your browser for fast Nigerian mobile data loading.
            </p>

            {/* Photo Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
              {photoSlots.map((slot, idx) => (
                <div
                  key={slot.id}
                  className="relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 group shadow-sm flex flex-col justify-between"
                >
                  {/* Immediate Preview Thumbnail */}
                  <img
                    src={slot.previewUrl}
                    alt={`Product photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                    {idx === 0 && (
                      <span className="bg-black/75 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                        Cover Photo
                      </span>
                    )}
                    <span className="ml-auto pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow transition active:scale-95"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>

                  {/* Bottom Status Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent p-2 text-white">
                    {slot.status === 'success' && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Ready &amp; Uploaded</span>
                      </div>
                    )}

                    {(slot.status === 'compressing' || slot.status === 'uploading') && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin text-[#F68B1F]" />
                            {slot.status === 'compressing' ? 'Optimizing...' : 'Uploading...'}
                          </span>
                          <span>{slot.progress}%</span>
                        </div>
                        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#F68B1F] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${slot.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {slot.status === 'error' && (
                      <div className="space-y-1">
                        <div className="text-[10px] text-red-300 font-semibold line-clamp-2 leading-tight">
                          {slot.errorMessage || 'Upload failed'}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRetryUpload(slot.id)}
                          className="w-full py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Retry Upload</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Upload Trigger Button */}
              {photoSlots.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingQueue}
                  className="aspect-square rounded-2xl border-2 border-dashed border-[#F68B1F]/60 hover:border-[#F68B1F] bg-orange-50/50 hover:bg-orange-50 transition flex flex-col items-center justify-center p-3 text-center text-xs font-semibold text-[#E07A15] cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-6 h-6 mb-1 text-[#F68B1F]" />
                  <span className="font-bold">
                    {isProcessingQueue ? 'Uploading...' : 'Add Photos'}
                  </span>
                  <span className="text-[9px] text-gray-500 font-normal mt-0.5">
                    JPG, PNG, WebP
                  </span>
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

          {/* Product Title */}
          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
              Product Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              name="title"
              placeholder="e.g., iPhone 15 Pro Max 256GB Natural Titanium"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                Condition <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('new')}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition ${
                    condition === 'new'
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Brand New
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('used')}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition ${
                    condition === 'used'
                      ? 'bg-amber-50 border-amber-600 text-amber-800 shadow-sm'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Direct Used
                </button>
              </div>
            </div>
          </div>

          {/* Price & Original Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                Selling Price (₦ Naira) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-gray-500">₦</span>
                <input
                  type="number"
                  required
                  name="price"
                  min="1"
                  placeholder="35000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                Original Price (Optional Discount)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-gray-500">₦</span>
                <input
                  type="number"
                  min="1"
                  placeholder="45000 (shows discount %)"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* DEDICATED PROMINENT WHATSAPP NUMBER SECTION (Spacious and Easy for Buyers to Message) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-400 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-sm">
                  <MessageCircle className="w-4 h-4 fill-current" />
                </span>
                <span>Seller WhatsApp Phone Number <span className="text-red-600 font-bold">* MANDATORY</span></span>
              </label>
              <span className="bg-[#25D366] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                Direct Buyer Chat
              </span>
            </div>

            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              Enter your WhatsApp line below. When buyers browse your product on NaijaMart, clicking <strong>"Chat with Seller on WhatsApp"</strong> opens an instant chat with you with your product pre-filled!
            </p>

            {/* Large Spacious Input with Nigerian Flag Badge */}
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center gap-1.5 text-xs font-bold text-gray-800 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 pointer-events-none shadow-xs">
                <span>🇳🇬 +234</span>
              </div>
              <input
                type="tel"
                required
                name="whatsapp"
                placeholder="0801 234 5678 or 0902 345 6789"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full pl-26 pr-4 py-3.5 bg-white border-2 border-emerald-400 focus:border-[#25D366] rounded-xl text-base sm:text-lg font-bold font-mono text-gray-900 placeholder-gray-400 outline-none shadow-inner transition"
              />
            </div>

            {/* Helper Info & Live WhatsApp Link Verification */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-800">
              <span className="font-semibold">
                Tip: Works with any Nigerian network (MTN, Airtel, Glo, 9mobile)
              </span>
              {whatsapp.trim() && (
                <a
                  href={`https://wa.me/234${whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-900 hover:text-emerald-950 underline flex items-center gap-1 bg-white/70 px-2 py-0.5 rounded-md"
                >
                  <ExternalLink className="w-3 h-3" />
                  Test my WhatsApp number link
                </a>
              )}
            </div>
          </div>

          {/* 3. ALL 36 NIGERIAN STATES + FCT AND FREE TEXT CITY/TOWN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                State (36 States + FCT) <span className="text-red-500">*</span>
              </label>
              <select
                name="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition font-medium"
              >
                {NIGERIA_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                City / Town / Market Area <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                name="city"
                placeholder="e.g. Ikeja, Wuse 2, Computer Village, Onitsha"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition font-medium"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
              Product Description & Specs <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              name="description"
              placeholder="Describe condition, features, warranty, pickup location, testing available..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || isProcessingQueue || photoSlots.some(s => s.status === 'compressing' || s.status === 'uploading')}
              className="px-6 py-3 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center gap-2 bg-[#F68B1F] hover:bg-[#E07A15] text-white shadow-orange-500/25 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Publishing Listing...'
                  : isProcessingQueue
                  ? 'Uploading Photos...'
                  : 'Publish Product Listing'}
              </span>
            </button>
          </div>
        </form>
      </>
    )}
  </div>
</div>
  );
};
