import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  Clock,
  Eye,
  MessageCircle,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Save,
  Share2,
  AlertCircle
} from 'lucide-react';
import { Product, SellerProfile } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import {
  fetchMySellerListings,
  updateProductListing,
  deleteProductListing,
  updateSellerProfile
} from '../services/api.js';
import { formatNaira } from './ProductCard.js';
import { NIGERIA_STATES } from '../constants/states.js';

interface SellerDashboardProps {
  onClose: () => void;
  onOpenSellModal: () => void;
  onOpenStorefront: (sellerId: string) => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  onClose,
  onOpenSellModal,
  onOpenStorefront
}) => {
  const { user, sellerProfile, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'profile'>('listings');
  const [listings, setListings] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>({
    totalProducts: 0,
    activeCount: 0,
    expiringSoonCount: 0,
    totalViews: 0,
    totalWhatsAppClicks: 0
  });
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Profile Edit State
  const [shopName, setShopName] = useState(sellerProfile?.shopName || '');
  const [description, setDescription] = useState(sellerProfile?.description || '');
  const [whatsappNumber, setWhatsappNumber] = useState(sellerProfile?.whatsappNumber || '');
  const [state, setState] = useState(sellerProfile?.state || 'Lagos');
  const [city, setCity] = useState(sellerProfile?.city || 'Ikeja');
  const [address, setAddress] = useState(sellerProfile?.address || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Edit Product State
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editStatus, setEditStatus] = useState<'active' | 'sold' | 'unavailable'>('active');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMySellerListings();
      setListings(data.listings || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error('Failed to load seller listings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateSellerProfile({
        shopName: shopName.trim(),
        description: description.trim(),
        whatsappNumber: whatsappNumber.trim(),
        state,
        city,
        address: address.trim()
      });
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update shop details');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditPrice(String(prod.price));
    setEditQuantity(String(prod.quantity));
    setEditStatus(prod.status as any);
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);
    try {
      await updateProductListing(editingProduct.id, {
        price: Number(editPrice),
        quantity: Number(editQuantity),
        status: editStatus
      });
      setEditingProduct(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this listing?')) return;
    try {
      await deleteProductListing(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleShareProduct = (prod: Product) => {
    const origin = window.location.origin;
    const text = encodeURIComponent(
      `Check out "${prod.title}" on NaijaMart: ${origin}/#product-${prod.id}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#1C1917] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F68B1F] flex items-center justify-center text-white font-black text-lg shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black">{sellerProfile?.shopName || 'Seller Hub'}</h2>
                {sellerProfile?.isVerified && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified Merchant
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Seller: {user?.name} • WhatsApp: {sellerProfile?.whatsappNumber || user?.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenStorefront(user!.id)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#F68B1F]" />
              <span className="hidden sm:inline">Preview Storefront</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('listings')}
              className={`py-3.5 border-b-2 transition ${
                activeTab === 'listings'
                  ? 'border-[#F68B1F] text-[#F68B1F]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              My Listings ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3.5 border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-[#F68B1F] text-[#F68B1F]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Storefront Settings
            </button>
          </div>

          <button
            onClick={onOpenSellModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post New Product</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Active Products</span>
              <span className="text-2xl font-black text-[#E07A15] mt-1 block">{stats.activeCount}</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">WhatsApp Leads</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block flex items-center gap-1">
                <MessageCircle className="w-5 h-5 fill-current" />
                {stats.totalWhatsAppClicks}
              </span>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Views</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block flex items-center gap-1">
                <Eye className="w-5 h-5" />
                {stats.totalViews}
              </span>
            </div>

            <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Expiring (&lt; 24h)</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block flex items-center gap-1">
                <Clock className="w-5 h-5" />
                {stats.expiringSoonCount}
              </span>
            </div>
          </div>

          {/* TAB 1: LISTINGS */}
          {activeTab === 'listings' && (
            <div>
              {/* 7-Day Expiration Advisory */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-xs text-amber-900 flex items-start gap-2.5">
                <Clock className="w-5 h-5 text-[#F68B1F] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-[#E07A15] mb-0.5">7-Day Automatic Expiration Policy</h4>
                  <p className="leading-relaxed">
                    NaijaMart enforces a strict 7-day (168 hours) lifecycle on all listings to ensure buyers only see available, fresh stock. When a product expires, it is safely cleaned up. You can easily publish a new listing anytime!
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  Loading your listings...
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <Store className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-bold text-gray-700 text-sm">No Listings Yet</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                    Upload your products with genuine pictures and start getting direct buyer enquiries on WhatsApp!
                  </p>
                  <button
                    onClick={onOpenSellModal}
                    className="px-4 py-2 bg-[#F68B1F] text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Post Your First Product
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      {/* Product Thumbnail & Details */}
                      <div className="flex items-center gap-3.5">
                        <img
                          src={item.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                          alt={item.title}
                          className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                        />
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-black text-[#F68B1F]">
                              {formatNaira(item.price)}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-600 capitalize">
                              Qty: {item.quantity}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                item.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'sold'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {item.status}
                            </span>
                            {item.moderationStatus === 'pending_review' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Pending Admin Review
                              </span>
                            )}
                            {item.moderationStatus === 'rejected' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-red-600" /> Rejected
                              </span>
                            )}
                          </div>

                          {/* 7-Day Expiration Tag */}
                          <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                            <span
                              className={`flex items-center gap-1 font-bold ${
                                item.isExpiringSoon
                                  ? 'text-red-600 animate-pulse'
                                  : 'text-amber-700'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {item.isExpiringSoon
                                ? `Expires in ${item.remainingHours} hours! (Action needed)`
                                : `Expires in: ${item.remainingDays}d ${item.remainingHours! % 24}h`}
                            </span>

                            <span className="text-gray-500 flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {item.views || 0} views
                            </span>

                            <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                              <MessageCircle className="w-3 h-3 fill-current" /> {item.whatsappClicks || 0} chats
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleShareProduct(item)}
                          className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                          title="Share to WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditProduct(item)}
                          className="px-3 py-1.5 text-xs font-bold bg-gray-100 hover:bg-orange-50 hover:text-[#F68B1F] text-gray-700 rounded-xl transition flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteProduct(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROFILE & STOREFRONT SETTINGS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="max-w-xl space-y-4">
              {profileSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Storefront details updated successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Shop Name</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                />
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-[#25D366] fill-current" />
                    <span>WhatsApp Business Line <span className="text-red-500">*</span></span>
                  </label>
                  <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                    Direct Buyer Chat
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900 font-medium">
                  This WhatsApp number is displayed on all your products for buyers to message you directly.
                </p>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-xs font-bold text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 pointer-events-none">
                    <span>🇳🇬 +234</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="0801 234 5678"
                    className="w-full pl-24 pr-3 py-2.5 text-sm sm:text-base font-bold bg-white border border-emerald-300 focus:border-[#25D366] rounded-xl outline-none font-mono"
                  />
                </div>
                {whatsappNumber && (
                  <div className="text-[11px] text-right">
                    <a
                      href={`https://wa.me/234${whatsappNumber.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-emerald-800 hover:text-emerald-950 underline"
                    >
                      Test WhatsApp link →
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                  >
                    {NIGERIA_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">City / Area</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Physical Shop Address</label>
                <input
                  type="text"
                  placeholder="e.g. Shop 12, Computer Village, Ikeja"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">About Your Shop</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-2.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{profileSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </form>
          )}
        </div>

        {/* EDIT PRODUCT SUBMODAL */}
        {editingProduct && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 p-4 flex items-center justify-center">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-gray-900">Edit Product Listing</h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-4 line-clamp-1 font-semibold">
                {editingProduct.title}
              </p>

              <form onSubmit={handleSaveProductEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Price (₦)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Available Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="active">Active (Available)</option>
                    <option value="sold">Mark as Sold Out</option>
                    <option value="unavailable">Temporarily Unavailable</option>
                  </select>
                </div>

                <div className="p-2.5 bg-blue-50 text-[11px] text-blue-900 rounded-xl">
                  <strong>7-Day Expiration Note:</strong> Editing prices or quantities does not reset your original 7-day expiration clock.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 text-xs font-bold bg-[#F68B1F] text-white rounded-xl"
                  >
                    {savingEdit ? 'Saving...' : 'Update Listing'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
