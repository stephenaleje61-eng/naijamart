import React, { useState, useRef } from 'react';
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
  MapPin
} from 'lucide-react';
import { Category, Product } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import {
  createProductListing,
  getApiBaseUrl,
  setApiBaseUrl
} from '../services/api.js';
import { NIGERIA_STATES } from '../constants/states.js';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';
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
  warningMessage?: string;
  downloadUrl?: string;
  task?: any;
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
  onClose,
  onSuccess,
  onRequireAuth,
  onViewProduct
}) => {
  const { user, sellerProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const [customBackendUrl, setCustomBackendUrl] = useState(getApiBaseUrl());

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [category, setCategory] = useState(activeCategories[0]?.id || 'hostel-items');
  const [condition, setCondition] = useState<'new' | 'used'>('new');
  const [state, setState] = useState(sellerProfile?.state || user?.state || 'Taraba');
  const [city, setCity] = useState(sellerProfile?.city || user?.city || 'Hostel A, 100L');
  const [whatsapp, setWhatsapp] = useState(
    sellerProfile?.whatsappNumber || user?.whatsappNumber || user?.phone || ''
  );
  const [quantity, setQuantity] = useState('1');

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
    setCategory(activeCategories[0]?.id || 'hostel-items');
    setCondition('new');
    setQuantity('1');
    setPhotoSlots([]);
    setCreatedProduct(null);
    setErrorMessage('');
  };

  const uploadSingleSlot = async (slotId: string, file: File) => {
    setPhotoSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, status: 'compressing', progress: 10, errorMessage: undefined, warningMessage: undefined }
          : s
      )
    );

    try {
      const result = await uploadImageToFirebaseStorage(file, {
        folder: 'products',
        ownerId: user?.id || 'seller',
        timeoutMs: 30000,
        onProgress: (pct) => {
          setPhotoSlots((prev) =>
            prev.map((s) => (s.id === slotId ? { ...s, progress: pct, status: 'uploading' } : s))
          );
        },
        onTaskCreated: (task) => {
          setPhotoSlots((prev) =>
            prev.map((s) => (s.id === slotId ? { ...s, task } : s))
          );
        },
        allowPersistentFallback: true
      });

      setPhotoSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'success',
                progress: 100,
                downloadUrl: result.downloadUrl,
                previewUrl: result.previewUrl || s.previewUrl,
                warningMessage: result.warning,
                task: undefined
              }
            : s
        )
      );
    } catch (err: any) {
      setPhotoSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: 'error',
                errorMessage: err.message || 'Upload failed. Please check internet or enable Storage.',
                task: undefined
              }
            : s
        )
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage('');
    const incoming = Array.from(files);

    if (photoSlots.length + incoming.length > 6) {
      setErrorMessage(`You can upload a maximum of 6 photographs. You currently have ${photoSlots.length}.`);
      return;
    }

    for (const file of incoming) {
      if (!isValidImageFormat(file)) {
        setErrorMessage('Only JPG, JPEG, PNG, and WebP images are allowed.');
        return;
      }
    }

    const newSlots: PhotoSlot[] = incoming.map((file) => ({
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'compressing'
    }));

    setPhotoSlots((prev) => [...prev, ...newSlots]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsProcessingQueue(true);
    for (const slot of newSlots) {
      await uploadSingleSlot(slot.id, slot.file);
    }
    setIsProcessingQueue(false);
  };

  const handleCancelUpload = (slotId: string) => {
    const slot = photoSlots.find((s) => s.id === slotId);
    if (slot?.task && typeof slot.task.cancel === 'function') {
      try {
        slot.task.cancel();
      } catch {}
    }
    setPhotoSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, status: 'error', errorMessage: 'Upload cancelled.', task: undefined }
          : s
      )
    );
  };

  const handleRetryUpload = async (slotId: string) => {
    const slot = photoSlots.find((s) => s.id === slotId);
    if (!slot) return;
    await uploadSingleSlot(slot.id, slot.file);
  };

  const handleRemoveSlot = (slotId: string) => {
    setPhotoSlots((prev) => {
      const target = prev.find((s) => s.id === slotId);
      if (target?.task && typeof target.task.cancel === 'function') {
        try {
          target.task.cancel();
        } catch {}
      }
      return prev.filter((s) => s.id !== slotId);
    });
  };

  const handleSaveBackendUrl = () => {
    setApiBaseUrl(customBackendUrl);
    setShowBackendConfig(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('Please login first to post an item on FU MARKET.');
      onRequireAuth();
      return;
    }

    if (user.isSuspended) {
      setErrorMessage(
        `Your seller account has been suspended: ${user.suspensionReason || 'Violation of trust & safety policy'}.`
      );
      return;
    }

    if (photoSlots.some((s) => s.status === 'compressing' || s.status === 'uploading') || isProcessingQueue) {
      setErrorMessage('Photographs are currently uploading. Please wait for upload to complete before publishing.');
      return;
    }

    if (photoSlots.some((s) => s.status === 'error')) {
      setErrorMessage('One or more photographs failed or were cancelled. Click Retry Upload or remove the failed photo.');
      return;
    }

    const successfulUrls = photoSlots
      .filter((s) => s.status === 'success' && s.downloadUrl && s.downloadUrl.trim().length > 0)
      .map((s) => s.downloadUrl!);

    if (successfulUrls.length === 0) {
      setErrorMessage('Please upload at least 1 genuine photograph of your product before publishing.');
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

      const res = await createProductListing(productPayload);
      onSuccess();
      if (res && res.product) {
        setCreatedProduct(res.product);
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish listing. Please check backend connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#111111]">
        {/* Green Header */}
        <div className="bg-[#0B6B3A] border-b-4 border-[#F2B90D] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black text-white">
              Post Item for FREE on <span className="text-[#F2B90D]">FU MARKET</span>
            </h2>
            <p className="text-xs text-white/90">
              FUWUKARI Student Marketplace • Genuine photos &amp; direct WhatsApp chat
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBackendConfig(!showBackendConfig)}
              className="p-2 rounded-full bg-[#14532D] border border-white/25 hover:border-[#F2B90D] text-white transition"
              title="Configure Backend API URL"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#14532D] border border-white/25 hover:border-[#F2B90D] text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showBackendConfig && (
          <div className="bg-[#F5F5F5] border-b border-[#E5E7EB] p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#111111] mb-1">
              <Globe className="w-4 h-4 text-[#0B6B3A]" />
              <span>Backend API URL Configuration</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Leave blank for default /api"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrl(e.target.value)}
                className="flex-1 p-2 bg-white border border-[#E5E7EB] rounded-lg outline-none font-mono text-xs text-[#111111]"
              />
              <button
                type="button"
                onClick={handleSaveBackendUrl}
                className="px-3 py-2 bg-[#0B6B3A] text-white font-black rounded-lg hover:bg-[#14532D]"
              >
                Save URL
              </button>
            </div>
          </div>
        )}

        {createdProduct ? (
          <div className="p-6 sm:p-8 space-y-6 text-center max-h-[85vh] overflow-y-auto bg-white">
            <div className="w-16 h-16 bg-[#0B6B3A] border-4 border-[#F2B90D] rounded-full flex items-center justify-center mx-auto text-[#F2B90D]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-black tracking-widest uppercase text-[#0B6B3A] bg-[#F5F5F5] border border-[#0B6B3A]/30 px-3 py-1 rounded-full">
                Saved Permanently on FU MARKET
              </span>
              <h3 className="text-2xl font-black text-[#111111] mt-3">Product posted successfully!</h3>
              <p className="text-xs sm:text-sm text-[#555555] max-w-md mx-auto mt-1">
                Your genuine listing and uploaded photographs are now live for FUWUKARI students.
              </p>
            </div>

            <div className="bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl p-4 text-left flex items-center gap-4 max-w-lg mx-auto">
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
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#0B6B3A] text-[#F2B90D]">
                    {createdProduct.categoryId}
                  </span>
                  <span className="text-xs text-[#555555] capitalize">{createdProduct.condition}</span>
                </div>
                <h4 className="font-bold text-[#111111] text-sm truncate mt-1">{createdProduct.title}</h4>
                <div className="inline-block px-2 py-0.5 rounded bg-[#0B6B3A] text-[#F2B90D] text-sm font-black mt-0.5">
                  {formatNaira(createdProduct.price)}
                </div>
                <div className="text-xs text-[#555555] mt-0.5">
                  {createdProduct.city}, {createdProduct.state}
                </div>
              </div>
            </div>

            {createdProduct.moderationStatus === 'pending_review' ? (
              <div className="p-4 bg-[#FFFDF2] border border-[#F2B90D] rounded-2xl text-left max-w-lg mx-auto text-xs text-[#111111] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0B6B3A]" />
                  <span>Pending Administrator Review</span>
                </div>
                <p className="text-[#555555]">Flagged for routine safety check before public feed visibility.</p>
              </div>
            ) : (
              <div className="p-4 bg-[#F5F5F5] border border-[#0B6B3A]/40 rounded-2xl text-left max-w-lg mx-auto text-xs text-[#14532D] space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0B6B3A]" />
                  <span>Live on FU MARKET</span>
                </div>
                <p>Your product is active and visible across the FUWUKARI student marketplace.</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onViewProduct) onViewProduct(createdProduct);
                  onClose();
                }}
                className="w-full sm:w-auto px-6 py-3 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Eye className="w-4 h-4 text-[#F2B90D]" />
                <span>View Product</span>
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-5 py-3 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Post Another</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 text-[#555555] hover:text-[#111111] font-bold text-xs sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto bg-white">
            {errorMessage && (
              <div className="p-3 bg-[#FFF8DB] border-2 border-[#111111] rounded-xl text-xs text-[#111111] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-black">Action Required:</strong>
                  <span className="break-words">{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Product Photographs */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#0B6B3A]" />
                  Product Photo <span className="text-[#555555] font-normal">(Max 6 • JPG, PNG, WebP)</span>
                </label>
                <span className="text-[11px] text-[#0B6B3A] font-bold">
                  {photoSlots.length}/6 ({photoSlots.filter((s) => s.status === 'success').length} ready)
                </span>
              </div>

              <p className="text-[11px] text-[#555555] mb-3 leading-relaxed">
                Upload clear photos of your item. Images &gt;1MB are compressed automatically for fast campus upload.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                {photoSlots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-[#E5E7EB] bg-[#F5F5F5] flex flex-col justify-between"
                  >
                    <img
                      src={slot.previewUrl}
                      alt={`Product photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between">
                      {idx === 0 && (
                        <span className="bg-[#0B6B3A] text-[#F2B90D] text-[9px] font-black px-1.5 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="ml-auto w-6 h-6 rounded-full bg-[#111111] hover:bg-[#14532D] text-white flex items-center justify-center shadow"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-[#111111]/90 p-2 text-white">
                      {slot.status === 'success' && (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[#F2B90D]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Uploaded (100%)</span>
                          </div>
                          {slot.warningMessage && (
                            <p className="text-[9px] text-white/85 line-clamp-2 leading-tight">
                              {slot.warningMessage}
                            </p>
                          )}
                        </div>
                      )}

                      {(slot.status === 'compressing' || slot.status === 'uploading') && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-[#F2B90D]" />
                              {slot.status === 'compressing' ? 'Optimizing' : 'Uploading'}
                            </span>
                            <span>{slot.progress}%</span>
                          </div>
                          <div className="w-full bg-white/25 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#F2B90D] h-full transition-all duration-300"
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
                          <div className="text-[10px] text-[#F2B90D] font-semibold line-clamp-2 leading-tight">
                            {slot.errorMessage || 'Upload failed'}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRetryUpload(slot.id)}
                            className="w-full py-1 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] rounded text-[10px] font-black flex items-center justify-center gap-1"
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
                    disabled={isProcessingQueue}
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#0B6B3A]/50 hover:border-[#0B6B3A] bg-[#F5F5F5] transition flex flex-col items-center justify-center p-3 text-center text-xs font-bold text-[#0B6B3A] cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-6 h-6 mb-1 text-[#0B6B3A]" />
                    <span className="font-black">{isProcessingQueue ? 'Uploading...' : 'Add Photo'}</span>
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

            <div>
              <label className="block text-xs font-black text-[#111111] uppercase tracking-wider mb-1">
                Product Name <span className="text-[#0B6B3A]">*</span>
              </label>
              <input
                type="text"
                required
                name="title"
                placeholder="e.g., 6-Inch Student Mattress, HP Laptop, 3kg Gas Cylinder"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-[#111111] uppercase tracking-wider mb-1">
                  Category <span className="text-[#0B6B3A]">*</span>
                </label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] outline-none font-semibold"
                >
                  {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#111111] uppercase tracking-wider mb-1">
                  Condition <span className="text-[#0B6B3A]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition('new')}
                    className={`py-2.5 text-xs font-black rounded-xl border transition ${
                      condition === 'new'
                        ? 'bg-[#0B6B3A] border-[#0B6B3A] text-[#F2B90D]'
                        : 'bg-[#F5F5F5] border-[#E5E7EB] text-[#444444]'
                    }`}
                  >
                    Brand New
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('used')}
                    className={`py-2.5 text-xs font-black rounded-xl border transition ${
                      condition === 'used'
                        ? 'bg-[#0B6B3A] border-[#0B6B3A] text-[#F2B90D]'
                        : 'bg-[#F5F5F5] border-[#E5E7EB] text-[#444444]'
                    }`}
                  >
                    Fairly Used
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black text-[#111111] uppercase tracking-wider mb-1">
                  Price (₦) <span className="text-[#0B6B3A]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="15000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#111111] uppercase tracking-wider mb-1">
                  Old Price (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="20000"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#111111] uppercase tracking-wider mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] outline-none"
                />
              </div>
            </div>

            {/* Seller WhatsApp */}
            <div className="p-4 rounded-2xl bg-[#F5F5F5] border border-[#0B6B3A]/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-[#111111] uppercase flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#0B6B3A]" />
                  <span>WhatsApp Number *</span>
                </label>
                {whatsapp.trim() && (
                  <a
                    href={`https://wa.me/234${whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-black text-[#0B6B3A] hover:underline flex items-center gap-1"
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
                className="w-full p-3 bg-white border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-sm font-bold font-mono text-[#111111] outline-none"
              />
            </div>

            {/* Campus Location (Hostel & Level + State) */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#111111] uppercase tracking-wider mb-1">
                    Hostel / Campus Location <span className="text-[#0B6B3A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="city"
                    placeholder="e.g. Hostel A, 100L"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#111111] uppercase tracking-wider mb-1">
                    State <span className="text-[#0B6B3A]">*</span>
                  </label>
                  <select
                    name="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] outline-none"
                  >
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
                  <MapPin className="w-3 h-3 text-[#0B6B3A]" /> Quick pick:
                </span>
                {CAMPUS_LOCATION_CHIPS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setCity(loc)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                      city === loc
                        ? 'bg-[#0B6B3A] text-[#F2B90D] border-[#0B6B3A]'
                        : 'bg-[#F5F5F5] text-[#333333] border-[#E5E7EB] hover:border-[#0B6B3A]'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#111111] uppercase tracking-wider mb-1">
                Description &amp; Specs <span className="text-[#0B6B3A]">*</span>
              </label>
              <textarea
                required
                rows={3}
                name="description"
                placeholder="Describe genuine condition, specifications, and where you can meet on campus..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-[#555555] hover:text-[#111111] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  isProcessingQueue ||
                  photoSlots.some((s) => s.status === 'compressing' || s.status === 'uploading')
                }
                className="px-6 py-3 font-black text-xs sm:text-sm rounded-xl bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] flex items-center gap-2 shadow disabled:opacity-50 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-[#0B6B3A]" />
                <span>
                  {submitting
                    ? 'Publishing...'
                    : isProcessingQueue
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
