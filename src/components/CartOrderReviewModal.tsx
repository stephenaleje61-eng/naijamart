import React, { useState } from 'react';
import { useEffect } from 'react';
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  MessageCircle,
  AlertCircle,
  Loader2,
  Info,
  CreditCard
} from 'lucide-react';
import { CartItem, CodPolicySettings, OrderRecord } from '../types.js';
import { formatNaira } from './ProductCard.js';
import { ProductImage } from './ProductImage.js';
import { createOrderInFirestore } from '../services/firebase.js';
import { useAuth } from '../context/AuthContext.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';
import { fetchCodPolicy } from '../services/campusEcosystem.js';
import { fetchPaymentGatewayStatus, initializeOrderCheckout } from '../services/monetization.js';
import { DEFAULT_INSTITUTION_ID } from '../constants/institutions.js';

interface CartOrderReviewModalProps {
  isOpen: boolean;
  items: CartItem[];
  institutionId?: string;
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

const CAMPUS_DELIVERY_POINTS = [
  'FUWukari Main Gate (₦0 Meetup)',
  'FUWukari New Site / Lecture Halls (₦0 Meetup)',
  'Student Hostels / Behind LT (₦500 Campus Rider)',
  'Puje / Bye Pass / Hospital Road (₦700 Okada Delivery)',
  'Wukari Market / Old Market (₦700 Okada Delivery)'
];

export const CartOrderReviewModal: React.FC<CartOrderReviewModalProps> = ({
  isOpen,
  items,
  institutionId = DEFAULT_INSTITUTION_ID,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart
}) => {
  const { user, firebaseUser } = useAuth();
  const studentSession = getLocalStudentSession();

  const [buyerName, setBuyerName] = useState(user?.name || studentSession?.name || '');
  const [buyerPhone, setBuyerPhone] = useState(
    user?.whatsappNumber || user?.phone || studentSession?.phone || ''
  );
  const [deliveryLocation, setDeliveryLocation] = useState(CAMPUS_DELIVERY_POINTS[0]);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<OrderRecord['paymentMethod']>(
    'pay_on_inspection'
  );
  const [codPolicy, setCodPolicy] = useState<CodPolicySettings>({
    codEnabled: true,
    codFoodEnabled: true,
    codMaxOrderNaira: 150000,
    codNote: ''
  });
  const [gatewayState, setGatewayState] = useState({
    paystackConfigured: false,
    flutterwaveConfigured: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchCodPolicy().then(setCodPolicy).catch(() => {});
    fetchPaymentGatewayStatus()
      .then((s) =>
        setGatewayState({
          paystackConfigured: s.paystackConfigured,
          flutterwaveConfigured: s.flutterwaveConfigured
        })
      )
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee =
    deliveryLocation.includes('₦500')
      ? 500
      : deliveryLocation.includes('₦700')
      ? 700
      : 0;
  const totalAmount = subtotal + deliveryFee;

  const buildSellerWaLink = (item: CartItem, orderId?: string) => {
    let cleaned = (item.whatsappNumber || '').replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (cleaned && !cleaned.startsWith('234')) cleaned = '234' + cleaned;
    const text = encodeURIComponent(
      `Hello ${item.shopName || item.sellerName}, I placed an order on NIGERIA CAMPUS MARKET${
        orderId ? ` (Ref: ${orderId})` : ''
      }:\n- ${item.quantity}x ${item.title} (${formatNaira(item.price * item.quantity)})\nPickup/Delivery: ${deliveryLocation}\nPayment: ${paymentMethod.replace(/_/g, ' ')}`
    );
    return `https://wa.me/${cleaned}?text=${text}`;
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (!buyerName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!buyerPhone.trim() || buyerPhone.trim().length < 10) {
      setError('Please enter a valid phone / WhatsApp number so the seller can confirm pickup.');
      return;
    }

    if (paymentMethod === 'pay_on_delivery' && (!codPolicy.codEnabled || totalAmount > codPolicy.codMaxOrderNaira)) {
      setError(`Cash on Delivery is unavailable for orders above ₦${codPolicy.codMaxOrderNaira.toLocaleString()}.`);
      return;
    }

    setSubmitting(true);
    try {
      const buyerUid = firebaseUser?.uid || user?.id || studentSession?.id || `guest_${Date.now()}`;
      const savedOrder = await createOrderInFirestore({
        buyerId: buyerUid,
        buyerName: buyerName.trim(),
        buyerEmail: user?.email,
        buyerPhone: buyerPhone.trim(),
        institutionId,
        deliveryLocation,
        deliveryNotes: deliveryNotes.trim() || undefined,
        items,
        subtotal,
        deliveryFee,
        totalAmount,
        paymentMethod,
        paymentStatus: 'unpaid'
      });

      if (paymentMethod === 'paystack' || paymentMethod === 'flutterwave') {
        try {
          const checkout = await initializeOrderCheckout({
            orderType: 'product_order',
            orderId: savedOrder.id,
            amountNaira: totalAmount,
            title: `NIGERIA CAMPUS MARKET (${items.length} item${items.length > 1 ? 's' : ''})`,
            gateway: paymentMethod,
            userId: buyerUid,
            userEmail: user?.email || 'student@nigeriacampusmarket.ng',
            userName: buyerName.trim(),
            institutionId,
            callbackPath: '/orders'
          });
          onClearCart();
          window.location.assign(checkout.authorizationUrl);
          return;
        } catch (gwErr: any) {
          setConfirmedOrder(savedOrder);
          onClearCart();
          setError(
            `Order saved as unpaid, but online gateway could not initialize: ${gwErr?.message || 'Gateway unavailable.'}`
          );
          return;
        }
      }

      setConfirmedOrder(savedOrder);
      onClearCart();
    } catch (err: any) {
      setError(err?.message || 'Could not save order to database. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#10251D]">
        {/* Green Header */}
        <div className="bg-[#087443] border-b-4 border-[#D4A62A] px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-[#D4A62A]" />
            <div>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                {confirmedOrder ? 'Order Saved & Ready' : 'Review Cart & Checkout'}
              </h2>
              <p className="text-[11px] text-white/90">
                NIGERIA CAMPUS MARKET • Verify quantities, seller details, and payment method
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#065D36] border border-white/25 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[82vh] overflow-y-auto space-y-5 bg-white">
          {confirmedOrder ? (
            <div className="space-y-4">
              <div className="bg-[#F4F8F5] border-2 border-[#087443] rounded-2xl p-4 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#087443] mx-auto" />
                <h3 className="text-base font-black text-[#10251D]">
                  Order Recorded (Ref: {confirmedOrder.id})
                </h3>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Your order summary ({formatNaira(confirmedOrder.totalAmount)}) is saved. Message the seller on WhatsApp to confirm meetup and inspect before paying.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-[#555555] tracking-wider">
                  Confirm Directly with Seller(s) on WhatsApp
                </h4>
                {confirmedOrder.items.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-[#F4F8F5] border border-[#E5E7EB] rounded-2xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#10251D] truncate">
                        {item.quantity}x {item.title}
                      </p>
                      <p className="text-[11px] text-[#555555]">
                        Seller: {item.shopName || item.sellerName} • {formatNaira(item.price * item.quantity)}
                      </p>
                    </div>
                    {item.whatsappNumber && (
                      <a
                        href={buildSellerWaLink(item, confirmedOrder.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black rounded-xl flex items-center gap-1.5 shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  onClose();
                }}
                className="w-full py-3 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs sm:text-sm font-black rounded-xl"
              >
                Done
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <ShoppingCart className="w-12 h-12 text-[#087443] mx-auto" />
              <h3 className="text-sm font-black text-[#10251D]">
                Your NIGERIA CAMPUS MARKET cart is empty
              </h3>
              <p className="text-xs text-[#555555]">
                Add items from the marketplace to review your order before meetup.
              </p>
            </div>
          ) : (
            <form onSubmit={handleConfirmOrder} className="space-y-5">
              {error && (
                <div className="p-3 bg-[#FFF8DB] border-2 border-[#10251D] text-[#10251D] text-xs rounded-xl flex items-start gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#10251D]" />
                  <span>{error}</span>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase text-[#555555] tracking-wider">
                  Items in Your Order ({items.length})
                </h3>
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-[#F4F8F5] border border-[#E5E7EB] rounded-2xl p-3 flex items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#E5E7EB] shrink-0 bg-white">
                      <ProductImage src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#10251D] truncate">{item.title}</h4>
                      <p className="text-[11px] text-[#555555] truncate">
                        Seller: {item.shopName || item.sellerName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A]">
                          {formatNaira(item.price)}
                        </span>
                        <span className="text-[11px] text-[#555555]">
                          • Line: <strong className="text-[#10251D]">{formatNaira(item.price * item.quantity)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          item.quantity > 1
                            ? onUpdateQuantity(item.productId, item.quantity - 1)
                            : onRemoveItem(item.productId)
                        }
                        className="w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] text-[#10251D] flex items-center justify-center hover:border-[#087443]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-[#10251D]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(
                            item.productId,
                            Math.min(item.maxQuantity || 20, item.quantity + 1)
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] text-[#10251D] flex items-center justify-center hover:border-[#087443]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId)}
                        className="w-7 h-7 rounded-lg bg-[#10251D] text-white flex items-center justify-center hover:bg-[#065D36]"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Buyer & Delivery Details */}
              <div className="bg-[#F4F8F5] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black uppercase text-[#087443] tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#087443]" />
                  <span>Buyer &amp; Campus Meetup Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#333333] mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Student full name"
                      className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-xs text-[#10251D] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#333333] mb-1">Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="080..."
                      className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-xs text-[#10251D] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#333333] mb-1">Delivery / Meetup Point</label>
                  <select
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-xs text-[#10251D] outline-none"
                  >
                    {CAMPUS_DELIVERY_POINTS.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#333333] mb-1">Notes for Seller (Optional)</label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Preferred time or hostel block..."
                    className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#087443] rounded-xl text-xs text-[#10251D] outline-none"
                  />
                </div>
              </div>

              {/* Payment Verification */}
              <div className="bg-[#F4F8F5] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black uppercase text-[#087443] tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#087443]" />
                  <span>Payment Verification Method</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_on_inspection')}
                    className={`p-3 rounded-xl border text-left transition ${
                      paymentMethod === 'pay_on_inspection'
                        ? 'bg-[#087443] border-[#087443] text-white'
                        : 'bg-white border-[#E5E7EB] text-[#444444]'
                    }`}
                  >
                    <div className="text-xs font-black">Pay on Campus Inspection</div>
                    <div className={`text-[10px] mt-0.5 ${paymentMethod === 'pay_on_inspection' ? 'text-[#D4A62A]' : 'text-[#555555]'}`}>
                      Inspect item in person before paying
                    </div>
                  </button>

                  {codPolicy.codEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pay_on_delivery')}
                      className={`p-3 rounded-xl border text-left transition ${
                        paymentMethod === 'pay_on_delivery'
                          ? 'bg-[#087443] border-[#087443] text-white'
                          : 'bg-white border-[#E5E7EB] text-[#444444]'
                      }`}
                    >
                      <div className="text-xs font-black">Pay on Delivery (COD)</div>
                      <div className={`text-[10px] mt-0.5 ${paymentMethod === 'pay_on_delivery' ? 'text-[#D4A62A]' : 'text-[#555555]'}`}>
                        Up to ₦{codPolicy.codMaxOrderNaira.toLocaleString()} eligible campus orders
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!gatewayState.paystackConfigured}
                    onClick={() => setPaymentMethod('paystack')}
                    className={`p-3 rounded-xl border text-left transition ${
                      paymentMethod === 'paystack'
                        ? 'bg-[#087443] border-[#087443] text-white'
                        : 'bg-white border-[#E5E7EB] text-[#444444] disabled:opacity-50'
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Online via Paystack</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${paymentMethod === 'paystack' ? 'text-[#D4A62A]' : 'text-[#555555]'}`}>
                      {gatewayState.paystackConfigured ? 'Card, Bank Transfer & USSD (NGN)' : 'Gateway keys not configured'}
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!gatewayState.flutterwaveConfigured}
                    onClick={() => setPaymentMethod('flutterwave')}
                    className={`p-3 rounded-xl border text-left transition ${
                      paymentMethod === 'flutterwave'
                        ? 'bg-[#087443] border-[#087443] text-white'
                        : 'bg-white border-[#E5E7EB] text-[#444444] disabled:opacity-50'
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Online via Flutterwave</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${paymentMethod === 'flutterwave' ? 'text-[#D4A62A]' : 'text-[#555555]'}`}>
                      {gatewayState.flutterwaveConfigured ? 'Instant Nigerian online checkout' : 'Gateway keys not configured'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('whatsapp_arrangement')}
                    className={`p-3 rounded-xl border text-left transition sm:col-span-2 ${
                      paymentMethod === 'whatsapp_arrangement'
                        ? 'bg-[#087443] border-[#087443] text-white'
                        : 'bg-white border-[#E5E7EB] text-[#444444]'
                    }`}
                  >
                    <div className="text-xs font-black">WhatsApp Direct Confirmation</div>
                    <div className={`text-[10px] mt-0.5 ${paymentMethod === 'whatsapp_arrangement' ? 'text-[#D4A62A]' : 'text-[#555555]'}`}>
                      Coordinate transfer &amp; meetup directly with seller
                    </div>
                  </button>
                </div>

                <div className="p-2.5 bg-white border border-[#E5E7EB] rounded-xl flex items-start gap-2 text-[11px] text-[#555555]">
                  <Info className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
                  <span>
                    To protect students from scams, confirm your order here and pay only after physical inspection.
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-[#F4F8F5] border border-[#E5E7EB] rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-[#555555]">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-[#10251D]">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#555555]">
                  <span>Estimated Campus Delivery / Rider Fee</span>
                  <span className="font-bold text-[#10251D]">
                    {deliveryFee === 0 ? '₦0 (Campus Meetup)' : formatNaira(deliveryFee)}
                  </span>
                </div>
                <div className="border-t border-[#E5E7EB] pt-2 flex justify-between text-sm font-black text-[#10251D]">
                  <span>Final Total</span>
                  <span className="px-2.5 py-0.5 rounded bg-[#087443] text-[#D4A62A]">
                    {formatNaira(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-[#555555] hover:text-[#10251D] rounded-xl"
                >
                  Continue Shopping
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs sm:text-sm font-black rounded-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Order...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#087443]" />
                      <span>Confirm &amp; Save Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
