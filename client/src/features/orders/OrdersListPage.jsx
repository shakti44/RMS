import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { STATUS_META } from '../../constants/orderStatus';

const restaurantId = localStorage.getItem('restaurantId');

export default function OrdersListPage() {
  const queryClient = useQueryClient();
  const [status, setStatus]     = useState('');
  const [orderType, setOrderType] = useState('');
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage]         = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders-list', restaurantId, status, orderType, date, page],
    queryFn:  () =>
      api.get('/orders', { params: { restaurantId, status: status || undefined, orderType: orderType || undefined, date, page, limit: 25 } })
        .then((r) => r.data),
    enabled: !!restaurantId,
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ orderId, status }) => api.patch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders-list'] }); toast.success('Updated'); },
    onError: () => toast.error('Update failed'),
  });

  const orders = data?.orders || [];
  const total  = data?.total  || 0;

  return (
    <div className="p-4 md:p-6 space-y-4 pb-20 md:pb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <button onClick={() => refetch()} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto text-sm" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto text-sm">
          <option value="">All statuses</option>
          {Object.keys(STATUS_META).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="input w-auto text-sm">
          <option value="">All types</option>
          <option value="dine_in">Dine-in</option>
          <option value="takeaway">Takeaway</option>
          <option value="delivery">Delivery</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Order', 'Type', 'Table', 'Items', 'Status', 'Time', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : orders.map((order) => {
                const meta = STATUS_META[order.status];
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-xs capitalize">{order.order_type.replace('_','-')}</td>
                    <td className="px-4 py-3 text-xs">{order.table_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{order.items?.length || '—'} items</td>
                    <td className="px-4 py-3"><span className={`badge ${meta.color}`}>{meta.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(order.placed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      {order.status === 'served' && (
                        <button onClick={() => updateStatus({ orderId: order.id, status: 'completed' })}
                          className="text-xs text-green-600 hover:text-green-700 font-medium">
                          Complete
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button onClick={() => updateStatus({ orderId: order.id, status: 'cancelled' })}
                          className="text-xs text-red-500 hover:text-red-600 font-medium">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
          <span>{total} orders</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <span className="px-3 py-1">{page}</span>
            <button disabled={orders.length < 25} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
