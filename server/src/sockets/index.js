/**
 * Socket.io bootstrap
 *
 * Architecture:
 *  - Each restaurant gets its own room: `restaurant:{restaurantId}`
 *  - Staff (POS, Admin, KDS) join the room on connect via JOIN_RESTAURANT event
 *  - QR guest sessions are ephemeral — they only receive ORDER_UPDATED for their order
 *
 *  Event flow:
 *  ┌─────────────┐  placeOrder()   ┌─────────────────────┐
 *  │  QR / POS   │ ──────────────► │  order.service.js   │
 *  └─────────────┘                 │  emitToRestaurant() │
 *                                  └────────┬────────────┘
 *                                           │ ORDER_NEW
 *                            ┌──────────────▼────────────────┐
 *                            │  restaurant:{id}  (IO room)   │
 *                            └──┬─────────────────┬──────────┘
 *                    ORDER_NEW  │                 │ ORDER_NEW
 *                          ┌───▼───┐         ┌───▼──────┐
 *                          │  KDS  │         │  Admin   │
 *                          └───┬───┘         └──────────┘
 *              ORDER_ACCEPTED/ │
 *              ORDER_READY     │ updateOrderStatus()
 *                          ┌───▼─────────────────────────────┐
 *                          │  ORDER_UPDATED  broadcast back  │
 *                          └────────────────────────────────-┘
 */

const { Server } = require('socket.io');
const { verifyAccess } = require('../utils/jwt');
const EVENTS = require('../constants/socketEvents');

/** Singleton IO instance, set in init() */
let io;

/**
 * Initialize Socket.io and attach all namespaces/handlers.
 * Call once from src/index.js after creating the HTTP server.
 */
const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || 'http://localhost:5173',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  // ── Authentication middleware (skip for QR guest namespace) ────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow unauthenticated only for the /guest namespace
      if (socket.nsp.name === '/guest') return next();
      return next(new Error('Authentication required'));
    }
    try {
      socket.data.user = verifyAccess(token);
    } catch {
      return next(new Error('Invalid token'));
    }
    next();
  });

  // ── Main namespace (staff, admin, KDS) ────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.id} | user: ${socket.data.user?.id}`);

    // Staff joins a restaurant room to receive order events
    socket.on(EVENTS.JOIN_RESTAURANT, ({ restaurantId }) => {
      if (!restaurantId) return;
      socket.join(`restaurant:${restaurantId}`);
      console.log(`[Socket] ${socket.data.user?.id} joined restaurant:${restaurantId}`);
    });

    socket.on(EVENTS.LEAVE_RESTAURANT, ({ restaurantId }) => {
      socket.leave(`restaurant:${restaurantId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] disconnected: ${socket.id}`);
    });
  });

  // ── Guest namespace (QR customers) ────────────────────────────────────
  const guestNsp = io.of('/guest');
  guestNsp.on('connection', (socket) => {
    // Guest joins a room scoped to their order (sent from client after order placed)
    socket.on('join:order', ({ orderId }) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
  });

  return io;
};

/** Emit to all sockets in a restaurant room */
const emitToRestaurant = (restaurantId, event, data) => {
  if (!io) return;
  io.to(`restaurant:${restaurantId}`).emit(event, data);
};

/** Emit to a specific guest's order room */
const emitToOrder = (orderId, event, data) => {
  if (!io) return;
  io.of('/guest').to(`order:${orderId}`).emit(event, data);
};

const getIO = () => io;

module.exports = { init, emitToRestaurant, emitToOrder, getIO };
