/**
 * /api/inventory
 *
 * GET    /                   List all inventory items (with low-stock flag)
 * POST   /                   Add new inventory item
 * PUT    /:id                Update inventory item details
 * DELETE /:id                Remove inventory item
 * POST   /:id/adjust         Manual stock adjustment (purchase / wastage / audit)
 * GET    /:id/transactions   Transaction ledger for one ingredient
 * GET    /alerts/low-stock   Items at or below reorder level
 *
 * GET    /recipes/:menuItemId         Get recipe for a menu item
 * POST   /recipes/:menuItemId         Upsert recipe (ingredients list)
 * DELETE /recipes/:menuItemId/:invId  Remove one ingredient from recipe
 */
const router           = require('express').Router();
const db               = require('../config/database');
const ApiError         = require('../utils/ApiError');
const asyncHandler     = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const tenantResolver   = require('../middleware/tenantResolver');
const { emitToRestaurant } = require('../sockets');
const EVENTS           = require('../constants/socketEvents');

router.use(tenantResolver, authenticate);

// ── Inventory items ───────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const items = await db('inventory_items')
    .where({ tenant_id: req.tenant.id, restaurant_id: req.query.restaurantId })
    .orderBy('name');
  res.json({ success: true, data: items });
}));

router.post('/', asyncHandler(async (req, res) => {
  const [item] = await db('inventory_items')
    .insert({ tenant_id: req.tenant.id, ...req.body })
    .returning('*');
  res.status(201).json({ success: true, data: item });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const [item] = await db('inventory_items')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .update({ ...req.body, updated_at: new Date() })
    .returning('*');
  if (!item) throw ApiError.notFound('Inventory item not found');
  res.json({ success: true, data: item });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const count = await db('inventory_items')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .delete();
  if (!count) throw ApiError.notFound('Inventory item not found');
  res.json({ success: true });
}));

// ── Stock adjustment (manual) ─────────────────────────────────────────────────
router.post('/:id/adjust', asyncHandler(async (req, res) => {
  const { txType, quantityChange, note } = req.body;
  const validTypes = ['purchase', 'wastage', 'adjustment', 'return'];
  if (!validTypes.includes(txType)) throw ApiError.badRequest('Invalid transaction type');

  await db.transaction(async (trx) => {
    const item = await trx('inventory_items')
      .where({ id: req.params.id, tenant_id: req.tenant.id })
      .forUpdate()
      .first();
    if (!item) throw ApiError.notFound('Inventory item not found');

    const newQty = item.quantity_on_hand + quantityChange;
    await trx('inventory_items')
      .where({ id: item.id })
      .update({ quantity_on_hand: newQty, updated_at: new Date() });

    await trx('inventory_transactions').insert({
      tenant_id:         req.tenant.id,
      inventory_item_id: item.id,
      tx_type:           txType,
      quantity_change:   quantityChange,
      quantity_after:    newQty,
      note:              note || null,
      performed_by:      req.user.id,
    });

    // Emit low-stock alert if needed
    if (newQty <= item.reorder_level) {
      emitToRestaurant(item.restaurant_id, EVENTS.STOCK_LOW, {
        itemId: item.id, name: item.name,
        quantity_on_hand: newQty, reorder_level: item.reorder_level,
      });
    }
  });

  const updated = await db('inventory_items').where({ id: req.params.id }).first();
  res.json({ success: true, data: updated });
}));

router.get('/:id/transactions', asyncHandler(async (req, res) => {
  const txns = await db('inventory_transactions')
    .where({ inventory_item_id: req.params.id, tenant_id: req.tenant.id })
    .orderBy('created_at', 'desc')
    .limit(100);
  res.json({ success: true, data: txns });
}));

router.get('/alerts/low-stock', asyncHandler(async (req, res) => {
  const items = await db('inventory_items')
    .where({ tenant_id: req.tenant.id, restaurant_id: req.query.restaurantId })
    .whereRaw('quantity_on_hand <= reorder_level')
    .orderBy('name');
  res.json({ success: true, data: items });
}));

// ── Recipes ───────────────────────────────────────────────────────────────────
router.get('/recipes/:menuItemId', asyncHandler(async (req, res) => {
  const recipe = await db('menu_item_ingredients as mii')
    .where({ 'mii.tenant_id': req.tenant.id, 'mii.menu_item_id': req.params.menuItemId })
    .join('inventory_items as ii', 'mii.inventory_item_id', 'ii.id')
    .select('mii.*', 'ii.name as ingredient_name', 'ii.unit');
  res.json({ success: true, data: recipe });
}));

router.post('/recipes/:menuItemId', asyncHandler(async (req, res) => {
  // req.body.ingredients = [{ inventoryItemId, quantityUsed }, ...]
  const { ingredients } = req.body;
  if (!ingredients?.length) throw ApiError.badRequest('Ingredients array required');

  await db.transaction(async (trx) => {
    await trx('menu_item_ingredients')
      .where({ menu_item_id: req.params.menuItemId, tenant_id: req.tenant.id })
      .delete();

    const rows = ingredients.map((i) => ({
      tenant_id:         req.tenant.id,
      menu_item_id:      req.params.menuItemId,
      inventory_item_id: i.inventoryItemId,
      quantity_used:     i.quantityUsed,
    }));
    await trx('menu_item_ingredients').insert(rows);
  });

  res.json({ success: true, message: 'Recipe saved' });
}));

router.delete('/recipes/:menuItemId/:invId', asyncHandler(async (req, res) => {
  await db('menu_item_ingredients')
    .where({
      menu_item_id:      req.params.menuItemId,
      inventory_item_id: req.params.invId,
      tenant_id:         req.tenant.id,
    })
    .delete();
  res.json({ success: true });
}));

module.exports = router;
