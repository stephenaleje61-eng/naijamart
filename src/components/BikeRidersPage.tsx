import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  PlusCircle,
  X,
  Upload,
  AlertCircle,
  ArrowLeft,
  Radio,
  RefreshCw,
  Trash2,
  Loader2
} from 'lucide-react';
import { UploadTask } from 'firebase/storage';
import { BikeRider } from '../types.js';
import { fetchBikeRiders, registerBikeRider } from '../services/api.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { isValidImageFormat } from '../utils/imagePersistence.js';
import { useAuth } from '../context/AuthContext.js';

export const WUKARI_AREAS = [
  'Wukari Market',
  'FUWukari Main Gate',
  'FUWukari New Site',
  'General Hospital Road',
  'Yam Market',
  'Puje',
  'New Market',
  'Anywhere in Wukari'
];

interface BikeRidersPageProps {
  onBackToMarketplace: () => void;
}

export const BikeRidersPage: React.FC<BikeRidersPageProps> = ({ onBackToMarketplace }) => {
  const { user } = useAuth();
  const [riders, setRiders] = useState<BikeRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [area, setArea] = useState(WUKARI_AREAS[0]);
  const [isAvailableNow, setIsAvailableNow] = useState(true);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const activeTaskRef = useRef<UploadTask | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRiders = async () => {
    setLoading(true);
    try {
      const data = await fetchBikeRiders(selectedArea === 'all' ? undefined : selectedArea);
      setRiders(data);
    } catch (err) {
      console.error('Failed to load Wukari bike riders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Wukari Okada Rider Directory | FU MARKET';
    loadRiders();
  }, [selectedArea]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const runRiderPhotoUpload = async (file: File) => {
    setUploadStatus('uploading');
    setUploadProgress(5);
    setUploadError(null);
    setUploadWarning(null);
    const riderOwnerId = user?.id || `rider_${phoneNumber.replace(/[^0-9]/g, '') || Date.now()}`;

    try {
      const result = await uploadImageToFirebaseStorage(file, {
        folder: 'riders',
        ownerId: riderOwnerId,
        timeoutMs: 30000,
        onProgress: (pct) => setUploadProgress(pct),
        onTaskCreated: (task) => {
          activeTaskRef.current = task;
        },
        allowPersistentFallback: true
      });
      activeTaskRef.current = null;
      setUploadedPhotoUrl(result.downloadUrl);
      setUploadProgress(100);
      setUploadStatus('success');
      if (result.warning) {
        setUploadWarning(result.warning);
      }
    } catch (err: any) {
      activeTaskRef.current = null;
      setUploadStatus('error');
      setUploadError(err?.message || 'Photo upload failed. Please check internet and retry.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFormat(file)) {
      setFormError('Only JPG, JPEG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFormError('Selected photo is too large (max 8MB before compression).');
      return;
    }

    setFormError('');
    setPhotoFile(file);
    setUploadedPhotoUrl(null);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    runRiderPhotoUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelPhotoUpload = () => {
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch {}
      activeTaskRef.current = null;
    }
    setUploadStatus('error');
    setUploadError('Upload cancelled. Click Retry or choose a different photo.');
  };

  const handleRemovePhoto = () => {
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch {}
      activeTaskRef.current = null;
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadedPhotoUrl(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadError(null);
    setUploadWarning(null);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.replace(/[^0-9]/g, '').length < 10) {
      setFormError('Please enter your active phone number.');
      return;
    }
    if (uploadStatus === 'uploading') {
      setFormError('Please wait for your rider photo to finish uploading or cancel it.');
      return;
    }
    if (photoFile && (!uploadedPhotoUrl || uploadStatus === 'error')) {
      setFormError('Your rider photo failed to upload. Please click Retry Upload or remove the photo.');
      return;
    }

    setSubmitting(true);

    try {
      const newRider = await registerBikeRider({
        name: fullName.trim(),
        photoUrl: uploadedPhotoUrl || '',
        phoneNumber: phoneNumber.trim(),
        whatsappNumber: (whatsappNumber || phoneNumber).trim(),
        area,
        isAvailable: isAvailableNow,
        userId: user?.id
      });

      setRiders((prev) => [newRider.rider, ...prev]);
      setShowRegisterModal(false);
      showToast(`Welcome ${fullName}! You are now listed in the FU MARKET Bike Directory.`);

      setFullName('');
      setPhoneNumber('');
      setWhatsappNumber('');
      handleRemovePhoto();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register as bike rider. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCleanWaLink = (rawNumber: string, riderArea: string) => {
    let cleaned = rawNumber.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (!cleaned.startsWith('234')) cleaned = '234' + cleaned;
    const message = encodeURIComponent(
      `Hello, I found your contact on FU MARKET and need an Okada ride around ${riderArea}. Are you available?`
    );
    return `https://wa.me/${cleaned}?text=${message}`;
  };

  const filteredRiders = riders.filter((rider) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rider.name.toLowerCase().includes(q) ||
      rider.area.toLowerCase().includes(q) ||
      rider.phoneNumber.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#111111] flex flex-col font-sans pb-24 sm:pb-8">
      {notification && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-[#0B6B3A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-[#F2B90D]">
          <CheckCircle2 className="w-4 h-4 text-[#F2B90D] shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0B6B3A] border-b border-[#14532D] sticky top-0 z-30 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMarketplace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#14532D] hover:bg-[#F2B90D] hover:text-[#111111] border border-white/20 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to FU MARKET</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏍️</span>
              <h1 className="text-sm sm:text-base font-black text-[#F2B90D] tracking-tight">
                Wukari Okada Directory
              </h1>
            </div>
          </div>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs sm:text-sm rounded-xl transition active:scale-95 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register as Bike Man</span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-[#14532D] text-white border-b border-[#0B6B3A] py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B6B3A] border border-[#F2B90D]/50 text-[#F2B90D] text-xs font-black uppercase tracking-wider mb-3">
              <Radio className="w-3 h-3 animate-ping" />
              <span>Fast Okada in Wukari Town &amp; FUWUKARI</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F2B90D]">
              Call Verified Bike Riders in Wukari
            </h2>
            <p className="text-xs sm:text-sm text-white/90 mt-2 leading-relaxed">
              Quick campus rides between FUWUKARI Main Gate, New Site, Behind LT, Wukari Market, and Hospital Road. Call riders directly with zero middleman fees.
            </p>
          </div>

          <div className="bg-[#0B6B3A] border border-white/20 p-4 rounded-2xl flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-[#F2B90D]" />
              <span>Direct Rider Contact • Verified Campus Zones</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <Clock className="w-4 h-4 text-[#F2B90D]" />
              <span>{riders.length} Registered Okada Riders</span>
            </div>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="mt-1 w-full py-2 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs font-black rounded-xl transition"
            >
              Are you a Bike Man? Join Now
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="w-full md:max-w-md relative">
            <Search className="w-4 h-4 text-[#555555] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rider by name, phone or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#111111] placeholder-[#6B7280] outline-none"
            />
          </div>

          <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedArea('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition shrink-0 ${
                selectedArea === 'all'
                  ? 'bg-[#0B6B3A] text-white'
                  : 'bg-[#F5F5F5] border border-[#E5E7EB] text-[#111111] hover:border-[#0B6B3A]'
              }`}
            >
              All Wukari ({riders.length})
            </button>
            {WUKARI_AREAS.map((a) => (
              <button
                key={a}
                onClick={() => setSelectedArea(a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition shrink-0 ${
                  selectedArea === a
                    ? 'bg-[#0B6B3A] text-white'
                    : 'bg-[#F5F5F5] border border-[#E5E7EB] text-[#111111] hover:border-[#0B6B3A]'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-[#0B6B3A] animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-[#555555]">Loading Wukari Okada riders...</p>
          </div>
        ) : filteredRiders.length === 0 ? (
          <div className="bg-[#FFFFFF] rounded-3xl p-10 text-center border border-[#E5E7EB] max-w-lg mx-auto my-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#0B6B3A]/10 border border-[#0B6B3A]/20 text-2xl flex items-center justify-center mx-auto mb-4">
              🏍️
            </div>
            <h3 className="text-base font-black text-[#111111]">No registered riders available yet.</h3>
            <p className="text-xs text-[#555555] mt-2 mb-6 leading-relaxed">
              Okada riders operating around FUWUKARI and Wukari town can register with a real photograph so students can call directly.
            </p>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-6 py-3 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs sm:text-sm font-black rounded-xl"
            >
              Register as Bike Man
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRiders.map((rider) => (
              <div
                key={rider.id}
                className="bg-[#FFFFFF] rounded-2xl overflow-hidden border border-[#E5E7EB] hover:border-[#0B6B3A] transition flex flex-col justify-between shadow-xs hover:shadow-md"
              >
                <div>
                  <div className="relative aspect-[4/3] w-full bg-[#F5F5F5] overflow-hidden flex items-center justify-center border-b border-[#E5E7EB]">
                    {rider.photoUrl ? (
                      <img
                        src={rider.photoUrl}
                        alt={rider.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#555555] p-4 text-center">
                        <span className="text-4xl mb-1">🏍️</span>
                        <span className="text-[10px] font-bold">Wukari Okada Rider</span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                          rider.isAvailable
                            ? 'bg-[#0B6B3A] text-[#F2B90D]'
                            : 'bg-[#111111]/85 text-white'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            rider.isAvailable ? 'bg-[#F2B90D] animate-pulse' : 'bg-white/60'
                          }`}
                        />
                        <span>{rider.isAvailable ? 'Available Now' : 'Offline'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-black text-base text-[#111111] truncate">{rider.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-[#555555]">
                      <MapPin className="w-3.5 h-3.5 text-[#0B6B3A] shrink-0" />
                      <span className="truncate">{rider.area}</span>
                    </div>
                    <div className="mt-2 text-xs text-[#111111] font-mono font-bold">{rider.phoneNumber}</div>
                  </div>
                </div>

                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${rider.phoneNumber}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] rounded-xl text-xs font-black transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>CALL NOW</span>
                  </a>
                  <a
                    href={getCleanWaLink(rider.whatsappNumber || rider.phoneNumber, rider.area)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#0B6B3A] hover:bg-[#14532D] text-white rounded-xl text-xs font-black transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#F2B90D]" />
                    <span>WHATSAPP</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-6 text-[#111111]">
            <div className="bg-[#0B6B3A] text-white border-b border-[#14532D] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏍️</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#F2B90D]">Register as Bike Man</h3>
                  <p className="text-[11px] text-white/85">FU MARKET Okada Directory</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="w-8 h-8 rounded-full bg-[#14532D] text-white hover:bg-[#F2B90D] hover:text-[#111111] flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-[#FFF8DB] border border-[#F2B90D] text-[#111111] text-xs rounded-xl flex items-start gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Photo Upload with Immediate Thumbnail, Cancel & Retry */}
              <div>
                <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                  Rider Photograph <span className="font-normal text-[#555555]">(JPG, JPEG, PNG, WebP)</span>
                </label>

                <div className="p-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-[#0B6B3A]/50 hover:border-[#0B6B3A] bg-[#FFFFFF] flex flex-col items-center justify-center cursor-pointer overflow-hidden shrink-0"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Rider Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2 text-[#0B6B3A]">
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Select Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                    {!photoFile && (
                      <p className="text-[#555555]">
                        Select a clear photo of yourself with your motorcycle for student recognition.
                      </p>
                    )}

                    {uploadStatus === 'uploading' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold text-[#111111]">
                          <span>Uploading to Storage...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#0B6B3A] h-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelPhotoUpload}
                          className="text-[11px] font-bold text-[#111111] underline"
                        >
                          Cancel Upload
                        </button>
                      </div>
                    )}

                    {uploadStatus === 'success' && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[#0B6B3A] font-black">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Photo ready (100%)</span>
                        </div>
                        {uploadWarning && (
                          <p className="text-[10px] text-[#555555] leading-tight">{uploadWarning}</p>
                        )}
                      </div>
                    )}

                    {uploadStatus === 'error' && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-[#111111]">{uploadError}</p>
                        {photoFile && (
                          <button
                            type="button"
                            onClick={() => runRiderPhotoUpload(photoFile)}
                            className="px-2.5 py-1 bg-[#F2B90D] text-[#111111] rounded-lg text-[11px] font-black inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry Upload</span>
                          </button>
                        )}
                      </div>
                    )}

                    {photoPreview && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-[11px] text-[#555555] hover:text-[#111111] inline-flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Usman Danladi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] focus:bg-[#FFFFFF] rounded-xl text-[#111111] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">
                    Phone Number (Calls) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g., 080..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] focus:bg-[#FFFFFF] rounded-xl text-[#111111] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Same as phone if blank"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] focus:bg-[#FFFFFF] rounded-xl text-[#111111] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">
                  Area you cover in Wukari *
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] focus:bg-[#FFFFFF] rounded-xl text-[#111111] outline-none"
                >
                  {WUKARI_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 p-3 bg-[#F5F5F5] rounded-xl border border-[#E5E7EB]">
                <input
                  type="checkbox"
                  id="availToggle"
                  checked={isAvailableNow}
                  onChange={(e) => setIsAvailableNow(e.target.checked)}
                  className="w-4 h-4 accent-[#0B6B3A]"
                />
                <label htmlFor="availToggle" className="text-xs font-bold text-[#111111] cursor-pointer">
                  I am available for passenger rides right now
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-[#555555] hover:text-[#111111] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadStatus === 'uploading'}
                  className="px-6 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs sm:text-sm rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Join as Bike Man'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
