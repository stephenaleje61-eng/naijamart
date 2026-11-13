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
  warningMessage?: string;
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

  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const [customBackendUrl, setCustomBackendUrl] = useState(getApiBaseUrl());

  // Form State (Default Taraba / Wukari, no fake phone prefill)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'phones-tablets');
  const [condition, setCondition] = useState<'new' | 'used'>('new');
  const [state, setState] = useState(sellerProfile?.state || user?.state || 'Taraba');
  const [city, setCity] = useState(sellerProfile?.city || user?.city || 'Wukari');
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
    setCategory(categories[0]?.id || 'phones-tablets');
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
      setErrorMessage('You must be signed in as a registered seller to post products on FU MARKET.');
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
      setErrorMessage('Please fill out product title, description, and price.');
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="bg-[#1C1C1C] border-b border-[#333333] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Publish Product on <span className="text-[#FFFFFF]">FU MARKET</span>
            </h2>
            <p className="text-xs text-[#BDBDBD]">
              FUWUKARI Student Marketplace • Genuine photos &amp; direct buyer chat
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBackendConfig(!showBackendConfig)}
              className="p-2 rounded-full bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] text-[#BDBDBD] hover:text-white transition"
              title="Configure Backend API URL"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showBackendConfig && (
          <div className="bg-[#1C1C1C] border-b border-[#333333] p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-white mb-1">
              <Globe className="w-4 h-4 text-[#FFFFFF]" />
              <span>Backend API URL Configuration</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Leave blank for default /api"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrl(e.target.value)}
                className="flex-1 p-2 bg-[#121212] border border-[#333333] rounded-lg outline-none font-mono text-xs text-white"
              />
              <button
                type="button"
                onClick={handleSaveBackendUrl}
                className="px-3 py-2 bg-[#FFFFFF] text-black font-black rounded-lg hover:bg-[#E5E5E5]"
              >
                Save URL
              </button>
            </div>
          </div>
        )}

        {createdProduct ? (
          <div className="p-6 sm:p-8 space-y-6 text-center max-h-[85vh] overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-950/70 border border-emerald-700 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-black tracking-widest uppercase text-emerald-300 bg-emerald-950/60 border border-emerald-700 px-3 py-1 rounded-full">
                Saved Permanently to FU MARKET
              </span>
              <h3 className="text-2xl font-black text-white mt-3">Product posted successfully!</h3>
              <p className="text-xs sm:text-sm text-[#BDBDBD] max-w-md mx-auto mt-1">
                Your genuine listing and uploaded photographs are now saved in the marketplace database.
              </p>
            </div>

            <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-4 text-left flex items-center gap-4 max-w-lg mx-auto">
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-[#333333] shrink-0 bg-[#121212]">
                <ProductImage
                  src={createdProduct.images?.[0]}
                  alt={createdProduct.title}
                  category={createdProduct.categoryId}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#121212] border border-[#333333] text-[#FFFFFF]">
                    {createdProduct.categoryId}
                  </span>
                  <span className="text-xs text-[#BDBDBD] capitalize">{createdProduct.condition}</span>
                </div>
                <h4 className="font-bold text-white text-sm truncate mt-1">{createdProduct.title}</h4>
                <div className="text-lg font-black text-[#FFFFFF] mt-0.5">
                  {formatNaira(createdProduct.price)}
                </div>
                <div className="text-xs text-[#BDBDBD] mt-0.5">
                  {createdProduct.city}, {createdProduct.state}
                </div>
              </div>
            </div>

            {createdProduct.moderationStatus === 'pending_review' ? (
              <div className="p-4 bg-[#1C1C1C] border border-white/40 rounded-2xl text-left max-w-lg mx-auto text-xs text-white space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#FFFFFF]" />
                  <span>Pending Administrator Review</span>
                </div>
                <p className="text-[#BDBDBD]">Flagged for routine safety check before public feed visibility.</p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/40 border border-emerald-700 rounded-2xl text-left max-w-lg mx-auto text-xs text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
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
                className="w-full sm:w-auto px-6 py-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Eye className="w-4 h-4" />
                <span>View Product</span>
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-5 py-3 bg-[#1C1C1C] hover:bg-[#333333] border border-[#333333] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Post Another</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 text-[#BDBDBD] hover:text-white font-bold text-xs sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {errorMessage && (
              <div className="p-3 bg-red-950/60 border border-red-700 rounded-xl text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-bold">Cannot publish product:</strong>
                  <span className="break-words">{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Product Photographs */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#FFFFFF]" />
                  Product Photographs <span className="text-[#BDBDBD] font-normal">(Max 6 • JPG, JPEG, PNG, WebP)</span>
                </label>
                <span className="text-[11px] text-[#BDBDBD] font-medium">
                  {photoSlots.length}/6 ({photoSlots.filter((s) => s.status === 'success').length} ready)
                </span>
              </div>

              <p className="text-[11px] text-[#BDBDBD] mb-3 leading-relaxed">
                Upload genuine photos of your actual product. Images &gt;1MB are compressed automatically for fast campus mobile data loading.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                {photoSlots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-[#333333] bg-[#1C1C1C] flex flex-col justify-between"
                  >
                    <img
                      src={slot.previewUrl}
                      alt={`Product photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between">
                      {idx === 0 && (
                        <span className="bg-black/80 text-[#FFFFFF] text-[9px] font-black px-1.5 py-0.5 rounded border border-[#333333]">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="ml-auto w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-black/85 p-2 text-white">
                      {slot.status === 'success' && (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Uploaded (100%)</span>
                          </div>
                          {slot.warningMessage && (
                            <p className="text-[9px] text-white/90 line-clamp-2 leading-tight">
                              {slot.warningMessage}
                            </p>
                          )}
                        </div>
                      )}

                      {(slot.status === 'compressing' || slot.status === 'uploading') && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-[#FFFFFF]" />
                              {slot.status === 'compressing' ? 'Optimizing' : 'Uploading'}
                            </span>
                            <span>{slot.progress}%</span>
                          </div>
                          <div className="w-full bg-[#333333] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#FFFFFF] h-full transition-all duration-300"
                              style={{ width: `${slot.progress}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancelUpload(slot.id)}
                            className="w-full py-0.5 bg-[#333333] hover:bg-red-700 text-white rounded text-[9px] font-bold"
                          >
                            Cancel
                          </button>
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
                            className="w-full py-1 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black rounded text-[10px] font-black flex items-center justify-center gap-1"
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
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#FFFFFF]/60 hover:border-[#FFFFFF] bg-[#1C1C1C] transition flex flex-col items-center justify-center p-3 text-center text-xs font-semibold text-[#FFFFFF] cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="font-bold">{isProcessingQueue ? 'Uploading...' : 'Add Photos'}</span>
                    <span className="text-[9px] text-[#BDBDBD] font-normal mt-0.5">JPG, PNG, WebP</span>
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
              <label className="block text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                Product Title <span className="text-[#FFFFFF]">*</span>
              </label>
              <input
                type="text"
                required
                name="title"
                placeholder="e.g., HP EliteBook 840 G5 Core i5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                  Category <span className="text-[#FFFFFF]">*</span>
                </label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-white outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                  Condition <span className="text-[#FFFFFF]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition('new')}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition ${
                      condition === 'new'
                        ? 'bg-[#FFFFFF] border-[#FFFFFF] text-black'
                        : 'bg-[#1C1C1C] border-[#333333] text-[#BDBDBD]'
                    }`}
                  >
                    Brand New
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('used')}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition ${
                      condition === 'used'
                        ? 'bg-[#FFFFFF] border-[#FFFFFF] text-black'
                        : 'bg-[#1C1C1C] border-[#333333] text-[#BDBDBD]'
                    }`}
                  >
                    Direct Used
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                  Selling Price (₦) <span className="text-[#FFFFFF]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="35000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-white font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                  Original Price (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="45000"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-white outline-none"
                />
              </div>
            </div>

            {/* Seller WhatsApp */}
            <div className="p-4 rounded-2xl bg-[#1C1C1C] border border-[#25D366]/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>Seller WhatsApp Number *</span>
                </label>
                {whatsapp.trim() && (
                  <a
                    href={`https://wa.me/234${whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-[#25D366] hover:underline flex items-center gap-1"
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
                className="w-full p-3 bg-[#121212] border border-[#333333] focus:border-[#25D366] rounded-xl text-sm font-bold font-mono text-white outline-none"
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                  State <span className="text-[#FFFFFF]">*</span>
                </label>
                <select
                  name="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-white outline-none"
                >
                  {NIGERIA_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                  Campus Area / City <span className="text-[#FFFFFF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="city"
                  placeholder="e.g. Wukari, FUWukari Main Gate, Behind LT"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#BDBDBD] uppercase tracking-wider mb-1">
                Product Description &amp; Specs <span className="text-[#FFFFFF]">*</span>
              </label>
              <textarea
                required
                rows={4}
                name="description"
                placeholder="Describe genuine condition, specifications, and campus meetup location..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-white outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#333333]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-[#BDBDBD] hover:text-white rounded-xl"
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
                className="px-6 py-3 font-black text-xs sm:text-sm rounded-xl bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Publishing...'
                    : isProcessingQueue
                    ? 'Uploading Photos...'
                    : 'Publish Product'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
