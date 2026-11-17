import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  PlusCircle,
  Search,
  MapPin,
  Phone,
  MessageCircle,
  MessageSquare,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Upload,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Tag,
  Building2,
  GraduationCap
} from 'lucide-react';
import { UploadTask } from 'firebase/storage';
import { Institution, StudentRequest, RegisteredUser } from '../types.js';
import {
  subscribeToStudentRequests,
  createStudentRequest,
  updateStudentRequest,
  deleteStudentRequest
} from '../services/firebase.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { isValidImageFormat } from '../utils/imagePersistence.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';
import { StudentLoginModal } from './StudentLoginModal.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import {
  belongsToInstitution,
  DEFAULT_INSTITUTION_CAMPUS,
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  getInstitutionById
} from '../constants/institutions.js';

interface WhatStudentsNeedPageProps {
  onBackToHome: () => void;
  onStartDirectChat: (target: { id: string; name: string; matricNumber?: string }) => void;
  selectedInstitutionId?: string;
  selectedCampus?: string;
  institutions?: Institution[];
  onSwitchInstitution?: () => void;
}

const REQUEST_LOCATIONS = [
  'Hostel A',
  'Hostel B',
  'FUWukari Main Gate',
  'FUWukari New Site',
  'Behind LT (Lecture Theatre)',
  'Puje Quarter',
  'Bye Pass',
  'Hospital Road',
  'Wukari Market',
  'Main Campus Area'
];

export const WhatStudentsNeedPage: React.FC<WhatStudentsNeedPageProps> = ({
  onBackToHome,
  onStartDirectChat,
  selectedInstitutionId = DEFAULT_INSTITUTION_ID,
  selectedCampus = DEFAULT_INSTITUTION_CAMPUS,
  institutions = VERIFIED_NIGERIAN_INSTITUTIONS,
  onSwitchInstitution
}) => {
  const { user: authUser } = useAuth();
  const [student, setStudent] = useState<RegisteredUser | null>(() => getLocalStudentSession());
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'fulfilled'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<StudentRequest | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState(REQUEST_LOCATIONS[0]);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [reqInstitutionId, setReqInstitutionId] = useState(
    selectedInstitutionId !== 'all' ? selectedInstitutionId : DEFAULT_INSTITUTION_ID
  );
  const [reqCampus, setReqCampus] = useState(selectedCampus || DEFAULT_INSTITUTION_CAMPUS);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const activeTaskRef = useRef<UploadTask | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const activeInst =
    selectedInstitutionId !== 'all'
      ? getInstitutionById(selectedInstitutionId, institutions)
      : undefined;
  const instShort = activeInst?.shortName || 'All Campuses';

  useEffect(() => {
    document.title = `What Students Need | FU MARKET — ${instShort}`;
  }, [instShort]);

  useEffect(() => {
    if (authUser && (!student || student.id !== authUser.id)) {
      setStudent({
        id: authUser.id,
        name: authUser.name,
        matricNumber: student?.matricNumber || 'FU-STUDENT',
        phone: authUser.phone || authUser.whatsappNumber || '',
        whatsappNumber: authUser.whatsappNumber || authUser.phone || '',
        isOnline: true,
        lastSeen: Date.now()
      });
    }
  }, [authUser]);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToStudentRequests((items) => {
      setRequests(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const resetForm = () => {
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch {}
      activeTaskRef.current = null;
    }
    const defaultInstId =
      selectedInstitutionId !== 'all' ? selectedInstitutionId : DEFAULT_INSTITUTION_ID;
    const defaultInstObj = getInstitutionById(defaultInstId, institutions);

    setEditingRequest(null);
    setTitle('');
    setDescription('');
    setBudget('');
    setLocation(REQUEST_LOCATIONS[0]);
    setReqInstitutionId(defaultInstId);
    setReqCampus(
      selectedInstitutionId !== 'all' && selectedCampus
        ? selectedCampus
        : defaultInstObj.campus || DEFAULT_INSTITUTION_CAMPUS
    );
    setPhone(student?.phone || student?.whatsappNumber || '');
    setWhatsapp(student?.whatsappNumber || student?.phone || '');
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadedImageUrl(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadError(null);
    setUploadWarning(null);
    setFormError('');
  };

  const openCreateModal = () => {
    if (!student) {
      setShowLoginModal(true);
      return;
    }
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (req: StudentRequest) => {
    const instId = req.institutionId || DEFAULT_INSTITUTION_ID;
    const instObj = getInstitutionById(instId, institutions);
    setEditingRequest(req);
    setTitle(req.title);
    setDescription(req.description);
    setBudget(req.budget ? String(req.budget) : '');
    setLocation(req.location || REQUEST_LOCATIONS[0]);
    setReqInstitutionId(instId);
    setReqCampus(req.campus || instObj.campus || DEFAULT_INSTITUTION_CAMPUS);
    setPhone(req.phone || '');
    setWhatsapp(req.whatsapp || req.phone || '');
    setPhotoFile(null);
    setPhotoPreview(req.imageUrl || null);
    setUploadedImageUrl(req.imageUrl || null);
    setUploadStatus(req.imageUrl ? 'success' : 'idle');
    setUploadProgress(req.imageUrl ? 100 : 0);
    setUploadError(null);
    setUploadWarning(null);
    setFormError('');
    setShowFormModal(true);
  };

  const runPhotoUpload = async (file: File) => {
    if (!student) return;
    setUploadStatus('uploading');
    setUploadProgress(5);
    setUploadError(null);
    setUploadWarning(null);

    try {
      const result = await uploadImageToFirebaseStorage(file, {
        folder: 'requests',
        ownerId: student.id,
        timeoutMs: 30000,
        onProgress: (pct) => setUploadProgress(pct),
        onTaskCreated: (task) => {
          activeTaskRef.current = task;
        },
        allowPersistentFallback: true
      });
      activeTaskRef.current = null;
      setUploadedImageUrl(result.downloadUrl);
      setUploadProgress(100);
      setUploadStatus('success');
      if (result.warning) {
        setUploadWarning(result.warning);
      }
    } catch (err: any) {
      activeTaskRef.current = null;
      setUploadStatus('error');
      setUploadError(err?.message || 'Photo upload failed. Please retry.');
    }
  };

  const handleSelectPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidImageFormat(file)) {
      setUploadError('Only JPG, JPEG, PNG, and WebP images are allowed.');
      return;
    }
    const preview = URL.createObjectURL(file);
    setPhotoFile(file);
    setPhotoPreview(preview);
    setUploadedImageUrl(null);
    runPhotoUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelUpload = () => {
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch {}
      activeTaskRef.current = null;
    }
    setUploadStatus('error');
    setUploadError('Upload cancelled. Click Retry or remove the photo.');
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
    setUploadedImageUrl(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadError(null);
    setUploadWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) {
      setShowLoginModal(true);
      return;
    }
    setFormError('');

    if (!title.trim() || title.trim().length < 3) {
      setFormError('Please describe what you need (minimum 3 characters).');
      return;
    }
    if (!description.trim()) {
      setFormError('Please provide details about what you are looking for.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setFormError('Please provide a valid phone or WhatsApp number.');
      return;
    }
    if (uploadStatus === 'uploading') {
      setFormError('Please wait for your photo upload to finish or cancel it.');
      return;
    }
    if (uploadStatus === 'error' && photoFile) {
      setFormError('Your selected photo failed to upload. Please click Retry or remove the photo.');
      return;
    }

    const numericBudget = Number(String(budget || '0').replace(/[^0-9]/g, '')) || 0;
    setSubmitting(true);

    try {
      if (editingRequest) {
        await updateStudentRequest(editingRequest.id, {
          title: title.trim(),
          description: description.trim(),
          budget: numericBudget,
          location,
          institutionId: reqInstitutionId,
          campus: reqCampus,
          phone: phone.trim(),
          whatsapp: (whatsapp || phone).trim(),
          ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {})
        });
        showToast('Your student request has been updated.');
      } else {
        await createStudentRequest({
          title: title.trim(),
          description: description.trim(),
          budget: numericBudget,
          location,
          institutionId: reqInstitutionId,
          campus: reqCampus,
          phone: phone.trim(),
          whatsapp: (whatsapp || phone).trim(),
          ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
          userId: student.id,
          userName: student.name,
          matricNumber: student.matricNumber
        });
        showToast('Your request is now live on FU MARKET!');
      }

      setShowFormModal(false);
      resetForm();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFulfilled = async (req: StudentRequest) => {
    try {
      const nextStatus = req.status === 'fulfilled' ? 'open' : 'fulfilled';
      await updateStudentRequest(req.id, { status: nextStatus });
      showToast(
        nextStatus === 'fulfilled'
          ? 'Marked request as Found / Fulfilled.'
          : 'Re-opened student request.'
      );
    } catch (err: any) {
      showToast(err?.message || 'Could not update request status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStudentRequest(id);
      setConfirmDeleteId(null);
      showToast('Student request deleted.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete request.');
    }
  };

  const buildWaLink = (req: StudentRequest) => {
    let cleaned = (req.whatsapp || req.phone || '').replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (cleaned && !cleaned.startsWith('234')) cleaned = '234' + cleaned;
    const text = encodeURIComponent(
      `Hello ${req.userName}, I saw your request "${req.title}" on FU MARKET (What Students Need). I can help with this!`
    );
    return `https://wa.me/${cleaned}?text=${text}`;
  };

  const institutionScopedRequests = requests.filter((req) =>
    belongsToInstitution(req.institutionId, selectedInstitutionId)
  );

  const filtered = institutionScopedRequests.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    if (locationFilter !== 'all' && req.location !== locationFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        req.title.toLowerCase().includes(q) ||
        req.description.toLowerCase().includes(q) ||
        req.location.toLowerCase().includes(q) ||
        req.userName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const modalInst = getInstitutionById(reqInstitutionId, institutions);

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#10251D] flex flex-col font-sans pb-24 sm:pb-8">
      {toastMsg && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-[#087443] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#D4A62A] flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#D4A62A] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#087443] border-b border-[#065D36] sticky top-0 z-30 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#065D36] hover:bg-[#D4A62A] hover:text-[#10251D] border border-white/20 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to FU MARKET</span>
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-black text-[#D4A62A] tracking-tight">
                What Students Need
              </h1>
              <p className="text-[11px] text-white/85">
                {instShort} Student Requests &amp; Peer Connections
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black text-xs sm:text-sm rounded-xl transition active:scale-95 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Request</span>
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-[#065D36] text-white py-6 px-4 border-b border-[#087443]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[#10251D] bg-[#D4A62A] px-2.5 py-1 rounded-md">
                {instShort} Campus Request Board
              </span>
              {onSwitchInstitution && (
                <button
                  type="button"
                  onClick={onSwitchInstitution}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] font-bold text-white transition cursor-pointer"
                >
                  <GraduationCap className="w-3 h-3 text-[#D4A62A]" />
                  <span>Switch Campus</span>
                </button>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#D4A62A]">
              Looking for textbooks, gadgets, hostel items, or food?
            </h2>
            <p className="text-xs sm:text-sm text-white/90 mt-1 leading-relaxed">
              Post what you need with your budget and campus location. Verified {instShort} students who have it can message you sharp sharp.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-[#087443] border border-white/20 rounded-2xl px-5 py-3 shrink-0">
            <div>
              <div className="text-lg font-black text-[#D4A62A]">
                {institutionScopedRequests.filter((r) => r.status === 'open').length}
              </div>
              <div className="text-[11px] text-white/85">Open Requests</div>
            </div>
            <div className="h-8 w-px bg-white/25" />
            <div>
              <div className="text-lg font-black text-white">
                {institutionScopedRequests.length}
              </div>
              <div className="text-[11px] text-white/85">Total Genuine Posts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-3.5 mb-6 flex flex-col md:flex-row gap-3 shadow-xs">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[#555555] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student requests (e.g. calculator, mattress, phone, textbook)..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#10251D] placeholder-[#6B7280] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2.5 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#10251D] outline-none focus:border-[#087443]"
            >
              <option value="all">All Locations</option>
              {REQUEST_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#10251D] outline-none focus:border-[#087443]"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open Only</option>
              <option value="fulfilled">Fulfilled Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-[#087443] animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-[#555555]">Loading genuine student requests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl p-10 text-center max-w-lg mx-auto my-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#087443]/10 border border-[#087443]/20 flex items-center justify-center mx-auto mb-4 text-[#087443]">
              <Tag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-[#10251D] mb-2">
              No student requests available for {instShort} yet. Post what you need and connect with other students.
            </h3>
            <button
              onClick={openCreateModal}
              className="mt-4 px-5 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs sm:text-sm font-black rounded-xl transition cursor-pointer"
            >
              Post What You Need
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((req) => {
              const isOwn = student && req.userId === student.id;
              return (
                <div
                  key={req.id}
                  className="bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#087443] rounded-2xl overflow-hidden flex flex-col justify-between transition shadow-xs hover:shadow-md"
                >
                  <div>
                    {req.imageUrl && (
                      <div className="aspect-[16/9] bg-[#F4F8F5] overflow-hidden border-b border-[#E5E7EB]">
                        <img
                          src={req.imageUrl}
                          alt={req.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                            req.status === 'fulfilled'
                              ? 'bg-[#087443] text-white'
                              : 'bg-[#D4A62A] text-[#10251D]'
                          }`}
                        >
                          {req.status === 'fulfilled' ? 'Found / Fulfilled' : 'Looking For Item'}
                        </span>
                        <span className="text-[11px] text-[#555555] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-[#10251D] leading-snug">
                        {req.title}
                      </h3>

                      <div className="inline-block bg-[#087443] text-[#D4A62A] text-xs font-black px-2.5 py-1 rounded-lg">
                        {req.budget > 0 ? `Budget: ${formatNaira(req.budget)}` : 'Budget: Negotiable'}
                      </div>

                      <p className="text-xs text-[#555555] leading-relaxed whitespace-pre-wrap">
                        {req.description}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB] text-[11px] text-[#555555]">
                        <span className="flex items-center gap-1 font-semibold text-[#10251D]">
                          <MapPin className="w-3.5 h-3.5 text-[#087443]" />
                          {req.location}
                        </span>
                        <span>
                          By <strong className="text-[#10251D]">{req.userName}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 pt-0 space-y-2">
                    {isOwn ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleFulfilled(req)}
                            className="py-2 px-2 bg-[#087443] hover:bg-[#065D36] text-white text-[11px] font-bold rounded-xl transition cursor-pointer"
                          >
                            {req.status === 'fulfilled' ? 'Re-open' : 'Mark Found'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(req)}
                            className="py-2 px-2 bg-[#F4F8F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#10251D] text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-[#087443]" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(req.id)}
                            className="py-2 px-2 bg-[#F4F8F5] hover:bg-[#10251D] hover:text-[#D4A62A] border border-[#E5E7EB] text-[#10251D] text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>

                        {confirmDeleteId === req.id && (
                          <div className="p-2.5 bg-[#FFF8DB] border border-[#D4A62A] rounded-xl flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#10251D] font-bold">Delete request?</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-[#FFFFFF] border border-[#E5E7EB] text-[#10251D] rounded-lg font-bold"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(req.id)}
                                className="px-2.5 py-1 bg-[#10251D] text-[#D4A62A] rounded-lg font-bold"
                              >
                                Yes, Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={`tel:${req.phone}`}
                          className="py-2 bg-[#F4F8F5] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#10251D] text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#087443]" />
                          <span>Call</span>
                        </a>
                        <a
                          href={buildWaLink(req)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 bg-[#087443] hover:bg-[#065D36] text-white text-[11px] font-black rounded-xl flex items-center justify-center gap-1 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            onStartDirectChat({
                              id: req.userId,
                              name: req.userName,
                              matricNumber: req.matricNumber
                            })
                          }
                          className="py-2 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-[11px] font-black rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
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

      {/* Create / Edit Request Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#10251D]">
            <div className="bg-[#087443] text-white px-5 py-4 flex items-center justify-between border-b border-[#065D36]">
              <div>
                <h3 className="text-base font-black text-[#D4A62A]">
                  {editingRequest ? 'Edit Student Request' : 'Post What You Need'}
                </h3>
                <p className="text-[11px] text-white/85">
                  Visible to genuine {modalInst.shortName} students on FU MARKET
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowFormModal(false);
                }}
                className="w-8 h-8 rounded-full bg-[#065D36] text-white hover:bg-[#D4A62A] hover:text-[#10251D] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] text-xs rounded-xl flex items-start gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#10251D]" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Institution & Campus */}
              <div className="bg-[#F4F8F5] border border-[#087443]/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-[#087443] uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Institution &amp; Campus</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <select
                    value={reqInstitutionId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setReqInstitutionId(nextId);
                      const inst = getInstitutionById(nextId, institutions);
                      setReqCampus(inst.campus || inst.campuses[0] || DEFAULT_INSTITUTION_CAMPUS);
                    }}
                    className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-xs text-[#10251D] outline-none"
                  >
                    {(institutions.length > 0 ? institutions : VERIFIED_NIGERIAN_INSTITUTIONS).map(
                      (inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.shortName} — {inst.name}
                        </option>
                      )
                    )}
                  </select>
                  <select
                    value={reqCampus}
                    onChange={(e) => setReqCampus(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-xs text-[#10251D] outline-none"
                  >
                    {modalInst.campuses.map((camp) => (
                      <option key={camp} value={camp}>
                        {camp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10251D] uppercase mb-1">
                  What do you need? *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Looking for fairly used HP laptop or 3x6 mattress"
                  className="w-full p-3 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#10251D] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10251D] uppercase mb-1">
                    Estimated Budget (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g., 45000 (0 if flexible)"
                    className="w-full p-3 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#10251D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] uppercase mb-1">
                    Campus Location *
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#10251D] outline-none"
                  >
                    {REQUEST_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10251D] uppercase mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="080..."
                    className="w-full p-3 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#10251D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#10251D] uppercase mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Same as phone if blank"
                    className="w-full p-3 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#10251D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10251D] uppercase mb-1">
                  Description &amp; Specifications *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe specs, condition preferred, hostel pickup area, or urgency..."
                  className="w-full p-3 bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#10251D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10251D] uppercase mb-1.5">
                  Reference Photo <span className="font-normal text-[#555555]">(Optional • JPG, PNG, WebP)</span>
                </label>
                {photoPreview ? (
                  <div className="p-3 bg-[#F4F8F5] border border-[#E5E7EB] rounded-2xl flex items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="Request preview"
                      className="w-16 h-16 rounded-xl object-cover border border-[#E5E7EB] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {uploadStatus === 'uploading' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] font-bold text-[#10251D]">
                            <span>Uploading photo...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#087443] h-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCancelUpload}
                            className="text-[11px] font-bold text-[#10251D] underline"
                          >
                            Cancel Upload
                          </button>
                        </div>
                      )}

                      {uploadStatus === 'success' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs font-bold text-[#087443]">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Photo uploaded</span>
                          </div>
                          {uploadWarning && (
                            <p className="text-[10px] text-[#555555] leading-tight">{uploadWarning}</p>
                          )}
                        </div>
                      )}

                      {uploadStatus === 'error' && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-[#10251D]">{uploadError}</p>
                          {photoFile && (
                            <button
                              type="button"
                              onClick={() => runPhotoUpload(photoFile)}
                              className="px-2.5 py-1 bg-[#D4A62A] text-[#10251D] rounded-lg text-[11px] font-black inline-flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-2 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB] text-[#10251D] hover:bg-[#10251D] hover:text-[#D4A62A] transition"
                      title="Remove photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 border-2 border-dashed border-[#087443]/40 hover:border-[#087443] bg-[#F4F8F5] rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-[#10251D] transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#087443]" />
                    <span>Upload Reference Photo (Optional)</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSelectPhoto}
                  className="hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowFormModal(false);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-[#555555] hover:text-[#10251D] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadStatus === 'uploading'}
                  className="px-5 py-2.5 bg-[#087443] hover:bg-[#065D36] text-white text-xs sm:text-sm font-black rounded-xl disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingRequest ? 'Update Request' : 'Publish Request'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StudentLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(logged) => {
          setStudent(logged);
          setPhone(logged.phone || logged.whatsappNumber || '');
          setWhatsapp(logged.whatsappNumber || logged.phone || '');
        }}
        initialData={student}
        title="Verify Student Identity — FU MARKET"
        subtitle="Enter your name and student matric number to post requests and chat directly with other students."
      />
    </div>
  );
};
