/**
 * OrderPanel — Right-side panel in POS showing the current order.
 * Handles item quantity changes, notes, billing, and payment.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, Minus, Receipt, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axiosInstance';

export default function OrderPanel({ table, cartItems, onUpdateQty, onRemoveItem, onClear, restaurantId }) {
  const queryClient  = useQueryClient();
  const [notes, setNotes]           = useState('');
  const [orderType, setOrderType]   = useState(table ? 'dine_in' : 'takeaway');
  const [coupon, setCoupon]         = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod]   = useState('cash');

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax      = subtotal * 0.05;   // 5% GST preview
  const total    = subtotal + tax;
  const fmt      = (n) => `₹${n.toFixed(2)}`;

  const { mutate: placeOrder, isPending: placing } = useMutation({
    mutationFn: (payload) => api.post('/orders', payload).then((r) => r.data.data),
    onSuccess:  (order) => {
      toast.success(`Order #${order.id.slice(-4).toUpperCase()} placed!`);
      onClear();
      queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      if (showPayment) generateBill(order.id);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Order failed'),
  });

  const { mutate: generateBill } = useMutation({
    mutationFn: (orderId) =>
      api.post('/billing/generate', { orderId, couponCode: coupon || undefined }),
    onSuccess: () => toast.success('Bill generated'),
    onError:   () => toast.error('Billing failed'),
  });

  const handlePlaceOrder = () => {
    if (!cartItems.length) { toast.error('Add items first'); return; }
    placeOrder({
      restaurantId,
      tableId:      table?.id || null,
      orderType,
      items:        cartItems.map((i) => ({
        menuItemId: i.id,
        quantity:   i.quantity,
        specialNote: i.note || '',
      })),
      specialNotes: notes,
    });
  };

  if (!cartItems.length) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800">
            {table ? `Table ${table.name}` : 'New Order'}
          </h2>
          <div className="flex gap-2 mt-2">
            {['dine_in', 'takeaway', 'delivery'].map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  orderType === t ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t.replace('_', '-')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Select items from the menu</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-800">
          {table ? `Table ${table.name}` : 'New Order'}
        </h2>
        <div className="flex gap-2 mt-2">
          {['dine_in', 'takeaway', 'delivery'].map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                orderType === t ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t.replace('_', '-')}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cartItems.map((item) => (
          <div key={item._key} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">{fmt(item.price)} × {item.quantity}</p>
            </div>
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
              <button onClick={() => onUpdateQty(item._key, item.quantity - 1)}
                className="p-1.5 hover:text-red-500 text-gray-400">
                {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              </button>
              <span className="text-sm font-bold min-w-[1.2rem] text-center">{item.quantity}</span>
              <button onClick={() => onUpdateQty(item._key, item.quantity + 1)}
                className="p-1.5 hover:text-brand-500 text-gray-400">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-sm font-semibold text-gray-900 min-w-[3.5rem] text-right">
              {fmt(item.price * item.quantity)}
            </span>
          </div>
        ))}

        {/* Notes */}
        <textarea
          rows={2}
          placeholder="Order notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input text-xs resize-none mt-2"
        />
      </div>

      {/* Bill summary */}
      <div className="border-t p-4 space-y-2">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>GST (5%)</span><span>{fmt(tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-1">
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>

        {/* Coupon */}
        <div className="flex gap-2">
          <input
            className="input text-xs flex-1"
            placeholder="Coupon code"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          />
        </div>

        {/* Payment method */}
        <div className="flex gap-2">
          {['cash', 'card', 'upi'].map((m) => (
            <button
              key={m}
              onClick={() => setPayMethod(m)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors ${
                payMethod === m ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClear} className="btn-secondary text-sm py-2.5">
            Clear
          </button>
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="btn-primary text-sm py-2.5 flex items-center justify-center gap-1.5"
          >
            <CreditCard className="w-4 h-4" />
            {placing ? 'Placing…' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
