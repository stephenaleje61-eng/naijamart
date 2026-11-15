import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
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
  AlertCircle,
  Package
} from 'lucide-react';
import { Product } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import {
  fetchMySellerListings,
  updateProductListing,
  deleteProductListing,
  updateSellerProfile
} from '../services/api.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';
import { NIGERIA_STATES } from '../constants/states.js';
import { ProductImage } from './ProductImage.js';
import { getProductDisplayImage, getValidProductImages } from '../utils/productImages.js';

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
    totalViews: 0,
    totalWhatsAppClicks: 0
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [shopName, setShopName] = useState(sellerProfile?.shopName || '');
  const [description, setDescription] = useState(sellerProfile?.description || '');
  const [whatsappNumber, setWhatsappNumber] = useState(sellerProfile?.whatsappNumber || '');
  const [state, setState] = useState(sellerProfile?.state || 'Taraba');
  const [city, setCity] = useState(sellerProfile?.city || 'Wukari');
  const [address, setAddress] = useState(sellerProfile?.address || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editStatus, setEditStatus] = useState<'active' | 'sold' | 'unavailable'>('active');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchMySellerListings();
      setListings(data.listings || []);
      setStats(data.stats || {});
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load your listings.');
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
    setErrorMsg(null);
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
      setErrorMsg(err.message || 'Failed to update shop details.');
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
    setErrorMsg(null);
    try {
      await updateProductListing(editingProduct.id, {
        price: Number(editPrice),
        quantity: Number(editQuantity),
        status: editStatus
      });
      setEditingProduct(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update product.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setErrorMsg(null);
    try {
      await deleteProductListing(id);
      setConfirmDeleteId(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete product.');
    }
  };

  const buildShareHref = (prod: Product) => {
    const origin = window.location.origin;
    const text = encodeURIComponent(
      `Check out "${prod.title}" (${formatNaira(prod.price)}) on FU MARKET: ${origin}/#product-${prod.id}`
    );
    return `https://wa.me/?text=${text}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-5xl bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[90vh] flex flex-col text-[#111111]">
        {/* Header */}
        <div className="bg-[#0B6B3A] text-white p-5 flex items-center justify-between shrink-0 border-b border-[#14532D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2B90D] flex items-center justify-center text-[#111111] font-black text-lg shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {sellerProfile?.shopName || 'FU MARKET Seller Hub'}
                </h2>
                <CeoVerifiedBadge
                  verified={Boolean(sellerProfile?.ceoVerified || sellerProfile?.isVerified || user?.ceoVerified || user?.isVerified)}
                  entityIds={[sellerProfile?.id, user?.id]}
                  variant="pill"
                />
              </div>
              <p className="text-xs text-white/85">
                Seller: {user?.name} • WhatsApp: {sellerProfile?.whatsappNumber || user?.whatsappNumber || user?.phone || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.id && (
              <button
                onClick={() => onOpenStorefront(user.id)}
                className="px-3 py-1.5 bg-[#14532D] hover:bg-[#0B6B3A] border border-white/25 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#F2B90D]" />
                <span className="hidden sm:inline">Preview Storefront</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#14532D] hover:bg-[#F2B90D] text-white hover:text-[#111111] flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-[#FFFFFF] border-b border-[#E5E7EB] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('listings')}
              className={`py-3.5 border-b-2 transition ${
                activeTab === 'listings'
                  ? 'border-[#0B6B3A] text-[#0B6B3A] font-black'
                  : 'border-transparent text-[#555555] hover:text-[#111111]'
              }`}
            >
              My Listings ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3.5 border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-[#0B6B3A] text-[#0B6B3A] font-black'
                  : 'border-transparent text-[#555555] hover:text-[#111111]'
              }`}
            >
              Storefront Settings
            </button>
          </div>

          <button
            onClick={onOpenSellModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs rounded-xl transition shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post New Product</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#F5F5F5]">
          {errorMsg && (
            <div className="p-3 bg-[#FFF8DB] border border-[#F2B90D] text-[#111111] text-xs rounded-xl flex items-center justify-between gap-2 font-semibold">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#111111] shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-[#111111] hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-[#555555] uppercase tracking-wider block">
                Total Listings
              </span>
              <span className="text-2xl font-black text-[#111111] mt-1 block flex items-center gap-1.5">
                <Package className="w-5 h-5 text-[#0B6B3A]" />
                {stats.totalProducts ?? listings.length}
              </span>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-[#555555] uppercase tracking-wider block">
                Active Products
              </span>
              <span className="text-2xl font-black text-[#0B6B3A] mt-1 block">
                {stats.activeCount ?? listings.filter((l) => l.status === 'active').length}
              </span>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-[#555555] uppercase tracking-wider block">
                WhatsApp Leads
              </span>
              <span className="text-2xl font-black text-[#0B6B3A] mt-1 block flex items-center gap-1.5">
                <MessageCircle className="w-5 h-5 text-[#0B6B3A]" />
                {stats.totalWhatsAppClicks ?? 0}
              </span>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-[#555555] uppercase tracking-wider block">
                Total Views
              </span>
              <span className="text-2xl font-black text-[#111111] mt-1 block flex items-center gap-1.5">
                <Eye className="w-5 h-5 text-[#0B6B3A]" />
                {stats.totalViews ?? 0}
              </span>
            </div>
          </div>

          {/* TAB 1: LISTINGS */}
          {activeTab === 'listings' && (
            <div>
              {loading ? (
                <div className="py-12 text-center text-xs font-semibold text-[#555555]">
                  Loading your listings...
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12 bg-[#FFFFFF] rounded-2xl border border-dashed border-[#E5E7EB]">
                  <Store className="w-10 h-10 text-[#0B6B3A] mx-auto mb-2" />
                  <h4 className="font-black text-[#111111] text-sm">No Listings Yet</h4>
                  <p className="text-xs text-[#555555] max-w-sm mx-auto mt-1 mb-4">
                    Upload your products with genuine photos and reach FUWUKARI students directly on FU MARKET.
                  </p>
                  <button
                    onClick={onOpenSellModal}
                    className="px-4 py-2 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs rounded-xl"
                  >
                    Post Your First Product
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#E5E7EB] shrink-0 bg-[#F5F5F5]">
                          <ProductImage
                            src={getProductDisplayImage(item.images, item.imageUrl)}
                            fallbackSrcs={getValidProductImages(item.images, item.imageUrl)}
                            alt={item.title}
                            category={item.categoryId}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-[#111111] line-clamp-1">
                            {item.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs font-black bg-[#0B6B3A] text-[#F2B90D] px-2 py-0.5 rounded-md">
                              {formatNaira(item.price)}
                            </span>
                            <span className="text-xs text-[#555555] font-semibold">• Qty: {item.quantity}</span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                item.status === 'active'
                                  ? 'bg-[#0B6B3A]/10 text-[#0B6B3A] border border-[#0B6B3A]/30'
                                  : item.status === 'sold'
                                  ? 'bg-[#111111] text-[#FFFFFF] border border-[#111111]'
                                  : 'bg-[#F5F5F5] text-[#555555] border border-[#E5E7EB]'
                              }`}
                            >
                              {item.status}
                            </span>
                            {item.moderationStatus === 'pending_review' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF8DB] text-[#111111] border border-[#F2B90D] flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                            {item.moderationStatus === 'rejected' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#111111] text-[#F2B90D] border border-[#111111] flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[#555555]">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {item.views || 0} views
                            </span>
                            <span className="text-[#0B6B3A] flex items-center gap-1 font-bold">
                              <MessageCircle className="w-3 h-3" /> {item.whatsappClicks || 0} WhatsApp clicks
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <a
                          href={buildShareHref(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#0B6B3A] hover:bg-[#0B6B3A] hover:text-white bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl transition"
                          title="Share to WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => handleOpenEditProduct(item)}
                          className="px-3 py-1.5 text-xs font-bold bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111] rounded-xl transition flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#0B6B3A]" />
                          <span>Edit</span>
                        </button>

                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(item.id)}
                              className="px-2.5 py-1.5 text-[11px] font-black bg-[#111111] hover:bg-black text-[#F2B90D] rounded-xl"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 text-[11px] font-bold bg-[#FFFFFF] border border-[#E5E7EB] text-[#555555] rounded-xl"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-2 text-[#555555] hover:text-[#111111] bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#111111] rounded-xl transition"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROFILE & STOREFRONT SETTINGS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="max-w-xl space-y-4 bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E7EB]">
              {profileSuccess && (
                <div className="p-3 bg-[#0B6B3A] border border-[#14532D] rounded-xl text-xs text-white flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#F2B90D]" />
                  <span>Storefront details updated successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Shop Name</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-[#111111] focus:border-[#0B6B3A] outline-none"
                />
              </div>

              <div className="p-4 bg-[#F5F5F5] border border-[#0B6B3A]/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#111111] uppercase flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-[#0B6B3A]" />
                    <span>WhatsApp Business Line *</span>
                  </label>
                  <span className="text-[10px] font-black bg-[#0B6B3A] text-[#F2B90D] px-2 py-0.5 rounded-full">
                    Direct Buyer Chat
                  </span>
                </div>
                <p className="text-[11px] text-[#555555]">
                  Displayed on all your products so FUWUKARI students can reach you directly.
                </p>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-xs font-bold text-[#111111] bg-[#F5F5F5] px-2 py-1 rounded border border-[#E5E7EB] pointer-events-none">
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="080..."
                    className="w-full pl-20 pr-3 py-2.5 text-sm font-bold bg-[#FFFFFF] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] outline-none font-mono"
                  />
                </div>
                {whatsappNumber && (
                  <div className="text-[11px] text-right">
                    <a
                      href={`https://wa.me/234${whatsappNumber.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-black text-[#0B6B3A] hover:underline"
                    >
                      Test WhatsApp link →
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-[#111111] focus:border-[#0B6B3A] outline-none"
                  >
                    {NIGERIA_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">City / Campus Area</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-[#111111] focus:border-[#0B6B3A] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Campus Meetup / Shop Address</label>
                <input
                  type="text"
                  placeholder="e.g. Hostel A, 100L or Main Gate, Wukari"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-[#111111] focus:border-[#0B6B3A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">About Your Shop</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-[#111111] focus:border-[#0B6B3A] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-[#F2B90D]" />
                <span>{profileSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </form>
          )}
        </div>

        {/* EDIT PRODUCT SUBMODAL */}
        {editingProduct && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 p-4 flex items-center justify-center">
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-base text-[#111111]">Edit Product Listing</h3>
                <button onClick={() => setEditingProduct(null)} className="text-[#555555] hover:text-[#111111]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#555555] mb-4 line-clamp-1 font-semibold">{editingProduct.title}</p>

              <form onSubmit={handleSaveProductEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Price (₦)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-[#111111] outline-none focus:border-[#0B6B3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Available Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-[#111111] outline-none focus:border-[#0B6B3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl text-[#111111] outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="active">Active (Available)</option>
                    <option value="sold">Mark as Sold Out</option>
                    <option value="unavailable">Temporarily Unavailable</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#555555] hover:text-[#111111] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 text-xs font-black bg-[#0B6B3A] hover:bg-[#14532D] text-white rounded-xl"
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
