import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Building2,
  Calculator,
  Heart,
  Package,
  ShoppingBag,
  Store,
  Truck,
  UserCheck,
  Utensils
} from 'lucide-react';
import {
  AccommodationInspectionRequest,
  FoodOrder,
  OrderRecord,
  Product
} from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import {
  getAllProductOrdersForUser,
  subscribeToBuyerFoodOrders,
  subscribeToStudentInspectionRequests
} from '../services/campusEcosystem.js';

interface BuyerOrdersAccountPageProps {
  products: Product[];
  onBackToHome: () => void;
  onOpenAuth: () => void;
  onOpenProduct: (product: Product) => void;
  onNavigateView: (view: string) => void;
}

export const BuyerOrdersAccountPage: React.FC<BuyerOrdersAccountPageProps> = ({
  products,
  onBackToHome,
  onOpenAuth,
  onOpenProduct,
  onNavigateView
}) => {
  const { user, firebaseUser, favourites, notifications, logout } = useAuth();
  const currentUid = firebaseUser?.uid || user?.id;

  const [tab, setTab] = useState<'orders' | 'food' | 'wishlist' | 'inspections' | 'alerts'>('orders');
  const [productOrders, setProductOrders] = useState<OrderRecord[]>([]);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [inspections, setInspections] = useState<AccommodationInspectionRequest[]>([]);

  useEffect(() => {
    if (!currentUid) return;
    getAllProductOrdersForUser(currentUid).then(setProductOrders).catch(() => {});
    const u1 = subscribeToBuyerFoodOrders(currentUid, setFoodOrders);
    const u2 = subscribeToStudentInspectionRequests(currentUid, setInspections);
    return () => {
      u1();
      u2();
    };
  }, [currentUid]);

  const savedProducts = products.filter((p) => favourites.includes(p.id));

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#10251D] pb-16">
      <div className="bg-[#087443] border-b-4 border-[#D4A62A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90 hover:text-[#D4A62A] mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
                {user ? `${user.name} — Student & Buyer Hub` : 'My Orders & Campus Account'}
              </h1>
              <p className="text-xs text-white/90 mt-1">
                {user
                  ? `${user.email} • Manage orders, food delivery tracking, saved lodges, inspections, and campus roles.`
                  : 'Sign in to access your cross-device orders, saved items, food tracking, and cloud GPA records.'}
              </p>
            </div>
            {user ? (
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2 bg-[#10251D] text-white text-xs font-black rounded-xl self-start sm:self-auto"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-5 py-2.5 bg-[#D4A62A] text-[#10251D] text-xs font-black rounded-xl self-start sm:self-auto"
              >
                Sign In / Create Account
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Multi-Role Ecosystem Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => onNavigateView('seller')}
            className="p-3.5 bg-white border border-[#D8E5DD] hover:border-[#087443] rounded-2xl text-left space-y-1 transition"
          >
            <Store className="w-5 h-5 text-[#087443]" />
            <div className="text-xs font-black">Seller Dashboard</div>
            <div className="text-[11px] text-[#556B60]">Manage products &amp; sales</div>
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('hux')}
            className="p-3.5 bg-white border border-[#D8E5DD] hover:border-[#087443] rounded-2xl text-left space-y-1 transition"
          >
            <Building2 className="w-5 h-5 text-[#087443]" />
            <div className="text-xs font-black">House Agent Portal</div>
            <div className="text-[11px] text-[#556B60]">Hostels &amp; inspections</div>
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('food')}
            className="p-3.5 bg-white border border-[#D8E5DD] hover:border-[#087443] rounded-2xl text-left space-y-1 transition"
          >
            <Utensils className="w-5 h-5 text-[#087443]" />
            <div className="text-xs font-black">Food Vendor Portal</div>
            <div className="text-[11px] text-[#556B60]">Menus &amp; kitchen orders</div>
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('food')}
            className="p-3.5 bg-white border border-[#D8E5DD] hover:border-[#087443] rounded-2xl text-left space-y-1 transition"
          >
            <Truck className="w-5 h-5 text-[#087443]" />
            <div className="text-xs font-black">Delivery Partner</div>
            <div className="text-[11px] text-[#556B60]">Campus runs &amp; earnings</div>
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('gpa')}
            className="p-3.5 bg-white border border-[#D8E5DD] hover:border-[#087443] rounded-2xl text-left space-y-1 transition"
          >
            <Calculator className="w-5 h-5 text-[#087443]" />
            <div className="text-xs font-black">GPA &amp; CGPA Sync</div>
            <div className="text-[11px] text-[#556B60]">Academic calculator</div>
          </button>
        </div>

        {/* Account Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'orders', label: `Product Orders (${productOrders.length})`, icon: ShoppingBag },
            { id: 'food', label: `Food Orders (${foodOrders.length})`, icon: Utensils },
            { id: 'wishlist', label: `Saved Items (${savedProducts.length})`, icon: Heart },
            { id: 'inspections', label: `Inspections (${inspections.length})`, icon: UserCheck },
            { id: 'alerts', label: `Notifications (${notifications.length})`, icon: Bell }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 border ${
                  tab === t.id
                    ? 'bg-[#087443] text-white border-[#087443]'
                    : 'bg-white text-[#10251D] border-[#D8E5DD]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === 'orders' && (
          <div className="space-y-3">
            {productOrders.length === 0 ? (
              <div className="bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center text-xs text-[#556B60]">
                No marketplace product orders saved yet.
              </div>
            ) : (
              productOrders.map((o) => (
                <div key={o.id} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 text-xs space-y-1">
                  <div className="flex justify-between font-black">
                    <span>Order #{o.id}</span>
                    <span className="text-[#087443]">{formatNaira(o.totalAmount)} &bull; {o.status}</span>
                  </div>
                  <div className="text-[#556B60]">
                    Delivery: {o.deliveryLocation} &bull; Payment: {o.paymentMethod.replace(/_/g, ' ')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'food' && (
          <div className="space-y-3">
            {foodOrders.length === 0 ? (
              <div className="bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center text-xs text-[#556B60]">
                No campus food orders found.
              </div>
            ) : (
              foodOrders.map((o) => (
                <div key={o.id} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-black">{o.vendorName} &bull; {formatNaira(o.totalNaira)}</div>
                    <div className="text-[#556B60]">{o.deliveryAddress}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#087443] text-[#D4A62A] font-black">{o.status}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'wishlist' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {savedProducts.length === 0 ? (
              <div className="sm:col-span-4 bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center text-xs text-[#556B60]">
                No items saved to your wishlist yet. Tap the heart icon on any listing to save it here.
              </div>
            ) : (
              savedProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpenProduct(p)}
                  className="bg-white border border-[#D8E5DD] rounded-2xl p-3 text-left hover:border-[#087443]"
                >
                  <div className="font-bold text-xs truncate">{p.title}</div>
                  <div className="text-[#087443] font-black text-sm mt-1">{formatNaira(p.price)}</div>
                </button>
              ))
            )}
          </div>
        )}

        {tab === 'inspections' && (
          <div className="space-y-3">
            {inspections.length === 0 ? (
              <div className="bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center text-xs text-[#556B60]">
                No accommodation inspection requests booked yet.
              </div>
            ) : (
              inspections.map((r) => (
                <div key={r.id} className="bg-white border border-[#D8E5DD] rounded-2xl p-4 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-black">{r.propertyTitle}</div>
                    <div className="text-[#556B60]">
                      Agent: {r.agentName} &bull; {r.preferredDate} at {r.preferredTime}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#F4F8F5] border border-[#087443] font-black uppercase text-[#087443]">
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'alerts' && (
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center text-xs text-[#556B60]">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 25).map((n) => (
                <div key={n.id} className="bg-white border border-[#D8E5DD] rounded-2xl p-3.5 text-xs">
                  <div className="font-black text-[#10251D]">{n.title}</div>
                  <div className="text-[#556B60] mt-0.5">{n.body}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
