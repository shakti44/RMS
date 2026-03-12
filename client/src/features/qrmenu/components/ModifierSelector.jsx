/**
 * ModifierSelector — Bottom-sheet modal for choosing add-ons/variants
 * Opens when a menu item has modifier groups.
 */
import { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function ModifierSelector({ item, onClose, onConfirm }) {
  const [selected, setSelected] = useState(() => {
    const init = {};
    item.modifier_groups?.forEach((g) => {
      const defaults = g.options.filter((o) => o.is_default).map((o) => o.id);
      init[g.id] = g.max_select === 1 ? (defaults[0] || null) : new Set(defaults);
    });
    return init;
  });

  const toggle = (groupId, optionId, maxSelect) => {
    setSelected((prev) => {
      if (maxSelect === 1) {
        return { ...prev, [groupId]: optionId };
      }
      const set = new Set(prev[groupId] || []);
      set.has(optionId) ? set.delete(optionId) : set.add(optionId);
      return { ...prev, [groupId]: set };
    });
  };

  const isSelected = (groupId, optionId, maxSelect) => {
    if (maxSelect === 1) return selected[groupId] === optionId;
    return (selected[groupId] || new Set()).has(optionId);
  };

  const validate = () => {
    for (const g of item.modifier_groups || []) {
      if (g.is_required) {
        const sel = g.max_select === 1 ? selected[g.id] : selected[g.id]?.size;
        if (!sel) return `Please select ${g.name}`;
      }
    }
    return null;
  };

  const handleConfirm = () => {
    const err = validate();
    if (err) { alert(err); return; }

    const flat = [];
    for (const g of item.modifier_groups || []) {
      const opts = g.max_select === 1
        ? g.options.filter((o) => o.id === selected[g.id])
        : g.options.filter((o) => (selected[g.id] || new Set()).has(o.id));
      flat.push(...opts.map((o) => ({ ...o, group_name: g.name })));
    }
    onConfirm(flat);
  };

  const extraCost = () => {
    let total = 0;
    for (const g of item.modifier_groups || []) {
      const opts = g.max_select === 1
        ? g.options.filter((o) => o.id === selected[g.id])
        : g.options.filter((o) => (selected[g.id] || new Set()).has(o.id));
      total += opts.reduce((s, o) => s + Number(o.price_delta), 0);
    }
    return total;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{item.name}</h2>
            <p className="text-sm text-gray-500">Customise your order</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modifier groups */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5">
          {item.modifier_groups?.map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-800">{group.name}</h3>
                {group.is_required && (
                  <span className="badge bg-red-100 text-red-700">Required</span>
                )}
                {group.max_select > 1 && (
                  <span className="text-xs text-gray-400">Choose up to {group.max_select}</span>
                )}
              </div>

              <div className="space-y-2">
                {group.options.map((opt) => {
                  const active = isSelected(group.id, opt.id, group.max_select);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggle(group.id, opt.id, group.max_select)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                        active
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-${group.max_select === 1 ? 'full' : 'md'} border-2 flex items-center justify-center transition-colors ${
                          active ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                        }`}>
                          {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-sm text-gray-800">{opt.name}</span>
                      </div>
                      {Number(opt.price_delta) !== 0 && (
                        <span className="text-sm font-medium text-gray-600">
                          {Number(opt.price_delta) > 0 ? '+' : ''}
                          ₹{Math.abs(opt.price_delta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-4 py-4 border-t bg-white">
          <button onClick={handleConfirm} className="btn-primary w-full py-3 text-base">
            Add to Cart
            {extraCost() > 0 && (
              <span className="ml-2 opacity-80">• +₹{extraCost()}</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
