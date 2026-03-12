/**
 * Order Service
 * Handles: order creation, status transitions, and inventory auto-deduction.
 * All DB operations inside a transaction for atomicity.
 */
const db        = require('../config/database');
const ApiError  = require('../utils/ApiError');
const { emitToRestaurant } = require('../sockets');
const EVENTS    = require('../constants/socketEvents');

/**
 * Place a new order (from QR guest OR staff POS).
 *
 * @param {object} data
 * @param {string} data.tenantId
 * @param {string} data.restaurantId
 * @param {string} [data.tableId]
 * @param {'dine_in'|'takeaway'|'delivery'} data.orderType
 * @param {Array<{menuItemId, quantity, modifierOptionIds?, specialNote?}>} data.items
 * @param {string} [data.customerName]
 * @param {string} [data.customerPhone]
 * @param {object} [data.deliveryAddress]
 * @param {string} [data.specialNotes]
 * @param {string} [data.placedBy]  — user UUID, null for QR guests
 * @returns {Promise<object>} created order with items
 */
const placeOrder = async (data) => {
  const {
    tenantId, restaurantId, tableId, orderType,
    items, customerName, customerPhone,
    deliveryAddress, specialNotes, placedBy,
  } = data;

  if (!items?.length) throw ApiError.badRequest('Order must contain at least one item');

  return db.transaction(async (trx) => {
    // ── 1. Fetch & validate all menu items in one query ──────────────────
    const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
    const menuItems   = await trx('menu_items')
      .whereIn('id', menuItemIds)
      .where({ tenant_id: tenantId, restaurant_id: restaurantId, is_available: true });

    if (menuItems.length !== menuItemIds.length) {
      throw ApiError.badRequest('One or more menu items are unavailable or not found');
    }
    const menuMap = Object.fromEntries(menuItems.map((m) => [m.id, m]));

    // ── 2. Validate table (for dine-in) ───────────────────────────────────
    if (orderType === 'dine_in' && tableId) {
      const table = await trx('restaurant_tables')
        .where({ id: tableId, tenant_id: tenantId })
        .first();
      if (!table) throw ApiError.notFound('Table not found');
      if (!['available', 'occupied'].includes(table.status)) {
        throw ApiError.conflict(`Table is currently ${table.status}`);
      }
      // Mark table occupied
      await trx('restaurant_tables')
        .where({ id: tableId })
        .update({ status: 'occupied', updated_at: new Date() });
    }

    // ── 3. Create order ───────────────────────────────────────────────────
    const [order] = await trx('orders')
      .insert({
        tenant_id:        tenantId,
        restaurant_id:    restaurantId,
        table_id:         tableId || null,
        order_type:       orderType,
        status:           'pending',
        customer_name:    customerName,
        customer_phone:   customerPhone,
        delivery_address: deliveryAddress ? JSON.stringify(deliveryAddress) : null,
        special_notes:    specialNotes,
        placed_by:        placedBy || null,
        placed_at:        new Date(),
      })
      .returning('*');

    // ── 4. Insert order items (and optional modifiers) ────────────────────
    const orderItemsPayload = items.map((item) => ({
      tenant_id:    tenantId,
      order_id:     order.id,
      menu_item_id: item.menuItemId,
      quantity:     item.quantity,
      unit_price:   menuMap[item.menuItemId].price,
      special_note: item.specialNote || null,
      status:       'pending',
    }));

    const insertedItems = await trx('order_items')
      .insert(orderItemsPayload)
      .returning('*');

    // Insert modifiers if provided
    const modifierRows = [];
    for (const [idx, item] of items.entries()) {
      if (item.modifierOptionIds?.length) {
        const opts = await trx('modifier_options')
          .whereIn('id', item.modifierOptionIds)
          .where({ tenant_id: tenantId, is_available: true });

        for (const opt of opts) {
          modifierRows.push({
            order_item_id:      insertedItems[idx].id,
            modifier_option_id: opt.id,
            price_delta:        opt.price_delta,
          });
        }
      }
    }
    if (modifierRows.length) {
      await trx('order_item_modifiers').insert(modifierRows);
    }

    // ── 5. Auto-deduct inventory ──────────────────────────────────────────
    await deductInventory(trx, { tenantId, restaurantId, order, items: insertedItems });

    // ── 6. Return fully assembled order ───────────────────────────────────
    const fullOrder = await getOrderById(order.id, tenantId, trx);

    // ── 7. Broadcast to kitchen & staff via Socket.io ─────────────────────
    emitToRestaurant(restaurantId, EVENTS.ORDER_NEW, fullOrder);

    return fullOrder;
  });
};

/**
 * Update order status (kitchen workflow: confirm → preparing → ready → served → completed)
 */
const updateOrderStatus = async ({ orderId, tenantId, status, userId }) => {
  const allowed = [
    'pending','confirmed','preparing','ready','served','completed','cancelled',
  ];
  if (!allowed.includes(status)) throw ApiError.badRequest(`Invalid status: ${status}`);

  const order = await db('orders')
    .where({ id: orderId, tenant_id: tenantId })
    .first();

  if (!order) throw ApiError.notFound('Order not found');

  const timestamps = {};
  if (status === 'confirmed')   { timestamps.accepted_at  = new Date(); timestamps.accepted_by = userId; }
  if (status === 'ready')       { timestamps.ready_at     = new Date(); }
  if (status === 'completed')   { timestamps.completed_at = new Date(); }

  // If order cancelled — restore inventory
  if (status === 'cancelled' && order.status !== 'cancelled') {
    await db.transaction(async (trx) => {
      const orderItems = await trx('order_items').where({ order_id: orderId });
      await restoreInventory(trx, { tenantId, restaurantId: order.restaurant_id, orderId, items: orderItems });
      await trx('orders')
        .where({ id: orderId })
        .update({ status, ...timestamps, updated_at: new Date() });
    });
  } else {
    await db('orders')
      .where({ id: orderId })
      .update({ status, ...timestamps, updated_at: new Date() });
  }

  const updated = await getOrderById(orderId, tenantId);
  emitToRestaurant(order.restaurant_id, EVENTS.ORDER_UPDATED, updated);
  return updated;
};

/**
 * Fetch a single order with all items and modifiers.
 */
const getOrderById = async (orderId, tenantId, trx = db) => {
  const order = await trx('orders as o')
    .where({ 'o.id': orderId, 'o.tenant_id': tenantId })
    .leftJoin('restaurant_tables as t', 'o.table_id', 't.id')
    .leftJoin('users as w',            'o.placed_by', 'w.id')
    .select(
      'o.*',
      't.name as table_name',
      'w.name as placed_by_name'
    )
    .first();

  if (!order) throw ApiError.notFound('Order not found');

  const items = await trx('order_items as oi')
    .where({ 'oi.order_id': orderId })
    .join('menu_items as m', 'oi.menu_item_id', 'm.id')
    .select('oi.*', 'm.name as item_name', 'm.item_type');

  // Attach modifiers to each item
  for (const item of items) {
    const modifiers = await trx('order_item_modifiers as oim')
      .where({ 'oim.order_item_id': item.id })
      .join('modifier_options as mo', 'oim.modifier_option_id', 'mo.id')
      .join('modifier_groups as mg',  'mo.modifier_group_id', 'mg.id')
      .select('mo.name', 'mg.name as group_name', 'oim.price_delta');
    item.modifiers = modifiers;
  }

  return { ...order, items };
};

/**
 * List orders for a restaurant (with optional filters).
 */
const listOrders = async ({ tenantId, restaurantId, status, orderType, date, page = 1, limit = 30 }) => {
  const query = db('orders as o')
    .where({ 'o.tenant_id': tenantId, 'o.restaurant_id': restaurantId })
    .leftJoin('restaurant_tables as t', 'o.table_id', 't.id')
    .select('o.*', 't.name as table_name')
    .orderBy('o.placed_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit);

  if (status)    query.where('o.status', status);
  if (orderType) query.where('o.order_type', orderType);
  if (date) {
    query.whereRaw('o.placed_at::date = ?', [date]);
  }

  const [orders, [{ count }]] = await Promise.all([
    query,
    db('orders').where({ tenant_id: tenantId, restaurant_id: restaurantId })
      .modify((q) => { if (status) q.where({ status }); })
      .count('id'),
  ]);

  return { orders, total: Number(count), page, limit };
};

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Deducts ingredients for each ordered menu item.
 * Silently skips items with no recipe defined.
 */
async function deductInventory(trx, { tenantId, restaurantId, order, items }) {
  // Aggregate total quantity needed per ingredient
  const ingredientMap = {};

  for (const item of items) {
    const recipe = await trx('menu_item_ingredients')
      .where({ tenant_id: tenantId, menu_item_id: item.menu_item_id });

    for (const r of recipe) {
      const needed = r.quantity_used * item.quantity;
      ingredientMap[r.inventory_item_id] =
        (ingredientMap[r.inventory_item_id] || 0) + needed;
    }
  }

  for (const [invId, qty] of Object.entries(ingredientMap)) {
    const invItem = await trx('inventory_items')
      .where({ id: invId, tenant_id: tenantId })
      .forUpdate()
      .first();

    if (!invItem) continue;

    const newQty = invItem.quantity_on_hand - qty;
    // We allow going slightly negative — alert in monitoring, don't block the order
    await trx('inventory_items')
      .where({ id: invId })
      .update({ quantity_on_hand: newQty, updated_at: new Date() });

    await trx('inventory_transactions').insert({
      tenant_id:         tenantId,
      inventory_item_id: invId,
      tx_type:           'sale_deduction',
      quantity_change:   -qty,
      quantity_after:    newQty,
      note:              `Auto-deducted for Order #${order.id}`,
      order_id:          order.id,
    });
  }
}

/**
 * Restores inventory when an order is cancelled.
 */
async function restoreInventory(trx, { tenantId, orderId, items }) {
  for (const item of items) {
    const recipe = await trx('menu_item_ingredients')
      .where({ tenant_id: tenantId, menu_item_id: item.menu_item_id });

    for (const r of recipe) {
      const restoreQty = r.quantity_used * item.quantity;
      const invItem    = await trx('inventory_items')
        .where({ id: r.inventory_item_id, tenant_id: tenantId })
        .forUpdate()
        .first();

      if (!invItem) continue;

      const newQty = invItem.quantity_on_hand + restoreQty;
      await trx('inventory_items')
        .where({ id: r.inventory_item_id })
        .update({ quantity_on_hand: newQty, updated_at: new Date() });

      await trx('inventory_transactions').insert({
        tenant_id:         tenantId,
        inventory_item_id: r.inventory_item_id,
        tx_type:           'return',
        quantity_change:   restoreQty,
        quantity_after:    newQty,
        note:              `Restored on cancellation of Order #${orderId}`,
        order_id:          orderId,
      });
    }
  }
}

module.exports = { placeOrder, updateOrderStatus, getOrderById, listOrders };
