/**
 * MenuItemCard — Customer-facing (QR Menu)
 *
 * Mobile-first design:
 *  - Veg/Non-veg indicator dot
 *  - Image with fallback gradient placeholder
 *  - Tags (spicy, bestseller, etc.)
 *  - Quantity stepper that adds directly to cart
 *  - Tap anywhere to open modifier modal
 */
import { useState } from 'react';
import { Plus, Minus, Flame, Star } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import ModifierSelector from './ModifierSelector';

const VEG_COLOR    = { veg: '#00a651', non_veg: '#e31e24', egg: '#f5a623', vegan: '#00a651' };
const VEG_LABEL    = { veg: 'VEG', non_veg: 'NON-VEG', egg: 'EGG', vegan: 'VEGAN' };

export default function MenuItemCard({ item }) {
  const { items: cartItems, addItem, updateQty } = useCart();
  const [showModifiers, setShowModifiers] = useState(false);

  // Find existing cart entry (without modifiers — simplified for direct add)
  const cartItem = cartItems.find((c) => c._key === `${item.id}-[]`);
  const qty      = cartItem?.quantity || 0;

  const handleAdd = () => {
    if (item.modifier_groups?.some((g) => g.is_required)) {
      // Has required modifiers — open selector first
      setShowModifiers(true);
    } else {
      addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url });
    }
  };

  const handleDecrease = () => {
    if (!cartItem) return;
    updateQty(cartItem._key, qty - 1);
  };

  const totalPrice = item.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <>
      <div
        className="card flex gap-3 p-3 cursor-pointer active:bg-gray-50 transition-colors"
        onClick={() => item.modifier_groups?.length ? setShowModifiers(true) : null}
      >
        {/* ── Item image ─────────────────────────────────────── */}
        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
          )}
        </div>

        {/* ── Item details ───────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Veg indicator + name */}
          <div className="flex items-start gap-1.5">
            <span
              className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-sm border-2 flex items-center justify-center"
              style={{ borderColor: VEG_COLOR[item.item_type] }}
              title={VEG_LABEL[item.item_type]}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: VEG_COLOR[item.item_type] }}
              />
            </span>
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
              {item.name}
            </h3>
          </div>

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.tags.includes('bestseller') && (
                <span className="inline-flex items-center gap-0.5 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Bestseller
                </span>
              )}
              {item.tags.includes('spicy') && (
                <span className="inline-flex items-center gap-0.5 text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">
                  <Flame className="w-3 h-3" />
                  Spicy
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}

          {/* Prep time */}
          <p className="text-xs text-gray-400 mt-0.5">~{item.prep_time_minutes} min</p>

          {/* Price + Add control */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold text-gray-900">{totalPrice}</span>

            {/* Quantity stepper */}
            {qty === 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                className="flex items-center gap-1 bg-brand-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
                ADD
              </button>
            ) : (
              <div
                className="flex items-center gap-1 border border-brand-500 rounded-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleDecrease}
                  className="p-1.5 text-brand-500 hover:bg-brand-50 active:scale-95 transition-transform"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-2 text-sm font-bold text-brand-600 min-w-[1.5rem] text-center">
                  {qty}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                  className="p-1.5 text-brand-500 hover:bg-brand-50 active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modifier modal */}
      {showModifiers && (
        <ModifierSelector
          item={item}
          onClose={() => setShowModifiers(false)}
          onConfirm={(selectedMods) => {
            addItem({
              id:                item.id,
              name:              item.name,
              price:             item.price,
              image_url:         item.image_url,
              selectedModifiers: selectedMods,
            });
            setShowModifiers(false);
          }}
        />
      )}
    </>
  );
}
