import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  MessageCircle,
  MessageSquare,
  MapPin,
  ShieldCheck,
  Heart,
  Flag,
  X,
  Upload,
  ArrowLeft,
  Building,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Edit3,
  RefreshCw,
  Tag
} from 'lucide-react';
import { UploadTask } from 'firebase/storage';
import { HuxListing, HuxCategory, HuxType, RegisteredUser } from '../types.js';
import {
  subscribeToHuxListings,
  createHuxListing,
  updateHuxListing,
  deleteHuxListing,
  reportHuxListing
} from '../services/firebase.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { isValidImageFormat } from '../utils/imagePersistence.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';
import { StudentLoginModal } from './StudentLoginModal.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';

interface HuxPageProps {
  onBackToHome: () => void;
  onStartDirectChat: (target: { id: string; name: string; matricNumber?: string }) => void;
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
  '1-Bedroom',
  '2-Bedroom',
  'Student lodge',
  'Shared room',
  'Flat',
  'Other'
];

const FACILITY_OPTIONS = [
  'Running Water',
  'Borehole',
  'Tiled Floor',
  'Prepaid Meter',
  'Fenced & Gated',
  'Security Guard',
  'Solar / Backup',
  'Private Kitchen & Toilet'
];

const SAVED_HUX_KEY = 'fu_market_saved_hux_ids';

interface HuxPhotoSlot {
  id: string;
  file?: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  downloadUrl?: string;
  errorMessage?: string;
  warningMessage?: string;
  task?: UploadTask;
}

export const HuxPage: React.FC<HuxPageProps> = ({
  onBackToHome,
  onStartDirectChat
}) => {
  const { user: authUser } = useAuth();
  const [student, setStudent] = useState<RegisteredUser | null>(() => getLocalStudentSession());
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Tab & Filter states
  const [activeCategory, setActiveCategory] = useState<HuxCategory>('rent');
  const [listings, setListings] = useState<HuxListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  const [priceSort, setPriceSort] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [savedHuxIds, setSavedHuxIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_HUX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create / Edit Modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingHux, setEditingHux] = useState<HuxListing | null>(null);
  const [formCategory, setFormCategory] = useState<HuxCategory>('rent');
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState(WUKARI_HOUSING_LOCATIONS[0]);
  const [formPrice, setFormPrice] = useState('');
  const [formPricePer, setFormPricePer] = useState<'year' | 'semester' | 'month'>('year');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formType, setFormType] = useState<HuxType>('Self-contain');
  const [formRooms, setFormRooms] = useState('1');
  const [formFacilities, setFormFacilities] = useState<string[]>([]);
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formDescription, setFormDescription] = useState('');
  const [formIsAgent, setFormIsAgent] = useState(true);
  const [formAgentName, setFormAgentName] = useState('');

  // Image slots
  const [photoSlots, setPhotoSlots] = useState<HuxPhotoSlot[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Report Modal States
  const [reportingHux, setReportingHux] = useState<HuxListing | null>(null);
  const [reportReason, setReportReason] = useState('Suspected fake lodge or agent scam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Detail Modal
  const [detailHux, setDetailHux] = useState<HuxListing | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    document.title = 'Wukari Agent — Campus Housing | FU MARKET';
  }, []);

  useEffect(() => {
    if (authUser && (!student || student.id !== authUser.id)) {
      setStudent({
        id: authUser.id,
        name: authUser.name,
        matricNumber: student?.matricNumber || 'FUW-STUDENT',
        phone: authUser.phone || authUser.whatsappNumber || '',
        whatsappNumber: authUser.whatsappNumber || authUser.phone || '',
        isOnline: true,
        lastSeen: Date.now()
      });
    }
  }, [authUser]);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToHuxListings(activeCategory, (items) => {
      setListings(items);
      setLoading(false);
    });
    return () => unsub();
  }, [activeCategory]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

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

  const resetForm = () => {
    photoSlots.forEach((s) => {
      if (s.task) {
        try {
          s.task.cancel();
        } catch {}
      }
    });
    setEditingHux(null);
    setFormCategory(activeCategory);
    setFormTitle('');
    setFormLocation(WUKARI_HOUSING_LOCATIONS[0]);
    setFormPrice('');
    setFormPricePer('year');
    setFormPhone(student?.phone || student?.whatsappNumber || '');
    setFormWhatsapp(student?.whatsappNumber || student?.phone || '');
    setFormType('Self-contain');
    setFormRooms('1');
    setFormFacilities([]);
    setFormIsAvailable(true);
    setFormDescription('');
    setFormIsAgent(true);
    setFormAgentName(student?.name || '');
    setPhotoSlots([]);
    setPostError(null);
  };

  const openCreateModal = () => {
    if (!student) {
      setShowLoginModal(true);
      return;
    }
    resetForm();
    setShowPostModal(true);
  };

  const openEditModal = (hux: HuxListing, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingHux(hux);
    setFormCategory(hux.category);
    setFormTitle(hux.title);
    setFormLocation(hux.location);
    setFormPrice(String(hux.price));
    setFormPricePer(hux.pricePer);
    setFormPhone(hux.phone);
    setFormWhatsapp(hux.whatsapp || hux.phone);
    setFormType(hux.type);
    setFormRooms(String(hux.rooms || 1));
    setFormFacilities(hux.facilities || []);
    setFormIsAvailable(hux.isAvailable !== false);
    setFormDescription(hux.description || '');
    setFormIsAgent(Boolean(hux.isAgent));
    setFormAgentName(hux.agentName || hux.userName || '');
    setPhotoSlots(
      (hux.images || []).map((url, idx) => ({
        id: `existing-${idx}-${Date.now()}`,
        preview: url,
        downloadUrl: url,
        progress: 100,
        status: 'success'
      }))
    );
    setPostError(null);
    setShowPostModal(true);
  };

  const uploadSinglePhotoSlot = async (slotId: string, file: File) => {
    if (!student) return;
    setPhotoSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, status: 'uploading', progress: 10, errorMessage: undefined } : s))
    );

    try {
      const result = await uploadImageToFirebaseStorage(file, {
        folder: 'hux',
        ownerId: student.id,
        timeoutMs: 30000,
        onProgress: (pct) => {
          setPhotoSlots((prev) =>
            prev.map((s) => (s.id === slotId ? { ...s, progress: pct } : s))
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
                errorMessage: err?.message || 'Upload failed. Click Retry.',
                task: undefined
              }
            : s
        )
      );
    }
  };

  const handleSelectPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setPostError(null);
    const availableSlots = 3 - photoSlots.length;
    if (availableSlots <= 0) {
      setPostError('You can upload a maximum of 3 photos per housing listing.');
      return;
    }

    const incoming = Array.from(files).slice(0, availableSlots);
    for (const file of incoming) {
      if (!isValidImageFormat(file)) {
        setPostError('Only JPG, JPEG, PNG, and WebP images are allowed.');
        return;
      }
    }

    const newSlots: HuxPhotoSlot[] = incoming.map((file) => ({
      id: `hux-slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'uploading'
    }));

    setPhotoSlots((prev) => [...prev, ...newSlots]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    for (const slot of newSlots) {
      if (slot.file) {
        await uploadSinglePhotoSlot(slot.id, slot.file);
      }
    }
  };

  const handleCancelPhotoSlot = (slotId: string) => {
    const slot = photoSlots.find((s) => s.id === slotId);
    if (slot?.task) {
      try {
        slot.task.cancel();
      } catch {}
    }
    setPhotoSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, status: 'error', errorMessage: 'Cancelled.', task: undefined }
          : s
      )
    );
  };

  const handleRemovePhotoSlot = (slotId: string) => {
    setPhotoSlots((prev) => {
      const target = prev.find((s) => s.id === slotId);
      if (target?.task) {
        try {
          target.task.cancel();
        } catch {}
      }
      return prev.filter((s) => s.id !== slotId);
    });
  };

  const toggleFacility = (fac: string) => {
    setFormFacilities((prev) =>
      prev.includes(fac) ? prev.filter((f) => f !== fac) : [...prev, fac]
    );
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) {
      setShowLoginModal(true);
      return;
    }

    setPostError(null);

    if (photoSlots.some((s) => s.status === 'uploading')) {
      setPostError('Photos are still uploading. Please wait or cancel them first.');
      return;
    }
    if (photoSlots.some((s) => s.status === 'error')) {
      setPostError('One or more photos failed to upload. Please click Retry or remove the failed photo.');
      return;
    }

    const priceNum = Number(formPrice.replace(/[^0-9]/g, ''));
    if (!priceNum || priceNum < 1000) {
      setPostError('Please enter a valid price in Naira (minimum ₦1,000).');
      return;
    }
    if (!formPhone || formPhone.replace(/[^0-9]/g, '').length < 10) {
      setPostError('Please provide a valid phone number for student inquiries.');
      return;
    }

    const uploadedUrls = photoSlots
      .filter((s) => s.status === 'success' && s.downloadUrl)
      .map((s) => s.downloadUrl!);

    setIsPosting(true);
    try {
      if (editingHux) {
        await updateHuxListing(editingHux.id, {
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
          rooms: Math.max(1, Number(formRooms) || 1),
          facilities: formFacilities,
          isAvailable: formIsAvailable,
          isAgent: formIsAgent,
          agentName: formIsAgent ? (formAgentName.trim() || student.name) : undefined
        });
        showToast('Accommodation listing updated on Wukari Agent!');
      } else {
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
          rooms: Math.max(1, Number(formRooms) || 1),
          facilities: formFacilities,
          isAvailable: formIsAvailable,
          isAgent: formIsAgent,
          agentName: formIsAgent ? (formAgentName.trim() || student.name) : undefined,
          userId: student.id,
          userName: student.name,
          matricNumber: student.matricNumber
        });
        showToast('Your listing has been posted on Wukari Agent!');
      }

      setShowPostModal(false);
      resetForm();
    } catch (err: any) {
      setPostError(err?.message || 'Could not save listing. Please retry.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleAvailability = async (hux: HuxListing, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const next = hux.isAvailable === false;
      await updateHuxListing(hux.id, { isAvailable: next });
      showToast(next ? 'Marked accommodation as Available.' : 'Marked accommodation as Occupied.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update availability.');
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await deleteHuxListing(id);
      setConfirmDeleteId(null);
      if (detailHux?.id === id) setDetailHux(null);
      showToast('Accommodation listing deleted.');
    } catch (err: any) {
      showToast(err?.message || 'Could not delete listing.');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingHux) return;
    setReportError('');
    setReportSubmitting(true);
    try {
      await reportHuxListing({
        huxId: reportingHux.id,
        huxTitle: reportingHux.title,
        reason: reportReason,
        details: reportDetails,
        reporterName: student?.name || 'FUWUKARI Student',
        reporterContact: student?.phone || student?.matricNumber || 'Campus User'
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportingHux(null);
        setReportSuccess(false);
        setReportDetails('');
      }, 1800);
    } catch (err: any) {
      setReportError(err?.message || 'Failed to submit report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const buildWaLink = (hux: HuxListing) => {
    let cleaned = (hux.whatsapp || hux.phone || '').replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (cleaned && !cleaned.startsWith('234')) cleaned = '234' + cleaned;
    const text = encodeURIComponent(
      `Hello, I saw "${hux.title}" at ${hux.location} on FU MARKET (Wukari Agent). Is it still available for inspection?`
    );
    return `https://wa.me/${cleaned}?text=${text}`;
  };

  const filteredListings = listings
    .filter((item) => {
      if (availabilityFilter === 'available' && item.isAvailable === false) return false;
      if (selectedLocation !== 'all' && item.location !== selectedLocation) return false;
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q) ||
          (item.facilities || []).some((f) => f.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (priceSort === 'price-asc') return a.price - b.price;
      if (priceSort === 'price-desc') return b.price - a.price;
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col font-sans pb-24 sm:pb-8">
      {toastMsg && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-[#1C1C1C] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#FFFFFF] flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#FFFFFF] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-[#121212] border-b border-[#333333] px-3 sm:px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] rounded-xl text-xs font-bold text-[#BDBDBD] hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to FU MARKET</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                Wukari Agent
              </h1>
              <span className="bg-[#FFFFFF] text-black text-[10px] font-black px-2 py-0.5 rounded-md">
                Campus Housing
              </span>
            </div>
            <p className="text-[11px] text-[#BDBDBD]">
              Self-contain, lodges, bedrooms &amp; roommate matching around FUWUKARI
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black text-xs font-black rounded-xl transition active:scale-95 flex items-center gap-1.5"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Post Property</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-3 sm:p-5 flex-1">
        {/* Category Tabs */}
        <div className="bg-[#121212] rounded-2xl p-1 border border-[#333333] flex items-center mb-4">
          <button
            onClick={() => setActiveCategory('rent')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
              activeCategory === 'rent'
                ? 'bg-[#FFFFFF] text-black'
                : 'text-[#BDBDBD] hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Houses &amp; Lodges for Rent</span>
          </button>

          <button
            onClick={() => setActiveCategory('roommate')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 ${
              activeCategory === 'roommate'
                ? 'bg-[#FFFFFF] text-black'
                : 'text-[#BDBDBD] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Find Roommate</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-[#121212] rounded-2xl p-3.5 border border-[#333333] mb-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#BDBDBD] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lodge name, location, facilities (water, tile, prepaid meter)..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white placeholder-[#BDBDBD]/60 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-[#1C1C1C] border border-[#333333] rounded-xl px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FFFFFF]" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#121212]">All Wukari Locations</option>
                {WUKARI_HOUSING_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} className="bg-[#121212]">
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#1C1C1C] border border-[#333333] rounded-xl px-2.5 py-1.5">
              <Building className="w-3.5 h-3.5 text-[#FFFFFF]" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#121212]">All Property Types</option>
                {HOUSING_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#121212]">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#1C1C1C] border border-[#333333] rounded-xl px-2.5 py-1.5">
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#121212]">All Availability</option>
                <option value="available" className="bg-[#121212]">Available Only</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#1C1C1C] border border-[#333333] rounded-xl px-2.5 py-1.5">
              <Tag className="w-3.5 h-3.5 text-[#BDBDBD]" />
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as any)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value="default" className="bg-[#121212]">Sort: Newest</option>
                <option value="price-asc" className="bg-[#121212]">Rent: Lowest to Highest</option>
                <option value="price-desc" className="bg-[#121212]">Rent: Highest to Lowest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-[#FFFFFF] animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-[#BDBDBD]">Loading genuine Wukari accommodation...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-[#1C1C1C] rounded-3xl p-10 text-center border border-[#333333] max-w-lg mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-[#121212] border border-[#333333] text-[#FFFFFF] flex items-center justify-center mx-auto mb-4">
              <Building className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-white">
              No accommodation listings available yet. Check back later or contact a registered agent.
            </h3>
            <button
              onClick={openCreateModal}
              className="mt-5 px-5 py-2.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black text-xs font-black rounded-xl transition"
            >
              Register / Post Accommodation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((hux) => {
              const isSaved = savedHuxIds.includes(hux.id);
              const isOwn = student && hux.userId === student.id;
              const isAvail = hux.isAvailable !== false;

              return (
                <div
                  key={hux.id}
                  onClick={() => {
                    setDetailHux(hux);
                    setActiveImageIdx(0);
                  }}
                  className="bg-[#1C1C1C] rounded-2xl overflow-hidden border border-[#333333] hover:border-[#FFFFFF]/70 transition flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="relative aspect-[16/10] bg-[#121212] overflow-hidden flex items-center justify-center border-b border-[#333333]">
                      {hux.imageUrl ? (
                        <img
                          src={hux.imageUrl}
                          alt={hux.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#BDBDBD]">
                          <Building className="w-8 h-8 mb-1 text-[#FFFFFF]" />
                          <span className="text-[10px] font-bold">Wukari Property</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="bg-black/80 text-white text-[10px] font-black px-2 py-0.5 rounded-md border border-[#333333]">
                          {hux.type}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isAvail
                              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700'
                              : 'bg-red-950/90 text-red-300 border border-red-700'
                          }`}
                        >
                          {isAvail ? 'Available' : 'Occupied'}
                        </span>
                        {hux.isAgent && (
                          <span className="bg-[#FFFFFF] text-black text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Agent</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => toggleSaveHux(hux.id, e)}
                        className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition ${
                          isSaved
                            ? 'bg-red-600 text-white'
                            : 'bg-black/70 text-[#BDBDBD] hover:text-white border border-[#333333]'
                        }`}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>

                      {hux.images.length > 1 && (
                        <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#333333]">
                          {hux.images.length} photos
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <span className="text-base sm:text-lg font-black text-[#FFFFFF]">
                            {formatNaira(hux.price)}
                          </span>
                          <span className="text-[10px] text-[#BDBDBD] font-bold uppercase ml-1">
                            / {hux.pricePer}
                          </span>
                        </div>
                        {hux.rooms && (
                          <span className="text-[10px] font-bold text-[#BDBDBD] bg-[#121212] border border-[#333333] px-2 py-0.5 rounded-md">
                            {hux.rooms} {hux.rooms === 1 ? 'Room' : 'Rooms'}
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-xs sm:text-sm text-white line-clamp-1 group-hover:text-[#FFFFFF] transition">
                        {hux.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#BDBDBD] font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-[#FFFFFF] shrink-0" />
                        <span className="truncate">{hux.location}</span>
                      </div>

                      {hux.facilities && hux.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {hux.facilities.slice(0, 3).map((fac) => (
                            <span
                              key={fac}
                              className="text-[10px] text-[#BDBDBD] bg-[#121212] border border-[#333333] px-1.5 py-0.5 rounded"
                            >
                              {fac}
                            </span>
                          ))}
                        </div>
                      )}

                      {hux.description && (
                        <p className="text-[11px] text-[#BDBDBD] line-clamp-2 leading-relaxed">
                          {hux.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-[#333333] space-y-2">
                    {isOwn ? (
                      <>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleAvailability(hux, e)}
                            className="py-1.5 px-2 bg-[#121212] hover:bg-[#333333] border border-[#333333] text-white text-[10px] font-bold rounded-lg"
                          >
                            {isAvail ? 'Mark Occupied' : 'Mark Available'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openEditModal(hux, e)}
                            className="py-1.5 px-2 bg-[#121212] hover:bg-[#333333] border border-[#333333] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(hux.id);
                            }}
                            className="py-1.5 px-2 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>

                        {confirmDeleteId === hux.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 bg-[#121212] border border-red-700 rounded-xl flex items-center justify-between text-[11px]"
                          >
                            <span className="text-red-300 font-bold">Confirm delete?</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-0.5 bg-[#333333] text-white rounded"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteListing(hux.id)}
                                className="px-2 py-0.5 bg-red-600 text-white rounded font-bold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${hux.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 bg-[#121212] hover:bg-[#333333] border border-[#333333] text-white rounded-xl transition"
                            title="Call Agent"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#FFFFFF]" />
                          </a>

                          <a
                            href={buildWaLink(hux)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-black text-[11px] font-black rounded-xl transition flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartDirectChat({
                                id: hux.userId,
                                name: hux.agentName || hux.userName,
                                matricNumber: hux.matricNumber
                              });
                            }}
                            className="px-2.5 py-1.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black text-[11px] font-black rounded-xl transition flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportingHux(hux);
                          }}
                          className="text-[#BDBDBD] hover:text-red-400 text-[10px] font-bold p-1 rounded flex items-center gap-1"
                        >
                          <Flag className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Property Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4">
            <div className="bg-[#1C1C1C] border-b border-[#333333] p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">
                  {editingHux ? 'Edit Property Listing' : 'Post on Wukari Agent'}
                </h3>
                <p className="text-[11px] text-[#BDBDBD]">FUWUKARI Accommodation &amp; Roommates</p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowPostModal(false);
                }}
                className="w-8 h-8 rounded-full bg-[#121212] border border-[#333333] text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {postError && (
                <div className="p-3 bg-red-950/60 border border-red-700 text-red-200 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{postError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormCategory('rent')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black border transition ${
                    formCategory === 'rent'
                      ? 'bg-[#FFFFFF] border-[#FFFFFF] text-black'
                      : 'bg-[#1C1C1C] border-[#333333] text-[#BDBDBD]'
                  }`}
                >
                  House / Lodge for Rent
                </button>
                <button
                  type="button"
                  onClick={() => setFormCategory('roommate')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black border transition ${
                    formCategory === 'roommate'
                      ? 'bg-[#FFFFFF] border-[#FFFFFF] text-black'
                      : 'bg-[#1C1C1C] border-[#333333] text-[#BDBDBD]'
                  }`}
                >
                  Find Roommate
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">
                  Property / Lodge Name <span className="text-[#FFFFFF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Executive Tiled Self-Contain at Behind LT"
                  className="w-full px-3.5 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Location *</label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white outline-none"
                  >
                    {WUKARI_HOUSING_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Property Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as HuxType)}
                    className="w-full px-3 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white outline-none"
                  >
                    {HOUSING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Available Rooms</label>
                  <input
                    type="number"
                    min="1"
                    value={formRooms}
                    onChange={(e) => setFormRooms(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Rent Price (₦) *</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 180000"
                    className="w-full px-3.5 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Billing Cycle</label>
                  <select
                    value={formPricePer}
                    onChange={(e) => setFormPricePer(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white outline-none"
                  >
                    <option value="year">Per Year (Session)</option>
                    <option value="semester">Per Semester</option>
                    <option value="month">Per Month</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Agent / Owner Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="080..."
                    className="w-full px-3.5 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="Same as phone if blank"
                    className="w-full px-3.5 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white outline-none"
                  />
                </div>
              </div>

              {/* Facilities Tag Picker */}
              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1.5">
                  Facilities Available
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FACILITY_OPTIONS.map((fac) => {
                    const selected = formFacilities.includes(fac);
                    return (
                      <button
                        key={fac}
                        type="button"
                        onClick={() => toggleFacility(fac)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          selected
                            ? 'bg-[#FFFFFF] border-[#FFFFFF] text-black'
                            : 'bg-[#1C1C1C] border-[#333333] text-[#BDBDBD] hover:text-white'
                        }`}
                      >
                        {fac}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Agent & Availability Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="p-3 bg-[#1C1C1C] border border-[#333333] rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Registered Agent / Landlord</p>
                    <p className="text-[10px] text-[#BDBDBD]">Shows Agent badge</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsAgent}
                    onChange={(e) => setFormIsAgent(e.target.checked)}
                    className="w-4 h-4 accent-[#FFFFFF]"
                  />
                </label>

                <label className="p-3 bg-[#1C1C1C] border border-[#333333] rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Currently Available</p>
                    <p className="text-[10px] text-[#BDBDBD]">Uncheck if fully occupied</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    className="w-4 h-4 accent-[#FFFFFF]"
                  />
                </label>
              </div>

              {formIsAgent && (
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Agent / Lodge Caretaker Name</label>
                  <input
                    type="text"
                    value={formAgentName}
                    onChange={(e) => setFormAgentName(e.target.value)}
                    placeholder="e.g. Musa Campus Homes"
                    className="w-full px-3.5 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs font-semibold text-white outline-none"
                  />
                </div>
              )}

              {/* Photos upload with real progress, Cancel & Retry */}
              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1.5">
                  Property Photos <span className="font-normal">(Up to 3 • JPG, JPEG, PNG, WebP)</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {photoSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="relative aspect-square rounded-xl overflow-hidden border border-[#333333] bg-[#1C1C1C]"
                    >
                      <img src={slot.preview} alt="Property preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhotoSlot(slot.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div className="absolute inset-x-0 bottom-0 bg-black/85 p-1.5 text-[10px]">
                        {slot.status === 'uploading' && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-white font-bold">
                              <span>Uploading</span>
                              <span>{slot.progress}%</span>
                            </div>
                            <div className="w-full bg-[#333333] h-1 rounded-full overflow-hidden">
                              <div className="bg-[#FFFFFF] h-full" style={{ width: `${slot.progress}%` }} />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCancelPhotoSlot(slot.id)}
                              className="w-full py-0.5 bg-[#333333] text-red-300 rounded font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {slot.status === 'success' && (
                          <div className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Ready</span>
                          </div>
                        )}
                        {slot.status === 'error' && (
                          <div className="space-y-1">
                            <div className="text-red-300 line-clamp-1">{slot.errorMessage || 'Failed'}</div>
                            {slot.file && (
                              <button
                                type="button"
                                onClick={() => uploadSinglePhotoSlot(slot.id, slot.file!)}
                                className="w-full py-0.5 bg-[#FFFFFF] text-black rounded font-black flex items-center justify-center gap-1"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                                <span>Retry</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {photoSlots.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-[#333333] hover:border-[#FFFFFF] bg-[#1C1C1C] flex flex-col items-center justify-center cursor-pointer text-[#BDBDBD] hover:text-white transition"
                    >
                      <Upload className="w-5 h-5 text-[#FFFFFF] mb-1" />
                      <span className="text-[10px] font-bold">Add Photo</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSelectPhotos}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Description &amp; Rules</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe distance to gate, light, water, inspection hours..."
                  className="w-full px-3.5 py-2.5 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isPosting || photoSlots.some((s) => s.status === 'uploading')}
                className="w-full py-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] disabled:opacity-50 text-black text-xs sm:text-sm font-black rounded-xl transition flex items-center justify-center gap-2"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Property...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingHux ? 'Save Changes' : 'Publish Property Listing'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailHux && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4">
            <button
              onClick={() => setDetailHux(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/80 border border-[#333333] text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative aspect-[16/10] bg-[#1C1C1C]">
              {detailHux.images.length > 0 ? (
                <img
                  src={detailHux.images[activeImageIdx] || detailHux.imageUrl}
                  alt={detailHux.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#BDBDBD]">
                  <Building className="w-12 h-12 text-[#FFFFFF]" />
                </div>
              )}
            </div>

            {detailHux.images.length > 1 && (
              <div className="flex items-center gap-2 p-2 bg-[#1C1C1C] border-b border-[#333333] justify-center">
                {detailHux.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition ${
                      activeImageIdx === i ? 'border-[#FFFFFF]' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl sm:text-2xl font-black text-[#FFFFFF]">
                  {formatNaira(detailHux.price)}
                  <span className="text-xs text-[#BDBDBD] font-semibold uppercase"> / {detailHux.pricePer}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold bg-[#1C1C1C] border border-[#333333] text-white px-2.5 py-1 rounded-md">
                    {detailHux.type}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                      detailHux.isAvailable !== false
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-red-950 text-red-300 border border-red-700'
                    }`}
                  >
                    {detailHux.isAvailable !== false ? 'Available' : 'Occupied'}
                  </span>
                </div>
              </div>

              <h2 className="text-base sm:text-lg font-black text-white">{detailHux.title}</h2>

              <div className="flex items-center gap-1.5 text-xs text-[#BDBDBD] font-bold">
                <MapPin className="w-4 h-4 text-[#FFFFFF]" />
                <span>{detailHux.location}</span>
                {detailHux.rooms && <span>• {detailHux.rooms} room(s)</span>}
              </div>

              {detailHux.facilities && detailHux.facilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detailHux.facilities.map((fac) => (
                    <span
                      key={fac}
                      className="text-[11px] bg-[#1C1C1C] border border-[#333333] text-white px-2.5 py-1 rounded-lg font-semibold"
                    >
                      {fac}
                    </span>
                  ))}
                </div>
              )}

              {detailHux.description && (
                <div className="bg-[#1C1C1C] rounded-2xl p-3.5 border border-[#333333]">
                  <h4 className="text-xs font-bold text-white uppercase mb-1">Details &amp; Inspection Info</h4>
                  <p className="text-xs text-[#BDBDBD] leading-relaxed whitespace-pre-wrap">
                    {detailHux.description}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-[#BDBDBD] pt-2 border-t border-[#333333]">
                <span>
                  Listed by: <strong className="text-white">{detailHux.agentName || detailHux.userName}</strong>
                </span>
                {detailHux.matricNumber && <span className="font-mono">{detailHux.matricNumber}</span>}
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <a
                  href={`tel:${detailHux.phone}`}
                  className="py-3 bg-[#1C1C1C] hover:bg-[#333333] border border-[#333333] text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-4 h-4 text-[#FFFFFF]" />
                  <span>Call</span>
                </a>

                <a
                  href={buildWaLink(detailHux)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setDetailHux(null);
                    onStartDirectChat({
                      id: detailHux.userId,
                      name: detailHux.agentName || detailHux.userName,
                      matricNumber: detailHux.matricNumber
                    });
                  }}
                  className="py-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>In-App Chat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scam Report Modal */}
      {reportingHux && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-md bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#333333] mb-3">
              <div className="flex items-center gap-2 text-red-400 font-black text-sm">
                <Flag className="w-4 h-4" />
                <span>Report Suspicious Listing</span>
              </div>
              <button
                onClick={() => {
                  setReportingHux(null);
                  setReportError('');
                }}
                className="w-7 h-7 rounded-full bg-[#1C1C1C] border border-[#333333] text-[#BDBDBD] hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">Report Submitted</h4>
                <p className="text-xs text-[#BDBDBD] mt-1">
                  Thank you for helping protect FUWUKARI students from housing fraud.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                {reportError && (
                  <div className="p-2.5 bg-red-950/60 border border-red-700 text-red-200 text-xs rounded-xl">
                    {reportError}
                  </div>
                )}
                <p className="text-xs text-[#BDBDBD]">
                  Listing: <strong className="text-white">{reportingHux.title}</strong>
                </p>

                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Reason for Report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#333333] rounded-xl text-xs font-semibold text-white outline-none"
                  >
                    <option value="Suspected fake lodge or agent scam">Suspected fake lodge or agent scam</option>
                    <option value="Demanding advance payment before inspection">Demanding advance payment before inspection</option>
                    <option value="Incorrect location or price">Incorrect location or price</option>
                    <option value="Lodge already fully occupied">Lodge already fully occupied</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Additional Details</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Explain what happened..."
                    className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#333333] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl"
                >
                  {reportSubmitting ? 'Submitting Report...' : 'Submit Scam Report'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <StudentLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(loggedStudent) => {
          setStudent(loggedStudent);
          setFormPhone(loggedStudent.phone || loggedStudent.whatsappNumber || '');
          setFormWhatsapp(loggedStudent.whatsappNumber || loggedStudent.phone || '');
        }}
        initialData={student}
        title="Wukari Agent Profile — FU MARKET"
        subtitle="Enter your name and matric number / agent ID to post and manage campus accommodation."
      />
    </div>
  );
};
