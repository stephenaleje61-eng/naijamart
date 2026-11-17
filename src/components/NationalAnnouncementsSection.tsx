import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Megaphone,
  Pin,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import {
  AnnouncementAudienceScope,
  Institution,
  NationalCampusAnnouncement
} from '../types.js';
import {
  NIGERIAN_INSTITUTIONS,
  NIGERIAN_STATES_AND_FCT
} from '../constants/institutions.js';
import {
  deleteNationalAnnouncement,
  doesAnnouncementMatchInstitution,
  publishNationalAnnouncement,
  subscribeToNationalAnnouncements
} from '../services/universityNetwork.js';

interface NationalAnnouncementsSectionProps {
  activeInstitution: Institution;
  canPublish?: boolean;
  ceoSessionToken?: string;
}

const CATEGORIES: NationalCampusAnnouncement['category'][] = [
  'Academic Calendar',
  'Scholarship & Grants',
  'Security Alert',
  'Campus Event',
  'Marketplace Notice',
  'National Policy'
];

export const NationalAnnouncementsSection: React.FC<NationalAnnouncementsSectionProps> = ({
  activeInstitution,
  canPublish = false,
  ceoSessionToken
}) => {
  const [announcements, setAnnouncements] = useState<NationalCampusAnnouncement[]>([]);
  const [viewScope, setViewScope] = useState<'my_campus' | 'all_national'>('my_campus');
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Composer state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<NationalCampusAnnouncement['category']>('Academic Calendar');
  const [audienceScope, setAudienceScope] = useState<AnnouncementAudienceScope>('all_universities');
  const [singleInstitutionId, setSingleInstitutionId] = useState(activeInstitution.id);
  const [selectedInstIds, setSelectedInstIds] = useState<string[]>([activeInstitution.id]);
  const [selectedStates, setSelectedStates] = useState<string[]>([activeInstitution.state]);
  const [isPinned, setIsPinned] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToNationalAnnouncements(setAnnouncements);
  }, []);

  const displayed = announcements.filter((ann) =>
    viewScope === 'all_national' ? true : doesAnnouncementMatchInstitution(ann, activeInstitution)
  );

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPublishing(true);
    setPublishError(null);
    try {
      await publishNationalAnnouncement({
        title: title.trim(),
        body: body.trim(),
        category,
        audienceScope,
        singleInstitutionId: audienceScope === 'single_institution' ? singleInstitutionId : undefined,
        targetInstitutionIds:
          audienceScope === 'selected_institutions' ? selectedInstIds : undefined,
        targetStates: audienceScope === 'selected_states' ? selectedStates : undefined,
        isPinned,
        isUrgent,
        ceoSessionToken
      });
      setTitle('');
      setBody('');
      setShowPublishModal(false);
    } catch (err: any) {
      setPublishError(err?.message || 'Unable to publish announcement.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-[#D9E5DF] p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#087443]">
            <Megaphone className="w-4 h-4 text-[#D4A62A]" />
            <span>NATIONAL CAMPUS ANNOUNCEMENTS</span>
          </div>
          <h2 className="text-lg font-extrabold text-[#172B24] mt-0.5">
            Targeted Bulletins &amp; Official Campus Notices
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-[#F5F8F6] p-1 border border-[#D9E5DF]">
            <button
              type="button"
              onClick={() => setViewScope('my_campus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewScope === 'my_campus' ? 'bg-[#087443] text-white' : 'text-[#172B24]'
              }`}
            >
              Relevant to {activeInstitution.shortName}
            </button>
            <button
              type="button"
              onClick={() => setViewScope('all_national')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewScope === 'all_national' ? 'bg-[#087443] text-white' : 'text-[#172B24]'
              }`}
            >
              All Nigeria
            </button>
          </div>

          {canPublish && (
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#172B24] hover:bg-[#087443] text-white text-xs font-extrabold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>Publish Notice</span>
            </button>
          )}
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="p-6 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF] text-center">
          <p className="text-xs font-bold text-[#172B24]">
            No official national announcements for {activeInstitution.shortName} right now.
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            Official bulletins published by NIGERIA UNIVERSITY HUB CEO or Campus Representatives appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayed.map((ann) => (
            <article
              key={ann.id}
              className={`p-4 rounded-xl border space-y-2 ${
                ann.isUrgent
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-[#F5F8F6] border-[#D9E5DF]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[#087443] text-white text-[10px] font-extrabold">
                    {ann.category}
                  </span>
                  {ann.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#172B24] text-[#D4A62A] text-[10px] font-extrabold">
                      <Pin className="w-2.5 h-2.5" />
                      <span>PINNED</span>
                    </span>
                  )}
                  {ann.isUrgent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold">
                      <AlertCircle className="w-2.5 h-2.5" />
                      <span>URGENT</span>
                    </span>
                  )}
                </div>

                {canPublish && (
                  <button
                    type="button"
                    onClick={() => deleteNationalAnnouncement(ann.id, ceoSessionToken).catch(() => {})}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-600"
                    title="Delete announcement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <h3 className="text-sm font-extrabold text-[#172B24]">{ann.title}</h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{ann.body}</p>

              <div className="pt-2 border-t border-[#D9E5DF]/70 flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-bold text-[#172B24]">{ann.authorName}</span>
                <span>{new Date(ann.createdAt).toLocaleDateString('en-NG')}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {showPublishModal && canPublish && (
        <div className="fixed inset-0 z-50 bg-[#172B24]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handlePublish}
            className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#D9E5DF] p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#D9E5DF] pb-3">
              <h3 className="text-sm font-extrabold text-[#172B24]">
                Publish Targeted Campus Announcement
              </h3>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="p-1.5 rounded-lg bg-[#F5F8F6] text-[#172B24]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#172B24] mb-1">Headline *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Official announcement headline"
                className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#172B24] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-white text-xs font-semibold text-[#172B24]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172B24] mb-1">Target Audience</label>
                <select
                  value={audienceScope}
                  onChange={(e) => setAudienceScope(e.target.value as AnnouncementAudienceScope)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-white text-xs font-semibold text-[#172B24]"
                >
                  <option value="all_universities">All Universities Nationwide</option>
                  <option value="all_polytechnics">All Polytechnics Nationwide</option>
                  <option value="selected_institutions">Selected Institutions</option>
                  <option value="selected_states">Selected States</option>
                  <option value="single_institution">Single Institution</option>
                </select>
              </div>
            </div>

            {audienceScope === 'single_institution' && (
              <select
                value={singleInstitutionId}
                onChange={(e) => setSingleInstitutionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-white text-xs text-[#172B24]"
              >
                {NIGERIAN_INSTITUTIONS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            )}

            {audienceScope === 'selected_states' && (
              <div className="max-h-32 overflow-y-auto border border-[#D9E5DF] rounded-xl p-2 grid grid-cols-2 gap-1">
                {NIGERIAN_STATES_AND_FCT.map((st) => (
                  <label key={st} className="flex items-center gap-1.5 text-xs text-[#172B24]">
                    <input
                      type="checkbox"
                      checked={selectedStates.includes(st)}
                      onChange={(e) =>
                        setSelectedStates((prev) =>
                          e.target.checked ? [...prev, st] : prev.filter((s) => s !== st)
                        )
                      }
                    />
                    <span>{st}</span>
                  </label>
                ))}
              </div>
            )}

            {audienceScope === 'selected_institutions' && (
              <div className="max-h-36 overflow-y-auto border border-[#D9E5DF] rounded-xl p-2 space-y-1">
                {NIGERIAN_INSTITUTIONS.map((inst) => (
                  <label key={inst.id} className="flex items-center gap-1.5 text-xs text-[#172B24]">
                    <input
                      type="checkbox"
                      checked={selectedInstIds.includes(inst.id)}
                      onChange={(e) =>
                        setSelectedInstIds((prev) =>
                          e.target.checked
                            ? [...prev, inst.id]
                            : prev.filter((id) => id !== inst.id)
                        )
                      }
                    />
                    <span>{inst.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#172B24] mb-1">Announcement Details *</label>
              <textarea
                rows={4}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write clear details, dates, deadlines, or instructions..."
                className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24]"
              />
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-[#172B24]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
                <span>Pin to top</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
                <span>Mark Urgent</span>
              </label>
            </div>

            {publishError && <p className="text-xs font-bold text-red-600">{publishError}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl bg-[#F5F8F6] text-xs font-bold text-[#172B24]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishing}
                className="px-5 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                {publishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Publish Official Bulletin</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
