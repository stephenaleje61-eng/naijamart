import React, { useState } from 'react';
import {
  X,
  Upload,
  Trash2,
  AlertCircle,
  Loader2,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import {
  ServiceAvailability,
  ServiceCategory,
  ServiceListing
} from '../types.js';
import {
  FUWUKARI_SERVICE_LOCATIONS,
  createServiceListing,
  updateServiceListing
} from '../services/servicesMarketplace.js';
import { uploadServicePhoto } from '../services/imageStorage.js';
import { useAuth } from '../context/AuthContext.js';
import { getOrCreateGuestId } from '../utils/studentAuth.js';

interface PostServiceModalProps {
  categories: ServiceCategory[];
  editingService?: ServiceListing | null;
  onClose: () => void;
  onSuccess: (service: ServiceListing, isEdit: boolean) => void;
}

export const PostServiceModal: React.FC<PostServiceModalProps> = ({
  categories,
  editingService = null,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const isEdit = Boolean(editingService);

  const [serviceName, setServiceName] = useState(editingService?.serviceName || '');
  const [category, setCategory] = useState(
    editingService?.category || categories[0]?.name || 'Other Services'
  );
  const [description, setDescription] = useState(editingService?.description || '');
  const [price, setPrice] = useState(
    editingService ? String(editingService.price) : ''
  );
  const [priceMax, setPriceMax] = useState(
    editingService?.priceMax ? String(editingService.priceMax) : ''
  );
  const [priceDisplayNote, setPriceDisplayNote] = useState(
    editingService?.priceDisplay || ''
  );
  const [location, setLocation] = useState(
    editingService?.location || 'Main Campus (FUWUKARI)'
  );
  const [phone, setPhone] = useState(
    editingService?.phone || user?.phone || ''
  );
  const [whatsapp, setWhatsapp] = useState(
    editingService?.whatsapp || user?.whatsappNumber || user?.phone || ''
  );
  const [providerName, setProviderName] = useState(
    editingService?.providerName || user?.name || ''
  );
  const [availability, setAvailability] = useState<ServiceAvailability>(
    editingService?.availability || 'available'
  );
  const [availabilityNote, setAvailabilityNote] = useState(
    editingService?.availabilityNote || ''
  );

  const [images, setImages] = useState<string[]>(editingService?.images || []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 6 - images.length;
    if (remainingSlots <= 0) {
      setErrorMsg('Maximum of 6 pictures per service reached.');
      return;
    }

    setErrorMsg(null);
    setUploading(true);
    const ownerHint = user?.id || getOrCreateGuestId();

    try {
      const uploadedUrls: string[] = [];
      for (const file of files.slice(0, remainingSlots)) {
        setUploadProgress(5);
        const res = await uploadServicePhoto(file, ownerHint, (pct) => setUploadProgress(pct));
        uploadedUrls.push(res.downloadUrl);
      }
      setImages((prev) => [...prev, ...uploadedUrls].slice(0, 6));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload service picture.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Please enter a valid starting price in Naira (0 for negotiable/free quote).');
      return;
    }
    const parsedMax = priceMax.trim() ? Number(priceMax) : undefined;
    if (parsedMax !== undefined && (isNaN(parsedMax) || parsedMax < parsedPrice)) {
      setErrorMsg('Maximum price must be greater than or equal to starting price.');
      return;
    }
    if (images.length === 0) {
      setErrorMsg('Please upload at least 1 picture showcasing your service.');
      return;
    }

    const computedPriceDisplay =
      priceDisplayNote.trim() ||
      (parsedMax && parsedMax > parsedPrice
        ? `₦${parsedPrice.toLocaleString()} – ₦${parsedMax.toLocaleString()}`
        : `₦${parsedPrice.toLocaleString()}`);

    setSubmitting(true);
    try {
      if (isEdit && editingService) {
        await updateServiceListing(editingService.serviceId, {
          providerName,
          serviceName,
          category,
          description,
          price: parsedPrice,
          priceMax: parsedMax,
          priceDisplay: computedPriceDisplay,
          location,
          phone,
          whatsapp: whatsapp.trim() || phone.trim(),
          images,
          availability,
          availabilityNote
        });
        onSuccess(
          {
            ...editingService,
            providerName: providerName.trim(),
            serviceName: serviceName.trim(),
            category: category.trim(),
            description: description.trim(),
            price: parsedPrice,
            ...(parsedMax ? { priceMax: parsedMax } : {}),
            priceDisplay: computedPriceDisplay,
            location: location.trim(),
            phone: phone.trim(),
            whatsapp: (whatsapp.trim() || phone.trim()),
            images,
            availability,
            availabilityNote: availabilityNote.trim(),
            updatedAt: new Date().toISOString()
          },
          true
        );
      } else {
        const created = await createServiceListing(
          {
            providerName,
            serviceName,
            category,
            description,
            price: parsedPrice,
            priceMax: parsedMax,
            priceDisplay: computedPriceDisplay,
            location,
            phone,
            whatsapp: whatsapp.trim() || phone.trim(),
            images,
            availability,
            availabilityNote
          },
          user?.id
        );
        onSuccess(created, false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to save service listing. Please check your fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit Service Listing' : 'Post Your Service'}
    >
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-2xl shadow-xl overflow-hidden my-4 text-[#111111]">
        {/* Header */}
        <div className="bg-[#0B6B3A] text-white px-5 py-4 flex items-center justify-between gap-4 border-b border-[#14532D]">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#F2B90D]">
              {isEdit ? 'EDIT SERVICE LISTING' : 'POST YOUR SERVICE'}
            </h2>
            <p className="text-xs text-white/90">
              {user
                ? `Posting as ${user.name}`
                : 'Guest Posting Supported · Saved Permanently to FU MARKET'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-lg bg-[#14532D] hover:bg-[#F2B90D] text-white hover:text-[#111111] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Service Name *
              </label>
              <input
                type="text"
                required
                maxLength={180}
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Classic Student Haircut & Fade"
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#0B6B3A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Service Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#0B6B3A] outline-none bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Provider / Business Name *
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Your full name or brand name"
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#0B6B3A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Availability *
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as ServiceAvailability)}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#0B6B3A] outline-none bg-white"
              >
                <option value="available">Available Now</option>
                <option value="busy">Busy / By Appointment</option>
                <option value="unavailable">Currently Unavailable</option>
              </select>
            </div>
          </div>

          {/* Pricing / Price Range */}
          <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl space-y-2.5">
            <p className="text-xs font-black text-[#111111]">Service Price or Price Range (₦)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[#555555] mb-1">
                  Starting Price (₦) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100000000}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl bg-white focus:border-[#0B6B3A] outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#555555] mb-1">
                  Max Price (₦ Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100000000}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl bg-white focus:border-[#0B6B3A] outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#555555] mb-1">
                  Custom Price Label (Optional)
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={priceDisplayNote}
                  onChange={(e) => setPriceDisplayNote(e.target.value)}
                  placeholder="e.g. From ₦1,500 / wash"
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl bg-white focus:border-[#0B6B3A] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location + Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#111111]">
              Service Location around FUWUKARI *
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#0B6B3A] absolute left-3 top-2.5" />
              <input
                type="text"
                required
                maxLength={180}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Behind LT, New Site, Main Gate, Wukari"
                className="w-full pl-8 pr-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#0B6B3A] outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FUWUKARI_SERVICE_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                    location === loc
                      ? 'bg-[#0B6B3A] border-[#0B6B3A] text-white'
                      : 'bg-[#F5F5F5] border-[#E5E7EB] text-[#444444] hover:border-[#0B6B3A]'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Phone + WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Contact Phone Number *
              </label>
              <input
                type="tel"
                required
                maxLength={40}
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  setPhone(val);
                  if (!whatsapp) setWhatsapp(val);
                }}
                placeholder="e.g. 08012345678"
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#0B6B3A] outline-none tabular-nums"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#111111]">
                  WhatsApp Number *
                </label>
                {phone && whatsapp !== phone && (
                  <button
                    type="button"
                    onClick={() => setWhatsapp(phone)}
                    className="text-[11px] font-bold text-[#0B6B3A] hover:underline"
                  >
                    Same as phone
                  </button>
                )}
              </div>
              <input
                type="tel"
                required
                maxLength={40}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#0B6B3A] outline-none tabular-nums"
              />
            </div>
          </div>

          {/* Service Description & Schedule */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">
              Service Description *
            </label>
            <textarea
              required
              rows={4}
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your service includes, turnaround time, home/hostel service availability, and student discounts..."
              className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#0B6B3A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">
              Availability Hours / Note (Optional)
            </label>
            <input
              type="text"
              maxLength={160}
              value={availabilityNote}
              onChange={(e) => setAvailabilityNote(e.target.value)}
              placeholder="e.g. Mon – Sat, 8am – 8pm · Hostel visits available"
              className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#0B6B3A] outline-none"
            />
          </div>

          {/* Service Pictures Upload */}
          <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-black text-[#111111]">
                Service Pictures * (Up to 6 compressed photos)
              </label>
              <span className="text-[11px] text-[#555555] tabular-nums">
                {images.length}/6 uploaded
              </span>
            </div>

            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-dashed border-[#0B6B3A] rounded-xl text-xs font-bold text-[#0B6B3A] cursor-pointer hover:bg-[#F0FDF4] transition">
              <Upload className="w-4 h-4" />
              <span>
                {uploading
                  ? `Uploading to Firebase Storage (${uploadProgress}%)...`
                  : 'Select Service Pictures (JPG, PNG, WebP)'}
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading || images.length >= 6}
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {images.map((url, idx) => (
                  <div
                    key={`${url.slice(0, 32)}-${idx}`}
                    className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#E5E7EB] bg-white group"
                  >
                    <img
                      src={url}
                      alt={`Service preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      aria-label={`Remove picture ${idx + 1}`}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-[#B91C1C] transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-[#111111] text-xs font-bold rounded-xl transition min-h-[42px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="px-6 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] disabled:opacity-60 text-white text-xs sm:text-sm font-black rounded-xl transition flex items-center gap-2 min-h-[42px]"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#F2B90D]" />
              )}
              <span>{isEdit ? 'Save Changes' : 'Publish Service'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
