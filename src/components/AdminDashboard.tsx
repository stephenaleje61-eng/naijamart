import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Users,
  Package,
  Clock,
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
  MessageCircle,
  Eye
} from 'lucide-react';
import { Product, AdminMetrics, ReportItem, AuditLogItem, User } from '../types.js';
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
  adminToggleUserSuspension,
  adminTriggerExpirationPurge
} from '../services/api.js';
import { formatNaira } from './ProductCard.js';

interface AdminDashboardProps {
  onClose: () => void;
  onOpenProductDetail: (product: Product) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  onOpenProductDetail
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'reports' | 'users' | 'cleanup'>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [cleanupStats, setCleanupStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [purgeRunning, setPurgeRunning] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricData, prodData, repData, userData] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminProducts(),
        fetchAdminReports(),
        fetchAdminUsers()
      ]);

      setMetrics(metricData.metrics);
      setCleanupStats(metricData.cleanupStats);
      setAuditLogs(metricData.recentAuditLogs || []);
      setProducts(prodData.products || []);
      setReports(repData.reports || []);
      setUsers(userData.users || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualPurge = async () => {
    setPurgeRunning(true);
    setPurgeResult(null);
    try {
      const res = await adminTriggerExpirationPurge();
      setPurgeResult(res.message);
      await loadData();
    } catch (err: any) {
      setPurgeResult('Purge error: ' + err.message);
    } finally {
      setPurgeRunning(false);
    }
  };

  const handleRemoveProduct = async (id: string) => {
    if (!confirm('Are you sure you want to remove this listing for violating marketplace terms?')) return;
    try {
      await adminRemoveProduct(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove product');
    }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      await adminToggleFeatured(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle featured');
    }
  };

  const handleToggleVerifySeller = async (userId: string) => {
    try {
      await adminToggleSellerVerification(userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update verification status');
    }
  };

  const handleResolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    const notes = prompt(`Enter resolution notes for report (${status}):`) || '';
    try {
      await adminResolveReport(id, status, notes);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve report');
    }
  };

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.shopName.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.city.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Admin Header */}
        <div className="bg-[#1C1917] text-white p-5 flex items-center justify-between shrink-0 border-b border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black text-white text-lg shadow-lg">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">NaijaMart Moderation Desk</h2>
                <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                  CONFIDENTIAL ADMIN
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Marketplace Trust, Safety, 7-Day Expiration Engine & Moderation Control
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-100 border-b border-gray-200 px-6 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 text-xs font-bold py-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'overview' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview & Analytics
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'products' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Product Moderation ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'reports' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reported Listings ({reports.filter(r => r.status === 'pending').length} pending)
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'users' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sellers & Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('cleanup')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'cleanup' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              7-Day Expiration Engine
            </button>
          </div>

          <button
            onClick={loadData}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Active Products</span>
                  <span className="text-2xl font-black text-gray-900 mt-1 block">{metrics?.activeProducts ?? 0}</span>
                  <span className="text-[10px] text-gray-400">Total in DB: {metrics?.totalProducts ?? 0}</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">WhatsApp Contacts</span>
                  <span className="text-2xl font-black text-emerald-600 mt-1 block flex items-center gap-1">
                    <MessageCircle className="w-5 h-5 fill-current" />
                    {metrics?.totalWhatsAppClicks ?? 0}
                  </span>
                  <span className="text-[10px] text-gray-400">Genuine buyer leads</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">7-Day Purged Items</span>
                  <span className="text-2xl font-black text-amber-600 mt-1 block flex items-center gap-1">
                    <Clock className="w-5 h-5" />
                    {cleanupStats?.totalExpiredDeleted ?? 0}
                  </span>
                  <span className="text-[10px] text-gray-400">Auto deleted after 168h</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Pending Reports</span>
                  <span className="text-2xl font-black text-red-600 mt-1 block flex items-center gap-1">
                    <AlertTriangle className="w-5 h-5" />
                    {metrics?.pendingReports ?? 0}
                  </span>
                  <span className="text-[10px] text-gray-400">Require moderation</span>
                </div>
              </div>

              {/* 7-Day Purge Trigger Card */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-base text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#F68B1F]" />
                    7-Day Auto-Purge Worker Status: ACTIVE
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Background job executes every 60 seconds on the server. Next cleanup scheduled automatically.
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 font-mono">
                    Last automatic cycle: {cleanupStats?.lastRun ? new Date(cleanupStats.lastRun).toLocaleString() : 'Recent'}
                  </p>
                </div>

                <button
                  onClick={handleManualPurge}
                  disabled={purgeRunning}
                  className="px-5 py-2.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 shrink-0"
                >
                  {purgeRunning ? 'Executing Cleanup...' : 'Run 7-Day Purge Now (Test)'}
                </button>
              </div>

              {purgeResult && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold">
                  {purgeResult}
                </div>
              )}

              {/* Recent System Audit Logs */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-sm text-gray-900 mb-3">Recent 7-Day Purge & Moderation Logs</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-xs">
                  {auditLogs.length === 0 ? (
                    <div className="text-gray-400 text-xs py-4 text-center">No logs recorded yet.</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span className="font-bold text-purple-700">{log.action}</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700">{log.details}</p>
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
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search product title, seller, or city..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-xl outline-none"
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  Showing {filteredProducts.length} listings
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3">Seller / Shop</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">7-Day Expiry</th>
                        <th className="p-3">Leads</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={p.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                              />
                              <div>
                                <p className="font-bold text-gray-900 line-clamp-1 max-w-xs">{p.title}</p>
                                <span className="text-[10px] text-gray-500 capitalize">{p.categoryId} • {p.condition}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-gray-700">
                            <span className="font-bold block">{p.shopName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{p.whatsappNumber}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-gray-900">
                              {formatNaira(p.price)}
                            </span>
                            {p.moderationStatus && (
                              <div className="mt-1">
                                <span className={`inline-flex items-center text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                  p.moderationStatus === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : p.moderationStatus === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800 animate-pulse'
                                }`}>
                                  {p.moderationStatus.toUpperCase()}
                                </span>
                              </div>
                            )}
                            {p.moderationFlags && p.moderationFlags.length > 0 && (
                              <div className="text-[9px] text-red-600 font-semibold mt-1 max-w-[140px] truncate" title={p.moderationFlags.join('; ')}>
                                ⚠ {p.moderationFlags[0]}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-[11px] font-bold text-amber-700 block">
                              {p.remainingHours}h remaining
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Published: {new Date(p.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-emerald-700 flex items-center gap-1">
                              <MessageCircle className="w-3 h-3 fill-current" /> {p.whatsappClicks}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={async () => {
                                    try {
                                      await adminModerateProduct(p.id, 'approved');
                                      await loadData();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition"
                                  title="Approve listing for public feed"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    const reason = prompt('Reason for rejecting listing:');
                                    if (!reason) return;
                                    try {
                                      await adminModerateProduct(p.id, 'rejected', reason);
                                      await loadData();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold transition"
                                  title="Reject listing from public feed"
                                >
                                  Reject
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleFeatured(p.id)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                                    p.isFeatured ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {p.isFeatured ? 'Featured ★' : 'Feature'}
                                </button>
                                <button
                                  onClick={() => handleRemoveProduct(p.id)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                  title="Permanently Delete Listing"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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

          {/* TAB 3: REPORTED LISTINGS */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center text-xs text-gray-500 border border-gray-200">
                  No buyer reports submitted yet. The marketplace is running smoothly.
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((rep) => (
                    <div key={rep.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            {rep.reason}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600">Reported by: {rep.reporterEmail}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-[11px] text-gray-400">{new Date(rep.createdAt).toLocaleString()}</span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 mt-1">
                          Product: {rep.productTitle || rep.productId || 'Unknown listing'}
                        </h4>
                        <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          "{rep.details}"
                        </p>
                        {rep.adminNotes && (
                          <p className="text-[11px] text-purple-700 mt-1 font-semibold">
                            Admin resolution: {rep.adminNotes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {rep.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleResolveReport(rep.id, 'resolved')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleResolveReport(rep.id, 'dismissed')}
                              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl"
                            >
                              Dismiss
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-gray-500 uppercase px-2 py-1 bg-gray-100 rounded-lg">
                            {rep.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: USERS & SELLERS */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3">User / Merchant</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">WhatsApp / Phone</th>
                    <th className="p-3">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <span className="font-bold text-gray-900 block">{u.name}</span>
                        <span className="text-[10px] text-gray-500">{u.email}</span>
                      </td>
                      <td className="p-3">
                        <span className="capitalize font-semibold text-gray-700">{u.role}</span>
                      </td>
                      <td className="p-3 text-gray-600">
                        {u.city}, {u.state}
                      </td>
                      <td className="p-3 font-mono text-gray-700">
                        {u.whatsappNumber || u.phone || 'N/A'}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1.5">
                          {u.isSuspended && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full self-start">
                              SUSPENDED
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            {u.role === 'seller' && (
                              <button
                                onClick={() => handleToggleVerifySeller(u.id)}
                                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition flex items-center gap-1"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Toggle Verified
                              </button>
                            )}
                            {u.role !== 'admin' && (
                              <button
                                onClick={async () => {
                                  const reason = !u.isSuspended ? prompt('Enter reason for account suspension:') : undefined;
                                  if (!u.isSuspended && !reason) return;
                                  try {
                                    await adminToggleUserSuspension(u.id, reason || undefined);
                                    await loadData();
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition ${
                                  u.isSuspended
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100'
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
          )}

          {/* TAB 5: 7-DAY EXPIRATION ENGINE INSPECTOR */}
          {activeTab === 'cleanup' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-extrabold text-gray-900 mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#F68B1F]" />
                  Automatic 7-Day (168-Hour) Expiration Rules & Scheduler
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Every product published on NaijaMart receives an immutable server timestamp <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-purple-700">expires_at = created_at + 7 days</code>. Editing a product never resets this timer. The node server process runs an autonomous background sweep every 60 seconds to purge expired records and their associated images from disk storage.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <span className="text-gray-500 block">Total Items Ever Purged:</span>
                    <strong className="text-lg text-gray-900">{cleanupStats?.totalExpiredDeleted || 0} listings</strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <span className="text-gray-500 block">Last Sweep Execution:</span>
                    <strong className="text-xs text-gray-800">{new Date(cleanupStats?.lastRun || Date.now()).toLocaleTimeString()}</strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <span className="text-gray-500 block">Current Server UTC:</span>
                    <strong className="text-xs text-gray-800 font-mono">{new Date().toISOString()}</strong>
                  </div>
                </div>

                <button
                  onClick={handleManualPurge}
                  disabled={purgeRunning}
                  className="px-6 py-2.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  {purgeRunning ? 'Executing Cleanup...' : 'Test Expiration Sweep Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
