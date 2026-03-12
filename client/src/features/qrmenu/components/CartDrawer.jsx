/**
 * CartDrawer — Slide-up drawer showing cart items + place order CTA.
 * Floats above the QR menu at the bottom of the screen.
 */
import { useState } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { useCart } from '../../../context/CartContext';

export default function CartDrawer({ onPlaceOrder, isPlacing }) {
  const { items, itemCount, subtotal, updateQty, removeItem, clearCart } = useCart();
  const [open, setOpen] = useState(false);

  if (itemCount === 0) return null;

  const fmt = (n) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <>
      {/* Backdrop (only when expanded) */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setOpen(false)} />
      )}

      <div className="fixed inset-x-0 bottom-0 z-40">
        {/* Expanded cart items */}
        {open && (
          <div className="bg-white border-t border-gray-100 max-h-64 overflow-y-auto px-4 py-3 space-y-3">
            {items.map((item) => {
              const modCost = (item.selectedModifiers || []).reduce((s, m) => s + (m.price_delta || 0), 0);
              const unitPrice = item.price + modCost;
              return (
                <div key={item._key} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {item.selectedModifiers?.length > 0 && (
                      <p className="text-xs text-gray-400 truncate">
                        {item.selectedModifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-600">{fmt(unitPrice)} each</p>
                  </div>

                  {/* Stepper */}
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                    <button
                      onClick={() => updateQty(item._key, item.quantity - 1)}
                      className="p-1.5 text-gray-500 hover:text-red-500"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-sm font-semibold min-w-[1.2rem] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item._key, item.quantity + 1)}
                      className="p-1.5 text-gray-500 hover:text-brand-500"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-sm font-semibold text-gray-900 min-w-[3rem] text-right">
                    {fmt(unitPrice * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky bar */}
        <div className="bg-brand-500 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          {/* Expand/collapse */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="text-sm font-bold">{itemCount}</span>
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            onClick={onPlaceOrder}
            disabled={isPlacing}
            className="flex-1 flex items-center justify-between bg-white text-brand-600 font-bold text-sm px-4 py-2 rounded-lg active:scale-95 transition-transform disabled:opacity-60"
          >
            <span>{isPlacing ? 'Placing...' : 'Place Order'}</span>
            <span>{fmt(subtotal)}</span>
          </button>
        </div>
      </div>
    </>
  );
}
