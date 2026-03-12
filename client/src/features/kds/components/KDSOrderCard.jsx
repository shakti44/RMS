/**
 * KDSOrderCard — Kitchen Display System order card.
 *
 * Shows one order with:
 *  - Table / order type badge
 *  - Elapsed timer with urgency color
 *  - All items with quantities and special notes
 *  - Accept / Start / Ready / Reject actions
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UtensilsCrossed, Bike, ShoppingBag, AlertCircle } from 'lucide-react';
import api from '../../../api/axiosInstance';
import KDSTimer from './KDSTimer';
import { KITCHEN_ACTIONS, STATUS_META } from '../../../constants/orderStatus';

const ORDER_TYPE_ICON = {
  dine_in:   <UtensilsCrossed className="w-3.5 h-3.5" />,
  delivery:  <Bike className="w-3.5 h-3.5" />,
  takeaway:  <ShoppingBag className="w-3.5 h-3.5" />,
};

const ORDER_TYPE_LABEL = {
  dine_in:  'Dine-in',
  delivery: 'Delivery',
  takeaway: 'Takeaway',
};

export default function KDSOrderCard({ order }) {
  const queryClient = useQueryClient();
  const action      = KITCHEN_ACTIONS[order.status];
  const statusMeta  = STATUS_META[order.status];

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ orderId, status }) =>
      api.patch(`/orders/${orderId}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      toast.success(`Order #${order.id.slice(-4).toUpperCase()} updated`);
    },
    onError: () => toast.error('Failed to update order'),
  });

  const handleAction = (status) => {
    updateStatus({ orderId: order.id, status });
  };

  const isUrgent = Date.now() - new Date(order.placed_at).getTime() > 20 * 60 * 1000;

  return (
    <div className={`card flex flex-col h-full overflow-hidden transition-shadow
                     ${isUrgent ? 'ring-2 ring-red-400 shadow-red-100 shadow-md' : ''}`}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={`px-3 py-2 flex items-center justify-between ${statusMeta.color} rounded-t-xl`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
          <span className="text-xs font-bold tracking-wide uppercase">{statusMeta.label}</span>
        </div>
        <KDSTimer placedAt={order.placed_at} />
      </div>

      {/* ── Order info ─────────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1 flex items-center justify-between border-b border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Order</p>
          <p className="text-sm font-bold text-gray-900 font-mono">
            #{order.id.slice(-6).toUpperCase()}
          </p>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-700">
            {ORDER_TYPE_ICON[order.order_type]}
            {ORDER_TYPE_LABEL[order.order_type]}
            {order.order_type === 'dine_in' && order.table_name && (
              <span className="ml-0.5 font-bold">• {order.table_name}</span>
            )}
          </span>
        </div>
      </div>

      {/* ── Items list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {order.items?.map((item) => (
          <div key={item.id} className="flex gap-2">
            {/* Quantity bubble */}
            <span className="flex-shrink-0 w-7 h-7 bg-brand-100 text-brand-700 rounded-lg
                             flex items-center justify-center text-sm font-bold">
              {item.quantity}×
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{item.item_name}</p>

              {/* Modifiers */}
              {item.modifiers?.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.modifiers.map((m) => m.name).join(', ')}
                </p>
              )}

              {/* Special note */}
              {item.special_note && (
                <div className="flex items-start gap-1 mt-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                  <AlertCircle className="w-3 h-3 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800">{item.special_note}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Order-level note ───────────────────────────────────────── */}
      {order.special_notes && (
        <div className="mx-3 mb-2 flex items-start gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">{order.special_notes}</p>
        </div>
      )}

      {/* ── Action buttons ─────────────────────────────────────────── */}
      {action && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          {/* Reject / Cancel */}
          <button
            onClick={() => handleAction('cancelled')}
            disabled={isPending}
            className="py-2.5 rounded-lg border border-red-300 text-red-600 text-sm font-semibold
                       hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
          >
            Reject
          </button>

          {/* Primary action */}
          <button
            onClick={() => handleAction(action.next)}
            disabled={isPending}
            className={`py-2.5 rounded-lg text-white text-sm font-semibold
                        active:scale-95 transition-all disabled:opacity-50
                        ${action.btnClass}`}
          >
            {isPending ? '...' : action.label}
          </button>
        </div>
      )}

      {/* Completed state footer */}
      {order.status === 'served' && (
        <div className="px-3 pb-3">
          <button
            onClick={() => handleAction('completed')}
            disabled={isPending}
            className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold
                       hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
          >
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}
