import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../api/axiosInstance';

const restaurantId = localStorage.getItem('restaurantId');
const COLORS = ['#FF6B35','#3B82F6','#10B981','#8B5CF6','#F59E0B'];

export default function AnalyticsPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: summary, isLoading } = useQuery({
    queryKey: ['analytics', restaurantId, date],
    queryFn:  () =>
      api.get('/billing/analytics/daily', { params: { restaurantId, date } }).then((r) => r.data.data),
    enabled: !!restaurantId,
  });

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <input
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="input w-auto text-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2].map((i) => <div key={i} className="card h-64 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by order type — bar */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Revenue by Order Type</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(summary?.by_order_type || []).map((d) => ({
                name: d.order_type.replace('_','-'),
                Revenue: Number(d.revenue),
                Orders: Number(d.count),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip formatter={(v, n) => [n === 'Revenue' ? fmt(v) : v, n]} />
                <Bar dataKey="Revenue" fill="#FF6B35" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top items — pie */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Top Items by Revenue</h2>
            {summary?.top_items?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={summary.top_items.map((i) => ({ name: i.name, value: Number(i.revenue) }))}
                    cx="50%" cy="50%" outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {summary.top_items.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
            )}
          </div>

          {/* Summary table */}
          <div className="card p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Daily Summary — {date}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['Total Revenue',   fmt(summary?.total_revenue)],
                ['Orders',          summary?.total_orders || 0],
                ['Tax Collected',   fmt(summary?.total_tax_collected)],
                ['Avg Order Value', fmt(summary?.avg_order_value)],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
