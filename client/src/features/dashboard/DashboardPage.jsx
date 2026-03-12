/**
 * DashboardPage — Daily overview for managers/admins.
 * Stats cards + revenue chart + top items + live order feed.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  TrendingUp, ShoppingBag, Receipt, Percent,
  RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../api/axiosInstance';
import { useSocket } from '../../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { EVENTS } from '../../constants/socketEvents';
import { STATUS_META } from '../../constants/orderStatus';

const restaurantId = localStorage.getItem('restaurantId');

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card p-4 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const queryClient  = useQueryClient();
  const { on, off, joinRestaurant } = useSocket();

  useEffect(() => {
    if (restaurantId) joinRestaurant(restaurantId);
  }, [joinRestaurant]);

  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['live-orders'] });
    };
    on(EVENTS.ORDER_NEW,     refresh);
    on(EVENTS.ORDER_UPDATED, refresh);
    return () => { off(EVENTS.ORDER_NEW, refresh); off(EVENTS.ORDER_UPDATED, refresh); };
  }, [on, off, queryClient]);

  const today = new Date().toISOString().slice(0, 10);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['daily-summary', restaurantId, today],
    queryFn:  () =>
      api.get('/billing/analytics/daily', { params: { restaurantId, date: today } })
        .then((r) => r.data.data),
    enabled: !!restaurantId,
  });

  const { data: liveOrders = [] } = useQuery({
    queryKey: ['live-orders', restaurantId],
    queryFn:  () =>
      api.get('/orders', { params: { restaurantId, limit: 10 } })
        .then((r) => r.data.orders),
    refetchInterval: 20_000,
    enabled: !!restaurantId,
  });

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries()}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stat cards */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 h-20 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's Revenue"  value={fmt(summary?.total_revenue)}    sub="incl. tax"            icon={TrendingUp}  color="bg-brand-500" />
          <StatCard label="Orders"           value={summary?.total_orders || 0}     sub="completed today"      icon={ShoppingBag} color="bg-blue-500"  />
          <StatCard label="Tax Collected"    value={fmt(summary?.total_tax_collected)} sub="CGST + SGST"        icon={Receipt}     color="bg-purple-500"/>
          <StatCard label="Avg Order Value"  value={fmt(summary?.avg_order_value)}  sub="per order"            icon={Percent}     color="bg-green-500" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart — by order type */}
        <div className="card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Revenue by Order Type</h2>
          {summary?.by_order_type?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={summary.by_order_type.map((d) => ({
                name: d.order_type.replace('_', '-'),
                revenue: Number(d.revenue),
              }))}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF6B35" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#FF6B35" fill="url(#grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No sales data yet today
            </div>
          )}
        </div>

        {/* Top items */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Top Items Today</h2>
          {summary?.top_items?.length ? (
            <div className="space-y-3">
              {summary.top_items.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.total_qty} sold</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    {fmt(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
          )}
        </div>
      </div>

      {/* Live orders feed */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Live Orders</h2>
        {liveOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No recent orders</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left pb-2 font-medium">Order</th>
                  <th className="text-left pb-2 font-medium">Type</th>
                  <th className="text-left pb-2 font-medium">Table</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {liveOrders.map((order) => {
                  const meta = STATUS_META[order.status];
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-2 font-mono text-xs font-bold">#{order.id.slice(-6).toUpperCase()}</td>
                      <td className="py-2 text-xs capitalize">{order.order_type.replace('_', '-')}</td>
                      <td className="py-2 text-xs">{order.table_name || '—'}</td>
                      <td className="py-2">
                        <span className={`badge ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="py-2 text-xs text-gray-500">
                        {new Date(order.placed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
