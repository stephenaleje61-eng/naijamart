import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  MapPin,
  MessageCircle,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  PlusCircle,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  Utensils,
  X
} from 'lucide-react';
import campusFoodShowcaseImg from '../assets/images/nigeria_campus_food_1794988912277.jpg';
import {
  CodPolicySettings,
  DeliveryPartner,
  FoodCartItem,
  FoodCategoryId,
  FoodMenuItem,
  FoodOrder,
  FoodOrderStatus,
  FoodVendor,
  Institution
} from '../types.js';
import {
  DEFAULT_INSTITUTION_CAMPUS,
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  belongsToInstitution,
  getInstitutionById
} from '../constants/institutions.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';
import {
  FOOD_CATEGORIES,
  FOOD_ORDER_STAGES,
  createFoodOrder,
  deleteFoodMenuItem,
  fetchCodPolicy,
  saveDeliveryPartner,
  saveFoodMenuItem,
  saveFoodVendor,
  subscribeToAllFoodOrders,
  subscribeToBuyerFoodOrders,
  subscribeToDeliveryPartners,
  subscribeToFoodMenuItems,
  subscribeToFoodVendors,
  subscribeToVendorFoodOrders,
  updateFoodOrderStatus
} from '../services/campusEcosystem.js';
import {
  fetchPaymentGatewayStatus,
  initializeOrderCheckout
} from '../services/monetization.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { ProductImage } from './ProductImage.js';

interface FoodMarketplacePageProps {
  selectedInstitutionId?: string;
  selectedCampus?: string;
  institutions?: Institution[];
  onSwitchInstitution?: () => void;
  onBackToHome: () => void;
  onOpenAuth?: () => void;
}

export const FoodMarketplacePage: React.FC<FoodMarketplacePageProps> = ({
  selectedInstitutionId = DEFAULT_INSTITUTION_ID,
  selectedCampus = DEFAULT_INSTITUTION_CAMPUS,
  institutions = VERIFIED_NIGERIAN_INSTITUTIONS,
  onSwitchInstitution,
  onBackToHome,
  onOpenAuth
}) => {
  const { user, firebaseUser } = useAuth();
  const currentUid = firebaseUser?.uid || user?.id;

  const [activeTab, setActiveTab] = useState<'order' | 'my_orders' | 'vendor_portal' | 'delivery_portal'>('order');
  const [vendors, setVendors] = useState<FoodVendor[]>([]);
  const [menuItems, setMenuItems] = useState<FoodMenuItem[]>([]);
  const [buyerOrders, setBuyerOrders] = useState<FoodOrder[]>([]);
  const [vendorOrders, setVendorOrders] = useState<FoodOrder[]>([]);
  const [allOrders, setAllOrders] = useState<FoodOrder[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<FoodCartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Checkout state
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryPoint, setDeliveryPoint] = useState<'Hostel' | 'Department' | 'Gate' | 'Off-campus'>('Hostel');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [buyerPhone, setBuyerPhone] = useState(user?.whatsappNumber || user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'flutterwave' | 'pay_on_delivery'>('pay_on_delivery');
  const [codPolicy, setCodPolicy] = useState<CodPolicySettings>({
    codEnabled: true,
    codFoodEnabled: true,
    codMaxOrderNaira: 150000,
    codNote: ''
  });
  const [gatewayState, setGatewayState] = useState({ paystackConfigured: false, flutterwaveConfigured: false });
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Vendor registration / menu item form
  const [vendorFormName, setVendorFormName] = useState('');
  const [vendorFormDesc, setVendorFormDesc] = useState('');
  const [vendorFormLocation, setVendorFormLocation] = useState('');
  const [vendorFormPhone, setVendorFormPhone] = useState('');
  const [vendorFormHours, setVendorFormHours] = useState('7:30 AM – 9:30 PM');
  const [vendorFormFee, setVendorFormFee] = useState('400');
  const [vendorSaving, setVendorSaving] = useState(false);

  const [itemFormName, setItemFormName] = useState('');
  const [itemFormDesc, setItemFormDesc] = useState('');
  const [itemFormCat, setItemFormCat] = useState<FoodCategoryId>('Rice & Stew');
  const [itemFormPrice, setItemFormPrice] = useState('');
  const [itemFormPrep, setItemFormPrep] = useState('20');
  const [itemFormImageUrl, setItemFormImageUrl] = useState('');
  const [itemUploading, setItemUploading] = useState(false);
  const [itemSaving, setItemSaving] = useState(false);

  // Delivery partner registration form
  const [dpName, setDpName] = useState(user?.name || '');
  const [dpPhone, setDpPhone] = useState(user?.phone || '');
  const [dpVehicle, setDpVehicle] = useState<DeliveryPartner['vehicleType']>('Motorcycle (Okada)');
  const [dpAreas, setDpAreas] = useState('');
  const [dpSaving, setDpSaving] = useState(false);

  const currentInstitution = useMemo(
    () => getInstitutionById(selectedInstitutionId, institutions),
    [selectedInstitutionId, institutions]
  );

  useEffect(() => {
    const u1 = subscribeToFoodVendors(setVendors);
    const u2 = subscribeToFoodMenuItems(setMenuItems);
    const u3 = subscribeToDeliveryPartners(setDeliveryPartners);
    const u4 = subscribeToAllFoodOrders(setAllOrders);
    fetchCodPolicy().then(setCodPolicy).catch(() => {});
    fetchPaymentGatewayStatus()
      .then((s) =>
        setGatewayState({
          paystackConfigured: s.paystackConfigured,
          flutterwaveConfigured: s.flutterwaveConfigured
        })
      )
      .catch(() => {});
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, []);

  useEffect(() => {
    const u1 = subscribeToBuyerFoodOrders(currentUid, setBuyerOrders);
    const u2 = subscribeToVendorFoodOrders(currentUid, setVendorOrders);
    return () => {
      u1();
      u2();
    };
  }, [currentUid]);

  const myVendor = useMemo(
    () => vendors.find((v) => v.ownerUid === currentUid) || null,
    [vendors, currentUid]
  );

  const myDeliveryPartner = useMemo(
    () => deliveryPartners.find((p) => p.userUid === currentUid) || null,
    [deliveryPartners, currentUid]
  );

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (v.status === 'suspended') return false;
      if (selectedInstitutionId !== 'all' && !belongsToInstitution(v.institutionId, selectedInstitutionId)) {
        return false;
      }
      return true;
    });
  }, [vendors, selectedInstitutionId]);

  const filteredMenuItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (!item.isAvailable) return false;
      if (selectedInstitutionId !== 'all' && !belongsToInstitution(item.institutionId, selectedInstitutionId)) {
        return false;
      }
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q) &&
        !item.vendorName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [menuItems, selectedInstitutionId, selectedCategory, searchQuery]);

  const cartVendor = useMemo(() => {
    if (cart.length === 0) return null;
    return vendors.find((v) => v.id === cart[0].vendorId) || null;
  }, [cart, vendors]);

  const cartSubtotal = cart.reduce((sum, i) => sum + i.priceNaira * i.quantity, 0);
  const cartDeliveryFee =
    fulfillmentType === 'pickup' ? 0 : cartVendor ? cartVendor.deliveryFeeNaira : 400;
  const cartTotal = cartSubtotal + cartDeliveryFee;

  const handleAddToCart = (item: FoodMenuItem) => {
    setOrderMessage(null);
    if (cart.length > 0 && cart[0].vendorId !== item.vendorId) {
      setOrderMessage({
        type: 'err',
        text: `Your food cart currently has items from "${cart[0].vendorName}". Complete or clear that vendor cart before ordering from another kitchen.`
      });
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === item.id);
      if (idx >= 0) {
        return prev.map((entry, i) =>
          i === idx ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          name: item.name,
          priceNaira: item.priceNaira,
          quantity: 1,
          imageUrl: item.imageUrl
        }
      ];
    });
  };

  const handleSubmitFoodOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (cart.length === 0 || !cartVendor) return;

    if (!buyerPhone.trim() || buyerPhone.trim().length < 10) {
      setOrderMessage({ type: 'err', text: 'Please enter a valid phone/WhatsApp number.' });
      return;
    }
    if (fulfillmentType === 'delivery' && !deliveryAddress.trim()) {
      setOrderMessage({ type: 'err', text: 'Please specify your hostel, department, or delivery spot.' });
      return;
    }
    if (paymentMethod === 'pay_on_delivery' && (!codPolicy.codFoodEnabled || cartTotal > codPolicy.codMaxOrderNaira)) {
      setOrderMessage({
        type: 'err',
        text: `Pay-on-Delivery is disabled or exceeds the ₦${codPolicy.codMaxOrderNaira.toLocaleString()} limit.`
      });
      return;
    }

    setSubmittingOrder(true);
    setOrderMessage(null);
    try {
      const created = await createFoodOrder({
        buyerUid: currentUid,
        buyerName: user?.name || 'Student',
        buyerEmail: user?.email,
        buyerPhone: buyerPhone.trim(),
        vendorId: cartVendor.id,
        vendorName: cartVendor.vendorName,
        vendorOwnerUid: cartVendor.ownerUid,
        institutionId: cartVendor.institutionId,
        fulfillmentType,
        deliveryPoint: fulfillmentType === 'delivery' ? deliveryPoint : undefined,
        deliveryAddress: fulfillmentType === 'pickup' ? `Pickup at ${cartVendor.location}` : `${deliveryPoint}: ${deliveryAddress.trim()}`,
        deliveryNotes: deliveryNotes.trim() || undefined,
        items: cart,
        subtotalNaira: cartSubtotal,
        deliveryFeeNaira: cartDeliveryFee,
        totalNaira: cartTotal,
        paymentMethod,
        paymentStatus: 'unpaid'
      });

      if (paymentMethod === 'paystack' || paymentMethod === 'flutterwave') {
        try {
          const checkout = await initializeOrderCheckout({
            orderType: 'food_order',
            orderId: created.id,
            amountNaira: cartTotal,
            title: `Campus Food (${cartVendor.vendorName})`,
            gateway: paymentMethod,
            userId: currentUid,
            userEmail: user?.email || 'student@nigeriacampusmarket.ng',
            userName: user?.name,
            institutionId: cartVendor.institutionId,
            callbackPath: '/food'
          });
          setCart([]);
          setCheckoutOpen(false);
          window.location.assign(checkout.authorizationUrl);
          return;
        } catch (gwErr: any) {
          setOrderMessage({
            type: 'err',
            text: `Order #${created.id} was saved as unpaid, but online payment initialization could not start: ${gwErr?.message || 'Gateway not configured.'}`
          });
          setCart([]);
          setCheckoutOpen(false);
          setActiveTab('my_orders');
          return;
        }
      }

      setCart([]);
      setCheckoutOpen(false);
      setActiveTab('my_orders');
      setOrderMessage({
        type: 'ok',
        text: `Food order submitted to ${cartVendor.vendorName}! Track live kitchen updates under "My Food Orders".`
      });
    } catch (err: any) {
      setOrderMessage({ type: 'err', text: err?.message || 'Could not place food order.' });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    setVendorSaving(true);
    try {
      await saveFoodVendor({
        id: myVendor?.id,
        ownerUid: currentUid,
        vendorName: vendorFormName.trim() || myVendor?.vendorName || 'Campus Kitchen',
        description: vendorFormDesc.trim() || 'Fresh campus meals prepared daily.',
        institutionId:
          selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId,
        campus: selectedCampus || DEFAULT_INSTITUTION_CAMPUS,
        location: vendorFormLocation.trim() || 'Student Union / Main Gate Area',
        phone: vendorFormPhone.trim(),
        whatsapp: vendorFormPhone.trim(),
        openingHours: vendorFormHours.trim(),
        isOpen: true,
        deliveryFeeNaira: Math.max(0, Number(vendorFormFee) || 0),
        supportsPickup: true,
        supportsDelivery: true,
        categories: ['Rice & Stew', 'Fast Food', 'Student Meal Combos'],
        status: 'active',
        createdAt: myVendor?.createdAt
      } as any);
      setOrderMessage({ type: 'ok', text: 'Food Vendor profile saved successfully!' });
    } catch (err: any) {
      setOrderMessage({ type: 'err', text: err?.message || 'Failed to save vendor profile.' });
    } finally {
      setVendorSaving(false);
    }
  };

  const handleUploadFoodImage = async (file?: File) => {
    if (!file || !currentUid) return;
    setItemUploading(true);
    try {
      const { downloadUrl } = await uploadImageToFirebaseStorage(file, {
        folder: 'food',
        ownerId: currentUid,
        allowPersistentFallback: true
      });
      setItemFormImageUrl(downloadUrl);
    } catch (err: any) {
      setOrderMessage({ type: 'err', text: err?.message || 'Food photo upload failed.' });
    } finally {
      setItemUploading(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myVendor || !currentUid) return;
    const price = Math.max(50, Math.round(Number(itemFormPrice) || 0));
    setItemSaving(true);
    try {
      await saveFoodMenuItem({
        vendorId: myVendor.id,
        vendorName: myVendor.vendorName,
        ownerUid: currentUid,
        institutionId: myVendor.institutionId,
        name: itemFormName.trim(),
        description: itemFormDesc.trim() || 'Freshly prepared campus meal.',
        category: itemFormCat,
        priceNaira: price,
        imageUrl: itemFormImageUrl || undefined,
        prepTimeMinutes: Math.max(5, Number(itemFormPrep) || 20),
        isAvailable: true
      });
      setItemFormName('');
      setItemFormDesc('');
      setItemFormPrice('');
      setItemFormImageUrl('');
      setOrderMessage({ type: 'ok', text: 'Meal added to your menu!' });
    } catch (err: any) {
      setOrderMessage({ type: 'err', text: err?.message || 'Could not add meal.' });
    } finally {
      setItemSaving(false);
    }
  };

  const handleSaveDeliveryPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    setDpSaving(true);
    try {
      await saveDeliveryPartner({
        id: myDeliveryPartner?.id,
        userUid: currentUid,
        fullName: dpName.trim() || user?.name || 'Campus Rider',
        phone: dpPhone.trim(),
        whatsapp: dpPhone.trim(),
        institutionId:
          selectedInstitutionId === 'all' ? DEFAULT_INSTITUTION_ID : selectedInstitutionId,
        campus: selectedCampus || DEFAULT_INSTITUTION_CAMPUS,
        vehicleType: dpVehicle,
        areasCovered: dpAreas.trim() || 'Hostels, Main Gate & Off-campus Lodges',
        isAvailable: true,
        status: 'active',
        completedDeliveries: myDeliveryPartner?.completedDeliveries ?? 0,
        totalEarningsNaira: myDeliveryPartner?.totalEarningsNaira ?? 0
      });
      setOrderMessage({ type: 'ok', text: 'Delivery Partner profile saved!' });
    } catch (err: any) {
      setOrderMessage({ type: 'err', text: err?.message || 'Failed to register delivery partner.' });
    } finally {
      setDpSaving(false);
    }
  };

  const handleAdvanceOrder = async (order: FoodOrder, nextStatus: FoodOrderStatus) => {
    await updateFoodOrderStatus({ order, nextStatus });
    if (nextStatus === 'Delivered' && order.deliveryPartnerUid && myDeliveryPartner && order.deliveryPartnerUid === currentUid) {
      await saveDeliveryPartner({
        ...myDeliveryPartner,
        completedDeliveries: (myDeliveryPartner.completedDeliveries || 0) + 1,
        totalEarningsNaira: (myDeliveryPartner.totalEarningsNaira || 0) + (order.deliveryFeeNaira || 0)
      });
    }
  };

  const availableDeliveries = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.fulfillmentType === 'delivery' &&
        (o.status === 'Ready for Pickup' ||
          (o.status === 'Out for Delivery' && o.deliveryPartnerUid === currentUid) ||
          (o.status === 'Delivered' && o.deliveryPartnerUid === currentUid))
    );
  }, [allOrders, currentUid]);

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#10251D] pb-16">
      {/* Header Banner */}
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#D4A62A]">
                <Utensils className="w-4 h-4" />
                <span>
                  {selectedInstitutionId === 'all'
                    ? 'Nationwide Campus Kitchens'
                    : `${currentInstitution.name} (${currentInstitution.shortName})`}
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
                CAMPUS FOOD &ndash; ORDER YOUR FAVOURITE MEALS
              </h1>
              <p className="text-xs sm:text-sm text-white/90 max-w-2xl">
                Order fresh meals from campus kitchens with clear pickup or hostel delivery pricing, live 7-stage kitchen tracking, and Paystack, Flutterwave, or eligible Pay-on-Delivery.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  { id: 'order', label: 'Browse Meals & Order' },
                  { id: 'my_orders', label: `My Food Orders (${buyerOrders.length})` },
                  { id: 'vendor_portal', label: 'Food Vendor Dashboard' },
                  { id: 'delivery_portal', label: 'Delivery Partner Portal' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition ${
                      activeTab === t.id
                        ? 'bg-[#D4A62A] text-[#10251D]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                {onSwitchInstitution && (
                  <button
                    type="button"
                    onClick={onSwitchInstitution}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#10251D] text-white hover:bg-black"
                  >
                    Switch Campus
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-4 hidden lg:block">
              <img
                src={campusFoodShowcaseImg}
                alt="Fresh Nigerian campus meals"
                className="w-full h-44 object-cover rounded-2xl border-2 border-[#D4A62A] shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {orderMessage && (
          <div
            className={`p-3.5 rounded-2xl border-2 text-xs font-bold flex items-center justify-between gap-2 ${
              orderMessage.type === 'ok'
                ? 'bg-white border-[#087443] text-[#087443]'
                : 'bg-[#FFF8DB] border-[#D4A62A] text-[#10251D]'
            }`}
          >
            <span>{orderMessage.text}</span>
            <button type="button" onClick={() => setOrderMessage(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: ORDER FOOD */}
        {activeTab === 'order' && (
          <div className="space-y-6">
            {/* Search & Food Categories */}
            <div className="bg-white rounded-2xl border border-[#D8E5DD] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#556B60] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search jollof rice, shawarma, swallow, grills, vendor kitchen..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F8F5] border border-[#D8E5DD] focus:border-[#087443] rounded-xl text-xs font-medium text-[#10251D] outline-none"
                  />
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCheckoutOpen(true)}
                    className="px-4 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl inline-flex items-center justify-center gap-2 shrink-0"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span className="tabular-nums">
                      Food Cart ({cart.reduce((s, c) => s + c.quantity, 0)}) &bull; {formatNaira(cartSubtotal)}
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${
                    selectedCategory === 'all'
                      ? 'bg-[#087443] text-white border-[#087443]'
                      : 'bg-[#F4F8F5] text-[#10251D] border-[#D8E5DD]'
                  }`}
                >
                  All Meals
                </button>
                {FOOD_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${
                      selectedCategory === cat
                        ? 'bg-[#087443] text-white border-[#087443]'
                        : 'bg-[#F4F8F5] text-[#10251D] border-[#D8E5DD]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Vendors Row */}
            <div>
              <h2 className="font-display text-lg font-black text-[#10251D] mb-3">
                Campus Food Vendors ({filteredVendors.length})
              </h2>
              {filteredVendors.length === 0 ? (
                <div className="bg-white border border-[#D8E5DD] rounded-2xl p-6 text-center space-y-2">
                  <ChefHat className="w-9 h-9 text-[#087443] mx-auto" />
                  <p className="text-sm font-black">No food vendors registered on this campus yet.</p>
                  <p className="text-xs text-[#556B60]">
                    Own a restaurant, mama put, shawarma grill, or snack spot near campus? Register free in the Food Vendor Dashboard.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('vendor_portal')}
                    className="mt-2 px-4 py-2 bg-[#087443] text-white text-xs font-black rounded-xl"
                  >
                    Register Your Kitchen
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVendors.map((v) => (
                    <div
                      key={v.id}
                      className="bg-white border border-[#D8E5DD] rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 font-black text-sm text-[#10251D]">
                              <span>{v.vendorName}</span>
                              <CeoVerifiedBadge verified={Boolean(v.ceoVerified || v.isVerified)} variant="compact" />
                            </div>
                            <div className="text-[11px] text-[#556B60] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#087443]" />
                              <span>{v.location}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              v.isOpen ? 'bg-[#087443] text-white' : 'bg-[#F4F8F5] text-[#556B60]'
                            }`}
                          >
                            {v.isOpen ? 'OPEN' : 'CLOSED'}
                          </span>
                        </div>
                        <p className="text-xs text-[#374B41] line-clamp-2">{v.description}</p>
                      </div>

                      <div className="pt-2 border-t border-[#D8E5DD] flex items-center justify-between text-[11px] font-bold text-[#556B60]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#087443]" />
                          {v.openingHours}
                        </span>
                        <span className="text-[#087443] tabular-nums">
                          Delivery: {formatNaira(v.deliveryFeeNaira)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu Items Grid */}
            <div>
              <h2 className="font-display text-lg font-black text-[#10251D] mb-3">
                Available Campus Meals ({filteredMenuItems.length})
              </h2>
              {filteredMenuItems.length === 0 ? (
                <div className="bg-white border border-[#D8E5DD] rounded-2xl p-6 text-center text-xs text-[#556B60]">
                  No meals matched your current filter. Vendors can publish live menu items in the Food Vendor Dashboard.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#D8E5DD] rounded-2xl overflow-hidden shadow-sm flex flex-col"
                    >
                      <div className="aspect-[4/3] bg-[#F4F8F5] relative">
                        <ProductImage
                          src={item.imageUrl || campusFoodShowcaseImg}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 bg-[#10251D]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-[#10251D] line-clamp-1">{item.name}</h3>
                          <p className="text-[11px] text-[#087443] font-bold truncate">{item.vendorName}</p>
                          <p className="text-xs text-[#556B60] line-clamp-2 mt-1">{item.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#D8E5DD]">
                          <div>
                            <span className="text-sm font-black text-[#10251D] tabular-nums">
                              {formatNaira(item.priceNaira)}
                            </span>
                            <span className="block text-[10px] text-[#556B60]">
                              ~{item.prepTimeMinutes} mins prep
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className="px-3 py-2 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black rounded-xl inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#D4A62A]" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY FOOD ORDERS (REAL-TIME 7-STAGE TRACKER) */}
        {activeTab === 'my_orders' && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-black text-[#10251D]">
              Live Food Order Tracking
            </h2>
            {buyerOrders.length === 0 ? (
              <div className="bg-white border border-[#D8E5DD] rounded-2xl p-8 text-center space-y-2">
                <PackageCheck className="w-10 h-10 text-[#087443] mx-auto" />
                <p className="text-sm font-black">No food orders placed yet.</p>
                <p className="text-xs text-[#556B60]">
                  Browse meals to place a campus pickup or hostel delivery order.
                </p>
              </div>
            ) : (
              buyerOrders.map((order) => {
                const activeStageIdx = FOOD_ORDER_STAGES.indexOf(order.status);
                return (
                  <div key={order.id} className="bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8E5DD] pb-3">
                      <div>
                        <div className="font-black text-sm text-[#10251D]">
                          {order.vendorName} &bull;{' '}
                          <span className="text-[#087443] tabular-nums">{formatNaira(order.totalNaira)}</span>
                        </div>
                        <div className="text-[11px] text-[#556B60]">
                          Ref: {order.id} &bull; {order.fulfillmentType.toUpperCase()} ({order.deliveryAddress}) &bull;{' '}
                          Payment: {order.paymentMethod.replace(/_/g, ' ')} ({order.paymentStatus})
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-[#087443] text-[#D4A62A] text-xs font-black">
                        {order.status}
                      </span>
                    </div>

                    {order.status !== 'Cancelled' && (
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                        {FOOD_ORDER_STAGES.map((stage, idx) => {
                          const done = activeStageIdx >= idx;
                          return (
                            <div
                              key={stage}
                              className={`p-2 rounded-xl border text-center text-[11px] font-bold ${
                                done
                                  ? 'bg-[#087443] border-[#087443] text-white'
                                  : 'bg-[#F4F8F5] border-[#D8E5DD] text-[#556B60]'
                              }`}
                            >
                              {stage}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="text-xs text-[#374B41] flex flex-wrap gap-3">
                      {order.items.map((it) => (
                        <span key={it.menuItemId} className="font-semibold">
                          {it.quantity}x {it.name} ({formatNaira(it.priceNaira * it.quantity)})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: FOOD VENDOR DASHBOARD */}
        {activeTab === 'vendor_portal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-4">
              <h2 className="font-display text-base font-black text-[#10251D] flex items-center gap-2">
                <Store className="w-5 h-5 text-[#087443]" />
                <span>{myVendor ? 'Update Vendor Kitchen Profile' : 'Register Food Vendor Kitchen'}</span>
              </h2>
              <form onSubmit={handleSaveVendor} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  value={vendorFormName || myVendor?.vendorName || ''}
                  onChange={(e) => setVendorFormName(e.target.value)}
                  placeholder="Kitchen / Restaurant Name *"
                  className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none focus:border-[#087443]"
                />
                <input
                  type="text"
                  required
                  value={vendorFormLocation || myVendor?.location || ''}
                  onChange={(e) => setVendorFormLocation(e.target.value)}
                  placeholder="Campus Location (e.g. Behind LT, Main Gate) *"
                  className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none focus:border-[#087443]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    required
                    value={vendorFormPhone || myVendor?.phone || ''}
                    onChange={(e) => setVendorFormPhone(e.target.value)}
                    placeholder="Phone / WhatsApp *"
                    className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none focus:border-[#087443]"
                  />
                  <input
                    type="number"
                    min={0}
                    value={vendorFormFee}
                    onChange={(e) => setVendorFormFee(e.target.value)}
                    placeholder="Delivery Fee (₦)"
                    className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none focus:border-[#087443]"
                  />
                </div>
                <input
                  type="text"
                  value={vendorFormHours}
                  onChange={(e) => setVendorFormHours(e.target.value)}
                  placeholder="Opening Hours (e.g. 8:00 AM – 9:00 PM)"
                  className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none focus:border-[#087443]"
                />
                <textarea
                  rows={2}
                  value={vendorFormDesc || myVendor?.description || ''}
                  onChange={(e) => setVendorFormDesc(e.target.value)}
                  placeholder="Describe your specialties..."
                  className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none focus:border-[#087443]"
                />
                <button
                  type="submit"
                  disabled={vendorSaving}
                  className="w-full py-2.5 bg-[#087443] hover:bg-[#065D36] text-white font-black rounded-xl"
                >
                  {vendorSaving ? 'Saving Kitchen...' : myVendor ? 'Save Kitchen Updates' : 'Register Kitchen Free'}
                </button>
              </form>

              {myVendor && (
                <div className="pt-4 border-t border-[#D8E5DD] space-y-3">
                  <h3 className="font-black text-xs uppercase text-[#087443]">Add Meal to Menu</h3>
                  <form onSubmit={handleAddMenuItem} className="space-y-2.5 text-xs">
                    <input
                      type="text"
                      required
                      value={itemFormName}
                      onChange={(e) => setItemFormName(e.target.value)}
                      placeholder="Meal Name (e.g. Jollof Rice & Grilled Chicken) *"
                      className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none focus:border-[#087443]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={itemFormCat}
                        onChange={(e) => setItemFormCat(e.target.value as FoodCategoryId)}
                        className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
                      >
                        {FOOD_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        required
                        min={50}
                        value={itemFormPrice}
                        onChange={(e) => setItemFormPrice(e.target.value)}
                        placeholder="Price (₦) *"
                        className="p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        value={itemFormPrep}
                        onChange={(e) => setItemFormPrep(e.target.value)}
                        placeholder="Prep mins"
                        className="w-28 p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
                      />
                      <label className="flex-1 p-2.5 bg-[#F4F8F5] border border-dashed border-[#087443] rounded-xl text-center cursor-pointer font-bold text-[#087443]">
                        {itemUploading ? 'Uploading Photo...' : itemFormImageUrl ? 'Meal Photo Uploaded' : 'Upload Meal Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadFoodImage(e.target.files?.[0])}
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={itemFormDesc}
                      onChange={(e) => setItemFormDesc(e.target.value)}
                      placeholder="Short description / portions"
                      className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
                    />
                    <button
                      type="submit"
                      disabled={itemSaving || itemUploading}
                      className="w-full py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black rounded-xl inline-flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{itemSaving ? 'Adding...' : 'Publish Meal'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-5">
              {/* Vendor Live Orders */}
              <div className="bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-3">
                <h3 className="font-display text-base font-black text-[#10251D]">
                  Incoming Kitchen Orders ({vendorOrders.length})
                </h3>
                {vendorOrders.length === 0 ? (
                  <p className="text-xs text-[#556B60]">No incoming kitchen orders yet.</p>
                ) : (
                  <div className="space-y-3">
                    {vendorOrders.map((order) => (
                      <div key={order.id} className="p-3.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between font-black">
                          <span>
                            {order.buyerName} ({order.buyerPhone}) &bull; {formatNaira(order.totalNaira)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A]">{order.status}</span>
                        </div>
                        <div className="text-[#374B41]">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')} &bull; {order.deliveryAddress}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(['Order Accepted', 'Preparing Food', 'Ready for Pickup', 'Out for Delivery', 'Delivered', 'Cancelled'] as FoodOrderStatus[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleAdvanceOrder(order, st)}
                              className={`px-2.5 py-1 rounded-lg font-bold border ${
                                order.status === st
                                  ? 'bg-[#087443] text-white border-[#087443]'
                                  : 'bg-white text-[#10251D] border-[#D8E5DD] hover:border-[#087443]'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* My Menu Items */}
              {myVendor && (
                <div className="bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-3">
                  <h3 className="font-display text-base font-black text-[#10251D]">
                    My Published Meals
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {menuItems
                      .filter((m) => m.vendorId === myVendor.id)
                      .map((m) => (
                        <div
                          key={m.id}
                          className="p-3 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-black truncate">{m.name}</div>
                            <div className="text-[#087443] font-bold">{formatNaira(m.priceNaira)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteFoodMenuItem(m.id)}
                            className="p-2 text-red-600 hover:bg-white rounded-lg"
                            title="Delete Meal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: DELIVERY PARTNER PORTAL */}
        {activeTab === 'delivery_portal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-4">
              <h2 className="font-display text-base font-black text-[#10251D] flex items-center gap-2">
                <Bike className="w-5 h-5 text-[#087443]" />
                <span>{myDeliveryPartner ? 'Delivery Partner Profile' : 'Register as Campus Delivery Partner'}</span>
              </h2>
              {myDeliveryPartner && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl text-xs">
                  <div>
                    <div className="text-[#556B60]">Completed Runs</div>
                    <div className="text-xl font-black text-[#087443] tabular-nums">
                      {myDeliveryPartner.completedDeliveries}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#556B60]">Delivery Fees Recorded</div>
                    <div className="text-xl font-black text-[#10251D] tabular-nums">
                      {formatNaira(myDeliveryPartner.totalEarningsNaira)}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveDeliveryPartner} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  value={dpName}
                  onChange={(e) => setDpName(e.target.value)}
                  placeholder="Full Name *"
                  className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
                />
                <input
                  type="tel"
                  required
                  value={dpPhone}
                  onChange={(e) => setDpPhone(e.target.value)}
                  placeholder="Phone & WhatsApp *"
                  className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
                />
                <select
                  value={dpVehicle}
                  onChange={(e) => setDpVehicle(e.target.value as any)}
                  className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
                >
                  <option value="Motorcycle (Okada)">Motorcycle (Okada)</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Tricycle (Keke)">Tricycle (Keke)</option>
                  <option value="On Foot">On Foot (Hostel Runner)</option>
                  <option value="Car">Car</option>
                </select>
                <input
                  type="text"
                  value={dpAreas}
                  onChange={(e) => setDpAreas(e.target.value)}
                  placeholder="Campus Areas Covered *"
                  className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
                />
                <button
                  type="submit"
                  disabled={dpSaving}
                  className="w-full py-2.5 bg-[#087443] hover:bg-[#065D36] text-white font-black rounded-xl"
                >
                  {dpSaving ? 'Saving...' : myDeliveryPartner ? 'Update Partner Profile' : 'Join Delivery Network'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white border border-[#D8E5DD] rounded-2xl p-5 space-y-4">
              <h3 className="font-display text-base font-black text-[#10251D] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#087443]" />
                <span>Available Campus Food Delivery Runs ({availableDeliveries.length})</span>
              </h3>
              {availableDeliveries.length === 0 ? (
                <p className="text-xs text-[#556B60]">
                  No orders are currently marked &quot;Ready for Pickup&quot; for delivery.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableDeliveries.map((o) => (
                    <div key={o.id} className="p-3.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl text-xs space-y-2">
                      <div className="flex justify-between font-black">
                        <span>{o.vendorName} &rarr; {o.deliveryAddress}</span>
                        <span className="text-[#087443] tabular-nums">Fee: {formatNaira(o.deliveryFeeNaira)}</span>
                      </div>
                      <div className="text-[#556B60]">
                        Buyer: {o.buyerName} ({o.buyerPhone}) &bull; Status: <strong>{o.status}</strong>
                      </div>
                      <div className="flex gap-2">
                        {o.status === 'Ready for Pickup' && myDeliveryPartner && (
                          <button
                            type="button"
                            onClick={() =>
                              updateFoodOrderStatus({
                                order: o,
                                nextStatus: 'Out for Delivery',
                                deliveryPartnerUid: currentUid,
                                deliveryPartnerName: myDeliveryPartner.fullName,
                                deliveryPartnerPhone: myDeliveryPartner.phone
                              })
                            }
                            className="px-3 py-1.5 bg-[#087443] text-white font-black rounded-lg"
                          >
                            Accept &amp; Start Delivery
                          </button>
                        )}
                        {o.status === 'Out for Delivery' && o.deliveryPartnerUid === currentUid && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceOrder(o, 'Delivered')}
                            className="px-3 py-1.5 bg-[#D4A62A] text-[#10251D] font-black rounded-lg"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#D8E5DD] overflow-hidden shadow-2xl my-4">
            <div className="bg-[#087443] border-b-4 border-[#D4A62A] px-5 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="text-sm font-black uppercase">Complete Campus Food Order</h3>
                <p className="text-[11px] text-white/90">{cartVendor?.vendorName}</p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFoodOrder} className="p-5 space-y-4 text-xs">
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {cart.map((c) => (
                  <div key={c.menuItemId} className="flex items-center justify-between bg-[#F4F8F5] p-2.5 rounded-xl">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{c.name}</div>
                      <div className="text-[#087443] font-black">{formatNaira(c.priceNaira * c.quantity)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) =>
                            prev
                              .map((x) =>
                                x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity - 1 } : x
                              )
                              .filter((x) => x.quantity > 0)
                          )
                        }
                        className="w-6 h-6 bg-white border border-[#D8E5DD] rounded flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black w-5 text-center">{c.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((x) =>
                              x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity + 1 } : x
                            )
                          )
                        }
                        className="w-6 h-6 bg-white border border-[#D8E5DD] rounded flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('delivery')}
                  className={`p-2.5 rounded-xl border font-black ${
                    fulfillmentType === 'delivery'
                      ? 'bg-[#087443] text-white border-[#087443]'
                      : 'bg-[#F4F8F5] text-[#10251D] border-[#D8E5DD]'
                  }`}
                >
                  Delivery ({formatNaira(cartVendor?.deliveryFeeNaira ?? 400)})
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType('pickup')}
                  className={`p-2.5 rounded-xl border font-black ${
                    fulfillmentType === 'pickup'
                      ? 'bg-[#087443] text-white border-[#087443]'
                      : 'bg-[#F4F8F5] text-[#10251D] border-[#D8E5DD]'
                  }`}
                >
                  Self Pickup (₦0)
                </button>
              </div>

              {fulfillmentType === 'delivery' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(['Hostel', 'Department', 'Gate', 'Off-campus'] as const).map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setDeliveryPoint(pt)}
                        className={`py-1.5 px-2 rounded-lg border font-bold ${
                          deliveryPoint === pt
                            ? 'bg-[#10251D] text-white border-[#10251D]'
                            : 'bg-[#F4F8F5] border-[#D8E5DD]'
                        }`}
                      >
                        {pt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={`Enter ${deliveryPoint} name / room / landmark *`}
                    className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
                  />
                </div>
              )}

              <input
                type="tel"
                required
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="Your Phone / WhatsApp *"
                className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
              />
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Spice preference or drop-off note (optional)"
                className="w-full p-2.5 bg-[#F4F8F5] border border-[#D8E5DD] rounded-xl outline-none"
              />

              {/* Payment Method */}
              <div className="space-y-1.5">
                <div className="font-black uppercase text-[11px] text-[#556B60]">Payment Option</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {codPolicy.codFoodEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pay_on_delivery')}
                      className={`p-2 rounded-xl border font-bold ${
                        paymentMethod === 'pay_on_delivery'
                          ? 'bg-[#087443] text-white border-[#087443]'
                          : 'bg-[#F4F8F5] border-[#D8E5DD]'
                      }`}
                    >
                      Pay on Delivery
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paystack')}
                    disabled={!gatewayState.paystackConfigured}
                    className={`p-2 rounded-xl border font-bold ${
                      paymentMethod === 'paystack'
                        ? 'bg-[#087443] text-white border-[#087443]'
                        : 'bg-[#F4F8F5] border-[#D8E5DD] disabled:opacity-50'
                    }`}
                  >
                    Paystack {!gatewayState.paystackConfigured && '(Unset)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('flutterwave')}
                    disabled={!gatewayState.flutterwaveConfigured}
                    className={`p-2 rounded-xl border font-bold ${
                      paymentMethod === 'flutterwave'
                        ? 'bg-[#087443] text-white border-[#087443]'
                        : 'bg-[#F4F8F5] border-[#D8E5DD] disabled:opacity-50'
                    }`}
                  >
                    Flutterwave {!gatewayState.flutterwaveConfigured && '(Unset)'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#F4F8F5] rounded-xl space-y-1 tabular-nums">
                <div className="flex justify-between">
                  <span>Meal Subtotal</span>
                  <span className="font-bold">{formatNaira(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-bold">{formatNaira(cartDeliveryFee)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-[#087443] pt-1 border-t border-[#D8E5DD]">
                  <span>Total Payable</span>
                  <span>{formatNaira(cartTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingOrder}
                className="w-full py-3 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black rounded-xl text-xs"
              >
                {submittingOrder ? 'Submitting Order...' : `Confirm Order (${formatNaira(cartTotal)})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
