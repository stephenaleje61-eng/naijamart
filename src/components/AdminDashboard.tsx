import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Users,
  Package,
  RotateCcw,
  Search,
  MessageCircle,
  Home,
  HelpCircle,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import {
  Product,
  AdminMetrics,
  ReportItem,
  AuditLogItem,
  User,
  HuxReport,
  StudentRequest
} from '../types.js';
import {
  fetchAdminMetrics,
  fetchAdminProducts,
  adminRemoveProduct,
  adminToggleFeatured,
  fetchAdminUsers,
  adminToggleSellerVerification,
  fetchAdminReports,
  adminResolveReport,
  adminModerateProduct,
  adminToggleUserSuspension
} from '../services/api.js';
import {
  getAllProductsFromFirestoreForAdmin,
  adminUpdateFirestoreProduct,
  deleteProductFromFirestore,
  subscribeToHuxReports,
  resolveHuxReport,
  subscribeToStudentRequests,
  deleteStudentRequest
} from '../services/firebase.js';
import { formatNaira } from './ProductCard.js';
import { ProductImage } from './ProductImage.js';
import { getProductDisplayImage, getValidProductImages } from '../utils/productImages.js';

interface AdminDashboardProps {
  onClose: () => void;
  onOpenProductDetail: (product: Product) => void;
}

type AdminTab = 'overview' | 'products' | 'reports' | 'hux-reports' | 'requests' | 'users';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  onOpenProductDetail
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
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

  // Inline confirmation & reason modals (replaces window.confirm/prompt/alert)
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

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [metricRes, prodRes, repRes, userRes, fsProducts] = await Promise.allSettled([
        fetchAdminMetrics(),
        fetchAdminProducts(),
        fetchAdminReports(),
        fetchAdminUsers(),
        getAllProductsFromFirestoreForAdmin()
      ]);

      if (metricRes.status === 'fulfilled') {
        setMetrics(metricRes.value.metrics);
        setAuditLogs(metricRes.value.recentAuditLogs || []);
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

  useEffect(() => {
    loadData();
    const unsubHux = subscribeToHuxReports((list) => setHuxReports(list));
    const unsubReqs = subscribeToStudentRequests((list) => setStudentRequests(list));
    return () => {
      unsubHux();
      unsubReqs();
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

  const handleToggleVerifySeller = async (userId: string) => {
    setErrorMsg(null);
    try {
      await adminToggleSellerVerification(userId);
      flashStatus('Seller verification updated.');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update seller verification.');
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-6xl bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Admin Header */}
        <div className="bg-[#1C1C1C] text-white p-5 flex items-center justify-between shrink-0 border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] flex items-center justify-center font-black text-black text-lg shadow-lg">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  FU MARKET Moderation Desk
                </h2>
                <span className="bg-[#FFFFFF]/15 text-[#FFFFFF] border border-[#FFFFFF]/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-[#BDBDBD]">
                Real Data Moderation • Products, Student Requests, Wukari Agent Reports &amp; Users
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-[#BDBDBD] hover:text-white" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#1C1C1C] border-b border-[#333333] px-5 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold py-2.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-[#FFFFFF] text-black'
                  : 'text-[#BDBDBD] hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'products'
                  ? 'bg-[#FFFFFF] text-black'
                  : 'text-[#BDBDBD] hover:text-white'
              }`}
            >
              Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-[#FFFFFF] text-black'
                  : 'text-[#BDBDBD] hover:text-white'
              }`}
            >
              Product Reports ({pendingProductReportsCount})
            </button>
            <button
              onClick={() => setActiveTab('hux-reports')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'hux-reports'
                  ? 'bg-[#FFFFFF] text-black'
                  : 'text-[#BDBDBD] hover:text-white'
              }`}
            >
              Housing Reports ({pendingHuxReportsCount})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'bg-[#FFFFFF] text-black'
                  : 'text-[#BDBDBD] hover:text-white'
              }`}
            >
              Student Requests ({studentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-[#FFFFFF] text-black'
                  : 'text-[#BDBDBD] hover:text-white'
              }`}
            >
              Users ({users.length})
            </button>
          </div>

          <button
            onClick={loadData}
            className="text-xs text-[#BDBDBD] hover:text-[#FFFFFF] flex items-center gap-1 font-semibold shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                {errorMsg}
              </span>
              <button onClick={() => setErrorMsg(null)} className="text-red-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-[#BDBDBD]">Loading moderation workspace...</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#1C1C1C] p-4 rounded-2xl border border-[#333333]">
                      <span className="text-[11px] font-bold text-[#BDBDBD] uppercase tracking-wider block">
                        Active Products
                      </span>
                      <span className="text-2xl font-black text-white mt-1 block">
                        {products.filter((p) => p.status === 'active').length}
                      </span>
                      <span className="text-[10px] text-[#BDBDBD]">
                        Total recorded: {products.length}
                      </span>
                    </div>

                    <div className="bg-[#1C1C1C] p-4 rounded-2xl border border-[#333333]">
                      <span className="text-[11px] font-bold text-[#BDBDBD] uppercase tracking-wider block">
                        Student Requests
                      </span>
                      <span className="text-2xl font-black text-[#FFFFFF] mt-1 block flex items-center gap-1.5">
                        <HelpCircle className="w-5 h-5" />
                        {studentRequests.length}
                      </span>
                      <span className="text-[10px] text-[#BDBDBD]">What Students Need</span>
                    </div>

                    <div className="bg-[#1C1C1C] p-4 rounded-2xl border border-[#333333]">
                      <span className="text-[11px] font-bold text-[#BDBDBD] uppercase tracking-wider block">
                        Pending Reports
                      </span>
                      <span className="text-2xl font-black text-red-400 mt-1 block flex items-center gap-1.5">
                        <AlertTriangle className="w-5 h-5" />
                        {pendingProductReportsCount + pendingHuxReportsCount}
                      </span>
                      <span className="text-[10px] text-[#BDBDBD]">
                        Products ({pendingProductReportsCount}) • Housing ({pendingHuxReportsCount})
                      </span>
                    </div>

                    <div className="bg-[#1C1C1C] p-4 rounded-2xl border border-[#333333]">
                      <span className="text-[11px] font-bold text-[#BDBDBD] uppercase tracking-wider block">
                        WhatsApp Leads
                      </span>
                      <span className="text-2xl font-black text-[#25D366] mt-1 block flex items-center gap-1.5">
                        <MessageCircle className="w-5 h-5" />
                        {metrics?.totalWhatsAppClicks ?? 0}
                      </span>
                      <span className="text-[10px] text-[#BDBDBD]">Genuine buyer clicks</span>
                    </div>
                  </div>

                  {/* Recent Audit Logs */}
                  <div className="bg-[#1C1C1C] p-5 rounded-2xl border border-[#333333]">
                    <h4 className="font-bold text-sm text-white mb-3">Recent Moderation Logs</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
                      {auditLogs.length === 0 ? (
                        <div className="text-[#BDBDBD] text-xs py-4 text-center">No logs recorded yet.</div>
                      ) : (
                        auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-2.5 bg-[#121212] rounded-xl border border-[#333333] flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between text-[11px] text-[#BDBDBD]">
                              <span className="font-bold text-[#FFFFFF]">{log.action}</span>
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-white/90">{log.details}</p>
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
                      <Search className="w-4 h-4 text-[#BDBDBD] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search product title, seller, or city..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#1C1C1C] border border-[#333333] text-white rounded-xl outline-none focus:border-[#FFFFFF]"
                      />
                    </div>
                    <span className="text-xs text-[#BDBDBD] font-medium">
                      Showing {filteredProducts.length} listings
                    </span>
                  </div>

                  <div className="bg-[#1C1C1C] rounded-2xl border border-[#333333] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#121212] text-[#BDBDBD] uppercase text-[10px] tracking-wider border-b border-[#333333]">
                          <tr>
                            <th className="p-3">Product</th>
                            <th className="p-3">Seller / Shop</th>
                            <th className="p-3">Price &amp; Status</th>
                            <th className="p-3">Created</th>
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333333]">
                          {filteredProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-[#121212]/60 transition">
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => onOpenProductDetail(p)}
                                  className="flex items-center gap-2.5 text-left"
                                >
                                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#333333] shrink-0 bg-[#121212]">
                                    <ProductImage
                                      src={getProductDisplayImage(p.images, p.imageUrl)}
                                      fallbackSrcs={getValidProductImages(p.images, p.imageUrl)}
                                      alt=""
                                      category={p.categoryId}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-bold text-white hover:text-[#FFFFFF] line-clamp-1 max-w-xs">
                                      {p.title}
                                    </p>
                                    <span className="text-[10px] text-[#BDBDBD] capitalize">
                                      {p.categoryId} • {p.condition}
                                    </span>
                                  </div>
                                </button>
                              </td>
                              <td className="p-3 text-[#BDBDBD]">
                                <span className="font-bold text-white block">{p.shopName}</span>
                                <span className="text-[10px] font-mono">{p.whatsappNumber || 'N/A'}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-[#FFFFFF]">{formatNaira(p.price)}</span>
                                {p.moderationStatus && (
                                  <div className="mt-1">
                                    <span
                                      className={`inline-flex items-center text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                        p.moderationStatus === 'approved'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                          : p.moderationStatus === 'rejected'
                                          ? 'bg-red-950 text-red-300 border border-red-700'
                                          : 'bg-white/10 text-white border border-white/40'
                                      }`}
                                    >
                                      {p.moderationStatus.toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-[#BDBDBD]">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleModerateProduct(p.id, 'approved')}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejectProductTarget(p);
                                        setRejectReason('');
                                      }}
                                      className="px-2 py-1 bg-[#333333] hover:bg-[#444444] border border-white/30 text-white rounded text-[10px] font-bold transition"
                                    >
                                      Reject
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleToggleFeatured(p)}
                                      className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                                        p.isFeatured
                                          ? 'bg-[#FFFFFF] text-black'
                                          : 'bg-[#121212] border border-[#333333] text-[#BDBDBD] hover:text-white'
                                      }`}
                                    >
                                      {p.isFeatured ? 'Featured ★' : 'Feature'}
                                    </button>

                                    {confirmDeleteProductId === p.id ? (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleConfirmRemoveProduct(p.id)}
                                          className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold"
                                        >
                                          Confirm
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteProductId(null)}
                                          className="px-2 py-1 bg-[#121212] border border-[#333333] text-[#BDBDBD] rounded text-[10px]"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmDeleteProductId(p.id)}
                                        className="p-1 text-red-400 hover:text-red-300 rounded"
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
                    <div className="bg-[#1C1C1C] p-8 rounded-2xl text-center text-xs text-[#BDBDBD] border border-[#333333]">
                      No product reports submitted yet.
                    </div>
                  ) : (
                    reports.map((rep) => (
                      <div
                        key={rep.id}
                        className="bg-[#1C1C1C] p-4 rounded-2xl border border-[#333333] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-red-950 border border-red-800 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {rep.reason}
                            </span>
                            <span className="text-xs text-[#BDBDBD]">Reported by: {rep.reporterEmail}</span>
                            <span className="text-[11px] text-[#BDBDBD]">
                              • {new Date(rep.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-1">
                            Product: {rep.productTitle || rep.productId || 'Unknown listing'}
                          </h4>
                          <p className="text-xs text-[#BDBDBD] mt-1 bg-[#121212] p-2.5 rounded-xl border border-[#333333]">
                            &ldquo;{rep.details}&rdquo;
                          </p>
                          {rep.adminNotes && (
                            <p className="text-[11px] text-[#FFFFFF] mt-1 font-semibold">
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
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => {
                                  setResolveReportTarget({ id: rep.id, status: 'dismissed' });
                                  setResolveNotes('');
                                }}
                                className="px-3 py-1.5 bg-[#121212] border border-[#333333] text-[#BDBDBD] hover:text-white font-bold text-xs rounded-xl"
                              >
                                Dismiss
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-[#BDBDBD] uppercase px-2.5 py-1 bg-[#121212] border border-[#333333] rounded-lg">
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
                    <div className="bg-[#1C1C1C] p-8 rounded-2xl text-center text-xs text-[#BDBDBD] border border-[#333333]">
                      <Home className="w-8 h-8 text-[#333333] mx-auto mb-2" />
                      No Wukari Agent accommodation scam reports yet.
                    </div>
                  ) : (
                    huxReports.map((rep) => (
                      <div
                        key={rep.id}
                        className="bg-[#1C1C1C] p-4 rounded-2xl border border-[#333333] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-red-950 border border-red-800 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {rep.reason}
                            </span>
                            <span className="text-xs text-[#BDBDBD]">
                              Reporter: {rep.reporterName || 'Student'}{' '}
                              {rep.reporterContact ? `(${rep.reporterContact})` : ''}
                            </span>
                            <span className="text-[11px] text-[#BDBDBD]">
                              • {new Date(rep.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-1">
                            Listing: {rep.huxTitle || rep.huxId}
                          </h4>
                          <p className="text-xs text-[#BDBDBD] mt-1 bg-[#121212] p-2.5 rounded-xl border border-[#333333]">
                            &ldquo;{rep.details}&rdquo;
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!rep.status || rep.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleResolveHuxReport(rep.id, 'resolved')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => handleResolveHuxReport(rep.id, 'dismissed')}
                                className="px-3 py-1.5 bg-[#121212] border border-[#333333] text-[#BDBDBD] hover:text-white font-bold text-xs rounded-xl"
                              >
                                Dismiss
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-[#BDBDBD] uppercase px-2.5 py-1 bg-[#121212] border border-[#333333] rounded-lg">
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
                    <div className="bg-[#1C1C1C] p-8 rounded-2xl text-center text-xs text-[#BDBDBD] border border-[#333333]">
                      No student requests posted yet.
                    </div>
                  ) : (
                    studentRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#1C1C1C] p-4 rounded-2xl border border-[#333333] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                req.status === 'fulfilled'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                  : 'bg-[#FFFFFF]/15 text-[#FFFFFF] border border-[#FFFFFF]/40'
                              }`}
                            >
                              {req.status}
                            </span>
                            <span className="text-xs font-black text-[#FFFFFF]">
                              Budget: {formatNaira(req.budget)}
                            </span>
                            <span className="text-xs text-[#BDBDBD]">• {req.location}</span>
                          </div>
                          <h4 className="font-bold text-sm text-white mt-1">{req.title}</h4>
                          <p className="text-xs text-[#BDBDBD] mt-0.5 line-clamp-2">{req.description}</p>
                          <p className="text-[11px] text-[#BDBDBD] mt-1">
                            Posted by: <strong className="text-white">{req.userName}</strong> ({req.phone})
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {confirmDeleteRequestId === req.id ? (
                            <>
                              <button
                                onClick={() => handleConfirmDeleteRequest(req.id)}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl"
                              >
                                Confirm Delete
                              </button>
                              <button
                                onClick={() => setConfirmDeleteRequestId(null)}
                                className="px-2.5 py-1.5 bg-[#121212] border border-[#333333] text-[#BDBDBD] text-xs rounded-xl"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteRequestId(req.id)}
                              className="p-2 text-red-400 hover:text-red-300 bg-[#121212] border border-[#333333] rounded-xl"
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
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#333333] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121212] text-[#BDBDBD] uppercase text-[10px] tracking-wider border-b border-[#333333]">
                        <tr>
                          <th className="p-3">User / Merchant</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Location</th>
                          <th className="p-3">WhatsApp / Phone</th>
                          <th className="p-3">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#333333]">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-[#121212]/60">
                            <td className="p-3">
                              <span className="font-bold text-white block">{u.name}</span>
                              <span className="text-[10px] text-[#BDBDBD]">{u.email}</span>
                            </td>
                            <td className="p-3">
                              <span className="capitalize font-semibold text-[#BDBDBD]">{u.role}</span>
                            </td>
                            <td className="p-3 text-[#BDBDBD]">
                              {u.city || 'Wukari'}, {u.state || 'Taraba'}
                            </td>
                            <td className="p-3 font-mono text-white">
                              {u.whatsappNumber || u.phone || 'N/A'}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1.5">
                                {u.isSuspended && (
                                  <span className="text-[10px] font-bold text-red-300 bg-red-950 border border-red-800 px-2 py-0.5 rounded-full self-start">
                                    SUSPENDED
                                  </span>
                                )}
                                <div className="flex items-center gap-2">
                                  {u.role === 'seller' && (
                                    <button
                                      onClick={() => handleToggleVerifySeller(u.id)}
                                      className="px-2.5 py-1 text-[11px] font-bold bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900 rounded-xl transition flex items-center gap-1"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      Toggle Verified
                                    </button>
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
                                          ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                                          : 'bg-red-950 border border-red-800 text-red-300 hover:bg-red-900'
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
            </>
          )}
        </div>

        {/* Inline Reject Reason Modal */}
        {rejectProductTarget && (
          <div className="absolute inset-0 bg-black/85 z-30 p-4 flex items-center justify-center">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!rejectReason.trim()) return;
                handleModerateProduct(rejectProductTarget.id, 'rejected', rejectReason.trim());
              }}
              className="w-full max-w-md bg-[#121212] border border-[#333333] rounded-2xl p-5 space-y-3"
            >
              <h4 className="font-bold text-white text-sm">Reject Listing: {rejectProductTarget.title}</h4>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejecting listing..."
                className="w-full p-2.5 bg-[#1C1C1C] border border-[#333333] rounded-xl text-xs text-white outline-none focus:border-[#FFFFFF]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectProductTarget(null)}
                  className="px-3 py-1.5 text-xs text-[#BDBDBD]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl"
                >
                  Reject Listing
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Inline Resolve Report Modal */}
        {resolveReportTarget && (
          <div className="absolute inset-0 bg-black/85 z-30 p-4 flex items-center justify-center">
            <form
              onSubmit={handleSubmitResolveReport}
              className="w-full max-w-md bg-[#121212] border border-[#333333] rounded-2xl p-5 space-y-3"
            >
              <h4 className="font-bold text-white text-sm capitalize">
                Mark Report as {resolveReportTarget.status}
              </h4>
              <textarea
                rows={3}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Optional admin resolution notes..."
                className="w-full p-2.5 bg-[#1C1C1C] border border-[#333333] rounded-xl text-xs text-white outline-none focus:border-[#FFFFFF]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolveReportTarget(null)}
                  className="px-3 py-1.5 text-xs text-[#BDBDBD]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#FFFFFF] text-black font-black text-xs rounded-xl"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Inline Suspend User Modal */}
        {suspendUserTarget && (
          <div className="absolute inset-0 bg-black/85 z-30 p-4 flex items-center justify-center">
            <form
              onSubmit={handleSubmitSuspendUser}
              className="w-full max-w-md bg-[#121212] border border-[#333333] rounded-2xl p-5 space-y-3"
            >
              <h4 className="font-bold text-white text-sm">Suspend User: {suspendUserTarget.name}</h4>
              <textarea
                required
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason for account suspension..."
                className="w-full p-2.5 bg-[#1C1C1C] border border-[#333333] rounded-xl text-xs text-white outline-none focus:border-[#FFFFFF]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSuspendUserTarget(null)}
                  className="px-3 py-1.5 text-xs text-[#BDBDBD]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl"
                >
                  Suspend User
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
