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
  ChevronDown,
  Sparkles,
  Users,
  Radio,
  Image as ImageIcon
} from 'lucide-react';
import { BikeRider } from '../types.js';
import {
  fetchBikeRiders,
  registerBikeRider,
  setBikeRiderAvailability
} from '../services/api.js';
import { uploadRiderPhoto } from '../services/imageStorage.js';
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

  // Form states
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [area, setArea] = useState(WUKARI_AREAS[0]);
  const [isAvailableNow, setIsAvailableNow] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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
    // Set document title
    document.title = 'Call Bike Man in Wukari - Fast Okada | ZangaMarket';
    loadRiders();
  }, [selectedArea]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Photo size must not exceed 5MB.');
      return;
    }

    setFormError('');
    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!phoneNumber.trim()) {
      setFormError('Please enter your active phone number.');
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);

    try {
      let photoUrl = '';
      if (photoFile) {
        photoUrl = await uploadRiderPhoto(
          photoFile,
          user?.id || `rider-${Date.now()}`,
          (pct) => setUploadProgress(pct)
        );
      }

      setUploadProgress(100);

      const newRider = await registerBikeRider({
        name: fullName.trim(),
        photoUrl,
        phoneNumber: phoneNumber.trim(),
        whatsappNumber: (whatsappNumber || phoneNumber).trim(),
        area,
        isAvailable: isAvailableNow,
        userId: user?.id
      });

      // Update UI immediately with real rider from Firestore
      setRiders((prev) => [newRider.rider, ...prev]);
      setShowRegisterModal(false);
      showToast(`Welcome ${fullName}! You are now listed in the Wukari Bike Directory.`);

      // Reset form
      setFullName('');
      setPhoneNumber('');
      setWhatsappNumber('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setUploadProgress(null);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setFormError(err.message || 'Failed to register as bike rider. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Format Nigerian phone number for WhatsApp link
  const getCleanWaLink = (rawNumber: string, riderArea: string) => {
    let cleaned = rawNumber.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    } else if (!cleaned.startsWith('234')) {
      cleaned = '234' + cleaned;
    }
    const message = encodeURIComponent(`Hello, I need bike in Wukari from ${riderArea}. Are you available?`);
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
    <div className="min-h-screen bg-[#F5F5F5] text-[#222222] flex flex-col font-sans">
      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C1917] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-gray-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMarketplace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 hover:text-[#F68B1F] hover:bg-orange-50 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Marketplace</span>
            </button>
            <div className="h-5 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl">🏍️</span>
              <h1 className="text-sm sm:text-base font-black text-[#222222] tracking-tight">
                Wukari Okada Directory
              </h1>
            </div>
          </div>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#F68B1F] to-[#FF7A00] hover:from-[#E07A15] hover:to-[#F68B1F] text-white font-extrabold text-xs sm:text-sm rounded-full shadow-md shadow-orange-500/25 active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register as Bike Man</span>
          </button>
        </div>
      </div>

      {/* Hero Header in Orange Theme */}
      <div className="bg-gradient-to-br from-[#1C1917] via-[#2D1B0D] to-[#1C1917] text-white py-8 sm:py-12 px-4 shadow-md">
        <div className="max-w-7xl mx-auto text-center sm:text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-[#FFA03A] text-xs font-black uppercase tracking-wider mb-3 border border-orange-500/30">
              <Radio className="w-3 h-3 animate-ping" />
              <span>Fast Okada in Wukari Town & FUWukari</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Call Bike Man in Wukari
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
              Need a quick ride to Wukari Market, FUWukari Campus, Hospital Road, or Yam Market?
              Connect directly with verified local Okada riders. Call immediately or chat on WhatsApp!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-3xl flex flex-col gap-2 shrink-0 self-center sm:self-auto text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Direct Driver Contact • 0% Middleman</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Instant pickup across all 8 Wukari zones</span>
            </div>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="mt-2 w-full py-2 bg-[#F68B1F] hover:bg-[#E07A15] text-white text-xs font-black rounded-xl transition shadow text-center"
            >
              Are you a Bike Man? Join Now
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* Search & Area Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="w-full md:max-w-md relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search rider by name, phone or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-[#F68B1F] rounded-xl text-xs sm:text-sm outline-none transition"
            />
          </div>

          {/* Area Filter Pills */}
          <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedArea('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 ${
                selectedArea === 'all'
                  ? 'bg-[#F68B1F] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Wukari ({riders.length})
            </button>
            {WUKARI_AREAS.map((a) => (
              <button
                key={a}
                onClick={() => setSelectedArea(a)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 ${
                  selectedArea === a
                    ? 'bg-[#F68B1F] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Riders Directory Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-[#F68B1F] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-bold text-gray-500">Loading Wukari Okada riders...</p>
          </div>
        ) : filteredRiders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-gray-200 shadow-sm max-w-lg mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-orange-100 text-[#F68B1F] text-3xl flex items-center justify-center mx-auto mb-4">
              🏍️
            </div>
            <h3 className="text-base sm:text-lg font-black text-gray-900">
              No registered riders available yet.
            </h3>
            <p className="text-xs text-gray-500 mt-1 mb-6 leading-relaxed">
              No bike man registered yet in Wukari — Be the first to register! Are you an Okada rider in Wukari? Register your phone and motorcycle picture now so university students and market traders can call you directly!
            </p>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-6 py-3 bg-[#F68B1F] hover:bg-[#E07A15] text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-lg shadow-orange-500/25 active:scale-95 transition"
            >
              Register as Bike Man
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredRiders.map((rider) => (
              <div
                key={rider.id}
                className="bg-white rounded-3xl overflow-hidden border border-gray-200/90 shadow-sm hover:shadow-xl hover:border-[#F68B1F]/60 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Photo Section */}
                  <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    {rider.photoUrl ? (
                      <img
                        src={rider.photoUrl}
                        alt={rider.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                        <span className="text-4xl mb-1">🏍️</span>
                        <span className="text-[10px] font-bold text-gray-500">Wukari Okada Rider</span>
                      </div>
                    )}

                    {/* Online / Offline Dot Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-md ${
                          rider.isAvailable
                            ? 'bg-emerald-600/95 text-white'
                            : 'bg-gray-800/80 text-gray-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            rider.isAvailable ? 'bg-emerald-300 animate-pulse' : 'bg-gray-400'
                          }`}
                        />
                        <span>{rider.isAvailable ? 'Available Now' : 'Offline'}</span>
                      </span>
                    </div>

                    {/* Verified Rider Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="bg-black/60 text-white p-1 rounded-full backdrop-blur-md shadow" title="Verified Okada Operator">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="p-4">
                    <h3 className="font-extrabold text-base text-gray-900 tracking-tight line-clamp-1">
                      {rider.name}
                    </h3>

                    {/* Area Badge */}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-[#F68B1F] shrink-0" />
                      <span className="truncate">{rider.area}</span>
                    </div>

                    <div className="mt-2 text-[11px] text-gray-400 font-mono">
                      📞 {rider.phoneNumber}
                    </div>
                  </div>
                </div>

                {/* Two Big Action Buttons */}
                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${rider.phoneNumber}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>CALL NOW</span>
                  </a>

                  <a
                    href={getCleanWaLink(rider.whatsappNumber || rider.phoneNumber, rider.area)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#25D366] hover:bg-[#20BD5A] active:scale-95 text-white rounded-xl text-xs font-black shadow-md shadow-green-500/20 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
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
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#F68B1F] to-[#FF7A00] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏍️</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black">Register as Bike Man</h3>
                  <p className="text-[11px] text-white/90">Wukari Okada Directory • Free Listing</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
                  Upload Photo (Rider with Bike) <span className="text-gray-400 font-normal">(Max 5MB)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#F68B1F]/60 hover:border-[#F68B1F] bg-orange-50/50 flex flex-col items-center justify-center cursor-pointer transition overflow-hidden shrink-0"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Rider Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2 text-[#E07A15]">
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Select Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    <p className="font-semibold text-gray-700">Show yourself with your motorcycle</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Helps passengers recognize you easily at Wukari junctions and campus gates.</p>
                    {photoFile && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ {photoFile.name}</p>
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

                {uploadProgress !== null && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                      <span>Uploading to Firebase Storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#F68B1F] h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Usman Danladi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition font-medium"
                />
              </div>

              {/* Phone & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                    Phone Number (Calls) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g., 08012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Same as phone or WhatsApp"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition font-medium"
                  />
                </div>
              </div>

              {/* Operating Area Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Area you cover in Wukari <span className="text-red-500">*</span>
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none transition font-medium"
                >
                  {WUKARI_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {/* Available Online Checkbox */}
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <input
                  type="checkbox"
                  id="availToggle"
                  checked={isAvailableNow}
                  onChange={(e) => setIsAvailableNow(e.target.checked)}
                  className="w-4 h-4 text-[#F68B1F] rounded focus:ring-0"
                />
                <label htmlFor="availToggle" className="text-xs font-bold text-emerald-900 cursor-pointer">
                  I am available and ready for passenger rides right now (Online)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-50"
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
