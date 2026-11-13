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

  // Profile Edit State (defaults to Taraba / Wukari for FU MARKET)
  const [shopName, setShopName] = useState(sellerProfile?.shopName || '');
  const [description, setDescription] = useState(sellerProfile?.description || '');
  const [whatsappNumber, setWhatsappNumber] = useState(sellerProfile?.whatsappNumber || '');
  const [state, setState] = useState(sellerProfile?.state || 'Taraba');
  const [city, setCity] = useState(sellerProfile?.city || 'Wukari');
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-5xl bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#1C1C1C] border-b border-[#333333] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] flex items-center justify-center text-black font-black text-lg shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{sellerProfile?.shopName || 'FU MARKET Seller Hub'}</h2>
                {sellerProfile?.isVerified && (
                  <span className="bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified Seller
                  </span>
                )}
              </div>
              <p className="text-xs text-[#BDBDBD]">
                Seller: {user?.name} • WhatsApp: {sellerProfile?.whatsappNumber || user?.whatsappNumber || user?.phone || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.id && (
              <button
                onClick={() => onOpenStorefront(user.id)}
                className="px-3 py-1.5 bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#FFFFFF]" />
                <span className="hidden sm:inline">Preview Storefront</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] flex items-center justify-center transition"
            >
              <X className="w-4 h-4 text-[#BDBDBD] hover:text-white" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-[#1C1C1C] border-b border-[#333333] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('listings')}
              className={`py-3.5 border-b-2 transition ${
                activeTab === 'listings'
                  ? 'border-[#FFFFFF] text-[#FFFFFF]'
                  : 'border-transparent text-[#BDBDBD] hover:text-white'
              }`}
            >
              My Listings ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3.5 border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-[#FFFFFF] text-[#FFFFFF]'
                  : 'border-transparent text-[#BDBDBD] hover:text-white'
              }`}
            >
              Storefront Settings
            </button>
          </div>

          <button
            onClick={onOpenSellModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs rounded-xl transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post New Product</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-red-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-4">
              <span className="text-[11px] font-bold text-[#BDBDBD] uppercase tracking-wider block">
                Total Listings
              </span>
              <span className="text-2xl font-black text-white mt-1 block flex items-center gap-1.5">
                <Package className="w-5 h-5 text-[#FFFFFF]" />
                {stats.totalProducts ?? listings.length}
              </span>
            </div>

            <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-4">
              <span className="text-[11px] font-bold text-[#BDBDBD] uppercase tracking-wider block">
                Active Products
              </span>
              <span className="text-2xl font-black text-[#FFFFFF] mt-1 block">
                {stats.activeCount ?? listings.filter((l) => l.status === 'active').length}
              </span>
            </div>

            <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-4">
              <span className="text-[11px] font-bold text-[#BDBDBD] uppercase tracking-wider block">
                WhatsApp Leads
              </span>
              <span className="text-2xl font-black text-[#25D366] mt-1 block flex items-center gap-1.5">
                <MessageCircle className="w-5 h-5" />
                {stats.totalWhatsAppClicks ?? 0}
              </span>
            </div>

            <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-4">
              <span className="text-[11px] font-bold text-[#BDBDBD] uppercase tracking-wider block">
                Total Views
              </span>
              <span className="text-2xl font-black text-white mt-1 block flex items-center gap-1.5">
                <Eye className="w-5 h-5 text-[#FFFFFF]" />
                {stats.totalViews ?? 0}
              </span>
            </div>
          </div>

          {/* TAB 1: LISTINGS */}
          {activeTab === 'listings' && (
            <div>
              {loading ? (
                <div className="py-12 text-center text-xs text-[#BDBDBD]">Loading your listings...</div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12 bg-[#1C1C1C] rounded-2xl border border-dashed border-[#333333]">
                  <Store className="w-10 h-10 text-[#BDBDBD] mx-auto mb-2" />
                  <h4 className="font-bold text-white text-sm">No Listings Yet</h4>
                  <p className="text-xs text-[#BDBDBD] max-w-sm mx-auto mt-1 mb-4">
                    Upload your products with genuine photos and reach FUWUKARI students directly on FU MARKET.
                  </p>
                  <button
                    onClick={onOpenSellModal}
                    className="px-4 py-2 bg-[#FFFFFF] text-black font-black text-xs rounded-xl"
                  >
                    Post Your First Product
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#1C1C1C] rounded-2xl border border-[#333333] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#333333] shrink-0 bg-[#121212]">
                          <ProductImage
                            src={getProductDisplayImage(item.images, item.imageUrl)}
                            fallbackSrcs={getValidProductImages(item.images, item.imageUrl)}
                            alt={item.title}
                            category={item.categoryId}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-sm font-black text-[#FFFFFF]">{formatNaira(item.price)}</span>
                            <span className="text-xs text-[#BDBDBD]">• Qty: {item.quantity}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                item.status === 'active'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                  : item.status === 'sold'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-700'
                                  : 'bg-[#121212] text-[#BDBDBD] border border-[#333333]'
                              }`}
                            >
                              {item.status}
                            </span>
                            {item.moderationStatus === 'pending_review' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/40 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                            {item.moderationStatus === 'rejected' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-700 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[#BDBDBD]">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {item.views || 0} views
                            </span>
                            <span className="text-[#25D366] flex items-center gap-1 font-semibold">
                              <MessageCircle className="w-3 h-3" /> {item.whatsappClicks || 0} WhatsApp clicks
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <a
                          href={buildShareHref(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#BDBDBD] hover:text-[#25D366] bg-[#121212] border border-[#333333] rounded-xl transition"
                          title="Share to WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => handleOpenEditProduct(item)}
                          className="px-3 py-1.5 text-xs font-bold bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] text-white rounded-xl transition flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#FFFFFF]" />
                          <span>Edit</span>
                        </button>

                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(item.id)}
                              className="px-2.5 py-1.5 text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 text-[11px] font-bold bg-[#121212] border border-[#333333] text-[#BDBDBD] rounded-xl"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-2 text-[#BDBDBD] hover:text-red-400 bg-[#121212] border border-[#333333] rounded-xl transition"
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
            <form onSubmit={handleSaveProfile} className="max-w-xl space-y-4">
              {profileSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Storefront details updated successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Shop Name</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm bg-[#1C1C1C] border border-[#333333] rounded-xl text-white focus:border-[#FFFFFF] outline-none"
                />
              </div>

              <div className="p-4 bg-[#1C1C1C] border border-[#25D366]/40 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    <span>WhatsApp Business Line <span className="text-[#FFFFFF]">*</span></span>
                  </label>
                  <span className="text-[10px] font-bold bg-[#25D366]/15 text-[#25D366] px-2 py-0.5 rounded-full">
                    Direct Buyer Chat
                  </span>
                </div>
                <p className="text-[11px] text-[#BDBDBD]">
                  Displayed on all your products so FUWUKARI students can reach you directly.
                </p>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-xs font-bold text-[#BDBDBD] bg-[#121212] px-2 py-1 rounded border border-[#333333] pointer-events-none">
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="080..."
                    className="w-full pl-20 pr-3 py-2.5 text-sm font-bold bg-[#121212] border border-[#333333] focus:border-[#25D366] rounded-xl text-white outline-none font-mono"
                  />
                </div>
                {whatsappNumber && (
                  <div className="text-[11px] text-right">
                    <a
                      href={`https://wa.me/234${whatsappNumber.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#25D366] hover:underline"
                    >
                      Test WhatsApp link →
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white focus:border-[#FFFFFF] outline-none"
                  >
                    {NIGERIA_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">City / Campus Area</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white focus:border-[#FFFFFF] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Campus Meetup / Shop Address</label>
                <input
                  type="text"
                  placeholder="e.g. Behind LT or Main Gate, Wukari"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white focus:border-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">About Your Shop</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white focus:border-[#FFFFFF] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-2.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{profileSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </form>
          )}
        </div>

        {/* EDIT PRODUCT SUBMODAL */}
        {editingProduct && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 p-4 flex items-center justify-center">
            <div className="bg-[#121212] border border-[#333333] rounded-3xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-white">Edit Product Listing</h3>
                <button onClick={() => setEditingProduct(null)} className="text-[#BDBDBD] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#BDBDBD] mb-4 line-clamp-1 font-semibold">{editingProduct.title}</p>

              <form onSubmit={handleSaveProductEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Price (₦)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white outline-none focus:border-[#FFFFFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Available Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white outline-none focus:border-[#FFFFFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white outline-none focus:border-[#FFFFFF]"
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
                    className="px-4 py-2 text-xs font-semibold text-[#BDBDBD] hover:text-white rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 text-xs font-black bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black rounded-xl"
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
