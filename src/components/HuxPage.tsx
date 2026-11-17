import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Edit3,
  RefreshCw,
  Tag,
  UserCheck
} from 'lucide-react';
import { UploadTask } from 'firebase/storage';
import {
  AccommodationInspectionRequest,
  AccommodationProperty,
  HouseAgentProfile,
  HouseAgentVerificationRequest,
  HuxCategory,
  HuxType,
  Institution,
  RegisteredUser
} from '../types.js';
import { reportHuxListing } from '../services/firebase.js';
import {
  createAccommodationProperty,
  deleteAccommodationProperty,
  subscribeToHouseAgents,
  subscribeToInstitutionAccommodation,
  updateAccommodationAvailability,
  upsertHouseAgentProfile
} from '../services/institutions.js';
import {
  submitAgentVerificationRequest,
  submitInspectionRequest,
  subscribeToAgentInspectionRequests,
  subscribeToStudentInspectionRequests,
  updateInspectionRequestStatus
} from '../services/campusEcosystem.js';
import {
  DEFAULT_INSTITUTION_CAMPUS,
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  getInstitutionById
} from '../constants/institutions.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { isValidImageFormat } from '../utils/imagePersistence.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';
import { StudentLoginModal } from './StudentLoginModal.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';

interface HuxPageProps {
  selectedInstitutionId?: string;
  selectedCampus?: string;
  institutions?: Institution[];
  onSwitchInstitution?: () => void;
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
  'Hostel',
  'Off-campus accommodation',
  'Shop & business space',
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
  selectedInstitutionId = DEFAULT_INSTITUTION_ID,
  selectedCampus = DEFAULT_INSTITUTION_CAMPUS,
  institutions = VERIFIED_NIGERIAN_INSTITUTIONS,
  onSwitchInstitution,
  onBackToHome,
  onStartDirectChat
}) => {
  const { user: authUser } = useAuth();
  const [student, setStudent] = useState<RegisteredUser | null>(() => getLocalStudentSession());
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'rent' | 'roommate' | 'agents' | 'inspections'>('rent');
  const [studentInspections, setStudentInspections] = useState<AccommodationInspectionRequest[]>([]);
  const [agentInspections, setAgentInspections] = useState<AccommodationInspectionRequest[]>([]);
  const [bookingHux, setBookingHux] = useState<AccommodationProperty | null>(null);
  const [inspDate, setInspDate] = useState('');
  const [inspTime, setInspTime] = useState('10:00 AM');
  const [inspPhone, setInspPhone] = useState('');
  const [inspNotes, setInspNotes] = useState('');
  const [inspSubmitting, setInspSubmitting] = useState(false);

  const [verifIdType, setVerifIdType] = useState<HouseAgentVerificationRequest['idType']>('National ID (NIN)');
  const [verifIdMasked, setVerifIdMasked] = useState('');
  const [verifDocUrl, setVerifDocUrl] = useState('');
  const [verifUploading, setVerifUploading] = useState(false);

  const [listings, setListings] = useState<AccommodationProperty[]>([]);
  const [houseAgents, setHouseAgents] = useState<HouseAgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(true);
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

  // Post Property Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingHux, setEditingHux] = useState<AccommodationProperty | null>(null);
  const [formCategory, setFormCategory] = useState<HuxCategory>('rent');
  const [formInstitutionId, setFormInstitutionId] = useState<string>(
    selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId
  );
  const [formCampus, setFormCampus] = useState<string>(selectedCampus || DEFAULT_INSTITUTION_CAMPUS);
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState(WUKARI_HOUSING_LOCATIONS[0]);
  const [formDistanceToCampus, setFormDistanceToCampus] = useState('');
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

  // Agent Registration Modal State
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentFormName, setAgentFormName] = useState('');
  const [agentFormAgency, setAgentFormAgency] = useState('');
  const [agentFormRole, setAgentFormRole] = useState<'house_agent' | 'landlord'>('house_agent');
  const [agentFormInstId, setAgentFormInstId] = useState<string>(
    selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId
  );
  const [agentFormCampus, setAgentFormCampus] = useState<string>(
    selectedCampus || DEFAULT_INSTITUTION_CAMPUS
  );
  const [agentFormArea, setAgentFormArea] = useState('');
  const [agentFormPhone, setAgentFormPhone] = useState('');
  const [agentFormWhatsapp, setAgentFormWhatsapp] = useState('');
  const [agentFormBio, setAgentFormBio] = useState('');
  const [agentSubmitting, setAgentSubmitting] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const [photoSlots, setPhotoSlots] = useState<HuxPhotoSlot[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reportingHux, setReportingHux] = useState<AccommodationProperty | null>(null);
  const [reportReason, setReportReason] = useState('Suspected fake lodge or agent scam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const [detailHux, setDetailHux] = useState<AccommodationProperty | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const activeInst = useMemo(
    () => getInstitutionById(selectedInstitutionId, institutions),
    [selectedInstitutionId, institutions]
  );

  useEffect(() => {
    document.title = `${
      selectedInstitutionId === 'all' ? 'Campus Housing & Agents' : activeInst.shortName + ' Housing & Agents'
    } | FU MARKET`;
  }, [activeInst.shortName, selectedInstitutionId]);

  useEffect(() => {
    if (authUser && (!student || student.id !== authUser.id)) {
      setStudent({
        id: authUser.id,
        name: authUser.name,
        matricNumber: student?.matricNumber || 'CAMPUS-USER',
        phone: authUser.phone || authUser.whatsappNumber || '',
        whatsappNumber: authUser.whatsappNumber || authUser.phone || '',
        isOnline: true,
        lastSeen: Date.now()
      });
    }
  }, [authUser]);

  useEffect(() => {
    if (activeTab === 'agents' || activeTab === 'inspections') return;
    setLoading(true);
    const unsub = subscribeToInstitutionAccommodation(
      selectedInstitutionId,
      activeTab,
      (items) => {
        setListings(items);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [selectedInstitutionId, activeTab]);

  useEffect(() => {
    setLoadingAgents(true);
    const unsub = subscribeToHouseAgents(selectedInstitutionId, (agents) => {
      setHouseAgents(agents);
      setLoadingAgents(false);
    });
    return () => unsub();
  }, [selectedInstitutionId]);

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
    const effInstId =
      selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId;
    const effInst = getInstitutionById(effInstId, institutions);
    setEditingHux(null);
    setFormCategory(activeTab === 'roommate' ? 'roommate' : 'rent');
    setFormInstitutionId(effInst.id);
    setFormCampus(selectedCampus || effInst.campus);
    setFormTitle('');
    setFormLocation(
      effInst.id === DEFAULT_INSTITUTION_ID
        ? WUKARI_HOUSING_LOCATIONS[0]
        : `${effInst.location} (${effInst.campus})`
    );
    setFormDistanceToCampus('');
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

  const openAgentRegistration = () => {
    if (!student) {
      setShowLoginModal(true);
      return;
    }
    const effInstId =
      selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId;
    const effInst = getInstitutionById(effInstId, institutions);
    setAgentFormName(student.name || '');
    setAgentFormAgency('');
    setAgentFormRole('house_agent');
    setAgentFormInstId(effInst.id);
    setAgentFormCampus(selectedCampus || effInst.campus);
    setAgentFormArea(effInst.location || '');
    setAgentFormPhone(student.phone || student.whatsappNumber || '');
    setAgentFormWhatsapp(student.whatsappNumber || student.phone || '');
    setAgentFormBio('');
    setAgentError(null);
    setShowAgentModal(true);
  };

  const openEditModal = (hux: AccommodationProperty, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const effInst = getInstitutionById(hux.institutionId, institutions);
    setEditingHux(hux);
    setFormCategory(hux.category);
    setFormInstitutionId(effInst.id);
    setFormCampus(hux.campus || effInst.campus);
    setFormTitle(hux.title);
    setFormLocation(hux.location);
    setFormDistanceToCampus(hux.distanceToCampus || '');
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
      prev.map((s) =>
        s.id === slotId ? { ...s, status: 'uploading', progress: 10, errorMessage: undefined } : s
      )
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
        await updateAccommodationAvailability(editingHux, {
          category: formCategory,
          institutionId: formInstitutionId,
          campus: formCampus,
          title: formTitle.trim(),
          location: formLocation.trim(),
          distanceToCampus: formDistanceToCampus.trim() || undefined,
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
        showToast('Accommodation listing updated on FU MARKET!');
      } else {
        await createAccommodationProperty({
          category: formCategory,
          institutionId: formInstitutionId,
          campus: formCampus,
          title: formTitle.trim(),
          location: formLocation.trim(),
          distanceToCampus: formDistanceToCampus.trim() || undefined,
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
        showToast('Your accommodation listing has been published on FU MARKET!');
      }

      setShowPostModal(false);
      resetForm();
    } catch (err: any) {
      setPostError(err?.message || 'Could not save listing. Please retry.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) {
      setShowLoginModal(true);
      return;
    }
    setAgentError(null);
    if (!agentFormName.trim()) {
      setAgentError('Please enter your full name.');
      return;
    }
    if (!agentFormArea.trim()) {
      setAgentError('Please enter the campus areas/locations you cover.');
      return;
    }
    if (!agentFormPhone || agentFormPhone.replace(/[^0-9]/g, '').length < 10) {
      setAgentError('Please enter a valid Nigerian phone number.');
      return;
    }

    setAgentSubmitting(true);
    try {
      await upsertHouseAgentProfile({
        userId: student.id,
        agentName: agentFormName.trim(),
        agencyName: agentFormAgency.trim() || undefined,
        institutionId: agentFormInstId,
        campus: agentFormCampus,
        areaCovered: agentFormArea.trim(),
        phone: agentFormPhone.trim(),
        whatsapp: (agentFormWhatsapp || agentFormPhone).trim(),
        bio: agentFormBio.trim() || 'Campus housing & lodge inspection assistance.',
        roleType: agentFormRole
      });
      setShowAgentModal(false);
      setActiveTab('agents');
      showToast('House Agent profile saved! Only CEO can assign verified badges.');
    } catch (err: any) {
      setAgentError(err?.message || 'Could not register House Agent profile.');
    } finally {
      setAgentSubmitting(false);
    }
  };

  const handleToggleAvailability = async (hux: AccommodationProperty, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const next = hux.isAvailable === false;
      await updateAccommodationAvailability(hux, { isAvailable: next });
      showToast(next ? 'Marked accommodation as Available.' : 'Marked accommodation as Occupied.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update availability.');
    }
  };

  const handleDeleteListing = async (hux: AccommodationProperty) => {
    try {
      await deleteAccommodationProperty(hux);
      setConfirmDeleteId(null);
      if (detailHux?.id === hux.id) setDetailHux(null);
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
        reporterName: student?.name || 'Campus User',
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

  const buildWaLink = (title: string, location: string, whatsappOrPhone: string) => {
    let cleaned = (whatsappOrPhone || '').replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (cleaned && !cleaned.startsWith('234')) cleaned = '234' + cleaned;
    const text = encodeURIComponent(
      `Hello, I saw "${title}" (${location}) on FU MARKET Campus Housing. Is it still available for inspection?`
    );
    return `https://wa.me/${cleaned}?text=${text}`;
  };

  const availableLocationOptions = useMemo(() => {
    const locs = new Set<string>();
    if (selectedInstitutionId === DEFAULT_INSTITUTION_ID || selectedInstitutionId === 'all') {
      WUKARI_HOUSING_LOCATIONS.forEach((l) => locs.add(l));
    }
    listings.forEach((l) => {
      if (l.location) locs.add(l.location);
    });
    return Array.from(locs);
  }, [listings, selectedInstitutionId]);

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
          (item.agentName || '').toLowerCase().includes(q) ||
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

  const filteredAgents = houseAgents.filter((agent) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      agent.agentName.toLowerCase().includes(q) ||
      (agent.agencyName || '').toLowerCase().includes(q) ||
      agent.areaCovered.toLowerCase().includes(q) ||
      agent.campus.toLowerCase().includes(q)
    );
  });

  const formModalInst = getInstitutionById(formInstitutionId, institutions);
  const agentModalInst = getInstitutionById(agentFormInstId, institutions);

  useEffect(() => {
    const effectiveUid = authUser?.id || student?.id;
    if (!effectiveUid) return;
    const u1 = subscribeToStudentInspectionRequests(effectiveUid, setStudentInspections);
    const u2 = subscribeToAgentInspectionRequests(effectiveUid, setAgentInspections);
    return () => {
      u1();
      u2();
    };
  }, [authUser?.id, student?.id]);

  const handleBookInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingHux) return;
    const effectiveUid = authUser?.id || student?.id;
    if (!effectiveUid) {
      setShowLoginModal(true);
      return;
    }
    setInspSubmitting(true);
    try {
      await submitInspectionRequest({
        propertyId: bookingHux.id,
        propertyTitle: bookingHux.title,
        propertyLocation: bookingHux.location,
        agentUserId: bookingHux.userId,
        agentName: bookingHux.agentName || bookingHux.userName,
        agentPhone: bookingHux.phone,
        studentUid: effectiveUid,
        studentName: authUser?.name || student?.name || 'Student',
        studentPhone: inspPhone.trim() || student?.phone || authUser?.phone || '',
        preferredDate: inspDate,
        preferredTime: inspTime,
        notes: inspNotes.trim() || undefined,
        institutionId: bookingHux.institutionId || selectedInstitutionId
      });
      setBookingHux(null);
      setInspNotes('');
      setActiveTab('inspections');
      showToast('Property inspection request sent! Check status in the Inspections tab.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to schedule inspection.');
    } finally {
      setInspSubmitting(false);
    }
  };

  const handleUploadVerificationDoc = async (file?: File) => {
    const effectiveUid = authUser?.id || student?.id;
    if (!file || !effectiveUid) return;
    setVerifUploading(true);
    try {
      const { downloadUrl } = await uploadImageToFirebaseStorage(file, {
        folder: 'hux',
        ownerId: effectiveUid,
        allowPersistentFallback: true
      });
      setVerifDocUrl(downloadUrl);
    } catch (err: any) {
      showToast(err?.message || 'Document upload failed.');
    } finally {
      setVerifUploading(false);
    }
  };

  const handleSubmitAgentVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveUid = authUser?.id || student?.id;
    if (!effectiveUid) {
      setShowLoginModal(true);
      return;
    }
    const myAgent = houseAgents.find((a) => a.userId === effectiveUid);
    await submitAgentVerificationRequest({
      agentId: myAgent?.id || effectiveUid,
      userId: effectiveUid,
      agentName: myAgent?.agentName || authUser?.name || student?.name || 'Agent',
      agencyName: myAgent?.agencyName,
      institutionId: myAgent?.institutionId || (selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId),
      phone: myAgent?.phone || student?.phone || authUser?.phone || '',
      idType: verifIdType,
      idNumberMasked: verifIdMasked.trim(),
      documentUrl: verifDocUrl || undefined
    });
    showToast('Verification request submitted to CEO Super Admin for approval.');
  };

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#10251D] flex flex-col font-sans pb-24 sm:pb-8">
      {toastMsg && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-[#087443] text-[#FFFFFF] px-4 py-3 rounded-2xl shadow-2xl border border-[#D4A62A] flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#D4A62A] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-[#087443] border-b border-[#065D36] px-3 sm:px-4 py-3 sticky top-0 z-30 flex items-center justify-between text-[#FFFFFF] gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#065D36] border border-white/20 hover:bg-[#D4A62A] hover:text-[#10251D] rounded-xl text-xs font-bold text-[#FFFFFF] transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back Home</span>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-[#D4A62A] truncate">
                CAMPUS ACCOMMODATION &ndash; FIND YOUR NEXT HOME
              </h1>
              <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-2 py-0.5 rounded-md">
                {selectedInstitutionId === 'all' ? 'All Institutions' : activeInst.shortName}
              </span>
              {onSwitchInstitution && (
                <button
                  type="button"
                  onClick={onSwitchInstitution}
                  className="text-[10px] font-bold underline text-[#FFFFFF]/90 hover:text-[#D4A62A]"
                >
                  Change Campus
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#FFFFFF]/85 truncate">
              Hostels, self-contain, lodges, roommates, inspections &amp; verified agents at{' '}
              {selectedInstitutionId === 'all' ? 'Nigerian Universities & Polytechnics' : activeInst.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openAgentRegistration}
            className="hidden sm:flex px-3 py-2 bg-[#065D36] hover:bg-[#10251D] text-[#FFFFFF] border border-[#D4A62A]/40 text-xs font-black rounded-xl transition items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#D4A62A]" />
            <span>Agent Sign-Up</span>
          </button>
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl transition active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post Property</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-3 sm:p-5 flex-1">
        {/* 4 Category Tabs */}
        <div className="bg-[#FFFFFF] rounded-2xl p-1 border border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-4 gap-1 mb-4 shadow-xs">
          <button
            onClick={() => setActiveTab('rent')}
            className={`py-2.5 px-2 rounded-xl text-[11px] sm:text-sm font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'rent'
                ? 'bg-[#087443] text-[#FFFFFF]'
                : 'text-[#555555] hover:text-[#10251D]'
            }`}
          >
            <Building className="w-4 h-4 shrink-0" />
            <span className="truncate">Houses &amp; Lodges</span>
          </button>

          <button
            onClick={() => setActiveTab('roommate')}
            className={`py-2.5 px-2 rounded-xl text-[11px] sm:text-sm font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'roommate'
                ? 'bg-[#087443] text-[#FFFFFF]'
                : 'text-[#555555] hover:text-[#10251D]'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Find Roommate</span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`py-2.5 px-2 rounded-xl text-[11px] sm:text-sm font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'agents'
                ? 'bg-[#10251D] text-[#D4A62A]'
                : 'text-[#555555] hover:text-[#10251D]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">House Agents ({houseAgents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inspections')}
            className={`py-2.5 px-2 rounded-xl text-[11px] sm:text-sm font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'inspections'
                ? 'bg-[#087443] text-[#FFFFFF]'
                : 'text-[#555555] hover:text-[#10251D]'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">Inspections &amp; KYC ({studentInspections.length + agentInspections.length})</span>
          </button>
        </div>

        {activeTab === 'inspections' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-[#10251D]">My Booked Property Inspections ({studentInspections.length})</h3>
                {studentInspections.length === 0 ? (
                  <p className="text-xs text-[#556B60]">Click &quot;Book Inspection&quot; on any property card to request an in-person tour before paying rent.</p>
                ) : (
                  studentInspections.map((req) => (
                    <div key={req.id} className="p-3 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl text-xs flex justify-between items-center gap-2">
                      <div>
                        <div className="font-black">{req.propertyTitle} ({req.propertyLocation})</div>
                        <div className="text-[#556B60]">Agent: {req.agentName} &bull; {req.preferredDate} at {req.preferredTime}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-[#087443] text-[#D4A62A] font-black uppercase">{req.status}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-[#10251D]">Agent Incoming Inspection Requests ({agentInspections.length})</h3>
                {agentInspections.length === 0 ? (
                  <p className="text-xs text-[#556B60]">No incoming inspection requests for your listed properties yet.</p>
                ) : (
                  agentInspections.map((req) => (
                    <div key={req.id} className="p-3 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl text-xs space-y-2">
                      <div className="flex justify-between font-black">
                        <span>{req.propertyTitle} &bull; {req.studentName} ({req.studentPhone})</span>
                        <span className="uppercase text-[#087443]">{req.status}</span>
                      </div>
                      <div className="text-[#556B60]">Requested: {req.preferredDate} at {req.preferredTime}</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => updateInspectionRequestStatus(req.id, 'confirmed', 'Agent confirmed tour slot', req.studentUid, req.propertyTitle)} className="px-3 py-1 bg-[#087443] text-white rounded-lg font-bold">Confirm</button>
                        <button type="button" onClick={() => updateInspectionRequestStatus(req.id, 'completed', 'Inspection completed', req.studentUid, req.propertyTitle)} className="px-3 py-1 bg-[#D4A62A] text-[#10251D] rounded-lg font-bold">Completed</button>
                        <button type="button" onClick={() => updateInspectionRequestStatus(req.id, 'declined', 'Unavailable at requested time', req.studentUid, req.propertyTitle)} className="px-3 py-1 bg-white border border-[#D8E5DD] rounded-lg font-bold">Decline</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-black text-[#10251D]">House Agent Verification Request</h3>
              <p className="text-xs text-[#556B60]">Submit valid identity details for CEO Super Admin review to earn verified House Agent status.</p>
              <form onSubmit={handleSubmitAgentVerification} className="space-y-3 text-xs">
                <select value={verifIdType} onChange={(e) => setVerifIdType(e.target.value as any)} className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl">
                  <option value="National ID (NIN)">National ID (NIN)</option>
                  <option value="Student/Staff ID">Student / Staff ID</option>
                  <option value="CAC Business Name">CAC Business Name</option>
                  <option value="Voter Card">Voter Card</option>
                  <option value="Driver License">Driver License</option>
                </select>
                <input required value={verifIdMasked} onChange={(e) => setVerifIdMasked(e.target.value)} placeholder="Last 4 digits or reference number *" className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                <label className="block p-3 bg-[#F4F8F5] border border-dashed border-[#087443] rounded-xl text-center cursor-pointer font-bold text-[#087443]">
                  {verifUploading ? 'Uploading ID Document...' : verifDocUrl ? 'Document Uploaded' : 'Upload ID / Agency Document'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadVerificationDoc(e.target.files?.[0])} />
                </label>
                <button type="submit" disabled={verifUploading} className="w-full py-2.5 bg-[#087443] text-white font-black rounded-xl">
                  Submit for CEO Verification
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-[#FFFFFF] rounded-2xl p-3.5 border border-[#E5E7EB] mb-5 space-y-3 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-[#555555] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'agents'
                  ? 'Search registered house agents, landlords, or areas covered...'
                  : 'Search lodge name, location, facilities (water, tile, prepaid meter)...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] placeholder-[#6B7280] outline-none"
            />
          </div>

          {activeTab !== 'agents' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#087443]" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-transparent text-[#10251D] text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="all">All Locations</option>
                  {availableLocationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5">
                <Building className="w-3.5 h-3.5 text-[#087443]" />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-transparent text-[#10251D] text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="all">All Property Types</option>
                  {HOUSING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5">
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                  className="bg-transparent text-[#10251D] text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="all">All Availability</option>
                  <option value="available">Available Only</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5">
                <Tag className="w-3.5 h-3.5 text-[#087443]" />
                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value as any)}
                  className="bg-transparent text-[#10251D] text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="default">Sort: Newest</option>
                  <option value="price-asc">Rent: Lowest to Highest</option>
                  <option value="price-desc">Rent: Highest to Lowest</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* House Agents Directory View */}
        {activeTab === 'agents' ? (
          loadingAgents ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 text-[#087443] animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-[#555555]">
                Loading registered campus house agents &amp; landlords...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#10251D] text-[#FFFFFF] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-4 border-[#D4A62A]">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-[#D4A62A]">
                    Registered Campus House Agents &amp; Landlords
                  </h2>
                  <p className="text-[11px] text-[#F4F8F5]/85">
                    Official FU MARKET Verified Badges are awarded strictly by the CEO Administrator after review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAgentRegistration}
                  className="px-4 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Register as House Agent / Landlord</span>
                </button>
              </div>

              {filteredAgents.length === 0 ? (
                <div className="bg-[#FFFFFF] rounded-3xl p-10 text-center border border-[#E5E7EB] max-w-lg mx-auto my-6 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-[#087443]/10 border border-[#087443]/20 text-[#087443] flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-black text-[#10251D]">
                    No registered house agents found for {activeInst.shortName} yet
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Property agents and landlords around {activeInst.name} can create their official directory profile here.
                  </p>
                  <button
                    onClick={openAgentRegistration}
                    className="mt-4 px-5 py-2.5 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] text-xs font-black rounded-xl transition"
                  >
                    Register as House Agent / Landlord
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAgents.map((agent) => {
                    const inst = getInstitutionById(agent.institutionId, institutions);
                    return (
                      <div
                        key={agent.id}
                        className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] hover:border-[#087443] p-4 flex flex-col justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-black text-[#10251D] truncate">
                                  {agent.agentName}
                                </h3>
                                <CeoVerifiedBadge
                                  verified={Boolean(agent.ceoVerified || agent.isVerified)}
                                  variant="compact"
                                />
                              </div>
                              {agent.agencyName && (
                                <p className="text-[11px] font-bold text-[#087443]">
                                  {agent.agencyName}
                                </p>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded bg-[#F4F8F5] border border-[#E5E7EB] text-[10px] font-black uppercase text-[#10251D] shrink-0">
                              {agent.roleType === 'landlord' ? 'Landlord' : 'House Agent'}
                            </span>
                          </div>

                          <div className="text-[11px] text-[#4B5563] space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-[#10251D]">
                              <Building2 className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                              <span className="truncate">
                                {inst.shortName} • {agent.campus}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                              <span className="truncate">Areas: {agent.areaCovered}</span>
                            </div>
                          </div>

                          {agent.bio && (
                            <p className="text-[11px] text-[#555555] line-clamp-2 leading-relaxed">
                              {agent.bio}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#E5E7EB] flex items-center gap-2">
                          <a
                            href={`tel:${agent.phone}`}
                            className="p-2 bg-[#F4F8F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#10251D] rounded-xl transition"
                            title="Call Agent"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#087443]" />
                          </a>
                          <a
                            href={buildWaLink(
                              agent.agencyName || agent.agentName,
                              `${inst.shortName} (${agent.areaCovered})`,
                              agent.whatsapp || agent.phone
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] text-[11px] font-black rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
                            <span>WhatsApp</span>
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              onStartDirectChat({
                                id: agent.userId,
                                name: agent.agentName
                              })
                            }
                            className="px-3 py-2 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-[11px] font-black rounded-xl transition flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        ) : loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-[#087443] animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-[#555555]">
              Loading campus accommodation for {activeInst.shortName}...
            </p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-[#FFFFFF] rounded-3xl p-10 text-center border border-[#E5E7EB] max-w-lg mx-auto my-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#087443]/10 border border-[#087443]/20 text-[#087443] flex items-center justify-center mx-auto mb-4">
              <Building className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-[#10251D]">
              No accommodation listings available yet for {activeInst.shortName}. Check back later or contact a registered agent.
            </h3>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={openCreateModal}
                className="px-5 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl transition"
              >
                Post Accommodation
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className="px-4 py-2.5 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] text-xs font-black rounded-xl transition"
              >
                Browse House Agents
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((hux) => {
              const isSaved = savedHuxIds.includes(hux.id);
              const isOwn = student && hux.userId === student.id;
              const isAvail = hux.isAvailable !== false;
              const listingInst = getInstitutionById(hux.institutionId, institutions);

              return (
                <div
                  key={hux.id}
                  onClick={() => {
                    setDetailHux(hux);
                    setActiveImageIdx(0);
                  }}
                  className="bg-[#FFFFFF] rounded-2xl overflow-hidden border border-[#E5E7EB] hover:border-[#087443] transition flex flex-col justify-between cursor-pointer group shadow-xs hover:shadow-md"
                >
                  <div>
                    <div className="relative aspect-[16/10] bg-[#F4F8F5] overflow-hidden flex items-center justify-center border-b border-[#E5E7EB]">
                      {hux.imageUrl ? (
                        <img
                          src={hux.imageUrl}
                          alt={hux.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#555555]">
                          <Building className="w-8 h-8 mb-1 text-[#087443]" />
                          <span className="text-[10px] font-bold">{listingInst.shortName} Property</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="bg-[#10251D]/85 text-[#FFFFFF] text-[10px] font-black px-2 py-0.5 rounded-md">
                          {hux.type}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isAvail
                              ? 'bg-[#087443] text-[#D4A62A]'
                              : 'bg-[#10251D] text-[#FFFFFF]'
                          }`}
                        >
                          {isAvail ? 'Available' : 'Occupied'}
                        </span>
                        {hux.isAgent && (
                          <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Agent</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => toggleSaveHux(hux.id, e)}
                        className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition shadow-sm ${
                          isSaved
                            ? 'bg-[#D4A62A] text-[#10251D]'
                            : 'bg-[#FFFFFF]/90 text-[#10251D] border border-[#E5E7EB] hover:border-[#087443]'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                      </button>

                      {hux.images.length > 1 && (
                        <span className="absolute bottom-2.5 right-2.5 bg-[#10251D]/80 text-[#FFFFFF] text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {hux.images.length} photos
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="inline-flex items-baseline bg-[#087443] px-2.5 py-1 rounded-lg">
                          <span className="text-sm sm:text-base font-black text-[#D4A62A]">
                            {formatNaira(hux.price)}
                          </span>
                          <span className="text-[10px] text-[#FFFFFF]/90 font-bold uppercase ml-1">
                            / {hux.pricePer}
                          </span>
                        </div>
                        {hux.rooms && (
                          <span className="text-[10px] font-bold text-[#10251D] bg-[#F4F8F5] border border-[#E5E7EB] px-2 py-0.5 rounded-md">
                            {hux.rooms} {hux.rooms === 1 ? 'Room' : 'Rooms'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-xs sm:text-sm text-[#10251D] line-clamp-1 group-hover:text-[#087443] transition">
                          {hux.title}
                        </h3>
                        <CeoVerifiedBadge
                          verified={Boolean(hux.ceoVerified || hux.isVerified)}
                          variant="compact"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#555555] font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                        <span className="truncate">
                          {hux.location}
                          {hux.distanceToCampus ? ` • ${hux.distanceToCampus}` : ''}
                        </span>
                      </div>

                      {hux.facilities && hux.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {hux.facilities.slice(0, 3).map((fac) => (
                            <span
                              key={fac}
                              className="text-[10px] text-[#10251D] bg-[#F4F8F5] border border-[#E5E7EB] px-1.5 py-0.5 rounded"
                            >
                              {fac}
                            </span>
                          ))}
                        </div>
                      )}

                      {hux.description && (
                        <p className="text-[11px] text-[#555555] line-clamp-2 leading-relaxed">
                          {hux.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-[#E5E7EB] space-y-2">
                    {isOwn ? (
                      <>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleAvailability(hux, e)}
                            className="py-1.5 px-2 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] text-[10px] font-bold rounded-lg"
                          >
                            {isAvail ? 'Mark Occupied' : 'Mark Available'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openEditModal(hux, e)}
                            className="py-1.5 px-2 bg-[#F4F8F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#10251D] text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
                          >
                            <Edit3 className="w-3 h-3 text-[#087443]" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(hux.id);
                            }}
                            className="py-1.5 px-2 bg-[#F4F8F5] hover:bg-[#10251D] hover:text-[#D4A62A] border border-[#E5E7EB] text-[#10251D] text-[10px] font-bold rounded-lg flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>

                        {confirmDeleteId === hux.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 bg-[#FFF8DB] border border-[#D4A62A] rounded-xl flex items-center justify-between text-[11px]"
                          >
                            <span className="text-[#10251D] font-bold">Confirm delete?</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E5E7EB] text-[#10251D] rounded font-bold"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteListing(hux)}
                                className="px-2 py-0.5 bg-[#10251D] text-[#D4A62A] rounded font-bold"
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
                            className="p-2 bg-[#F4F8F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#10251D] rounded-xl transition"
                            title="Call Agent"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#087443]" />
                          </a>

                          <a
                            href={buildWaLink(hux.title, hux.location, hux.whatsapp || hux.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] text-[11px] font-black rounded-xl transition flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
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
                            className="px-2.5 py-1.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-[11px] font-black rounded-xl transition flex items-center gap-1"
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
                          className="text-[#555555] hover:text-[#10251D] text-[10px] font-bold p-1 rounded flex items-center gap-1"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#10251D]">
            <div className="bg-[#087443] text-[#FFFFFF] border-b border-[#065D36] p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#D4A62A]">
                  {editingHux ? 'Edit Property Listing' : 'Post Campus Accommodation'}
                </h3>
                <p className="text-[11px] text-[#FFFFFF]/85">
                  Student Lodges, Hostels, Agents &amp; Roommates
                </p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowPostModal(false);
                }}
                className="w-8 h-8 rounded-full bg-[#065D36] text-[#FFFFFF] hover:bg-[#D4A62A] hover:text-[#10251D] flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {postError && (
                <div className="p-3 bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] text-xs rounded-xl flex items-start gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#10251D]" />
                  <span>{postError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormCategory('rent')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black border transition ${
                    formCategory === 'rent'
                      ? 'bg-[#087443] border-[#087443] text-[#FFFFFF]'
                      : 'bg-[#F4F8F5] border-[#E5E7EB] text-[#555555]'
                  }`}
                >
                  House / Lodge for Rent
                </button>
                <button
                  type="button"
                  onClick={() => setFormCategory('roommate')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black border transition ${
                    formCategory === 'roommate'
                      ? 'bg-[#087443] border-[#087443] text-[#FFFFFF]'
                      : 'bg-[#F4F8F5] border-[#E5E7EB] text-[#555555]'
                  }`}
                >
                  Find Roommate
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-[#F4F8F5] border border-[#E5E7EB]">
                <div>
                  <label className="block text-[11px] font-bold text-[#10251D] mb-1">
                    Institution *
                  </label>
                  <select
                    value={formInstitutionId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setFormInstitutionId(nextId);
                      const nextInst = getInstitutionById(nextId, institutions);
                      setFormCampus(nextInst.campus);
                      if (nextId !== DEFAULT_INSTITUTION_ID) {
                        setFormLocation(`${nextInst.location}`);
                      } else {
                        setFormLocation(WUKARI_HOUSING_LOCATIONS[0]);
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#10251D] outline-none focus:border-[#087443]"
                  >
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.shortName} — {inst.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10251D] mb-1">Campus</label>
                  <select
                    value={formCampus}
                    onChange={(e) => setFormCampus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#10251D] outline-none focus:border-[#087443]"
                  >
                    {formModalInst.campuses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10251D] mb-1">
                  Property / Lodge Name *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Executive Tiled Self-Contain near Main Gate"
                  className="w-full px-3.5 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Area / Street Location *
                  </label>
                  {formInstitutionId === DEFAULT_INSTITUTION_ID ? (
                    <select
                      value={WUKARI_HOUSING_LOCATIONS.includes(formLocation) ? formLocation : WUKARI_HOUSING_LOCATIONS[0]}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                    >
                      {WUKARI_HOUSING_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder={`Area near ${formModalInst.shortName}`}
                      className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Distance to Campus
                  </label>
                  <input
                    type="text"
                    value={formDistanceToCampus}
                    onChange={(e) => setFormDistanceToCampus(e.target.value)}
                    placeholder="e.g. 5 mins walk to Main Gate"
                    className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Property Type *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as HuxType)}
                    className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                  >
                    {HOUSING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Available Rooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formRooms}
                    onChange={(e) => setFormRooms(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Rent Price (₦) *</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 180000"
                    className="w-full px-3.5 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Billing Cycle</label>
                  <select
                    value={formPricePer}
                    onChange={(e) => setFormPricePer(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                  >
                    <option value="year">Per Year (Session)</option>
                    <option value="semester">Per Semester</option>
                    <option value="month">Per Month</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Agent / Owner Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="080..."
                    className="w-full px-3.5 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="Same as phone if blank"
                    className="w-full px-3.5 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10251D] mb-1.5">
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
                            ? 'bg-[#087443] border-[#087443] text-[#FFFFFF]'
                            : 'bg-[#F4F8F5] border-[#E5E7EB] text-[#555555] hover:text-[#10251D]'
                        }`}
                      >
                        {fac}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="p-3 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#10251D]">Registered Agent / Landlord</p>
                    <p className="text-[10px] text-[#555555]">Shows Agent label</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsAgent}
                    onChange={(e) => setFormIsAgent(e.target.checked)}
                    className="w-4 h-4 accent-[#087443]"
                  />
                </label>

                <label className="p-3 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#10251D]">Currently Available</p>
                    <p className="text-[10px] text-[#555555]">Uncheck if fully occupied</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    className="w-4 h-4 accent-[#087443]"
                  />
                </label>
              </div>

              {formIsAgent && (
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Agent / Lodge Caretaker Name
                  </label>
                  <input
                    type="text"
                    value={formAgentName}
                    onChange={(e) => setFormAgentName(e.target.value)}
                    placeholder="e.g. Musa Campus Homes"
                    className="w-full px-3.5 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs font-semibold text-[#10251D] outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#10251D] mb-1.5">
                  Property Photos <span className="font-normal text-[#555555]">(Up to 3 • JPG, JPEG, PNG, WebP)</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {photoSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="relative aspect-square rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#F4F8F5]"
                    >
                      <img src={slot.preview} alt="Property preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhotoSlot(slot.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#10251D] text-[#D4A62A] flex items-center justify-center"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div className="absolute inset-x-0 bottom-0 bg-[#10251D]/85 p-1.5 text-[10px]">
                        {slot.status === 'uploading' && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[#FFFFFF] font-bold">
                              <span>Uploading</span>
                              <span>{slot.progress}%</span>
                            </div>
                            <div className="w-full bg-white/25 h-1 rounded-full overflow-hidden">
                              <div className="bg-[#D4A62A] h-full" style={{ width: `${slot.progress}%` }} />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCancelPhotoSlot(slot.id)}
                              className="w-full py-0.5 bg-white/15 text-[#D4A62A] rounded font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {slot.status === 'success' && (
                          <div className="text-[#D4A62A] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Ready</span>
                          </div>
                        )}
                        {slot.status === 'error' && (
                          <div className="space-y-1">
                            <div className="text-[#D4A62A] line-clamp-1">{slot.errorMessage || 'Failed'}</div>
                            {slot.file && (
                              <button
                                type="button"
                                onClick={() => uploadSinglePhotoSlot(slot.id, slot.file!)}
                                className="w-full py-0.5 bg-[#D4A62A] text-[#10251D] rounded font-black flex items-center justify-center gap-1"
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
                      className="aspect-square rounded-xl border-2 border-dashed border-[#087443]/40 hover:border-[#087443] bg-[#F4F8F5] flex flex-col items-center justify-center cursor-pointer text-[#10251D] transition"
                    >
                      <Upload className="w-5 h-5 text-[#087443] mb-1" />
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
                <label className="block text-xs font-bold text-[#10251D] mb-1">Description &amp; Rules</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe distance to gate, light, water, inspection hours..."
                  className="w-full px-3.5 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs text-[#10251D] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isPosting || photoSlots.some((s) => s.status === 'uploading')}
                className="w-full py-3 bg-[#087443] hover:bg-[#065D36] disabled:opacity-50 text-[#FFFFFF] text-xs sm:text-sm font-black rounded-xl transition flex items-center justify-center gap-2"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Property...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#D4A62A]" />
                    <span>{editingHux ? 'Save Changes' : 'Publish Property Listing'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* House Agent / Landlord Registration Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-md bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#10251D]">
            <div className="bg-[#10251D] text-[#FFFFFF] border-b-4 border-[#D4A62A] p-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#D4A62A]">
                  Register as House Agent / Landlord
                </h3>
                <p className="text-[11px] text-[#F4F8F5]/80">
                  List your campus housing agency profile on FU MARKET
                </p>
              </div>
              <button
                onClick={() => setShowAgentModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-[#FFFFFF] hover:bg-[#D4A62A] hover:text-[#10251D] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAgentSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {agentError && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs rounded-xl font-bold">
                  {agentError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAgentFormRole('house_agent')}
                  className={`py-2 rounded-xl text-xs font-black border ${
                    agentFormRole === 'house_agent'
                      ? 'bg-[#087443] border-[#087443] text-[#FFFFFF]'
                      : 'bg-[#F4F8F5] border-[#E5E7EB] text-[#555555]'
                  }`}
                >
                  House Agent
                </button>
                <button
                  type="button"
                  onClick={() => setAgentFormRole('landlord')}
                  className={`py-2 rounded-xl text-xs font-black border ${
                    agentFormRole === 'landlord'
                      ? 'bg-[#087443] border-[#087443] text-[#FFFFFF]'
                      : 'bg-[#F4F8F5] border-[#E5E7EB] text-[#555555]'
                  }`}
                >
                  Landlord / Owner
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={agentFormName}
                  onChange={(e) => setAgentFormName(e.target.value)}
                  placeholder="e.g. Ibrahim Audu"
                  className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold outline-none focus:border-[#087443]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Agency / Lodge Name (Optional)</label>
                <input
                  type="text"
                  value={agentFormAgency}
                  onChange={(e) => setAgentFormAgency(e.target.value)}
                  placeholder="e.g. Campus Gate Properties"
                  className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold outline-none focus:border-[#087443]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Institution *</label>
                  <select
                    value={agentFormInstId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setAgentFormInstId(nextId);
                      const nextInst = getInstitutionById(nextId, institutions);
                      setAgentFormCampus(nextInst.campus);
                    }}
                    className="w-full px-2.5 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs font-bold outline-none focus:border-[#087443]"
                  >
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.shortName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Campus</label>
                  <select
                    value={agentFormCampus}
                    onChange={(e) => setAgentFormCampus(e.target.value)}
                    className="w-full px-2.5 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs font-bold outline-none focus:border-[#087443]"
                  >
                    {agentModalInst.campuses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Areas / Locations Covered *</label>
                <input
                  type="text"
                  required
                  value={agentFormArea}
                  onChange={(e) => setAgentFormArea(e.target.value)}
                  placeholder="e.g. Behind LT, Bye Pass, Main Gate"
                  className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold outline-none focus:border-[#087443]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={agentFormPhone}
                    onChange={(e) => setAgentFormPhone(e.target.value)}
                    placeholder="080..."
                    className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold outline-none focus:border-[#087443]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={agentFormWhatsapp}
                    onChange={(e) => setAgentFormWhatsapp(e.target.value)}
                    placeholder="Same if blank"
                    className="w-full px-3 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold outline-none focus:border-[#087443]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Short Bio &amp; Inspection Terms</label>
                <textarea
                  rows={2}
                  value={agentFormBio}
                  onChange={(e) => setAgentFormBio(e.target.value)}
                  placeholder="Describe your available lodges and inspection hours..."
                  className="w-full px-3 py-2 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs outline-none focus:border-[#087443]"
                />
              </div>

              <button
                type="submit"
                disabled={agentSubmitting}
                className="w-full py-3 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] text-xs font-black rounded-xl transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#D4A62A]" />
                <span>{agentSubmitting ? 'Saving Profile...' : 'Save Agent Profile'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailHux && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#10251D]">
            <button
              onClick={() => setDetailHux(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-[#10251D]/80 text-[#FFFFFF] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative aspect-[16/10] bg-[#F4F8F5]">
              {detailHux.images.length > 0 ? (
                <img
                  src={detailHux.images[activeImageIdx] || detailHux.imageUrl}
                  alt={detailHux.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#555555]">
                  <Building className="w-12 h-12 text-[#087443]" />
                </div>
              )}
            </div>

            {detailHux.images.length > 1 && (
              <div className="flex items-center gap-2 p-2 bg-[#F4F8F5] border-b border-[#E5E7EB] justify-center">
                {detailHux.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition ${
                      activeImageIdx === i ? 'border-[#087443]' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="inline-flex items-baseline bg-[#087443] px-3 py-1 rounded-xl">
                  <span className="text-lg sm:text-xl font-black text-[#D4A62A]">
                    {formatNaira(detailHux.price)}
                  </span>
                  <span className="text-xs text-[#FFFFFF]/90 font-semibold uppercase ml-1">
                    / {detailHux.pricePer}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold bg-[#F4F8F5] border border-[#E5E7EB] text-[#10251D] px-2.5 py-1 rounded-md">
                    {detailHux.type}
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-md ${
                      detailHux.isAvailable !== false
                        ? 'bg-[#087443] text-[#D4A62A]'
                        : 'bg-[#10251D] text-[#FFFFFF]'
                    }`}
                  >
                    {detailHux.isAvailable !== false ? 'Available' : 'Occupied'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-[#10251D]">{detailHux.title}</h2>
                <CeoVerifiedBadge
                  verified={Boolean(detailHux.ceoVerified || detailHux.isVerified)}
                  variant="compact"
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#555555] font-bold">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-[#087443]" />
                  {detailHux.location}
                </span>
                {detailHux.distanceToCampus && <span>• {detailHux.distanceToCampus}</span>}
                {detailHux.rooms && <span>• {detailHux.rooms} room(s)</span>}
              </div>

              {detailHux.facilities && detailHux.facilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detailHux.facilities.map((fac) => (
                    <span
                      key={fac}
                      className="text-[11px] bg-[#F4F8F5] border border-[#E5E7EB] text-[#10251D] px-2.5 py-1 rounded-lg font-semibold"
                    >
                      {fac}
                    </span>
                  ))}
                </div>
              )}

              {detailHux.description && (
                <div className="bg-[#F4F8F5] rounded-2xl p-3.5 border border-[#E5E7EB]">
                  <h4 className="text-xs font-bold text-[#10251D] uppercase mb-1">
                    Details &amp; Inspection Info
                  </h4>
                  <p className="text-xs text-[#555555] leading-relaxed whitespace-pre-wrap">
                    {detailHux.description}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-[#555555] pt-2 border-t border-[#E5E7EB]">
                <span>
                  Listed by:{' '}
                  <strong className="text-[#10251D]">{detailHux.agentName || detailHux.userName}</strong>
                </span>
                {detailHux.matricNumber && <span className="font-mono">{detailHux.matricNumber}</span>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBookingHux(detailHux);
                    setDetailHux(null);
                  }}
                  className="py-3 bg-[#10251D] hover:bg-black text-[#D4A62A] font-black rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Book Inspection</span>
                </button>

                <a
                  href={`tel:${detailHux.phone}`}
                  className="py-3 bg-[#F4F8F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#10251D] font-black rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-4 h-4 text-[#087443]" />
                  <span>Call</span>
                </a>

                <a
                  href={buildWaLink(
                    detailHux.title,
                    detailHux.location,
                    detailHux.whatsapp || detailHux.phone
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] font-black rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4A62A]" />
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
                  className="py-3 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>In-App Chat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Inspection Modal (Separate from Product Order Checkout) */}
      {bookingHux && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-md bg-white border border-[#D8E5DD] rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-[#087443] border-b-4 border-[#D4A62A] px-5 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="text-sm font-black uppercase">Book Property Inspection</h3>
                <p className="text-[11px] text-white/90 truncate">{bookingHux.title}</p>
              </div>
              <button type="button" onClick={() => setBookingHux(null)} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleBookInspection} className="p-5 space-y-3 text-xs">
              <p className="text-[#556B60]">
                Request an in-person inspection with <strong>{bookingHux.agentName || bookingHux.userName}</strong> before making any payment.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Preferred Date *</label>
                  <input type="date" required value={inspDate} onChange={(e) => setInspDate(e.target.value)} className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Preferred Time *</label>
                  <input type="text" required value={inspTime} onChange={(e) => setInspTime(e.target.value)} placeholder="10:00 AM" className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Your Phone / WhatsApp *</label>
                <input type="tel" required value={inspPhone} onChange={(e) => setInspPhone(e.target.value)} placeholder="080..." className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
              </div>
              <div>
                <label className="font-bold block mb-1">Notes (Optional)</label>
                <textarea rows={2} value={inspNotes} onChange={(e) => setInspNotes(e.target.value)} placeholder="Preferred meetup landmark..." className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl" />
              </div>
              <button type="submit" disabled={inspSubmitting} className="w-full py-3 bg-[#D4A62A] text-[#10251D] font-black rounded-xl">
                {inspSubmitting ? 'Submitting Request...' : 'Send Inspection Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scam Report Modal */}
      {reportingHux && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-md bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 p-5 text-[#10251D]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-3">
              <div className="flex items-center gap-2 text-[#10251D] font-black text-sm">
                <Flag className="w-4 h-4 text-[#087443]" />
                <span>Report Suspicious Listing</span>
              </div>
              <button
                onClick={() => {
                  setReportingHux(null);
                  setReportError('');
                }}
                className="w-7 h-7 rounded-full bg-[#F4F8F5] border border-[#E5E7EB] text-[#555555] hover:text-[#10251D] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-[#087443] mx-auto mb-2" />
                <h4 className="text-sm font-bold text-[#10251D]">Report Submitted</h4>
                <p className="text-xs text-[#555555] mt-1">
                  Thank you for helping protect students from housing fraud.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                {reportError && (
                  <div className="p-2.5 bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] text-xs rounded-xl font-semibold">
                    {reportError}
                  </div>
                )}
                <p className="text-xs text-[#555555]">
                  Listing: <strong className="text-[#10251D]">{reportingHux.title}</strong>
                </p>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Reason for Report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold text-[#10251D] outline-none focus:border-[#087443]"
                  >
                    <option value="Suspected fake lodge or agent scam">
                      Suspected fake lodge or agent scam
                    </option>
                    <option value="Demanding advance payment before inspection">
                      Demanding advance payment before inspection
                    </option>
                    <option value="Incorrect location or price">Incorrect location or price</option>
                    <option value="Lodge already fully occupied">Lodge already fully occupied</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Additional Details</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Explain what happened..."
                    className="w-full px-3 py-2 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs text-[#10251D] outline-none focus:border-[#087443]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="w-full py-2.5 bg-[#10251D] hover:bg-black text-[#D4A62A] text-xs font-black rounded-xl"
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
        title="Campus Housing Profile — FU MARKET"
        subtitle="Enter your name and ID to post accommodation or register as a House Agent."
      />
    </div>
  );
};
