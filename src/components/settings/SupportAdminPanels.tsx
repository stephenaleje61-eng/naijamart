import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Crown,
  FileText,
  HelpCircle,
  Loader2,
  Lock,
  Megaphone,
  Search,
  Send,
  ShieldAlert,
  Sliders,
  Users
} from 'lucide-react';
import { SupportReportRecord, User } from '../../types.js';
import { isAuthorizedCeo } from '../../services/events.js';
import { CeoSectionId } from '../CeoSuperAdminDashboard.js';
import {
  submitSupportReport,
  subscribeToMySupportReports
} from '../../services/settings.js';
import { formatTimestamp } from '../../utils/formatters.js';

interface HelpSupportPanelProps {
  user: User | null;
  focusSection: 'help-centre' | 'report-problem' | 'terms';
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const FAQS = [
  {
    q: 'How do I change my university or polytechnic?',
    a: 'Open Settings → University Information, select your Institution Type and State, choose your Nigerian university, polytechnic, or college of education, confirm the transfer notice, and save. Your campus feed updates right away.'
  },
  {
    q: 'How can I stay safe when buying or selling on campus?',
    a: 'Always inspect items physically in well-lit, populated campus locations (such as faculty complexes, SUG buildings, or main gates) before paying. Never pay upfront to an unverified stranger for hostel rent or gadgets.'
  },
  {
    q: 'Why can’t other students see my phone number?',
    a: 'If you disabled "Show Phone Number Publicly" in Privacy Settings, your phone and WhatsApp buttons are hidden from public profiles. Fellow students can still reach you securely via in-app Private Messages.'
  },
  {
    q: 'How does the Campus GPA / CGPA calculator choose my grading scale?',
    a: 'In Settings → Academic Preferences, set your Default GPA / CGPA Scale (5.0, 4.0, 7.0, or Custom) and Target CGPA. When you open the GPA Calculator, your academic defaults load automatically.'
  },
  {
    q: 'What happens if I deactivate vs permanently delete my account?',
    a: 'Deactivating hides your profile temporarily and signs you out; signing back in restores all your listings and chats. Deleting permanently removes your profile, settings, sessions, and authentication credentials.'
  }
];

export const HelpSupportPanel: React.FC<HelpSupportPanelProps> = ({
  user,
  focusSection,
  onShowToast
}) => {
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [reportKind, setReportKind] = useState<SupportReportRecord['kind']>('problem');
  const [category, setCategory] = useState('Technical Issue');
  const [subject, setSubject] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myReports, setMyReports] = useState<SupportReportRecord[]>([]);
  const [policyTab, setPolicyTab] = useState<'terms' | 'privacy' | 'guidelines'>('terms');

  useEffect(() => {
    if (!user?.id) {
      setMyReports([]);
      return;
    }
    return subscribeToMySupportReports(user.id, setMyReports);
  }, [user?.id]);

  const filteredFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
    );
  }, [faqSearch]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitSupportReport({
        kind: reportKind,
        reporterId: user?.id || 'guest',
        reporterName: user?.name || 'Platform Visitor',
        reporterEmail: user?.email || '',
        subject,
        category,
        targetUserName: reportKind === 'user_report' ? targetUserName : undefined,
        description,
        institutionId: user?.institutionId
      });
      setSubject('');
      setTargetUserName('');
      setDescription('');
      onShowToast('Your report has been sent securely to the Platform Admin team.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to submit report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Help Centre & Searchable FAQs */}
      <div
        className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
          focusSection === 'help-centre'
            ? 'border-[#16834A]/50 ring-1 ring-[#16834A]/20'
            : 'border-[#E2E8F0] dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#16834A]" />
              Help Centre & Frequently Asked Questions
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Quick answers for students, sellers, and accommodation agents nationwide.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search help topics..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white outline-none focus:border-[#16834A]"
            />
          </div>
        </div>

        <div className="divide-y divide-[#F1F5F9] dark:divide-slate-800">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={faq.q} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-3 text-left text-xs sm:text-sm font-bold text-[#202938] dark:text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#16834A] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#64748B] shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs leading-relaxed text-[#64748B] dark:text-slate-300">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Report a Problem / Report a User / Contact Admin */}
      <form
        onSubmit={handleSubmitReport}
        className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
          focusSection === 'report-problem'
            ? 'border-[#16834A]/50 ring-1 ring-[#16834A]/20'
            : 'border-[#E2E8F0] dark:border-slate-800'
        }`}
      >
        <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Report a Problem, User, or Contact Admin
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
              Report Type
            </label>
            <select
              value={reportKind}
              onChange={(e) => setReportKind(e.target.value as SupportReportRecord['kind'])}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white outline-none focus:border-[#16834A]"
            >
              <option value="problem">Report a Technical Problem</option>
              <option value="user_report">Report a Suspicious User / Seller</option>
              <option value="support_ticket">Contact Platform Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white outline-none focus:border-[#16834A]"
            >
              <option value="Technical Issue">Technical Issue / Bug</option>
              <option value="Scam / Fraud">Scam or Fake Listing</option>
              <option value="Harassment">Harassment or Abuse</option>
              <option value="Account Help">Account & Verification Help</option>
              <option value="University Directory">Missing University / Department</option>
            </select>
          </div>

          {reportKind === 'user_report' ? (
            <div>
              <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
                Name / Phone of User
              </label>
              <input
                type="text"
                value={targetUserName}
                onChange={(e) => setTargetUserName(e.target.value)}
                placeholder="Seller or user name"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white outline-none focus:border-[#16834A]"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
                Admin Contact Email
              </label>
              <input
                type="text"
                disabled
                value="stephenaleje61@gmail.com"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[#F1F5F9] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-400"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
            Subject
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief title of your issue or inquiry"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white outline-none focus:border-[#16834A]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
            Details
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Include details such as product title, university, or steps that caused the issue..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white outline-none focus:border-[#16834A] resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-sm font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting Report...' : 'Submit to Admin Support'}
          </button>
        </div>

        {myReports.length > 0 && (
          <div className="pt-4 border-t border-[#F1F5F9] dark:border-slate-800 space-y-2">
            <div className="text-xs font-bold text-[#202938] dark:text-slate-200">
              Your Recent Support Submissions ({myReports.length})
            </div>
            {myReports.slice(0, 4).map((rep) => (
              <div
                key={rep.id}
                className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/70 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[#202938] dark:text-white truncate">{rep.subject}</div>
                  <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                    {rep.category} • {formatTimestamp(rep.createdAt)}
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8F5EE] dark:bg-emerald-950/60 text-[#16834A]">
                  {rep.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* 3. Terms, Privacy Policy & Community Guidelines */}
      <div
        className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
          focusSection === 'terms'
            ? 'border-[#16834A]/50 ring-1 ring-[#16834A]/20'
            : 'border-[#E2E8F0] dark:border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#16834A]" />
            Terms, Privacy Policy & Community Guidelines
          </h3>
          <div className="flex gap-1.5 bg-[#F5F7FA] dark:bg-slate-800 p-1 rounded-xl">
            {(
              [
                { id: 'terms', label: 'Terms of Use' },
                { id: 'privacy', label: 'Privacy Policy' },
                { id: 'guidelines', label: 'Community Rules' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPolicyTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  policyTab === t.id
                    ? 'bg-white dark:bg-slate-900 text-[#16834A] shadow-xs'
                    : 'text-[#64748B] dark:text-slate-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {policyTab === 'terms' && (
          <div className="text-xs leading-relaxed text-[#64748B] dark:text-slate-300 space-y-2">
            <p>
              <strong>Nigeria University Market Hub</strong> connects verified students, graduates,
              lecturers, and local campus merchants across Nigerian tertiary institutions. Users are
              solely responsible for accurately representing items, hostel availability, and services.
            </p>
            <p>
              Prohibited items—including stolen property, counterfeit examination materials, illicit
              substances, or fraudulent investment schemes—are strictly banned and lead to immediate
              permanent suspension.
            </p>
          </div>
        )}
        {policyTab === 'privacy' && (
          <div className="text-xs leading-relaxed text-[#64748B] dark:text-slate-300 space-y-2">
            <p>
              Your account settings, privacy preferences, and academic records are stored privately in
              owner-scoped Cloud Firestore records. Phone numbers and email addresses are never leaked
              into public community feeds unless you explicitly enable public phone visibility.
            </p>
            <p>
              You retain full control to update your university info, hide your profile from discovery,
              sign out remote devices, or permanently delete your account at any time.
            </p>
          </div>
        )}
        {policyTab === 'guidelines' && (
          <div className="text-xs leading-relaxed text-[#64748B] dark:text-slate-300 space-y-2">
            <p>
              Treat fellow students and campus vendors with respect. Avoid spam, misleading pricing
              ("₦1" bait listings), and unsolicited bulk messaging across university groups.
            </p>
            <p>
              Always meet in safe, public campus locations during daylight hours for physical handover
              and verify accommodation properties with an inspection before making rent payments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface AdminSettingsPanelProps {
  user: User | null;
  onOpenCeoSection: (section: CeoSectionId) => void;
  onOpenAdminDashboard: () => void;
  onOpenMasterControl: () => void;
}

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = ({
  user,
  onOpenCeoSection,
  onOpenAdminDashboard,
  onOpenMasterControl
}) => {
  if (!isAuthorizedCeo(user)) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-2xl p-8 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#202938] dark:text-white">Access Denied</h3>
        <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
          Administrative platform controls are restricted exclusively to the authorized Nigeria University Market Hub Super Administrator.
        </p>
      </div>
    );
  }

  const tools: {
    title: string;
    desc: string;
    icon: React.ReactNode;
    onClick: () => void;
  }[] = [
    {
      title: 'Manage Registered Users',
      desc: 'Inspect users nationwide, filter by university, verify accounts, suspend or restore.',
      icon: <Users className="w-5 h-5 text-[#16834A]" />,
      onClick: () => onOpenCeoSection('users')
    },
    {
      title: 'University & Institution Directory',
      desc: 'Add or update federal, state, private universities, polytechnics, and colleges.',
      icon: <Building2 className="w-5 h-5 text-[#16834A]" />,
      onClick: () => onOpenCeoSection('institutions')
    },
    {
      title: 'Site-Wide Platform Settings',
      desc: 'Configure verification badges, APK app distribution links, and security controls.',
      icon: <Sliders className="w-5 h-5 text-[#16834A]" />,
      onClick: () => onOpenCeoSection('settings')
    },
    {
      title: 'Nationwide Announcements & Ads Studio',
      desc: 'Publish official campus banners and sponsored business promotions across Nigeria.',
      icon: <Megaphone className="w-5 h-5 text-[#16834A]" />,
      onClick: onOpenMasterControl
    },
    {
      title: 'Anti-Scam, Reports & Content Moderation',
      desc: 'Review flagged identifiers, scam reports, support tickets, and marketplace listings.',
      icon: <ShieldAlert className="w-5 h-5 text-[#16834A]" />,
      onClick: () => onOpenCeoSection('reports')
    },
    {
      title: 'Marketplace Moderation Console',
      desc: 'Approve listings, inspect student requests, and view order analytics.',
      icon: <Crown className="w-5 h-5 text-amber-500" />,
      onClick: onOpenAdminDashboard
    }
  ];

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-[#075B3B] to-[#16834A] rounded-2xl p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F2C94C] text-[#202938] text-[11px] font-black uppercase tracking-wide">
            <Crown className="w-3 h-3" />
            Admin Only
          </span>
          <h3 className="text-lg font-extrabold mt-2">Super Administrator Command Controls</h3>
          <p className="text-xs text-emerald-100 mt-0.5">
            Signed in as verified Super Administrator ({user?.email}).
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenCeoSection('overview')}
          className="px-4 py-2.5 rounded-xl bg-[#F2C94C] hover:bg-[#e5bc3e] text-[#202938] text-xs font-extrabold transition cursor-pointer shadow-xs"
        >
          Open Full /admin Console
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <button
            key={tool.title}
            type="button"
            onClick={tool.onClick}
            className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#16834A] rounded-2xl p-5 text-left flex items-start gap-4 transition shadow-xs cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#E8F5EE] dark:bg-emerald-950/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              {tool.icon}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#202938] dark:text-white group-hover:text-[#16834A] transition">
                {tool.title}
              </h4>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">{tool.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
