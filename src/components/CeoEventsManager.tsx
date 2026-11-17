import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Eye,
  Upload,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Globe,
  FileText,
  X,
  PartyPopper,
  ShieldAlert
} from 'lucide-react';
import { CampusEvent } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import {
  CEO_EMAIL,
  EVENT_TYPES,
  deleteEventFromFirestore,
  formatEventDate,
  getAllEventsForCeoFromFirestore,
  isAuthorizedCeo,
  isEventPast,
  isEventScheduledForFuture,
  isFirebaseCeoVerified,
  saveEventToFirestore,
  updateEventInFirestore
} from '../services/events.js';
import { uploadEventPosterPhoto } from '../services/imageStorage.js';
import { isValidImageFormat } from '../utils/imagePersistence.js';
import { EventDetailModal } from './EventDetailModal.js';
import { EventPosterImage } from './EventPosterImage.js';

interface CeoEventsManagerProps {
  onEventsChanged?: () => void;
  embedded?: boolean;
  onClose?: () => void;
}

type PublishMode = 'now' | 'schedule' | 'draft';
type FilterScope = 'all' | 'upcoming' | 'scheduled' | 'drafts' | 'past';

export const CeoEventsManager: React.FC<CeoEventsManagerProps> = ({
  onEventsChanged,
  embedded = false,
  onClose
}) => {
  const { user, loginWithGoogle } = useAuth();
  const isCeoAccount = isAuthorizedCeo(user);
  const [firebaseVerified, setFirebaseVerified] = useState<boolean>(() => isFirebaseCeoVerified());

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filterScope, setFilterScope] = useState<FilterScope>('all');

  // Form state
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null);
  const [celebrantName, setCelebrantName] = useState('');
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[0]);
  const [customEventType, setCustomEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [publishMode, setPublishMode] = useState<PublishMode>('now');
  const [publishAtInput, setPublishAtInput] = useState('');

  // Upload & Save UI state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Previews & Delete confirmation
  const [previewEvent, setPreviewEvent] = useState<CampusEvent | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [verifyingGoogle, setVerifyingGoogle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshVerificationAndEvents = async () => {
    const verified = isFirebaseCeoVerified();
    setFirebaseVerified(verified);
    if (!verified) return;

    setLoadingList(true);
    setErrorMsg(null);
    try {
      const list = await getAllEventsForCeoFromFirestore();
      setEvents(list);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load CEO events list.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isCeoAccount) {
      refreshVerificationAndEvents();
    }
  }, [isCeoAccount, user?.id]);

  const handleVerifyGoogleCeo = async () => {
    setVerifyingGoogle(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      setFirebaseVerified(isFirebaseCeoVerified());
      await refreshVerificationAndEvents();
      setSuccessMsg('CEO Google session verified. You can now publish and manage events.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not complete CEO Google verification.');
    } finally {
      setVerifyingGoogle(false);
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setCelebrantName('');
    setEventType(EVENT_TYPES[0]);
    setCustomEventType('');
    setEventDate('');
    setEventTime('');
    setVenue('');
    setDescription('');
    setAdditionalInfo('');
    setPhotoUrl('');
    setPublishMode('now');
    setPublishAtInput('');
    setUploadWarning(null);
    setErrorMsg(null);
  };

  const populateFormForEdit = (ev: CampusEvent) => {
    setEditingEvent(ev);
    setCelebrantName(ev.celebrantName);
    const matchesPreset = (EVENT_TYPES as readonly string[]).includes(ev.eventType);
    if (matchesPreset) {
      setEventType(ev.eventType);
      setCustomEventType('');
    } else {
      setEventType('__custom__');
      setCustomEventType(ev.eventType);
    }
    setEventDate(ev.eventDate);
    setEventTime(ev.eventTime || '');
    setVenue(ev.venue);
    setDescription(ev.description);
    setAdditionalInfo(ev.additionalInfo || '');
    setPhotoUrl(ev.photoUrl);

    if (ev.status === 'draft') {
      setPublishMode('draft');
      setPublishAtInput('');
    } else if (ev.publishAt && Date.parse(ev.publishAt) > Date.now()) {
      setPublishMode('schedule');
      const d = new Date(ev.publishAt);
      const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setPublishAtInput(localISO);
    } else {
      setPublishMode('now');
      setPublishAtInput('');
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!isValidImageFormat(file)) {
      setErrorMsg('Only JPG, JPEG, PNG, and WebP images are supported for event posters.');
      return;
    }

    setUploadingPhoto(true);
    setUploadProgress(5);
    setUploadWarning(null);
    setErrorMsg(null);

    try {
      const result = await uploadEventPosterPhoto(
        file,
        user?.id || 'ceo',
        (pct) => setUploadProgress(pct)
      );
      setPhotoUrl(result.downloadUrl);
      if (result.warning) {
        setUploadWarning(result.warning);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload photograph. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const resolvedEventType =
    eventType === '__custom__' ? customEventType.trim() : eventType.trim();

  const buildDraftPreviewObject = (): CampusEvent => ({
    id: editingEvent?.id || 'preview_event',
    celebrantName: celebrantName.trim() || 'Celebrant Full Name',
    eventType: resolvedEventType || 'Birthday Celebration',
    eventDate: eventDate || new Date().toISOString().slice(0, 10),
    ...(eventTime.trim() ? { eventTime: eventTime.trim() } : {}),
    venue: venue.trim() || 'FUWUKARI Campus Venue',
    description:
      description.trim() || 'Event description will appear here cleanly for all FU MARKET visitors.',
    ...(additionalInfo.trim() ? { additionalInfo: additionalInfo.trim() } : {}),
    photoUrl: photoUrl || '',
    status: publishMode === 'draft' ? 'draft' : 'published',
    ...(publishMode === 'schedule' && publishAtInput
      ? { publishAt: new Date(publishAtInput).toISOString() }
      : {}),
    createdAt: editingEvent?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isFirebaseCeoVerified()) {
      setErrorMsg(
        `Please verify your Google sign-in as ${CEO_EMAIL} first so Firestore authorises your announcement.`
      );
      return;
    }

    if (!celebrantName.trim()) {
      setErrorMsg("Please enter the celebrant's full name.");
      return;
    }
    if (!resolvedEventType) {
      setErrorMsg('Please select or enter the event type.');
      return;
    }
    if (!eventDate) {
      setErrorMsg('Please choose the birthday or event date.');
      return;
    }
    if (!venue.trim()) {
      setErrorMsg('Please enter the event venue.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter the event description.');
      return;
    }
    if (!photoUrl) {
      setErrorMsg("Please upload the celebrant's photograph or event poster.");
      return;
    }

    let resolvedPublishAt: string | undefined;
    if (publishMode === 'schedule') {
      if (!publishAtInput) {
        setErrorMsg('Please select the scheduled publication date and time.');
        return;
      }
      const parsed = Date.parse(publishAtInput);
      if (isNaN(parsed)) {
        setErrorMsg('Invalid schedule date/time format.');
        return;
      }
      resolvedPublishAt = new Date(parsed).toISOString();
    }

    setSaving(true);
    try {
      const targetStatus: 'published' | 'draft' = publishMode === 'draft' ? 'draft' : 'published';

      if (editingEvent) {
        await updateEventInFirestore(editingEvent, {
          celebrantName: celebrantName.trim(),
          eventType: resolvedEventType,
          eventDate,
          eventTime: eventTime.trim(),
          venue: venue.trim(),
          description: description.trim(),
          additionalInfo: additionalInfo.trim(),
          photoUrl,
          status: targetStatus,
          publishAt: publishMode === 'schedule' ? resolvedPublishAt : ''
        });
        setSuccessMsg('Announcement updated successfully!');
      } else {
        await saveEventToFirestore({
          celebrantName: celebrantName.trim(),
          eventType: resolvedEventType,
          eventDate,
          eventTime: eventTime.trim() || undefined,
          venue: venue.trim(),
          description: description.trim(),
          additionalInfo: additionalInfo.trim() || undefined,
          photoUrl,
          status: targetStatus,
          publishAt: resolvedPublishAt
        });
        setSuccessMsg(
          publishMode === 'draft'
            ? 'Announcement saved as draft.'
            : publishMode === 'schedule'
            ? 'Announcement scheduled successfully!'
            : 'Announcement published live on FU MARKET!'
        );
      }

      resetForm();
      await refreshVerificationAndEvents();
      onEventsChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublishStatus = async (ev: CampusEvent) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const nextStatus: 'published' | 'draft' = ev.status === 'published' ? 'draft' : 'published';
      await updateEventInFirestore(ev, { status: nextStatus, publishAt: '' });
      setSuccessMsg(
        nextStatus === 'published'
          ? `"${ev.celebrantName}" is now published on FU MARKET.`
          : `"${ev.celebrantName}" moved to drafts (hidden from public).`
      );
      await refreshVerificationAndEvents();
      onEventsChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update event visibility.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await deleteEventFromFirestore(id);
      setConfirmDeleteId(null);
      if (editingEvent?.id === id) {
        resetForm();
      }
      setSuccessMsg('Event announcement deleted permanently.');
      await refreshVerificationAndEvents();
      onEventsChanged?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete announcement.');
    }
  };

  // Hard client-side access block for non-CEO accounts
  if (!isCeoAccount) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-[#FCA5A5] max-w-lg mx-auto my-8 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-display text-lg font-black text-[#10251D]">
          CEO Access Required
        </h3>
        <p className="text-xs text-[#4B5563]">
          Only the authorized FU MARKET CEO can create, edit, schedule, or delete Birthday &amp; Events announcements.
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#10251D] text-white text-xs font-bold"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  const filteredEvents = events.filter((ev) => {
    const scheduled = isEventScheduledForFuture(ev);
    const past = isEventPast(ev);
    if (filterScope === 'drafts') return ev.status === 'draft';
    if (filterScope === 'scheduled') return scheduled;
    if (filterScope === 'past') return ev.status === 'published' && !scheduled && past;
    if (filterScope === 'upcoming') return ev.status === 'published' && !scheduled && !past;
    return true;
  });

  const body = (
    <div className="space-y-6">
      {/* Firebase Google Session Verification Check */}
      {!firebaseVerified && (
        <div className="bg-[#10251D] text-white p-4 sm:p-5 rounded-2xl border-2 border-[#D4A62A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#D4A62A] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-black text-white">
                Verify Your CEO Google Session to Publish
              </h4>
              <p className="text-xs text-white/80 mt-0.5">
                Firestore security rules require verified Firebase Authentication as{' '}
                <span className="font-mono text-[#D4A62A]">{CEO_EMAIL}</span> to create, edit, or delete announcements.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleVerifyGoogleCeo}
            disabled={verifyingGoogle}
            className="px-4 py-2.5 rounded-xl bg-[#D4A62A] hover:bg-[#E0B43B] disabled:opacity-60 text-[#10251D] text-xs font-black shrink-0 min-h-[44px]"
          >
            {verifyingGoogle ? 'Verifying...' : 'Verify with Google'}
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </span>
          <button type="button" onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-[#087443] text-white text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#D4A62A] shrink-0" />
            <span>{successMsg}</span>
          </span>
          <button type="button" onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two-Column CEO Workspace: Create/Edit Form + Live Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F4F8F5]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#087443] text-[#D4A62A] flex items-center justify-center">
                <PartyPopper className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-black text-[#10251D]">
                  {editingEvent ? 'Edit Event Announcement' : 'Publish New Birthday or Event'}
                </h3>
                <p className="text-[11px] text-[#6B7280]">
                  CEO Exclusive Dashboard • Pre-screened by Firebase Security Rules
                </p>
              </div>
            </div>
            {editingEvent && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-lg bg-[#F4F8F5] hover:bg-[#E5E7EB] text-xs font-bold text-[#10251D]"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Photo Uploader */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-[#10251D]">
              Celebrant&apos;s Photograph or Event Poster *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handlePhotoFileChange}
              className="hidden"
            />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-4 py-3 rounded-xl border-2 border-dashed border-[#087443] bg-[#F4F8F5] hover:bg-[#E8F2EC] text-[#087443] text-xs font-black flex items-center justify-center gap-2 transition min-h-[48px] flex-1"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {uploadingPhoto
                    ? `Uploading (${uploadProgress}%)...`
                    : photoUrl
                    ? 'Replace Photograph / Poster'
                    : 'Upload Celebrant Photo / Event Poster'}
                </span>
              </button>
              {photoUrl && (
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-[#E5E7EB] shrink-0 bg-[#10251D]">
                  <EventPosterImage src={photoUrl} alt="Poster preview" />
                </div>
              )}
            </div>
            {uploadingPhoto && (
              <div className="w-full h-2 rounded-full bg-[#F4F8F5] overflow-hidden">
                <div
                  className="h-full bg-[#087443] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            {uploadWarning && (
              <p className="text-[11px] text-[#10251D] bg-[#F4F8F5] px-2.5 py-1.5 rounded-lg border border-[#D4A62A]">
                {uploadWarning}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-black text-[#10251D] mb-1">
                Celebrant&apos;s Full Name *
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={celebrantName}
                onChange={(e) => setCelebrantName(e.target.value)}
                placeholder="e.g. Aisha Mohammed Danjuma"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] text-xs sm:text-sm font-semibold text-[#10251D] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#10251D] mb-1">
                Type of Event *
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] text-xs sm:text-sm font-semibold text-[#10251D] outline-none"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="__custom__">Other (Custom Event Type)</option>
              </select>
            </div>
          </div>

          {eventType === '__custom__' && (
            <div>
              <label className="block text-xs font-black text-[#10251D] mb-1">
                Custom Event Type *
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={customEventType}
                onChange={(e) => setCustomEventType(e.target.value)}
                placeholder="e.g. Departmental Dinner / Induction Ceremony"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] text-xs sm:text-sm font-semibold text-[#10251D] outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-black text-[#10251D] mb-1">
                Birthday or Event Date *
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] text-xs sm:text-sm font-semibold text-[#10251D] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#10251D] mb-1">
                Event Time (Optional)
              </label>
              <input
                type="text"
                maxLength={60}
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 4:00 PM Prompt"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] text-xs sm:text-sm font-semibold text-[#10251D] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-[#10251D] mb-1">
              Event Venue *
            </label>
            <input
              type="text"
              required
              maxLength={180}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. FUWUKARI Large Lecture Theatre / Off-Campus Hall"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] text-xs sm:text-sm font-semibold text-[#10251D] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#10251D] mb-1">
              Event Description *
            </label>
            <textarea
              required
              rows={3}
              maxLength={3000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write warm birthday wishes, celebration highlights, or campus event details..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] text-xs sm:text-sm font-medium text-[#10251D] outline-none resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#10251D] mb-1">
              Additional Information (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={1500}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Optional dress code, RSVP contact, or special notes for guests..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] focus:border-[#087443] text-xs sm:text-sm font-medium text-[#10251D] outline-none resize-y"
            />
          </div>

          {/* Publish / Schedule / Draft Selector */}
          <div className="p-3.5 rounded-2xl bg-[#F4F8F5] border border-[#E5E7EB] space-y-3">
            <span className="block text-xs font-black text-[#10251D]">
              Visibility &amp; Schedule
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'now' as PublishMode, label: 'Publish Now', icon: Globe },
                { id: 'schedule' as PublishMode, label: 'Schedule Date', icon: Calendar },
                { id: 'draft' as PublishMode, label: 'Save Draft', icon: FileText }
              ].map((opt) => {
                const Icon = opt.icon;
                const active = publishMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPublishMode(opt.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition ${
                      active
                        ? 'bg-[#087443] border-[#087443] text-[#D4A62A]'
                        : 'bg-white border-[#E5E7EB] text-[#4B5563] hover:border-[#087443]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {publishMode === 'schedule' && (
              <div>
                <label className="block text-[11px] font-bold text-[#4B5563] mb-1">
                  Go Live Automatically At:
                </label>
                <input
                  type="datetime-local"
                  required
                  value={publishAtInput}
                  onChange={(e) => setPublishAtInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] focus:border-[#087443] text-xs font-bold text-[#10251D] outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setPreviewEvent(buildDraftPreviewObject())}
              className="px-4 py-3 rounded-xl bg-[#10251D] hover:bg-[#065D36] text-white text-xs font-black flex items-center gap-2 transition min-h-[44px]"
            >
              <Eye className="w-4 h-4 text-[#D4A62A]" />
              <span>Preview Before Publishing</span>
            </button>

            <button
              type="submit"
              disabled={saving || uploadingPhoto}
              className="flex-1 px-5 py-3 rounded-xl bg-[#087443] hover:bg-[#065D36] disabled:opacity-60 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-[#D4A62A]" />
              <span>
                {saving
                  ? 'Saving Announcement...'
                  : editingEvent
                  ? 'Save Changes'
                  : publishMode === 'draft'
                  ? 'Save Draft'
                  : publishMode === 'schedule'
                  ? 'Schedule Announcement'
                  : 'Publish Announcement Live'}
              </span>
            </button>
          </div>
        </form>

        {/* Live Homepage Card Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#087443] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4A62A]" />
              Live Homepage Card Preview
            </span>
            <button
              type="button"
              onClick={() => setPreviewEvent(buildDraftPreviewObject())}
              className="text-xs font-bold text-[#10251D] hover:text-[#087443] underline"
            >
              Open Full Details View
            </button>
          </div>

          <div className="bg-white border-2 border-[#087443]/25 rounded-2xl overflow-hidden shadow-md">
            <div className="aspect-[4/3] bg-[#10251D] relative overflow-hidden">
              <EventPosterImage
                src={photoUrl}
                alt={celebrantName || 'Celebrant Photo Preview'}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-lg bg-[#087443] text-white text-[10px] font-black uppercase tracking-wider shadow">
                  {resolvedEventType || 'Birthday Celebration'}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <h4 className="font-display text-base font-black text-[#10251D] line-clamp-1">
                {celebrantName.trim() || "Celebrant's Full Name"}
              </h4>
              <div className="space-y-1 text-xs text-[#4B5563]">
                <p className="flex items-center gap-1.5 font-bold text-[#10251D]">
                  <Calendar className="w-3.5 h-3.5 text-[#087443]" />
                  <span>{eventDate ? formatEventDate(eventDate) : 'Select Event Date'}</span>
                </p>
                {eventTime.trim() && (
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#087443]" />
                    <span>{eventTime}</span>
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#087443]" />
                  <span>{venue.trim() || 'FUWUKARI Campus Venue'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Published, Scheduled, Draft & Past Events Management List */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm sm:text-base font-black text-[#10251D]">
              Manage All Announcements ({events.length})
            </h3>
            <p className="text-[11px] text-[#6B7280]">
              Publish, unpublish, schedule, edit, or delete FU MARKET Birthday &amp; Events entries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'scheduled', label: 'Scheduled' },
                { id: 'drafts', label: 'Drafts' },
                { id: 'past', label: 'Past' }
              ] as { id: FilterScope; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterScope(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterScope === tab.id
                    ? 'bg-[#087443] text-white'
                    : 'bg-[#F4F8F5] text-[#4B5563] hover:text-[#10251D]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loadingList ? (
          <div className="py-8 text-center text-xs font-bold text-[#6B7280]">
            Loading announcements...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B7280] bg-[#F4F8F5] rounded-xl border border-[#E5E7EB]">
            No announcements match this filter yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((ev) => {
              const scheduled = isEventScheduledForFuture(ev);
              const past = isEventPast(ev);
              return (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-2xl border border-[#E5E7EB] bg-[#F4F8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#10251D] shrink-0">
                      <EventPosterImage src={ev.photoUrl} alt={ev.celebrantName} />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#087443] text-white text-[10px] font-black uppercase">
                          {ev.eventType}
                        </span>
                        {ev.status === 'draft' ? (
                          <span className="px-2 py-0.5 rounded bg-[#E5E7EB] text-[#374151] text-[10px] font-black uppercase">
                            Draft
                          </span>
                        ) : scheduled ? (
                          <span className="px-2 py-0.5 rounded bg-[#10251D] text-[#D4A62A] text-[10px] font-black uppercase">
                            Scheduled ({new Date(ev.publishAt!).toLocaleString()})
                          </span>
                        ) : past ? (
                          <span className="px-2 py-0.5 rounded bg-[#374151] text-white text-[10px] font-black uppercase">
                            Past Event
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#D4A62A] text-[#10251D] text-[10px] font-black uppercase">
                            Live Upcoming
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-[#10251D] truncate">
                        {ev.celebrantName}
                      </h4>
                      <p className="text-[11px] text-[#4B5563] truncate">
                        {formatEventDate(ev.eventDate)} • {ev.venue}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewEvent(ev)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#10251D] text-xs font-bold text-[#10251D] flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePublishStatus(ev)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                        ev.status === 'published'
                          ? 'bg-[#D4A62A] text-[#10251D] hover:bg-[#E0B43B]'
                          : 'bg-[#087443] text-white hover:bg-[#065D36]'
                      }`}
                    >
                      {ev.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>

                    <button
                      type="button"
                      onClick={() => populateFormForEdit(ev)}
                      className="px-3 py-1.5 rounded-lg bg-[#10251D] hover:bg-[#065D36] text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#D4A62A]" />
                      Edit
                    </button>

                    {confirmDeleteId === ev.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-black"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 rounded-lg bg-[#E5E7EB] text-[#10251D] text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(ev.id)}
                        className="p-1.5 rounded-lg bg-white border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEF2F2]"
                        title="Delete event"
                        aria-label={`Delete ${ev.celebrantName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewEvent && (
        <EventDetailModal
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          isPreview={previewEvent.id === 'preview_event' || previewEvent.status === 'draft'}
        />
      )}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-6xl bg-[#F4F8F5] rounded-3xl shadow-2xl overflow-hidden my-2 sm:my-4 max-h-[94vh] flex flex-col border border-[#E5E7EB]">
        <div className="bg-[#087443] text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0 border-b-4 border-[#D4A62A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4A62A] text-[#10251D] flex items-center justify-center shrink-0">
              <PartyPopper className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black text-white">
                FU MARKET CEO — Birthday &amp; Events Publishing Centre
              </h2>
              <p className="text-[11px] text-white/80">
                Authorized CEO Account ({user?.email || CEO_EMAIL})
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#065D36] hover:bg-[#D4A62A] text-white hover:text-[#10251D] flex items-center justify-center transition"
              aria-label="Close CEO Publishing Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{body}</div>
      </div>
    </div>
  );
};
