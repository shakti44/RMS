/**
 * KDSPage — Kitchen Display System
 *
 * Real-time grid of active orders. Socket.io pushes new orders
 * and status updates without polling.
 *
 * Columns auto-arranged by CSS grid — fits any screen size.
 */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChefHat, RefreshCw } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import KDSOrderCard from './components/KDSOrderCard';
import { EVENTS } from '../../constants/socketEvents';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

export default function KDSPage() {
  const { user }        = useAuth();
  const { on, off, joinRestaurant } = useSocket();
  const queryClient     = useQueryClient();
  const [restaurantId]  = useState(() => localStorage.getItem('restaurantId'));
  const [filter, setFilter] = useState('all');

  // Join socket room on mount
  useEffect(() => {
    if (restaurantId) joinRestaurant(restaurantId);
  }, [restaurantId, joinRestaurant]);

  // Real-time order events
  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['kds-orders'] });

    on(EVENTS.ORDER_NEW,     refresh);
    on(EVENTS.ORDER_UPDATED, refresh);
    return () => {
      off(EVENTS.ORDER_NEW,     refresh);
      off(EVENTS.ORDER_UPDATED, refresh);
    };
  }, [on, off, queryClient]);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey:  ['kds-orders', restaurantId],
    queryFn:   () =>
      api.get('/orders', { params: { restaurantId, limit: 50 } })
        .then((r) => r.data.orders.filter((o) => ACTIVE_STATUSES.includes(o.status))),
    refetchInterval: 30_000,   // fallback poll every 30s
    enabled: !!restaurantId,
  });

  const filtered = filter === 'all'
    ? orders
    : orders.filter((o) => o.status === filter);

  // Sort: pending first, then by time ascending (oldest = most urgent)
  const sorted = [...filtered].sort((a, b) => {
    const priority = { pending: 0, confirmed: 1, preparing: 2, ready: 3 };
    if (priority[a.status] !== priority[b.status])
      return priority[a.status] - priority[b.status];
    return new Date(a.placed_at) - new Date(b.placed_at);
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-brand-400" />
          <span className="font-bold text-lg">Kitchen Display</span>
          <span className="ml-2 bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {sorted.length} active
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex bg-gray-800 rounded-lg p-0.5 gap-0.5 text-xs">
            {['all', 'pending', 'confirmed', 'preparing', 'ready'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                  filter === s ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button onClick={() => refetch()} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <ChefHat className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No active orders right now.</p>
          </div>
        ) : (
          <div className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {sorted.map((order) => (
              <KDSOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
