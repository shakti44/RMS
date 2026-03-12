/**
 * Socket.io event name registry — shared by server sockets and client listeners.
 * Import this file on both ends to avoid magic string drift.
 */
module.exports = {
  // ── Order lifecycle ─────────────────────────────────────────
  ORDER_NEW:         'order:new',          // POS/QR → Kitchen + Admin
  ORDER_UPDATED:     'order:updated',      // any status change
  ORDER_ACCEPTED:    'order:accepted',     // Kitchen accepted
  ORDER_PREPARING:   'order:preparing',    // Kitchen started prep
  ORDER_READY:       'order:ready',        // Kitchen ready to serve
  ORDER_SERVED:      'order:served',       // Waiter served to table
  ORDER_COMPLETED:   'order:completed',    // Bill paid
  ORDER_CANCELLED:   'order:cancelled',    // Cancelled

  // ── Table status ─────────────────────────────────────────────
  TABLE_STATUS:      'table:status',       // available / occupied / reserved

  // ── Kitchen ──────────────────────────────────────────────────
  KDS_ITEM_STATUS:   'kds:item:status',    // individual item status from kitchen

  // ── Inventory alerts ─────────────────────────────────────────
  STOCK_LOW:         'inventory:low_stock',// item below reorder level

  // ── Client → server (actions) ────────────────────────────────
  JOIN_RESTAURANT:   'join:restaurant',    // staff/KDS join a restaurant room
  LEAVE_RESTAURANT:  'leave:restaurant',

  // ── System ───────────────────────────────────────────────────
  CONNECT_ERROR:     'connect_error',
  DISCONNECT:        'disconnect',
};
