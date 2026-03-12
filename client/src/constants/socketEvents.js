// Mirror of server/src/constants/socketEvents.js
export const EVENTS = {
  ORDER_NEW:        'order:new',
  ORDER_UPDATED:    'order:updated',
  ORDER_ACCEPTED:   'order:accepted',
  ORDER_PREPARING:  'order:preparing',
  ORDER_READY:      'order:ready',
  ORDER_SERVED:     'order:served',
  ORDER_COMPLETED:  'order:completed',
  ORDER_CANCELLED:  'order:cancelled',
  TABLE_STATUS:     'table:status',
  KDS_ITEM_STATUS:  'kds:item:status',
  STOCK_LOW:        'inventory:low_stock',
  JOIN_RESTAURANT:  'join:restaurant',
  LEAVE_RESTAURANT: 'leave:restaurant',
};
