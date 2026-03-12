/**
 * OrderStatusPage — Real-time order tracking for QR guests.
 * Uses Socket.io /guest namespace to receive ORDER_UPDATED events.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, ChefHat, Utensils, XCircle } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useSocket } from '../../context/SocketContext';
import { EVENTS } from '../../constants/socketEvents';

const STEPS = [
  { status: 'pending',   icon: Clock,       label: 'Order Received',   desc: 'Your order has been sent to the kitchen' },
  { status: 'confirmed', icon: CheckCircle, label: 'Order Accepted',   desc: 'Kitchen has accepted your order' },
  { status: 'preparing', icon: ChefHat,     label: 'Being Prepared',   desc: 'Our chefs are working on your order' },
  { status: 'ready',     icon: Utensils,    label: 'Ready to Serve',   desc: 'Your order is ready!' },
  { status: 'served',    icon: CheckCircle, label: 'Served',           desc: 'Enjoy your meal!' },
];

const stepIndex = (status) => STEPS.findIndex((s) => s.status === status);

export default function OrderStatusPage() {
  const { orderId }      = useParams();
  const { on, off, joinOrder } = useSocket();
  const [liveStatus, setLiveStatus] = useState(null);

  const { data: order, refetch } = useQuery({
    queryKey: ['order-status', orderId],
    queryFn:  () => api.get(`/orders/${orderId}`).then((r) => r.data.data),
    enabled:  !!orderId,
  });

  useEffect(() => {
    if (orderId) joinOrder(orderId);
  }, [orderId, joinOrder]);

  useEffect(() => {
    const handler = (updated) => {
      if (updated.id === orderId) {
        setLiveStatus(updated.status);
        refetch();
      }
    };
    on(EVENTS.ORDER_UPDATED, handler);
    return () => off(EVENTS.ORDER_UPDATED, handler);
  }, [orderId, on, off, refetch]);

  const currentStatus = liveStatus || order?.status || 'pending';
  const cancelled     = currentStatus === 'cancelled';
  const current       = stepIndex(currentStatus);
  const fmt           = (n) => `₹${Number(n || 0).toFixed(2)}`;

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-md mx-auto">
      {/* Order ID */}
      <div className="text-center mb-8">
        <p className="text-sm text-gray-500">Order</p>
        <p className="text-2xl font-bold font-mono text-gray-900">
          #{order.id.slice(-6).toUpperCase()}
        </p>
        {order.table_name && (
          <p className="text-sm text-gray-500 mt-1">Table {order.table_name}</p>
        )}
      </div>

      {/* Cancelled state */}
      {cancelled ? (
        <div className="card p-6 text-center space-y-3">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="font-semibold text-gray-900">Order Cancelled</p>
          <p className="text-sm text-gray-500">Please contact staff for assistance.</p>
        </div>
      ) : (
        /* Progress steps */
        <div className="card p-6 mb-6">
          <div className="space-y-5">
            {STEPS.map((step, i) => {
              const done   = i < current;
              const active = i === current;
              const Icon   = step.icon;
              return (
                <div key={step.status} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      done   ? 'bg-green-500' :
                      active ? 'bg-brand-500 animate-pulse-fast' :
                               'bg-gray-200'
                    }`}>
                      <Icon className={`w-4 h-4 ${done || active ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-0.5 flex-1 mt-1 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className={`text-sm font-semibold ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {active && (
                      <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order summary */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Your Order</h3>
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700">{item.quantity}× {item.item_name}</span>
            <span className="font-medium text-gray-900">{fmt(item.subtotal)}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between text-sm font-semibold text-gray-900">
          <span>Est. Total (+ tax)</span>
          <span>
            {fmt(order.items?.reduce((s, i) => s + Number(i.subtotal), 0) * 1.05)}
          </span>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        This page updates automatically. No need to refresh.
      </p>
    </div>
  );
}
