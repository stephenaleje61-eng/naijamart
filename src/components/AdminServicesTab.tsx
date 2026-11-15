import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Star,
  ShieldAlert,
  FolderPlus,
  Flag,
  Clock,
  RotateCcw
} from 'lucide-react';
import {
  ServiceCategory,
  ServiceListing,
  ServicePromotionPlanId,
  ServiceReport
} from '../types.js';
import {
  adminApproveOrRejectService,
  adminDeleteServiceCategory,
  adminFeatureService,
  adminPurgeExpiredServicePromotions,
  adminResolveServiceReport,
  adminSaveServiceCategory,
  adminSuspendServiceProvider,
  deleteServiceListing,
  subscribeToAllServicesForAdmin,
  subscribeToServiceCategories,
  subscribeToServiceReportsForAdmin
} from '../services/servicesMarketplace.js';
import { formatNaira } from './ProductCard.js';

interface AdminServicesTabProps {
  onEditService: (service: ServiceListing) => void;
  onStatusMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

export const AdminServicesTab: React.FC<AdminServicesTabProps> = ({
  onEditService,
  onStatusMessage,
  onErrorMessage
}) => {
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [subView, setSubView] = useState<'listings' | 'categories' | 'reports'>('listings');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'rejected' | 'suspended' | 'featured'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [featuringService, setFeaturingService] = useState<ServiceListing | null>(null);
  const [featurePlan, setFeaturePlan] = useState<ServicePromotionPlanId>('homepage');
  const [featureRef, setFeatureRef] = useState('');

  useEffect(() => {
    const u1 = subscribeToAllServicesForAdmin(
      (list) => {
        setServices(list);
        setLoading(false);
      },
      (err) => {
        onErrorMessage(err?.message || 'Failed to load services.');
        setLoading(false);
      }
    );
    const u2 = subscribeToServiceCategories((cats) => setCategories(cats));
    const u3 = subscribeToServiceReportsForAdmin((reps) => setReports(reps));
    return () => {
      u1();
      u2();
      u3();
    };
  }, [onErrorMessage]);

  const stats = useMemo(() => {
    return {
      total: services.length,
      active: services.filter((s) => s.status === 'active').length,
      featured: services.filter((s) => s.featured).length,
      suspended: services.filter((s) => s.status === 'suspended').length,
      totalViews: services.reduce((acc, s) => acc + (s.views || 0), 0),
      totalWhatsApp: services.reduce((acc, s) => acc + (s.whatsappClicks || 0), 0),
      pendingReports: reports.filter((r) => r.status === 'pending').length
    };
  }, [services, reports]);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (statusFilter === 'featured' && !s.featured) return false;
      if (statusFilter !== 'all' && statusFilter !== 'featured' && s.status !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = `${s.serviceName} ${s.providerName} ${s.category} ${s.location} ${s.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [services, search, statusFilter]);

  const handleModerate = async (
    srv: ServiceListing,
    decision: 'active' | 'rejected' | 'suspended'
  ) => {
    try {
      await adminApproveOrRejectService(srv, decision);
      onStatusMessage(`Service "${srv.serviceName}" marked as ${decision}.`);
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to update service status.');
    }
  };

  const handleDeleteService = async (srv: ServiceListing) => {
    try {
      await deleteServiceListing(srv.serviceId);
      setConfirmDeleteId(null);
      onStatusMessage(`Deleted service "${srv.serviceName}".`);
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to delete service.');
    }
  };

  const handleSuspendProvider = async (srv: ServiceListing, suspend: boolean) => {
    try {
      const count = await adminSuspendServiceProvider(
        srv.providerId,
        srv.providerName,
        suspend,
        suspend ? 'Suspended by CEO moderation' : 'Reinstated by CEO'
      );
      onStatusMessage(
        suspend
          ? `Suspended provider ${srv.providerName} (${count} listing(s) suspended).`
          : `Reinstated provider ${srv.providerName} (${count} listing(s) active).`
      );
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to update provider suspension.');
    }
  };

  const handleConfirmFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featuringService) return;
    try {
      await adminFeatureService(featuringService, {
        featured: true,
        planId: featurePlan,
        reference: featureRef.trim() || undefined
      });
      onStatusMessage(`"${featuringService.serviceName}" is now Featured.`);
      setFeaturingService(null);
      setFeatureRef('');
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to feature service.');
    }
  };

  const handleUnfeature = async (srv: ServiceListing) => {
    try {
      await adminFeatureService(srv, { featured: false });
      onStatusMessage(`Removed "${srv.serviceName}" from Featured.`);
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to unfeature service.');
    }
  };

  const handlePurgeExpired = async () => {
    try {
      const removed = await adminPurgeExpiredServicePromotions(services);
      onStatusMessage(
        removed > 0
          ? `Cleared ${removed} expired service promotion(s).`
          : 'No expired featured service promotions found.'
      );
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to clear expired promotions.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminSaveServiceCategory({
        id: editingCat?.id,
        name: editingCat ? editingCat.name : newCategoryName,
        description: editingCat ? editingCat.description : newCategoryDesc,
        isActive: true
      });
      onStatusMessage(editingCat ? 'Category updated.' : 'Service category saved.');
      setNewCategoryName('');
      setNewCategoryDesc('');
      setEditingCat(null);
    } catch (err: any) {
      onErrorMessage(err?.message || 'Failed to save category.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Statistics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB]">
          <p className="text-[11px] font-bold text-[#555555]">Total Services</p>
          <p className="text-xl font-black text-[#111111] tabular-nums">{stats.total}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB]">
          <p className="text-[11px] font-bold text-[#555555]">Active</p>
          <p className="text-xl font-black text-[#0B6B3A] tabular-nums">{stats.active}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB]">
          <p className="text-[11px] font-bold text-[#555555]">Featured</p>
          <p className="text-xl font-black text-[#B45309] tabular-nums">{stats.featured}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB]">
          <p className="text-[11px] font-bold text-[#555555]">Views</p>
          <p className="text-xl font-black text-[#111111] tabular-nums">{stats.totalViews}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB]">
          <p className="text-[11px] font-bold text-[#555555]">WhatsApp Clicks</p>
          <p className="text-xl font-black text-[#16A34A] tabular-nums">{stats.totalWhatsApp}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB]">
          <p className="text-[11px] font-bold text-[#555555]">Open Reports</p>
          <p className="text-xl font-black text-[#B91C1C] tabular-nums">{stats.pendingReports}</p>
        </div>
      </div>

      {/* Sub-navigation + Purge Expired Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E5E7EB] text-xs font-bold">
          <button
            type="button"
            onClick={() => setSubView('listings')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subView === 'listings' ? 'bg-[#0B6B3A] text-white' : 'text-[#555555]'
            }`}
          >
            Service Listings ({services.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('categories')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subView === 'categories' ? 'bg-[#0B6B3A] text-white' : 'text-[#555555]'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('reports')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subView === 'reports' ? 'bg-[#0B6B3A] text-white' : 'text-[#555555]'
            }`}
          >
            Reported Services ({stats.pendingReports})
          </button>
        </div>

        <button
          type="button"
          onClick={handlePurgeExpired}
          className="px-3.5 py-2 bg-[#FFF7ED] hover:bg-[#EA580C] text-[#9A3412] hover:text-white border border-[#FDBA74] text-xs font-black rounded-xl transition flex items-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Remove Expired Promotions</span>
        </button>
      </div>

      {/* SUBVIEW 1: LISTINGS */}
      {subView === 'listings' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#0B6B3A] absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search service name, provider, category, phone or location..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl outline-none focus:border-[#0B6B3A]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-bold bg-white border border-[#E5E7EB] rounded-xl outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="featured">Featured Only</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-[#555555]">Loading services...</div>
          ) : filteredServices.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center text-xs text-[#555555]">
              No service listings match this filter.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredServices.map((srv) => (
                <div
                  key={srv.serviceId}
                  className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={srv.images?.[0] || ''}
                      alt={srv.serviceName}
                      loading="lazy"
                      className="w-16 h-14 rounded-lg object-cover border border-[#E5E7EB] bg-[#F5F5F5] shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#555555]">
                        <span className="font-bold text-[#0B6B3A]">{srv.category}</span>
                        <span>·</span>
                        <span className="font-bold uppercase">{srv.status}</span>
                        {srv.featured && (
                          <>
                            <span>·</span>
                            <span className="font-black text-[#B45309]">
                              FEATURED ({srv.promotionPlan || 'active'})
                            </span>
                          </>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-[#111111] truncate">
                        {srv.serviceName}
                      </h4>
                      <p className="text-xs text-[#444444] tabular-nums">
                        {srv.priceDisplay || formatNaira(srv.price)} · Provider:{' '}
                        <strong>{srv.providerName}</strong> ({srv.phone}) · {srv.location}
                      </p>
                      <p className="text-[11px] text-[#666666] tabular-nums">
                        Views: {srv.views} · WhatsApp Clicks: {srv.whatsappClicks}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {srv.status !== 'active' && (
                      <button
                        type="button"
                        onClick={() => handleModerate(srv, 'active')}
                        className="px-2.5 py-1.5 bg-[#0B6B3A] text-white text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {srv.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleModerate(srv, 'rejected')}
                        className="px-2.5 py-1.5 bg-[#FEF2F2] text-[#B91C1C] text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditService(srv)}
                      className="px-2.5 py-1.5 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-[#111111] text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {srv.featured ? (
                      <button
                        type="button"
                        onClick={() => handleUnfeature(srv)}
                        className="px-2.5 py-1.5 bg-[#FFF7ED] border border-[#FDBA74] text-[#9A3412] text-xs font-bold rounded-lg"
                      >
                        Unfeature
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFeaturingService(srv)}
                        className="px-2.5 py-1.5 bg-[#F2B90D] text-[#111111] text-xs font-black rounded-lg flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Feature</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleSuspendProvider(srv, srv.status !== 'suspended')
                      }
                      className="px-2.5 py-1.5 bg-[#FFF8DB] text-[#92400E] border border-[#FDE68A] text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      {srv.status === 'suspended' ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reinstate</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Suspend Provider</span>
                        </>
                      )}
                    </button>

                    {confirmDeleteId === srv.serviceId ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv)}
                          className="px-2.5 py-1.5 bg-[#B91C1C] text-white text-xs font-black rounded-lg"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 bg-[#E5E7EB] text-xs font-bold rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(srv.serviceId)}
                        className="px-2.5 py-1.5 bg-[#FEF2F2] hover:bg-[#B91C1C] text-[#B91C1C] hover:text-white text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 2: MANAGE SERVICE CATEGORIES */}
      {subView === 'categories' && (
        <div className="space-y-4">
          <form
            onSubmit={handleSaveCategory}
            className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3"
          >
            <p className="text-xs font-black text-[#111111] flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-[#0B6B3A]" />
              <span>{editingCat ? `Edit Category: ${editingCat.name}` : 'Add Service Category'}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                value={editingCat ? editingCat.name : newCategoryName}
                onChange={(e) =>
                  editingCat
                    ? setEditingCat({ ...editingCat, name: e.target.value })
                    : setNewCategoryName(e.target.value)
                }
                placeholder="Category name..."
                className="px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl outline-none focus:border-[#0B6B3A]"
              />
              <input
                type="text"
                value={editingCat ? editingCat.description || '' : newCategoryDesc}
                onChange={(e) =>
                  editingCat
                    ? setEditingCat({ ...editingCat, description: e.target.value })
                    : setNewCategoryDesc(e.target.value)
                }
                placeholder="Short description (optional)"
                className="px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl outline-none focus:border-[#0B6B3A]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black rounded-xl"
              >
                {editingCat ? 'Update Category' : 'Add Category'}
              </button>
              {editingCat && (
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-3 py-2 bg-[#F5F5F5] text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#111111] truncate">{cat.name}</p>
                  {cat.description && (
                    <p className="text-[11px] text-[#555555] truncate">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingCat(cat)}
                    className="px-2.5 py-1 bg-[#F5F5F5] text-xs font-bold rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await adminDeleteServiceCategory(cat.id, cat.name);
                        onStatusMessage(`Removed category "${cat.name}".`);
                      } catch (err: any) {
                        onErrorMessage(err?.message || 'Could not remove category.');
                      }
                    }}
                    className="px-2.5 py-1 bg-[#FEF2F2] text-[#B91C1C] text-xs font-bold rounded-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 3: REPORTED SERVICES */}
      {subView === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center text-xs text-[#555555]">
              No reported services yet.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Flag className="w-3.5 h-3.5 text-[#B91C1C]" />
                    <span className="font-black text-[#111111]">{rep.serviceName}</span>
                    <span className="text-[11px] font-bold uppercase text-[#555555]">
                      ({rep.status})
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#991B1B]">{rep.reason}</p>
                  <p className="text-xs text-[#555555]">{rep.details}</p>
                </div>

                {rep.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await adminResolveServiceReport(rep.id, 'resolved');
                        onStatusMessage('Service report marked resolved.');
                      }}
                      className="px-3 py-1.5 bg-[#0B6B3A] text-white text-xs font-bold rounded-lg"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminResolveServiceReport(rep.id, 'dismissed');
                        onStatusMessage('Service report dismissed.');
                      }}
                      className="px-3 py-1.5 bg-[#F5F5F5] text-[#111111] text-xs font-bold rounded-lg"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Feature Service Confirmation Modal */}
      {featuringService && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmFeature}
            className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4 text-[#111111]"
          >
            <h3 className="text-sm font-black text-[#111111]">
              Feature Service: {featuringService.serviceName}
            </h3>
            <div className="space-y-2">
              <label className="block text-xs font-bold">Promotion Plan</label>
              <select
                value={featurePlan}
                onChange={(e) => setFeaturePlan(e.target.value as ServicePromotionPlanId)}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl"
              >
                <option value="weekly">Weekly Promotion (₦2,500 · 7 days)</option>
                <option value="homepage">Homepage Promotion (₦3,500 · 7 days)</option>
                <option value="monthly">Monthly Promotion (₦8,000 · 30 days)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold">
                Payment Reference / Receipt Note (Optional)
              </label>
              <input
                type="text"
                value={featureRef}
                onChange={(e) => setFeatureRef(e.target.value)}
                placeholder="Paystack ref or CEO confirmation note"
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFeaturingService(null)}
                className="px-4 py-2 text-xs font-bold bg-[#F5F5F5] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-black bg-[#0B6B3A] text-white rounded-xl"
              >
                Verify &amp; Activate Featured
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
