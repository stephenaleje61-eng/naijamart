import React, { useState } from 'react';
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
  Info
} from 'lucide-react';
import { CartItem, OrderRecord } from '../types.js';
import { formatNaira } from './ProductCard.js';
import { ProductImage } from './ProductImage.js';
import { createOrderInFirestore } from '../services/firebase.js';
import { useAuth } from '../context/AuthContext.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';

interface CartOrderReviewModalProps {
  isOpen: boolean;
  items: CartItem[];
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
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart
}) => {
  const { user } = useAuth();
  const studentSession = getLocalStudentSession();

  const [buyerName, setBuyerName] = useState(user?.name || studentSession?.name || '');
  const [buyerPhone, setBuyerPhone] = useState(
    user?.whatsappNumber || user?.phone || studentSession?.phone || ''
  );
  const [deliveryLocation, setDeliveryLocation] = useState(CAMPUS_DELIVERY_POINTS[0]);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pay_on_inspection' | 'whatsapp_arrangement'>(
    'pay_on_inspection'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

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
      `Hello ${item.shopName || item.sellerName}, I placed an order on FU MARKET${
        orderId ? ` (Ref: ${orderId})` : ''
      }:\n- ${item.quantity}x ${item.title} (${formatNaira(item.price * item.quantity)})\nPickup/Delivery: ${deliveryLocation}\nPayment: Pay on Inspection`
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

    setSubmitting(true);
    try {
      const savedOrder = await createOrderInFirestore({
        buyerId: user?.id || studentSession?.id || `guest_${Date.now()}`,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        deliveryLocation,
        deliveryNotes: deliveryNotes.trim() || undefined,
        items,
        subtotal,
        deliveryFee,
        totalAmount,
        paymentMethod
      });
      setConfirmedOrder(savedOrder);
      onClearCart();
    } catch (err: any) {
      setError(err?.message || 'Could not save order to database. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="bg-[#1C1C1C] border-b border-[#333333] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-[#FFFFFF]" />
            <div>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                {confirmedOrder ? 'Order Saved & Ready for Confirmation' : 'REVIEW ORDER BEFORE PAYMENT'}
              </h2>
              <p className="text-[11px] text-[#BDBDBD]">
                FU MARKET • Verify quantities, seller details, and delivery breakdown
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#121212] border border-[#333333] text-[#BDBDBD] hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[82vh] overflow-y-auto space-y-5">
          {confirmedOrder ? (
            <div className="space-y-4">
              <div className="bg-emerald-950/50 border border-emerald-700 rounded-2xl p-4 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-black text-white">
                  Order Recorded (Ref: {confirmedOrder.id})
                </h3>
                <p className="text-xs text-[#BDBDBD] leading-relaxed">
                  Your order summary ({formatNaira(confirmedOrder.totalAmount)}) has been saved in Firestore. Confirm meetup and inspect your item(s) directly with each seller below before paying.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-[#BDBDBD] tracking-wider">
                  Confirm Directly with Seller(s) on WhatsApp
                </h4>
                {confirmedOrder.items.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {item.quantity}x {item.title}
                      </p>
                      <p className="text-[11px] text-[#BDBDBD]">
                        Seller: {item.shopName || item.sellerName} • {formatNaira(item.price * item.quantity)}
                      </p>
                    </div>
                    {item.whatsappNumber && (
                      <a
                        href={buildSellerWaLink(item, confirmedOrder.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-[#25D366] hover:bg-[#20BA5C] text-black text-xs font-black rounded-xl flex items-center gap-1.5 shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Send Order</span>
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
                className="w-full py-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black text-xs sm:text-sm font-black rounded-xl"
              >
                Done
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <ShoppingCart className="w-12 h-12 text-[#333333] mx-auto" />
              <h3 className="text-sm font-black text-white">Your FU MARKET cart is empty</h3>
              <p className="text-xs text-[#BDBDBD]">
                Add products from the Student Marketplace to review your order before payment.
              </p>
            </div>
          ) : (
            <form onSubmit={handleConfirmOrder} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-950/60 border border-red-700 text-red-200 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase text-[#BDBDBD] tracking-wider">
                  Items in Your Order ({items.length})
                </h3>
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-3 flex items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#333333] shrink-0">
                      <ProductImage src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{item.title}</h4>
                      <p className="text-[11px] text-[#BDBDBD] truncate">
                        Seller: {item.shopName || item.sellerName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-[#FFFFFF]">
                          {formatNaira(item.price)}
                        </span>
                        <span className="text-[11px] text-[#BDBDBD]">
                          • Line total: <strong className="text-white">{formatNaira(item.price * item.quantity)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          item.quantity > 1
                            ? onUpdateQuantity(item.productId, item.quantity - 1)
                            : onRemoveItem(item.productId)
                        }
                        className="w-7 h-7 rounded-lg bg-[#121212] border border-[#333333] text-white flex items-center justify-center hover:border-[#FFFFFF]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-white">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(
                            item.productId,
                            Math.min(item.maxQuantity || 20, item.quantity + 1)
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-[#121212] border border-[#333333] text-white flex items-center justify-center hover:border-[#FFFFFF]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId)}
                        className="w-7 h-7 rounded-lg bg-red-950/60 border border-red-800 text-red-300 flex items-center justify-center hover:bg-red-900"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Buyer & Delivery Details */}
              <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black uppercase text-[#BDBDBD] tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FFFFFF]" />
                  <span>Buyer &amp; Campus Meetup Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#BDBDBD] mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Student full name"
                      className="w-full p-2.5 bg-[#121212] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#BDBDBD] mb-1">Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="080..."
                      className="w-full p-2.5 bg-[#121212] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#BDBDBD] mb-1">Delivery / Meetup Point</label>
                  <select
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full p-2.5 bg-[#121212] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs text-white outline-none"
                  >
                    {CAMPUS_DELIVERY_POINTS.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#BDBDBD] mb-1">Notes for Seller (Optional)</label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Preferred time or hostel block..."
                    className="w-full p-2.5 bg-[#121212] border border-[#333333] focus:border-[#FFFFFF] rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Payment Method & Gateway Notice */}
              <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black uppercase text-[#BDBDBD] tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FFFFFF]" />
                  <span>Payment Verification Method</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_on_inspection')}
                    className={`p-3 rounded-xl border text-left transition ${
                      paymentMethod === 'pay_on_inspection'
                        ? 'bg-[#121212] border-[#FFFFFF] text-white'
                        : 'bg-[#121212]/50 border-[#333333] text-[#BDBDBD]'
                    }`}
                  >
                    <div className="text-xs font-black">Pay on Campus Inspection</div>
                    <div className="text-[10px] text-[#BDBDBD] mt-0.5">
                      Inspect item in person at FUWUKARI before paying
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('whatsapp_arrangement')}
                    className={`p-3 rounded-xl border text-left transition ${
                      paymentMethod === 'whatsapp_arrangement'
                        ? 'bg-[#121212] border-[#FFFFFF] text-white'
                        : 'bg-[#121212]/50 border-[#333333] text-[#BDBDBD]'
                    }`}
                  >
                    <div className="text-xs font-black">WhatsApp Direct Confirmation</div>
                    <div className="text-[10px] text-[#BDBDBD] mt-0.5">
                      Coordinate transfer &amp; meetup with seller
                    </div>
                  </button>
                </div>

                <div className="p-2.5 bg-[#121212] border border-[#333333] rounded-xl flex items-start gap-2 text-[11px] text-[#BDBDBD]">
                  <Info className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                  <span>
                    Online card payment gateway (Paystack/Flutterwave) is not yet enabled. To protect students from scams, confirm your order here and pay only after physical inspection.
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-[#BDBDBD]">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-white">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#BDBDBD]">
                  <span>Estimated Campus Delivery / Rider Fee</span>
                  <span className="font-bold text-white">
                    {deliveryFee === 0 ? '₦0 (Campus Meetup)' : formatNaira(deliveryFee)}
                  </span>
                </div>
                <div className="border-t border-[#333333] pt-2 flex justify-between text-sm font-black text-white">
                  <span>Final Total</span>
                  <span className="text-[#FFFFFF]">{formatNaira(totalAmount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-[#BDBDBD] hover:text-white rounded-xl"
                >
                  Continue Shopping
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black text-xs sm:text-sm font-black rounded-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Order...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
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
