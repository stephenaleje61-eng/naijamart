import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Package,
  RotateCcw,
  Search,
  MessageCircle,
  Home,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Database,
  Sliders,
  GraduationCap,
  Plus,
  Edit3
} from 'lucide-react';
import {
  Product,
  AdminMetrics,
  ReportItem,
  AuditLogItem,
  User,
  HuxReport,
  StudentRequest,
  ServiceCategory,
  ServiceListing,
  Institution,
  InstitutionType
} from '../types.js';
import {
  fetchAdminMetrics,
  fetchAdminProducts,
  adminRemoveProduct,
  adminToggleFeatured,
  fetchAdminUsers,
  fetchAdminReports,
  adminResolveReport,
  adminModerateProduct,
  adminToggleUserSuspension,
  fetchLegacyRecoveryStatus,
  triggerLegacyRecovery
} from '../services/api.js';
import {
  getAllProductsFromFirestoreForAdmin,
  adminUpdateFirestoreProduct,
  deleteProductFromFirestore,
  subscribeToHuxReports,
  resolveHuxReport,
  subscribeToStudentRequests,
  deleteStudentRequest,
  getLegacyDbDiagnostic,
  tryRecoverLegacyDefaultDb,
  LegacyDbDiagnostic
} from '../services/firebase.js';
import { formatNaira } from './ProductCard.js';
import { ProductImage } from './ProductImage.js';
import { getProductDisplayImage, getValidProductImages } from '../utils/productImages.js';
import { CeoEventsManager } from './CeoEventsManager.js';
import { AdminAnnouncementsModerationTab } from './AdminAnnouncementsModerationTab.js';
import { AdminServicesTab } from './AdminServicesTab.js';
import { AdminEmergencyTab } from './AdminEmergencyTab.js';
import { PostServiceModal } from './PostServiceModal.js';
import {
  DEFAULT_SERVICE_CATEGORIES,
  subscribeToServiceCategories
} from '../services/servicesMarketplace.js';
import { isAuthorizedCeo } from '../services/events.js';
import { useAuth } from '../context/AuthContext.js';
import {
  subscribeToAllInstitutionsForCeo,
  ceoSaveInstitution,
  ceoToggleInstitutionStatus,
  syncVerifiedInstitutionsIfMissing
} from '../services/institutions.js';
import { INSTITUTION_TYPE_OPTIONS } from '../constants/institutions.js';

interface AdminDashboardProps {
  onClose: () => void;
  onOpenProductDetail: (product: Product) => void;
  initialTab?: AdminTab;
  onEventsChanged?: () => void;
  onOpenMasterControl?: () => void;
}

type AdminTab =
  | 'overview'
  | 'institutions'
  | 'events'
  | 'announcements'
  | 'services'
  | 'emergency'
  | 'products'
  | 'reports'
  | 'hux-reports'
  | 'requests'
  | 'users';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  onOpenProductDetail,
  initialTab = 'overview',
  onEventsChanged,
  onOpenMasterControl
}) => {
  const { user } = useAuth();
  const isCeo = isAuthorizedCeo(user);
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [huxReports, setHuxReports] = useState<HuxReport[]>([]);
  const [studentRequests, setStudentRequests] = useState<StudentRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [confirmDeleteRequestId, setConfirmDeleteRequestId] = useState<string | null>(null);
  const [rejectProductTarget, setRejectProductTarget] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [resolveReportTarget, setResolveReportTarget] = useState<{
    id: string;
    status: 'resolved' | 'dismissed';
  } | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [suspendUserTarget, setSuspendUserTarget] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [legacyDiag, setLegacyDiag] = useState<LegacyDbDiagnostic>(() => getLegacyDbDiagnostic());
  const [scanningLegacy, setScanningLegacy] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    DEFAULT_SERVICE_CATEGORIES
  );
  const [editingServiceTarget, setEditingServiceTarget] = useState<ServiceListing | null>(null);
  const [institutionsList, setInstitutionsList] = useState<Institution[]>([]);
  const [instSearch, setInstSearch] = useState('');
  const [instBusy, setInstBusy] = useState(false);
  const [instForm, setInstForm] = useState<{
    id: string;
    name: string;
    shortName: string;
    type: InstitutionType;
    state: string;
    location: string;
    campusesText: string;
    description: string;
  }>({
    id: '',
    name: '',
    shortName: '',
    type: 'Federal University',
    state: 'Taraba',
    location: '',
    campusesText: 'Main Campus',
    description: ''
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [metricRes, prodRes, repRes, userRes, fsProducts, legacyApiRes] = await Promise.allSettled([
        fetchAdminMetrics(),
        fetchAdminProducts(),
        fetchAdminReports(),
        fetchAdminUsers(),
        getAllProductsFromFirestoreForAdmin(),
        fetchLegacyRecoveryStatus()
      ]);

      if (metricRes.status === 'fulfilled') {
        setMetrics(metricRes.value.metrics);
        setAuditLogs(metricRes.value.recentAuditLogs || []);
      }

      if (legacyApiRes.status === 'fulfilled' && legacyApiRes.value?.legacyDbStatus) {
        setLegacyDiag(legacyApiRes.value.legacyDbStatus);
      } else {
        setLegacyDiag(getLegacyDbDiagnostic());
      }

      const apiProds = prodRes.status === 'fulfilled' ? prodRes.value.products || [] : [];
      const cloudProds = fsProducts.status === 'fulfilled' ? fsProducts.value || [] : [];

      const mergedMap = new Map<string, Product>();
      for (const p of cloudProds) mergedMap.set(p.id, p);
      for (const p of apiProds) mergedMap.set(p.id, p);
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setProducts(merged);

      if (repRes.status === 'fulfilled') setReports(repRes.value.reports || []);
      if (userRes.status === 'fulfilled') setUsers(userRes.value.users || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanLegacyDb = async () => {
    setScanningLegacy(true);
    setErrorMsg(null);
    try {
      const [clientDiag, serverDiag] = await Promise.allSettled([
        tryRecoverLegacyDefaultDb(),
        triggerLegacyRecovery()
      ]);
      const diag =
        clientDiag.status === 'fulfilled'
          ? clientDiag.value
          : serverDiag.status === 'fulfilled'
          ? serverDiag.value.legacyDbStatus
          : getLegacyDbDiagnostic();
      setLegacyDiag(diag);
      if (diag?.accessible) {
        flashStatus(`Legacy DB scan complete: ${diag.recoveredCount} product(s) migrated.`);
        await loadData();
      } else {
        setErrorMsg(
          'Legacy (default) Firestore database is locked by expired Firebase rules (permission-denied). Follow the Console steps below to publish read access, then click Scan again.'
        );
      }
    } finally {
      setScanningLegacy(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubHux = subscribeToHuxReports((list) => setHuxReports(list));
    const unsubReqs = subscribeToStudentRequests((list) => setStudentRequests(list));
    const unsubServiceCats = subscribeToServiceCategories((cats) => {
      if (cats.length > 0) setServiceCategories(cats);
    });
    const unsubInst = subscribeToAllInstitutionsForCeo((list) => setInstitutionsList(list));
    return () => {
      unsubHux();
      unsubReqs();
      unsubServiceCats();
      unsubInst();
    };
  }, []);

  const flashStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleConfirmRemoveProduct = async (id: string) => {
    setErrorMsg(null);
    try {
      await Promise.allSettled([adminRemoveProduct(id), deleteProductFromFirestore(id)]);
      setConfirmDeleteProductId(null);
      flashStatus('Product listing deleted permanently.');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete product.');
    }
  };

  const handleModerateProduct = async (
    id: string,
    status: 'approved' | 'rejected',
    notes?: string
  ) => {
    setErrorMsg(null);
    try {
      await Promise.allSettled([
        adminModerateProduct(id, status, notes),
        adminUpdateFirestoreProduct(id, { moderationStatus: status })
      ]);
      setRejectProductTarget(null);
      setRejectReason('');
      flashStatus(`Listing ${status}.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update moderation status.');
    }
  };

  const handleToggleFeatured = async (p: Product) => {
    setErrorMsg(null);
    try {
      await Promise.allSettled([
        adminToggleFeatured(p.id),
        adminUpdateFirestoreProduct(p.id, { isFeatured: !p.isFeatured })
      ]);
      flashStatus(p.isFeatured ? 'Removed from featured.' : 'Marked as featured.');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to toggle featured state.');
    }
  };

  const handleSubmitResolveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveReportTarget) return;
    setErrorMsg(null);
    try {
      await adminResolveReport(
        resolveReportTarget.id,
        resolveReportTarget.status,
        resolveNotes.trim()
      );
      setResolveReportTarget(null);
      setResolveNotes('');
      flashStatus(`Report marked ${resolveReportTarget.status}.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to resolve report.');
    }
  };

  const handleSubmitSuspendUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendUserTarget) return;
    setErrorMsg(null);
    try {
      await adminToggleUserSuspension(suspendUserTarget.id, suspendReason.trim() || undefined);
      setSuspendUserTarget(null);
      setSuspendReason('');
      flashStatus('User status updated.');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update user status.');
    }
  };

  const handleResolveHuxReport = async (id: string, status: 'resolved' | 'dismissed') => {
    setErrorMsg(null);
    try {
      await resolveHuxReport(id, status);
      flashStatus(`Housing report ${status}.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update housing report.');
    }
  };

  const handleConfirmDeleteRequest = async (id: string) => {
    setErrorMsg(null);
    try {
      await deleteStudentRequest(id);
      setConfirmDeleteRequestId(null);
      flashStatus('Student request removed.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete student request.');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.shopName || '').toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  const pendingProductReportsCount = reports.filter((r) => r.status === 'pending').length;
  const pendingHuxReportsCount = huxReports.filter((r) => !r.status || r.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-6xl bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col text-[#10251D]">
        {/* Admin Header */}
        <div className="bg-[#087443] text-white p-5 flex items-center justify-between shrink-0 border-b border-[#065D36]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4A62A] flex items-center justify-center font-black text-[#10251D] text-lg shadow-lg">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-[#D4A62A]">
                  NIGERIA CAMPUS MARKET Admin Desk
                </h2>
                <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-2 py-0.5 rounded-full">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-white/85">
                Real Data Moderation • Institutions, Products, Student Requests, Hostels &amp; Users
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isCeo && onOpenMasterControl && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMasterControl();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>CEO Master Control</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#065D36] hover:bg-[#D4A62A] text-white hover:text-[#10251D] flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#FFFFFF] border-b border-[#E5E7EB] px-5 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold py-2.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-[#087443] text-white'
                  : 'text-[#555555] hover:text-[#10251D] hover:bg-[#F4F8F5]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('institutions')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap inline-flex items-center gap-1 ${
                activeTab === 'institutions'
                  ? 'bg-[#087443] text-[#D4A62A] font-black'
                  : 'text-[#087443] hover:bg-[#F4F8F5]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Institutions ({institutionsList.length})</span>
            </button>
            {isCeo && (
              <>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                    activeTab === 'events'
                      ? 'bg-[#087443] text-[#D4A62A] font-black'
                      : 'text-[#087443] hover:bg-[#F4F8F5]'
                  }`}
                >
                  Birthday &amp; Events (CEO)
                </button>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                    activeTab === 'announcements'
                      ? 'bg-[#10251D] text-white'
                      : 'text-[#10251D] hover:bg-[#F4F8F5]'
                  }`}
                >
                  Sports &amp; Announcements
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'services'
                  ? 'bg-[#087443] text-[#D4A62A] font-black'
                  : 'text-[#087443] hover:bg-[#F4F8F5]'
              }`}
            >
              Services
            </button>
            {isCeo && (
              <button
                onClick={() => setActiveTab('emergency')}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'emergency'
                    ? 'bg-[#0F1E3D] text-white font-black'
                    : 'text-[#DC2626] hover:bg-[#FEF2F2]'
                }`}
              >
                Emergency &amp; Help
              </button>
            )}
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'products'
                  ? 'bg-[#087443] text-white'
                  : 'text-[#555555] hover:text-[#10251D] hover:bg-[#F4F8F5]'
              }`}
            >
              Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-[#087443] text-white'
                  : 'text-[#555555] hover:text-[#10251D] hover:bg-[#F4F8F5]'
              }`}
            >
              Product Reports ({pendingProductReportsCount})
            </button>
            <button
              onClick={() => setActiveTab('hux-reports')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'hux-reports'
                  ? 'bg-[#087443] text-white'
                  : 'text-[#555555] hover:text-[#10251D] hover:bg-[#F4F8F5]'
              }`}
            >
              Housing Reports ({pendingHuxReportsCount})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'bg-[#087443] text-white'
                  : 'text-[#555555] hover:text-[#10251D] hover:bg-[#F4F8F5]'
              }`}
            >
              Student Requests ({studentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-[#087443] text-white'
                  : 'text-[#555555] hover:text-[#10251D] hover:bg-[#F4F8F5]'
              }`}
            >
              Users ({users.length})
            </button>
          </div>

          <button
            onClick={loadData}
            className="text-xs text-[#087443] hover:underline flex items-center gap-1 font-bold shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-[#F4F8F5]">
          {errorMsg && (
            <div className="p-3 bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] text-xs rounded-xl flex items-center justify-between gap-2 font-semibold">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#10251D] shrink-0" />
                {errorMsg}
              </span>
              <button onClick={() => setErrorMsg(null)} className="text-[#10251D] hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 bg-[#087443] border border-[#065D36] text-white text-xs rounded-xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#D4A62A] shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs font-semibold text-[#555555]">
              Loading moderation workspace...
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <span className="text-[11px] font-bold text-[#555555] uppercase tracking-wider block">
                        Active Products
                      </span>
                      <span className="text-2xl font-black text-[#10251D] mt-1 block">
                        {products.filter((p) => p.status === 'active').length}
                      </span>
                      <span className="text-[10px] text-[#555555]">
                        Total recorded: {products.length}
                      </span>
                    </div>

                    <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <span className="text-[11px] font-bold text-[#555555] uppercase tracking-wider block">
                        Student Requests
                      </span>
                      <span className="text-2xl font-black text-[#087443] mt-1 block flex items-center gap-1.5">
                        <HelpCircle className="w-5 h-5" />
                        {studentRequests.length}
                      </span>
                      <span className="text-[10px] text-[#555555]">What Students Need</span>
                    </div>

                    <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <span className="text-[11px] font-bold text-[#555555] uppercase tracking-wider block">
                        Pending Reports
                      </span>
                      <span className="text-2xl font-black text-[#10251D] mt-1 block flex items-center gap-1.5">
                        <AlertTriangle className="w-5 h-5 text-[#D4A62A]" />
                        {pendingProductReportsCount + pendingHuxReportsCount}
                      </span>
                      <span className="text-[10px] text-[#555555]">
                        Products ({pendingProductReportsCount}) • Housing ({pendingHuxReportsCount})
                      </span>
                    </div>

                    <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
                      <span className="text-[11px] font-bold text-[#555555] uppercase tracking-wider block">
                        WhatsApp Leads
                      </span>
                      <span className="text-2xl font-black text-[#087443] mt-1 block flex items-center gap-1.5">
                        <MessageCircle className="w-5 h-5" />
                        {metrics?.totalWhatsAppClicks ?? 0}
                      </span>
                      <span className="text-[10px] text-[#555555]">Genuine buyer clicks</span>
                    </div>
                  </div>

                  {/* Database & Legacy Product Recovery Diagnostic */}
                  <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#087443] text-[#D4A62A] flex items-center justify-center shrink-0">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-[#10251D]">
                            Firestore Database &amp; Legacy Recovery Status
                          </h4>
                          <p className="text-[11px] text-[#555555]">
                            Active DB: <span className="font-mono text-[#087443]">ai-studio-naijamartnigeria-7994e8d8...</span> ({products.length} products)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleScanLegacyDb}
                        disabled={scanningLegacy}
                        className="px-4 py-2 bg-[#087443] hover:bg-[#065D36] disabled:opacity-60 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 text-[#D4A62A] ${scanningLegacy ? 'animate-spin' : ''}`} />
                        <span>{scanningLegacy ? 'Scanning...' : 'Scan & Migrate Legacy Products'}</span>
                      </button>
                    </div>

                    {legacyDiag.hasLegacyDb && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          legacyDiag.accessible
                            ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#065D36]'
                            : 'bg-[#FFF8DB] border-[#D4A62A] text-[#10251D]'
                        }`}
                      >
                        {legacyDiag.accessible ? (
                          <p className="font-bold">
                            Legacy <code className="font-mono">(default)</code> DB accessible — {legacyDiag.legacyProductsCount} item(s) scanned, {legacyDiag.recoveredCount} newly migrated to active DB.
                          </p>
                        ) : (
                          <>
                            <p className="font-black">
                              Legacy <code className="font-mono">(default)</code> Firestore database returned <span className="underline">{legacyDiag.errorCode || 'permission-denied'}</span>.
                            </p>
                            <p className="text-[11px] leading-relaxed">
                              If you posted older products in the original <code className="font-mono">(default)</code> database of project <code className="font-mono">zangamarket1</code>, open{' '}
                              <strong>Firebase Console → Firestore Database → select (default) → Rules</strong> and allow read access on <code className="font-mono">products</code>,{' '}
                              <code className="font-mono">users</code>, and <code className="font-mono">sellerProfiles</code>, then click <strong>Scan &amp; Migrate Legacy Products</strong> above to automatically copy them into your active database.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recent Audit Logs */}
                  <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                    <h4 className="font-black text-sm text-[#10251D] mb-3">Recent Moderation Logs</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
                      {auditLogs.length === 0 ? (
                        <div className="text-[#555555] text-xs py-4 text-center">No logs recorded yet.</div>
                      ) : (
                        auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-2.5 bg-[#F4F8F5] rounded-xl border border-[#E5E7EB] flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between text-[11px] text-[#555555]">
                              <span className="font-bold text-[#087443]">{log.action}</span>
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-[#10251D]">{log.details}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRODUCT MODERATION */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-[#555555] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search product title, seller, or location..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#E5E7EB] text-[#10251D] rounded-xl outline-none focus:border-[#087443]"
                      />
                    </div>
                    <span className="text-xs text-[#555555] font-semibold">
                      Showing {filteredProducts.length} listings
                    </span>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F4F8F5] text-[#555555] uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
                          <tr>
                            <th className="p-3">Product</th>
                            <th className="p-3">Seller / Shop</th>
                            <th className="p-3">Price &amp; Status</th>
                            <th className="p-3">Created</th>
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {filteredProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-[#F4F8F5]/70 transition">
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => onOpenProductDetail(p)}
                                  className="flex items-center gap-2.5 text-left"
                                >
                                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#E5E7EB] shrink-0 bg-[#F4F8F5]">
                                    <ProductImage
                                      src={getProductDisplayImage(p.images, p.imageUrl)}
                                      fallbackSrcs={getValidProductImages(p.images, p.imageUrl)}
                                      alt=""
                                      category={p.categoryId}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#10251D] hover:text-[#087443] line-clamp-1 max-w-xs">
                                      {p.title}
                                    </p>
                                    <span className="text-[10px] text-[#555555] capitalize">
                                      {p.categoryId} • {p.condition}
                                    </span>
                                  </div>
                                </button>
                              </td>
                              <td className="p-3 text-[#555555]">
                                <span className="font-bold text-[#10251D] block">{p.shopName}</span>
                                <span className="text-[10px] font-mono">{p.whatsappNumber || 'N/A'}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-black bg-[#087443] text-[#D4A62A] px-2 py-0.5 rounded-md text-[11px]">
                                  {formatNaira(p.price)}
                                </span>
                                {p.moderationStatus && (
                                  <div className="mt-1">
                                    <span
                                      className={`inline-flex items-center text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                        p.moderationStatus === 'approved'
                                          ? 'bg-[#087443]/10 text-[#087443] border border-[#087443]/30'
                                          : p.moderationStatus === 'rejected'
                                          ? 'bg-[#10251D] text-[#D4A62A] border border-[#10251D]'
                                          : 'bg-[#FFF8DB] text-[#10251D] border border-[#D4A62A]'
                                      }`}
                                    >
                                      {p.moderationStatus.toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-[#555555]">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleModerateProduct(p.id, 'approved')}
                                      className="px-2 py-1 bg-[#087443] hover:bg-[#065D36] text-white rounded text-[10px] font-bold transition"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejectProductTarget(p);
                                        setRejectReason('');
                                      }}
                                      className="px-2 py-1 bg-[#F4F8F5] hover:bg-[#10251D] hover:text-[#D4A62A] border border-[#E5E7EB] text-[#10251D] rounded text-[10px] font-bold transition"
                                    >
                                      Reject
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleToggleFeatured(p)}
                                      className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                                        p.isFeatured
                                          ? 'bg-[#D4A62A] text-[#10251D] font-black'
                                          : 'bg-[#FFFFFF] border border-[#E5E7EB] text-[#555555] hover:text-[#10251D]'
                                      }`}
                                    >
                                      {p.isFeatured ? 'Featured ★' : 'Feature'}
                                    </button>

                                    {confirmDeleteProductId === p.id ? (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleConfirmRemoveProduct(p.id)}
                                          className="px-2 py-1 bg-[#10251D] text-[#D4A62A] rounded text-[10px] font-bold"
                                        >
                                          Confirm
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteProductId(null)}
                                          className="px-2 py-1 bg-[#FFFFFF] border border-[#E5E7EB] text-[#555555] rounded text-[10px]"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmDeleteProductId(p.id)}
                                        className="p-1 text-[#555555] hover:text-[#10251D] rounded"
                                        title="Permanently Delete Listing"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PRODUCT REPORTS */}
              {activeTab === 'reports' && (
                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <div className="bg-[#FFFFFF] p-8 rounded-2xl text-center text-xs text-[#555555] border border-[#E5E7EB]">
                      <Package className="w-8 h-8 text-[#087443] mx-auto mb-2" />
                      No product reports submitted yet.
                    </div>
                  ) : (
                    reports.map((rep) => (
                      <div
                        key={rep.id}
                        className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                              {rep.reason}
                            </span>
                            <span className="text-xs text-[#555555]">Reported by: {rep.reporterEmail}</span>
                            <span className="text-[11px] text-[#555555]">
                              • {new Date(rep.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#10251D] mt-1">
                            Product: {rep.productTitle || rep.productId || 'Unknown listing'}
                          </h4>
                          <p className="text-xs text-[#555555] mt-1 bg-[#F4F8F5] p-2.5 rounded-xl border border-[#E5E7EB]">
                            &ldquo;{rep.details}&rdquo;
                          </p>
                          {rep.adminNotes && (
                            <p className="text-[11px] text-[#087443] mt-1 font-semibold">
                              Admin resolution: {rep.adminNotes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {rep.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => {
                                  setResolveReportTarget({ id: rep.id, status: 'resolved' });
                                  setResolveNotes('');
                                }}
                                className="px-3 py-1.5 bg-[#087443] hover:bg-[#065D36] text-white font-bold text-xs rounded-xl"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => {
                                  setResolveReportTarget({ id: rep.id, status: 'dismissed' });
                                  setResolveNotes('');
                                }}
                                className="px-3 py-1.5 bg-[#F4F8F5] border border-[#E5E7EB] text-[#10251D] font-bold text-xs rounded-xl"
                              >
                                Dismiss
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-[#555555] uppercase px-2.5 py-1 bg-[#F4F8F5] border border-[#E5E7EB] rounded-lg">
                              {rep.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: HOUSING SCAM REPORTS */}
              {activeTab === 'hux-reports' && (
                <div className="space-y-3">
                  {huxReports.length === 0 ? (
                    <div className="bg-[#FFFFFF] p-8 rounded-2xl text-center text-xs text-[#555555] border border-[#E5E7EB]">
                      <Home className="w-8 h-8 text-[#087443] mx-auto mb-2" />
                      No Wukari Agent accommodation scam reports yet.
                    </div>
                  ) : (
                    huxReports.map((rep) => (
                      <div
                        key={rep.id}
                        className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-[#FFF8DB] border border-[#D4A62A] text-[#10251D] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                              {rep.reason}
                            </span>
                            <span className="text-xs text-[#555555]">
                              Reporter: {rep.reporterName || 'Student'}{' '}
                              {rep.reporterContact ? `(${rep.reporterContact})` : ''}
                            </span>
                            <span className="text-[11px] text-[#555555]">
                              • {new Date(rep.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#10251D] mt-1">
                            Listing: {rep.huxTitle || rep.huxId}
                          </h4>
                          <p className="text-xs text-[#555555] mt-1 bg-[#F4F8F5] p-2.5 rounded-xl border border-[#E5E7EB]">
                            &ldquo;{rep.details}&rdquo;
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!rep.status || rep.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleResolveHuxReport(rep.id, 'resolved')}
                                className="px-3 py-1.5 bg-[#087443] hover:bg-[#065D36] text-white font-bold text-xs rounded-xl"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => handleResolveHuxReport(rep.id, 'dismissed')}
                                className="px-3 py-1.5 bg-[#F4F8F5] border border-[#E5E7EB] text-[#10251D] font-bold text-xs rounded-xl"
                              >
                                Dismiss
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-[#555555] uppercase px-2.5 py-1 bg-[#F4F8F5] border border-[#E5E7EB] rounded-lg">
                              {rep.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: STUDENT REQUESTS */}
              {activeTab === 'requests' && (
                <div className="space-y-3">
                  {studentRequests.length === 0 ? (
                    <div className="bg-[#FFFFFF] p-8 rounded-2xl text-center text-xs text-[#555555] border border-[#E5E7EB]">
                      No student requests posted yet.
                    </div>
                  ) : (
                    studentRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E7EB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                req.status === 'fulfilled'
                                  ? 'bg-[#087443] text-white'
                                  : 'bg-[#D4A62A] text-[#10251D]'
                              }`}
                            >
                              {req.status}
                            </span>
                            <span className="text-xs font-black text-[#087443]">
                              Budget: {formatNaira(req.budget)}
                            </span>
                            <span className="text-xs text-[#555555]">• {req.location}</span>
                          </div>
                          <h4 className="font-bold text-sm text-[#10251D] mt-1">{req.title}</h4>
                          <p className="text-xs text-[#555555] mt-0.5 line-clamp-2">{req.description}</p>
                          <p className="text-[11px] text-[#555555] mt-1">
                            Posted by: <strong className="text-[#10251D]">{req.userName}</strong> ({req.phone})
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {confirmDeleteRequestId === req.id ? (
                            <>
                              <button
                                onClick={() => handleConfirmDeleteRequest(req.id)}
                                className="px-3 py-1.5 bg-[#10251D] text-[#D4A62A] text-xs font-bold rounded-xl"
                              >
                                Confirm Delete
                              </button>
                              <button
                                onClick={() => setConfirmDeleteRequestId(null)}
                                className="px-2.5 py-1.5 bg-[#F4F8F5] border border-[#E5E7EB] text-[#555555] text-xs rounded-xl"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteRequestId(req.id)}
                              className="p-2 text-[#555555] hover:text-[#10251D] bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl"
                              title="Remove Student Request"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 6: USERS & SELLERS */}
              {activeTab === 'users' && (
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F4F8F5] text-[#555555] uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
                        <tr>
                          <th className="p-3">User / Merchant</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Location</th>
                          <th className="p-3">WhatsApp / Phone</th>
                          <th className="p-3">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-[#F4F8F5]/70">
                            <td className="p-3">
                              <span className="font-bold text-[#10251D] block">{u.name}</span>
                              <span className="text-[10px] text-[#555555]">{u.email}</span>
                            </td>
                            <td className="p-3">
                              <span className="capitalize font-semibold text-[#555555]">{u.role}</span>
                            </td>
                            <td className="p-3 text-[#555555]">
                              {u.city || 'Wukari'}, {u.state || 'Taraba'}
                            </td>
                            <td className="p-3 font-mono text-[#10251D]">
                              {u.whatsappNumber || u.phone || 'N/A'}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1.5">
                                {u.isSuspended && (
                                  <span className="text-[10px] font-black text-[#D4A62A] bg-[#10251D] px-2 py-0.5 rounded-full self-start">
                                    SUSPENDED
                                  </span>
                                )}
                                <div className="flex items-center gap-2">
                                  {u.role === 'seller' && (
                                    <span className="px-2.5 py-1 text-[10px] font-bold bg-[#F4F8F5] border border-[#E5E7EB] text-[#555555] rounded-xl flex items-center gap-1">
                                      <ShieldCheck className="w-3.5 h-3.5 text-[#087443]" />
                                      {(u.ceoVerified || u.isVerified) ? 'Verified (CEO)' : 'CEO Verification Only'}
                                    </span>
                                  )}
                                  {u.role !== 'admin' && (
                                    <button
                                      onClick={() => {
                                        if (u.isSuspended) {
                                          adminToggleUserSuspension(u.id)
                                            .then(loadData)
                                            .catch((e) => setErrorMsg(e.message));
                                        } else {
                                          setSuspendUserTarget(u);
                                          setSuspendReason('');
                                        }
                                      }}
                                      className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition ${
                                        u.isSuspended
                                          ? 'bg-[#087443] text-white'
                                          : 'bg-[#10251D] text-[#D4A62A] hover:bg-black'
                                      }`}
                                    >
                                      {u.isSuspended ? 'Lift Suspension' : 'Suspend Account'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: CEO BIRTHDAY & EVENTS PUBLISHING */}
              {activeTab === 'events' && isCeo && (
                <CeoEventsManager embedded onEventsChanged={onEventsChanged} />
              )}

              {/* TAB 8: SPORTS & ANNOUNCEMENTS MODERATION */}
              {activeTab === 'announcements' && isCeo && (
                <AdminAnnouncementsModerationTab
                  onStatus={flashStatus}
                  onError={setErrorMsg}
                />
              )}

              {/* TAB 9: STUDENT SERVICES MARKETPLACE MODERATION */}
              {activeTab === 'services' && (
                <AdminServicesTab
                  onEditService={(svc) => setEditingServiceTarget(svc)}
                  onStatusMessage={flashStatus}
                  onErrorMessage={setErrorMsg}
                />
              )}

              {/* TAB 10: CAMPUS EMERGENCY & HELP CENTRE */}
              {activeTab === 'emergency' && isCeo && (
                <AdminEmergencyTab
                  onStatusMessage={flashStatus}
                  onErrorMessage={setErrorMsg}
                />
              )}

              {/* TAB 11: NATIONAL UNIVERSITY & POLYTECHNIC MANAGEMENT */}
              {activeTab === 'institutions' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-[#D9E5DF] p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-[#10251D]">
                          Manage Nigerian Universities &amp; Polytechnics ({institutionsList.length})
                        </h3>
                        <p className="text-xs text-[#555555]">
                          Add new institutions, edit details or campuses, and activate or deactivate campus marketplaces without editing source code.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={instBusy}
                        onClick={async () => {
                          setInstBusy(true);
                          setErrorMsg(null);
                          try {
                            const res = await syncVerifiedInstitutionsIfMissing();
                            flashStatus(`Synced verified directory (${res.added} added).`);
                          } catch (err: any) {
                            setErrorMsg(err?.message || 'Unable to sync verified institutions.');
                          } finally {
                            setInstBusy(false);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#10251D] hover:bg-black text-[#D4A62A] text-xs font-black cursor-pointer"
                      >
                        {instBusy ? 'Syncing...' : 'Sync Verified Directory'}
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setInstBusy(true);
                        setErrorMsg(null);
                        try {
                          const campuses = instForm.campusesText
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          await ceoSaveInstitution({
                            id: instForm.id.trim() || undefined,
                            name: instForm.name,
                            shortName: instForm.shortName,
                            type: instForm.type,
                            state: instForm.state,
                            location: instForm.location,
                            campuses,
                            campus: campuses[0] || 'Main Campus',
                            description: instForm.description
                          });
                          flashStatus(`Institution "${instForm.shortName}" saved.`);
                          setInstForm({
                            id: '',
                            name: '',
                            shortName: '',
                            type: 'Federal University',
                            state: 'Taraba',
                            location: '',
                            campusesText: 'Main Campus',
                            description: ''
                          });
                        } catch (err: any) {
                          setErrorMsg(err?.message || 'Failed to save institution.');
                        } finally {
                          setInstBusy(false);
                        }
                      }}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl bg-[#F4F8F5] border border-[#D9E5DF] text-xs"
                    >
                      <input
                        type="text"
                        required
                        value={instForm.name}
                        onChange={(e) => setInstForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Full Institution Name *"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="text"
                        required
                        value={instForm.shortName}
                        onChange={(e) => setInstForm((p) => ({ ...p, shortName: e.target.value }))}
                        placeholder="Acronym (e.g. UNILAG, FUWUKARI) *"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <select
                        value={instForm.type}
                        onChange={(e) =>
                          setInstForm((p) => ({ ...p, type: e.target.value as InstitutionType }))
                        }
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      >
                        {INSTITUTION_TYPE_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        value={instForm.state}
                        onChange={(e) => setInstForm((p) => ({ ...p, state: e.target.value }))}
                        placeholder="State (e.g. Lagos) *"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="text"
                        required
                        value={instForm.location}
                        onChange={(e) => setInstForm((p) => ({ ...p, location: e.target.value }))}
                        placeholder="City / Town *"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="text"
                        value={instForm.campusesText}
                        onChange={(e) =>
                          setInstForm((p) => ({ ...p, campusesText: e.target.value }))
                        }
                        placeholder="Campuses (comma-separated)"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="text"
                        value={instForm.description}
                        onChange={(e) =>
                          setInstForm((p) => ({ ...p, description: e.target.value }))
                        }
                        placeholder="Short campus description (optional)"
                        className="sm:col-span-2 px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        {instForm.id && (
                          <button
                            type="button"
                            onClick={() =>
                              setInstForm({
                                id: '',
                                name: '',
                                shortName: '',
                                type: 'Federal University',
                                state: 'Taraba',
                                location: '',
                                campusesText: 'Main Campus',
                                description: ''
                              })
                            }
                            className="px-3 py-2 rounded-xl border border-gray-300 bg-white font-bold"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={instBusy}
                          className="px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-[#D4A62A]" />
                          <span>{instForm.id ? 'Update Institution' : 'Add Institution'}</span>
                        </button>
                      </div>
                    </form>

                    <div className="relative">
                      <Search className="w-4 h-4 text-[#087443] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={instSearch}
                        onChange={(e) => setInstSearch(e.target.value)}
                        placeholder="Search institutions by name, acronym, or state..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F4F8F5] border border-[#D9E5DF] text-xs outline-none focus:border-[#087443]"
                      />
                    </div>

                    <div className="divide-y divide-[#E5E7EB] max-h-96 overflow-y-auto">
                      {institutionsList
                        .filter((inst) => {
                          const q = instSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            inst.name.toLowerCase().includes(q) ||
                            inst.shortName.toLowerCase().includes(q) ||
                            inst.state.toLowerCase().includes(q)
                          );
                        })
                        .map((inst) => (
                          <div
                            key={inst.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-[#10251D]">{inst.name}</span>
                                <span className="px-2 py-0.5 rounded bg-[#10251D] text-[#D4A62A] text-[10px] font-black">
                                  {inst.shortName}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    inst.status === 'inactive'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-emerald-100 text-[#087443]'
                                  }`}
                                >
                                  {inst.status || 'active'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#555555]">
                                {inst.type} · {inst.location}, {inst.state} State · Campuses:{' '}
                                {inst.campuses.join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setInstForm({
                                    id: inst.id,
                                    name: inst.name,
                                    shortName: inst.shortName,
                                    type: inst.type,
                                    state: inst.state,
                                    location: inst.location,
                                    campusesText: inst.campuses.join(', '),
                                    description: inst.description || ''
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-[#087443] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#087443]" />
                                <span>Edit</span>
                              </button>
                              {!inst.isDefault && (
                                <button
                                  type="button"
                                  disabled={instBusy}
                                  onClick={async () => {
                                    setInstBusy(true);
                                    setErrorMsg(null);
                                    try {
                                      const nextStatus =
                                        inst.status === 'inactive' ? 'active' : 'inactive';
                                      await ceoToggleInstitutionStatus(inst.id, nextStatus);
                                      flashStatus(`${inst.shortName} marked ${nextStatus}.`);
                                    } catch (err: any) {
                                      setErrorMsg(err?.message || 'Unable to update institution status.');
                                    } finally {
                                      setInstBusy(false);
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] cursor-pointer ${
                                    inst.status === 'inactive'
                                      ? 'bg-[#087443] text-white'
                                      : 'bg-[#10251D] text-[#D4A62A]'
                                  }`}
                                >
                                  {inst.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Inline Reject Reason Modal */}
        {rejectProductTarget && (
          <div className="absolute inset-0 bg-black/60 z-30 p-4 flex items-center justify-center">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!rejectReason.trim()) return;
                handleModerateProduct(rejectProductTarget.id, 'rejected', rejectReason.trim());
              }}
              className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 space-y-3 shadow-2xl"
            >
              <h4 className="font-black text-[#10251D] text-sm">Reject Listing: {rejectProductTarget.title}</h4>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejecting listing..."
                className="w-full p-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs text-[#10251D] outline-none focus:border-[#087443]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectProductTarget(null)}
                  className="px-3 py-1.5 text-xs text-[#555555] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#10251D] text-[#D4A62A] font-black text-xs rounded-xl"
                >
                  Reject Listing
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Inline Resolve Report Modal */}
        {resolveReportTarget && (
          <div className="absolute inset-0 bg-black/60 z-30 p-4 flex items-center justify-center">
            <form
              onSubmit={handleSubmitResolveReport}
              className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 space-y-3 shadow-2xl"
            >
              <h4 className="font-black text-[#10251D] text-sm capitalize">
                Mark Report as {resolveReportTarget.status}
              </h4>
              <textarea
                rows={3}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Optional admin resolution notes..."
                className="w-full p-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs text-[#10251D] outline-none focus:border-[#087443]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolveReportTarget(null)}
                  className="px-3 py-1.5 text-xs text-[#555555] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#087443] text-white font-black text-xs rounded-xl"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Inline Suspend User Modal */}
        {suspendUserTarget && (
          <div className="absolute inset-0 bg-black/60 z-30 p-4 flex items-center justify-center">
            <form
              onSubmit={handleSubmitSuspendUser}
              className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 space-y-3 shadow-2xl"
            >
              <h4 className="font-black text-[#10251D] text-sm">Suspend User: {suspendUserTarget.name}</h4>
              <textarea
                required
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason for account suspension..."
                className="w-full p-2.5 bg-[#F4F8F5] border border-[#E5E7EB] rounded-xl text-xs text-[#10251D] outline-none focus:border-[#087443]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSuspendUserTarget(null)}
                  className="px-3 py-1.5 text-xs text-[#555555] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#10251D] text-[#D4A62A] font-black text-xs rounded-xl"
                >
                  Suspend User
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {editingServiceTarget && (
        <PostServiceModal
          categories={serviceCategories}
          editingService={editingServiceTarget}
          onClose={() => setEditingServiceTarget(null)}
          onSuccess={() => {
            setEditingServiceTarget(null);
            flashStatus('Service listing updated.');
          }}
        />
      )}
    </div>
  );
};
