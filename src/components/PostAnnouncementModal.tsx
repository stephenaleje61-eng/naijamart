import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Trophy,
  Megaphone,
  Upload,
  Eye,
  Send,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  MapPin,
  Users,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../services/firebase.js';
import {
  GENERAL_ANNOUNCEMENT_CATEGORIES,
  SPORT_CATEGORIES,
  createGeneralAnnouncementPost,
  createSportUpdatePost,
  updateOwnGeneralAnnouncementPost,
  updateOwnSportUpdatePost
} from '../services/announcements.js';
import { uploadAnnouncementPhoto } from '../services/imageStorage.js';
import { isValidImageFormat } from '../utils/imagePersistence.js';
import {
  CommunityAnnouncementPost,
  GeneralAnnouncementPost,
  SportUpdatePost
} from '../types.js';
import { EventPosterImage } from './EventPosterImage.js';

interface PostAnnouncementModalProps {
  defaultFeedType?: 'sport_update' | 'general_announcement';
  editingPost?: CommunityAnnouncementPost | null;
  onClose: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onSuccess: (created?: CommunityAnnouncementPost, message?: string) => void;
}

export const PostAnnouncementModal: React.FC<PostAnnouncementModalProps> = ({
  defaultFeedType = 'sport_update',
  editingPost = null,
  onClose,
  onOpenAuthModal,
  onSuccess
}) => {
  const { user, loginWithGoogle } = useAuth();
  const [hasFirebaseUser, setHasFirebaseUser] = useState<boolean>(() =>
    Boolean(auth.currentUser?.uid)
  );

  const [postType, setPostType] = useState<'sport_update' | 'general_announcement'>(() =>
    editingPost ? editingPost.categoryType : defaultFeedType
  );

  // Common fields
  const [title, setTitle] = useState(editingPost?.title || '');
  const [description, setDescription] = useState(editingPost?.description || '');
  const [imageUrl, setImageUrl] = useState(editingPost?.imageUrl || '');

  // Sport fields
  const [sportCategory, setSportCategory] = useState<string>(() =>
    editingPost?.categoryType === 'sport_update'
      ? editingPost.sportCategory
      : SPORT_CATEGORIES[0]
  );
  const [teamOrPlayer, setTeamOrPlayer] = useState(
    editingPost?.categoryType === 'sport_update' ? editingPost.teamOrPlayer || '' : ''
  );
  const [competitionName, setCompetitionName] = useState(
    editingPost?.categoryType === 'sport_update' ? editingPost.competitionName || '' : ''
  );
  const [matchDate, setMatchDate] = useState(
    editingPost?.categoryType === 'sport_update' ? editingPost.matchDate || '' : ''
  );
  const [matchTime, setMatchTime] = useState(
    editingPost?.categoryType === 'sport_update' ? editingPost.matchTime || '' : ''
  );
  const [venue, setVenue] = useState(
    editingPost?.categoryType === 'sport_update' ? editingPost.venue || '' : ''
  );
  const [score, setScore] = useState(
    editingPost?.categoryType === 'sport_update' ? editingPost.score || '' : ''
  );

  // General Announcement fields
  const [announcementCategory, setAnnouncementCategory] = useState<string>(() =>
    editingPost?.categoryType === 'general_announcement'
      ? editingPost.announcementCategory
      : GENERAL_ANNOUNCEMENT_CATEGORIES[0]
  );
  const [eventDate, setEventDate] = useState(
    editingPost?.categoryType === 'general_announcement' ? editingPost.eventDate || '' : ''
  );
  const [eventTime, setEventTime] = useState(
    editingPost?.categoryType === 'general_announcement' ? editingPost.eventTime || '' : ''
  );
  const [location, setLocation] = useState(
    editingPost?.categoryType === 'general_announcement' ? editingPost.location || '' : ''
  );

  // UI & Upload State
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasFirebaseUser(Boolean(auth.currentUser?.uid));
  }, [user]);

  const handleGoogleSignIn = async () => {
    setSigningInGoogle(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      setHasFirebaseUser(Boolean(auth.currentUser?.uid));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to verify Google account.');
    } finally {
      setSigningInGoogle(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!isValidImageFormat(file)) {
      setErrorMsg('Only JPG, JPEG, PNG, and WebP images are supported.');
      return;
    }

    setUploadingPhoto(true);
    setUploadProgress(5);
    setUploadWarning(null);
    setErrorMsg(null);

    try {
      const folder = postType === 'sport_update' ? 'sport_updates' : 'general_announcements';
      const result = await uploadAnnouncementPhoto(
        file,
        folder,
        auth.currentUser?.uid || user?.id || 'user',
        (pct) => setUploadProgress(pct)
      );
      setImageUrl(result.downloadUrl);
      if (result.warning) setUploadWarning(result.warning);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Image upload failed. Please retry.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!auth.currentUser?.uid) {
      setErrorMsg('Please sign in with Google first to publish your announcement.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter a clear title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please write your announcement details.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPost) {
        if (editingPost.categoryType === 'sport_update') {
          await updateOwnSportUpdatePost(editingPost.id, {
            sportCategory,
            title,
            teamOrPlayer,
            competitionName,
            matchDate,
            matchTime,
            venue,
            score,
            description,
            imageUrl
          } as Partial<SportUpdatePost>);
        } else {
          await updateOwnGeneralAnnouncementPost(editingPost.id, {
            announcementCategory,
            title,
            eventDate,
            eventTime,
            location,
            description,
            imageUrl
          } as Partial<GeneralAnnouncementPost>);
        }
        onSuccess(undefined, 'Announcement updated successfully!');
        onClose();
        return;
      }

      if (postType === 'sport_update') {
        const created = await createSportUpdatePost(
          {
            sportCategory,
            title,
            teamOrPlayer,
            competitionName,
            matchDate,
            matchTime,
            venue,
            score,
            description,
            imageUrl
          },
          user
        );
        const msg =
          created.status === 'pending'
            ? 'Submitted for quick admin safety review.'
            : 'Sport update published live on FU MARKET!';
        onSuccess(created, msg);
      } else {
        const created = await createGeneralAnnouncementPost(
          {
            announcementCategory,
            title,
            eventDate,
            eventTime,
            location,
            description,
            imageUrl
          },
          user
        );
        const msg =
          created.status === 'pending'
            ? 'Submitted for quick admin safety review.'
            : 'General announcement published live on FU MARKET!';
        onSuccess(created, msg);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to publish post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-2 sm:my-4 border border-[#E5E7EB]">
        {/* Dark + Orange Header */}
        <div className="bg-[#111111] text-white px-5 py-4 flex items-center justify-between gap-3 border-b-4 border-[#EA580C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center shrink-0">
              {postType === 'sport_update' ? (
                <Trophy className="w-5 h-5" />
              ) : (
                <Megaphone className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black text-white">
                {editingPost ? 'Edit Your Post' : 'Post Sport Update or Announcement'}
              </h2>
              <p className="text-[11px] text-white/75">
                FU SPORT UPDATE &amp; ANNOUNCEMENT CENTRE
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close post composer"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#EA580C] text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          {/* Authentication / Anti-Spam Gate */}
          {!hasFirebaseUser ? (
            <div className="bg-[#FFF7ED] border-2 border-[#EA580C]/40 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center mx-auto shadow">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="font-display text-lg font-black text-[#111111]">
                  Verify Your Account to Publish
                </h3>
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Anyone can browse and share announcements without logging in. To post, edit, like, or comment and protect FU MARKET from spam, please sign in first.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingInGoogle}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 text-white text-xs font-black shadow-md transition min-h-[44px]"
                >
                  {signingInGoogle ? 'Signing in...' : 'Continue with Google (Instant)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal('register');
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition min-h-[44px]"
                >
                  Sign In / Create Account
                </button>
              </div>
            </div>
          ) : showPreview ? (
            /* Live Preview Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#EA580C]">
                  Post Preview Before Publishing
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#111111] text-white text-xs font-bold"
                >
                  Back to Edit
                </button>
              </div>

              <div className="rounded-2xl border-2 border-[#EA580C]/30 overflow-hidden bg-white shadow-sm">
                {imageUrl && (
                  <div className="aspect-[16/9] bg-[#111111] overflow-hidden">
                    <EventPosterImage src={imageUrl} alt={title || 'Preview'} />
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-[#EA580C] text-white text-[10px] font-black uppercase">
                      {postType === 'sport_update' ? sportCategory : announcementCategory}
                    </span>
                    {postType === 'sport_update' && (
                      <span className="px-2 py-0.5 rounded bg-[#FFF7ED] border border-[#FED7AA] text-[#9A3412] text-[10px] font-bold">
                        User-Submitted • Unverified
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-black text-[#111111]">
                    {title || 'Post Title'}
                  </h3>
                  {postType === 'sport_update' && score.trim() && (
                    <div className="inline-block px-3 py-1.5 rounded-xl bg-[#111111] text-[#FB923C] text-xs font-black">
                      Reported Score: {score}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-[#4B5563]">
                    {postType === 'sport_update' && teamOrPlayer.trim() && (
                      <span className="flex items-center gap-1 font-bold text-[#111111]">
                        <Users className="w-3.5 h-3.5 text-[#EA580C]" />
                        {teamOrPlayer}
                      </span>
                    )}
                    {postType === 'sport_update' && competitionName.trim() && (
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-[#EA580C]" />
                        {competitionName}
                      </span>
                    )}
                    {(postType === 'sport_update' ? matchDate : eventDate) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#EA580C]" />
                        {postType === 'sport_update' ? matchDate : eventDate}
                        {(postType === 'sport_update' ? matchTime : eventTime) &&
                          ` • ${postType === 'sport_update' ? matchTime : eventTime}`}
                      </span>
                    )}
                    {(postType === 'sport_update' ? venue : location) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#EA580C]" />
                        {postType === 'sport_update' ? venue : location}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#1F2937] whitespace-pre-line leading-relaxed">
                    {description || 'Your announcement text will appear here.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-3 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111111] text-xs font-black min-h-[44px]"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-5 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Publishing...' : editingPost ? 'Save Changes' : 'Publish Now'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Post Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Feed Switcher (locked while editing an existing document) */}
              {!editingPost && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPostType('sport_update')}
                    className={`p-3 rounded-2xl border-2 text-left transition flex items-center gap-2.5 ${
                      postType === 'sport_update'
                        ? 'bg-[#111111] border-[#EA580C] text-white'
                        : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#374151] hover:border-[#EA580C]'
                    }`}
                  >
                    <Trophy
                      className={`w-5 h-5 shrink-0 ${
                        postType === 'sport_update' ? 'text-[#FB923C]' : 'text-[#EA580C]'
                      }`}
                    />
                    <div>
                      <span className="block text-xs font-black">FU SPORT UPDATE</span>
                      <span className="block text-[10px] opacity-80">
                        Matches, fixtures, results &amp; teams
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostType('general_announcement')}
                    className={`p-3 rounded-2xl border-2 text-left transition flex items-center gap-2.5 ${
                      postType === 'general_announcement'
                        ? 'bg-[#111111] border-[#EA580C] text-white'
                        : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#374151] hover:border-[#EA580C]'
                    }`}
                  >
                    <Megaphone
                      className={`w-5 h-5 shrink-0 ${
                        postType === 'general_announcement' ? 'text-[#FB923C]' : 'text-[#EA580C]'
                      }`}
                    />
                    <div>
                      <span className="block text-xs font-black">FU GENERAL ANNOUNCEMENTS</span>
                      <span className="block text-[10px] opacity-80">
                        Events, notices, scholarships &amp; info
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {/* Category + Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-black text-[#111111] mb-1">
                    {postType === 'sport_update' ? 'Sport Category *' : 'Announcement Category *'}
                  </label>
                  <select
                    value={postType === 'sport_update' ? sportCategory : announcementCategory}
                    onChange={(e) =>
                      postType === 'sport_update'
                        ? setSportCategory(e.target.value)
                        : setAnnouncementCategory(e.target.value)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs sm:text-sm font-semibold text-[#111111] outline-none"
                  >
                    {(postType === 'sport_update'
                      ? SPORT_CATEGORIES
                      : GENERAL_ANNOUNCEMENT_CATEGORIES
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#111111] mb-1">
                    Post Title *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={180}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      postType === 'sport_update'
                        ? 'e.g. Computer Science vs Mass Comm Semi-Final'
                        : 'e.g. 200L Biology Practical Schedule Update'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs sm:text-sm font-semibold text-[#111111] outline-none"
                  />
                </div>
              </div>

              {postType === 'sport_update' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-black text-[#111111] mb-1">
                        Team or Player Names
                      </label>
                      <input
                        type="text"
                        maxLength={160}
                        value={teamOrPlayer}
                        onChange={(e) => setTeamOrPlayer(e.target.value)}
                        placeholder="e.g. CSC Eagles vs Economics FC"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs sm:text-sm text-[#111111] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-[#111111] mb-1">
                        Competition / Tournament Name
                      </label>
                      <input
                        type="text"
                        maxLength={140}
                        value={competitionName}
                        onChange={(e) => setCompetitionName(e.target.value)}
                        placeholder="e.g. SUG Vice-Chancellor Cup"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs sm:text-sm text-[#111111] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-black text-[#111111] mb-1">
                        Match / Event Date
                      </label>
                      <input
                        type="date"
                        value={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs text-[#111111] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-[#111111] mb-1">
                        Kickoff / Event Time
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={matchTime}
                        onChange={(e) => setMatchTime(e.target.value)}
                        placeholder="e.g. 4:00 PM"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs text-[#111111] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-[#111111] mb-1">
                        Score (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="e.g. 2 - 1 (FT)"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs text-[#111111] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#111111] mb-1">
                      Venue / Pitch
                    </label>
                    <input
                      type="text"
                      maxLength={180}
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. FUWUKARI Main Football Pitch"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs sm:text-sm text-[#111111] outline-none"
                    />
                  </div>

                  <p className="text-[11px] text-[#9A3412] bg-[#FFF7ED] border border-[#FED7AA] px-3 py-2 rounded-xl">
                    Honesty Notice: Only post real fixtures or actual match scores. User-submitted sports reports are automatically marked &ldquo;User-Submitted • Unverified&rdquo;.
                  </p>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-black text-[#111111] mb-1">
                      Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs text-[#111111] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#111111] mb-1">
                      Time (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="e.g. 10:00 AM"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs text-[#111111] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#111111] mb-1">
                      Location / Venue
                    </label>
                    <input
                      type="text"
                      maxLength={180}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Auditorium / Hostel"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs text-[#111111] outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-black text-[#111111] mb-1">
                  Full Announcement Details *
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={4000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write all important details clearly for FUWUKARI students and visitors..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#EA580C] text-xs sm:text-sm text-[#111111] outline-none resize-y"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-[#111111]">
                  Picture or Flyer Poster (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-dashed border-[#EA580C] bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#9A3412] text-xs font-black flex items-center justify-center gap-2 transition min-h-[46px]"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {uploadingPhoto
                        ? `Uploading (${uploadProgress}%)...`
                        : imageUrl
                        ? 'Change Photo / Poster'
                        : 'Upload Image or Event Poster'}
                    </span>
                  </button>
                  {imageUrl && (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#111111] border border-[#E5E7EB] shrink-0">
                      <EventPosterImage src={imageUrl} alt="Upload preview" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        aria-label="Remove uploaded image"
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                {uploadingPhoto && (
                  <div className="w-full h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div
                      className="h-full bg-[#EA580C] transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                {uploadWarning && (
                  <p className="text-[11px] text-[#9A3412] bg-[#FFF7ED] px-2.5 py-1 rounded-lg">
                    {uploadWarning}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="px-4 py-3 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-black flex items-center gap-1.5 transition min-h-[44px]"
                >
                  <Eye className="w-4 h-4 text-[#FB923C]" />
                  <span>Preview Post</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingPhoto}
                  className="flex-1 px-5 py-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Publishing...'
                      : editingPost
                      ? 'Save Changes'
                      : 'Publish Publicly'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
