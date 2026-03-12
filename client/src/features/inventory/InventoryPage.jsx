/**
 * InventoryPage — Ingredient tracking with low-stock alerts and manual adjustments.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle, ArrowUpDown, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';

const restaurantId = localStorage.getItem('restaurantId');

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [adjustItem,    setAdjustItem]    = useState(null);
  const [adjustQty,     setAdjustQty]     = useState('');
  const [adjustType,    setAdjustType]    = useState('purchase');
  const [adjustNote,    setAdjustNote]    = useState('');
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [newItem,       setNewItem]       = useState({ name: '', unit: 'piece', reorder_level: 0, cost_per_unit: 0 });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', restaurantId],
    queryFn:  () =>
      api.get('/inventory', { params: { restaurantId } }).then((r) => r.data.data),
    enabled: !!restaurantId,
  });

  const { mutate: addItem, isPending: adding } = useMutation({
    mutationFn: (data) => api.post('/inventory', { ...data, restaurant_id: restaurantId }),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setShowAddForm(false); toast.success('Item added'); },
    onError:    () => toast.error('Failed to add item'),
  });

  const { mutate: adjust, isPending: adjusting } = useMutation({
    mutationFn: ({ id, ...body }) => api.post(`/inventory/${id}/adjust`, body),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setAdjustItem(null); setAdjustQty(''); setAdjustNote('');
      toast.success('Stock updated');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Adjustment failed'),
  });

  const lowStockItems = items.filter((i) => Number(i.quantity_on_hand) <= Number(i.reorder_level));

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{items.length} items tracked</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Low-stock banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {lowStockItems.map((i) => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Add item form */}
      {showAddForm && (
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">New Ingredient</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Name</label>
              <input className="input" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Flour" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Unit</label>
              <select className="input" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}>
                {['kg','g','litre','ml','piece','dozen','pack'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Reorder Level</label>
              <input type="number" className="input" value={newItem.reorder_level} onChange={(e) => setNewItem({ ...newItem, reorder_level: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cost / Unit (₹)</label>
              <input type="number" className="input" value={newItem.cost_per_unit} onChange={(e) => setNewItem({ ...newItem, cost_per_unit: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(false)} className="btn-secondary text-sm flex-1">Cancel</button>
            <button onClick={() => addItem(newItem)} disabled={adding || !newItem.name} className="btn-primary text-sm flex-1">
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Inventory table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-14 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Item', 'Unit', 'In Stock', 'Reorder At', 'Cost/Unit', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const isLow = Number(item.quantity_on_hand) <= Number(item.reorder_level);
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {item.name}
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                          {Number(item.quantity_on_hand).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{Number(item.reorder_level).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">₹{Number(item.cost_per_unit).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setAdjustItem(item)}
                          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" /> Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustment modal */}
      {adjustItem && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setAdjustItem(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-6 shadow-xl max-w-sm mx-auto space-y-4">
            <h3 className="font-semibold text-gray-900">Adjust Stock — {adjustItem.name}</h3>
            <p className="text-xs text-gray-500">
              Current: <strong>{Number(adjustItem.quantity_on_hand).toFixed(2)} {adjustItem.unit}</strong>
            </p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select className="input" value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
                {['purchase','wastage','adjustment','return'].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Quantity {adjustType === 'wastage' ? '(will be deducted)' : '(will be added)'}
              </label>
              <input
                type="number"
                step="0.001"
                className="input"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="0.000"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
              <input className="input" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason…" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdjustItem(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button
                disabled={!adjustQty || adjusting}
                onClick={() => adjust({
                  id:             adjustItem.id,
                  txType:         adjustType,
                  quantityChange: adjustType === 'wastage' ? -Math.abs(adjustQty) : Math.abs(adjustQty),
                  note:           adjustNote,
                })}
                className="btn-primary flex-1 text-sm"
              >
                {adjusting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
