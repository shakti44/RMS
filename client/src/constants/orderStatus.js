export const ORDER_STATUS = {
  PENDING:    'pending',
  CONFIRMED:  'confirmed',
  PREPARING:  'preparing',
  READY:      'ready',
  SERVED:     'served',
  COMPLETED:  'completed',
  CANCELLED:  'cancelled',
};

export const STATUS_META = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-400'   },
  preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400' },
  ready:     { label: 'Ready',     color: 'bg-green-100 text-green-800',   dot: 'bg-green-400'  },
  served:    { label: 'Served',    color: 'bg-teal-100 text-teal-800',     dot: 'bg-teal-400'   },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400'   },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700',       dot: 'bg-red-400'    },
};

export const KITCHEN_ACTIONS = {
  pending:   { next: 'confirmed',  label: 'Accept',   btnClass: 'bg-blue-500 hover:bg-blue-600'   },
  confirmed: { next: 'preparing',  label: 'Start',    btnClass: 'bg-orange-500 hover:bg-orange-600'},
  preparing: { next: 'ready',      label: 'Mark Ready', btnClass: 'bg-green-500 hover:bg-green-600'},
  ready:     { next: 'served',     label: 'Served',   btnClass: 'bg-teal-500 hover:bg-teal-600'   },
};
