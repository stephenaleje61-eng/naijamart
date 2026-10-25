import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Users,
  Search,
  Filter,
  PlusCircle,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Heart,
  Flag,
  X,
  Upload,
  ArrowLeft,
  ChevronDown,
  Building,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Tag
} from 'lucide-react';
import { HuxListing, HuxCategory, HuxType, RegisteredUser } from '../types.js';
import {
  subscribeToHuxListings,
  createHuxListing,
  deleteHuxListing,
  reportHuxListing
} from '../services/firebase.js';
import { uploadHuxPhoto } from '../services/imageStorage.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';
import { StudentLoginModal } from './StudentLoginModal.js';
import { formatNaira } from './ProductCard.js';

interface HuxPageProps {
  onBackToHome: () => void;
  onNavigateToHub: () => void;
  onNavigateToFriends: () => void;
}

export const WUKARI_HOUSING_LOCATIONS = [
  'Behind LT (Lecture Theatre)',
  'Bye Pass',
  'FUWukari Main Gate',
  'FUWukari New Site',
  'General Hospital Road',
  'Puje Quarter',
  'Yam Market Area',
  'Old Market / Roundabout',
  'Anguwan Jeka',
  'Anywhere in Wukari'
];

export const HOUSING_TYPES: HuxType[] = [
  'Self-contain',
  'Single room',
  '2-Bedroom',
  'Flat',
  'Shared room'
];

const SAVED_HUX_KEY = 'fuw_saved_hux_ids';

export const HuxPage: React.FC<HuxPageProps> = ({
  onBackToHome,
  onNavigateToHub,
  onNavigateToFriends
}) => {
  const [student, setStudent] = useState<RegisteredUser | null>(() => getLocalStudentSession());
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Tab & Filter states
  const [activeCategory, setActiveCategory] = useState<HuxCategory>('rent');
  const [listings, setListings] = useState<HuxListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [priceSort, setPriceSort] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [savedHuxIds, setSavedHuxIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_HUX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Post Modal States
  const [showPostModal, setShowPostModal] = useState(false);
  const [formCategory, setFormCategory] = useState<HuxCategory>('rent');
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState(WUKARI_HOUSING_LOCATIONS[0]);
  const [formPrice, setFormPrice] = useState('');
  const [formPricePer, setFormPricePer] = useState<'year' | 'semester' | 'month'>('year');
  const [formPhone, setFormPhone] = useState(student?.phone || student?.whatsappNumber || '');
  const [formWhatsapp, setFormWhatsapp] = useState(student?.whatsappNumber || student?.phone || '');
  const [formType, setFormType] = useState<HuxType>('Self-contain');
  const [formDescription, setFormDescription] = useState('');
  const [formIsAgent, setFormIsAgent] = useState(false);
  const [formAgentName, setFormAgentName] = useState('');

  // Image Upload Queue for Post Form (up to 3 photos)
  const [selectedPhotos, setSelectedPhotos] = useState<Array<{ file: File; preview: string; uploadedUrl?: string }>>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Report Modal States
  const [reportingHux, setReportingHux] = useState<HuxListing | null>(null);
  const [reportReason, setReportReason] = useState('Suspected fake lodge or agent scam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Detail Modal
  const [detailHux, setDetailHux] = useState<HuxListing | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Subscribe to real-time Hux listings
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToHuxListings(activeCategory, (items) => {
      setListings(items);
      setLoading(false);
    });
    return () => unsub();
  }, [activeCategory]);

  const toggleSaveHux = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedHuxIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(SAVED_HUX_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSelectPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = 3 - selectedPhotos.length;
    if (availableSlots <= 0) {
      alert('You can upload a maximum of 3 photos per housing listing.');
      return;
    }

    const newItems: Array<{ file: File; preview: string }> = [];
    const filesToTake = Math.min(files.length, availableSlots);

    for (let i = 0; i < filesToTake; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newItems.push({
          file,
          preview: URL.createObjectURL(file)
        });
      }
    }

    setSelectedPhotos((prev) => [...prev, ...newItems]);
  };

  const removePhoto = (idx: number) => {
    setSelectedPhotos((prev) => {
      const target = prev[idx];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!student) {
      setShowLoginModal(true);
      return;
    }

    const priceNum = Number(formPrice.replace(/[^0-9]/g, ''));
    if (!priceNum || priceNum < 1000) {
      setPostError('Please enter a valid price in Naira (minimum ₦1,000)');
      return;
    }

    if (!formPhone || formPhone.length < 10) {
      setPostError('Please provide a valid phone number for student inquiries');
      return;
    }

    setIsPosting(true);
    setPostError(null);

    try {
      // 1. Upload photos sequentially (if any)
      const uploadedUrls: string[] = [];
      for (let i = 0; i < selectedPhotos.length; i++) {
        const item = selectedPhotos[i];
        setUploadProgress(Math.round(((i + 1) / selectedPhotos.length) * 90));
        const url = await uploadHuxPhoto(item.file, student.id);
        uploadedUrls.push(url);
      }

      // 2. Save document directly in Firestore collection "hux"
      await createHuxListing({
        category: formCategory,
        title: formTitle.trim(),
        location: formLocation,
        price: priceNum,
        pricePer: formPricePer,
        phone: formPhone.trim(),
        whatsapp: (formWhatsapp || formPhone).trim(),
        images: uploadedUrls,
        imageUrl: uploadedUrls[0] || '',
        description: formDescription.trim(),
        type: formType,
        isAgent: formIsAgent,
        agentName: formIsAgent ? formAgentName.trim() || student.name : undefined,
        userId: student.id,
        userName: student.name,
        matricNumber: student.matricNumber
      });

      // Reset form
      setFormTitle('');
      setFormPrice('');
      setFormDescription('');
      setSelectedPhotos([]);
      setShowPostModal(false);
      alert('Your housing listing has been posted successfully to Wukari Hux Hub!');
    } catch (err: any) {
      console.error('Failed to post hux:', err);
      setPostError(err?.message || 'Could not post listing. Please check connection and retry.');
    } finally {
      setIsPosting(false);
      setUploadProgress(0);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingHux) return;

    setReportSubmitting(true);
    try {
      await reportHuxListing({
        huxId: reportingHux.id,
        huxTitle: reportingHux.title,
        reason: reportReason,
        details: reportDetails,
        reporterName: student?.name || 'Anonymous Student',
        reporterContact: student?.phone || student?.matricNumber || 'Online User'
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportingHux(null);
        setReportSuccess(false);
        setReportDetails('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit scam report');
    } finally {
      setReportSubmitting(false);
    }
  };

  // Filter listings
  const filteredListings = listings
    .filter((item) => {
      if (selectedLocation !== 'all' && item.location !== selectedLocation) return false;
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesLoc = item.location.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesLoc && !matchesDesc) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (priceSort === 'price-asc') return a.price - b.price;
      if (priceSort === 'price-desc') return b.price - a.price;
      return 0; // default newest
    });

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans pb-24 sm:pb-0">
      
      {/* 1. TOP HEADER */}
      <div className="bg-[#008751] text-white px-3 sm:px-4 py-2.5 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBackToHome}
            className="p-1.5 rounded-full hover:bg-black/15 transition text-white"
            title="Back to Marketplace"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                Wukari Hux Hub
              </h1>
              <span className="bg-[#F68B1F] text-[10px] text-white font-black px-2 py-0.5 rounded-full">
                Campus Housing
              </span>
            </div>
            <p className="text-[11px] text-emerald-100">
              Lodges, self-contains & roommate matching around FUWukari
            </p>
          </div>
        </div>

        {/* Post Button */}
        <button
          onClick={() => {
            if (!student) {
              setShowLoginModal(true);
            } else {
              setShowPostModal(true);
            }
          }}
          className="px-3 py-1.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white text-xs font-black rounded-xl shadow transition active:scale-95 flex items-center gap-1.5"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Post Hux</span>
        </button>
      </div>

      {/* 2. MAIN CONTAINER */}
      <div className="max-w-5xl w-full mx-auto p-3 sm:p-5 flex-1">
        
        {/* CATEGORY TABS: "House for Rent" vs "Find Roommate" */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-200 flex items-center mb-4">
          <button
            onClick={() => setActiveCategory('rent')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 ${
              activeCategory === 'rent'
                ? 'bg-[#008751] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>House for Rent (Lodges)</span>
          </button>

          <button
            onClick={() => setActiveCategory('roommate')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 ${
              activeCategory === 'roommate'
                ? 'bg-[#008751] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Find Roommate</span>
          </button>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 mb-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by lodge name, location, or features (e.g. tile, running water)..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {/* Location Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#008751]" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent text-gray-800 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all">All Wukari Locations</option>
                {WUKARI_HOUSING_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Building className="w-3.5 h-3.5 text-[#F68B1F]" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-gray-800 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {HOUSING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Sort */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as any)}
                className="bg-transparent text-gray-800 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="default">Sort: Newest</option>
                <option value="price-asc">Price: Lowest to Highest</option>
                <option value="price-desc">Price: Highest to Lowest</option>
              </select>
            </div>
          </div>
        </div>

        {/* LISTINGS GRID */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-[#008751] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-500">Loading Wukari campus housing...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-orange-100 text-[#F68B1F] text-3xl flex items-center justify-center mx-auto mb-3">
              🏠
            </div>
            <h3 className="text-base font-black text-gray-900">
              No lodges or roommate requests posted yet in Wukari Hux Hub
            </h3>
            <p className="text-xs text-gray-500 mt-1 mb-5 leading-relaxed">
              Are you a house agent, landlord, or student with a room or looking for a roommate in Wukari? Be the very first to post!
            </p>
            <button
              onClick={() => {
                if (!student) {
                  setShowLoginModal(true);
                } else {
                  setShowPostModal(true);
                }
              }}
              className="px-5 py-2.5 bg-[#008751] hover:bg-[#007043] text-white text-xs font-black rounded-xl shadow transition"
            >
              Post First Housing Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((hux) => {
              const isSaved = savedHuxIds.includes(hux.id);
              const isOwn = student && hux.userId === student.id;

              return (
                <div
                  key={hux.id}
                  onClick={() => {
                    setDetailHux(hux);
                    setActiveImageIdx(0);
                  }}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-200/90 hover:border-[#008751]/80 shadow-xs hover:shadow-lg transition flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Image Area */}
                    <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden flex items-center justify-center">
                      {hux.imageUrl ? (
                        <img
                          src={hux.imageUrl}
                          alt={hux.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Building className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Wukari Lodge</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          {hux.type}
                        </span>
                        {hux.isAgent && (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified Agent</span>
                          </span>
                        )}
                      </div>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleSaveHux(hux.id, e)}
                        className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition ${
                          isSaved
                            ? 'bg-red-500 text-white'
                            : 'bg-white/80 hover:bg-white text-gray-600'
                        }`}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>

                      {/* Photo counter */}
                      {hux.images.length > 1 && (
                        <span className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">
                          📷 {hux.images.length} photos
                        </span>
                      )}
                    </div>

                    {/* Details Content */}
                    <div className="p-3.5">
                      {/* Price */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-base sm:text-lg font-black text-[#008751]">
                          {formatNaira(hux.price)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase">
                          / {hux.pricePer}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-extrabold text-xs sm:text-sm text-gray-900 mt-1 line-clamp-1 group-hover:text-[#008751] transition">
                        {hux.title}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-600 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-[#F68B1F] shrink-0" />
                        <span className="truncate">{hux.location}</span>
                      </div>

                      {/* Description preview */}
                      {hux.description && (
                        <p className="text-[11px] text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                          {hux.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Call Button */}
                      <a
                        href={`tel:${hux.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-[#008751] rounded-xl font-bold transition flex items-center justify-center"
                        title="Call Poster"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>

                      {/* WhatsApp Button */}
                      <a
                        href={`https://wa.me/${hux.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hello, I saw your "${hux.title}" listing on Wukari Hux Hub. Is it still available?`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] font-black rounded-xl transition flex items-center gap-1 shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </a>
                    </div>

                    {/* Report Scam Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportingHux(hux);
                      }}
                      className="text-gray-400 hover:text-red-500 text-[10px] font-bold p-1 rounded transition flex items-center gap-1"
                      title="Report Scam"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 3. POST HUX MODAL */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-4">
            
            {/* Header */}
            <div className="bg-[#008751] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Post on Wukari Hux Hub</h3>
                <p className="text-[11px] text-emerald-100">Lodges, Self-Contains & Roommates</p>
              </div>
              <button
                onClick={() => setShowPostModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePostSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {postError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{postError}</span>
                </div>
              )}

              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Listing Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCategory('rent')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      formCategory === 'rent'
                        ? 'bg-emerald-50 border-[#008751] text-[#008751]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    🏢 House for Rent (Lodge)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCategory('roommate')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      formCategory === 'roommate'
                        ? 'bg-emerald-50 border-[#008751] text-[#008751]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    👥 Find Roommate
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Listing Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Spacious Tiled Self-Contain with running water"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
                />
              </div>

              {/* Location & Housing Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Location in Wukari <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
                  >
                    {WUKARI_HOUSING_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Housing Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
                  >
                    {HOUSING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Billing Cycle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Price (₦ Naira) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={formPricePer}
                    onChange={(e) => setFormPricePer(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
                  >
                    <option value="year">Per Year (Session)</option>
                    <option value="semester">Per Semester</option>
                    <option value="month">Per Month</option>
                  </select>
                </div>
              </div>

              {/* Phone & WhatsApp Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 08167258121"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="e.g. 08167258121"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
                  />
                </div>
              </div>

              {/* Agent Badge Toggle */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Are you a Real Estate Agent / Landlord?</p>
                  <p className="text-[10px] text-gray-500">Adds a Verified Agent badge to your listing</p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsAgent}
                  onChange={(e) => setFormIsAgent(e.target.checked)}
                  className="w-4 h-4 text-[#008751] rounded"
                />
              </div>

              {/* Photos upload (up to 3) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Lodge / Room Photos <span className="text-gray-400 font-normal">(Up to 3 genuine images)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {selectedPhotos.map((item, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                      <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {selectedPhotos.length < 3 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#008751] flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-emerald-50 transition">
                      <Upload className="w-5 h-5 text-gray-400 mb-1" />
                      <span className="text-[10px] font-bold text-gray-600">Add Photo</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleSelectPhotos}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description & Facilities
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mention key details: water borehole, security, fenced compound, light status, tile, prepaid meter, etc."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPosting}
                className="w-full py-3 bg-[#008751] hover:bg-[#007043] disabled:opacity-50 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading Photos & Saving ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Listing</span>
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* 4. DETAIL MODAL */}
      {detailHux && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4">
            <button
              onClick={() => setDetailHux(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Main Photo Gallery */}
            <div className="relative aspect-[16/10] bg-gray-900">
              {detailHux.images.length > 0 ? (
                <img
                  src={detailHux.images[activeImageIdx] || detailHux.imageUrl}
                  alt={detailHux.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <Building className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Thumbnail dots */}
            {detailHux.images.length > 1 && (
              <div className="flex items-center gap-2 p-2 bg-gray-100 justify-center">
                {detailHux.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition ${
                      activeImageIdx === i ? 'border-[#008751]' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-[#008751]">
                  {formatNaira(detailHux.price)}
                  <span className="text-xs text-gray-500 font-semibold uppercase">
                    {' '}/ {detailHux.pricePer}
                  </span>
                </span>
                <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                  {detailHux.type}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-black text-gray-900">
                {detailHux.title}
              </h2>

              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-bold">
                <MapPin className="w-4 h-4 text-[#F68B1F]" />
                <span>{detailHux.location}</span>
              </div>

              {detailHux.description && (
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80">
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-1">Details & Facilities</h4>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {detailHux.description}
                  </p>
                </div>
              )}

              {/* Poster info */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>Posted by: <strong className="text-gray-800">{detailHux.userName}</strong></span>
                {detailHux.matricNumber && (
                  <span className="font-mono">{detailHux.matricNumber}</span>
                )}
              </div>

              {/* Contact Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href={`tel:${detailHux.phone}`}
                  className="py-3 bg-emerald-50 hover:bg-emerald-100 text-[#008751] font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {detailHux.phone}</span>
                </a>

                <a
                  href={`https://wa.me/${detailHux.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hello, I saw your "${detailHux.title}" listing on Wukari Hux Hub. Is it still available?`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. SCAM REPORT MODAL */}
      {reportingHux && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden my-4 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                <Flag className="w-4 h-4" />
                <span>Report Suspicious Listing</span>
              </div>
              <button
                onClick={() => setReportingHux(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-900">Report Submitted</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Thank you for keeping Wukari campus safe from housing fraud.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                <p className="text-xs text-gray-600">
                  Listing: <strong>{reportingHux.title}</strong>
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Reason for Report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Suspected fake lodge or agent scam">Suspected fake lodge or agent scam</option>
                    <option value="Demanding advance payment before inspection">Demanding advance payment before inspection</option>
                    <option value="Incorrect location or price">Incorrect location or price</option>
                    <option value="Lodge already fully occupied">Lodge already fully occupied</option>
                    <option value="Offensive or inappropriate content">Offensive or inappropriate content</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Additional Details
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide any evidence or details to help moderators investigate..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow transition"
                >
                  {reportSubmitting ? 'Submitting Report...' : 'Submit Report'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Student Login Modal */}
      <StudentLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(loggedStudent) => setStudent(loggedStudent)}
        initialData={student}
        title="Post on Wukari Hux Hub"
        subtitle="Set your name and matric number to post housing listings and connect with students."
      />

    </div>
  );
};
