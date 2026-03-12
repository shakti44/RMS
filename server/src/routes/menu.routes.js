/**
 * /api/menu
 *
 * Public (QR guest):
 *   GET  /public/:restaurantId          Full menu grouped by category
 *   GET  /public/item/:itemId           Single item with modifiers
 *
 * Authenticated (staff/admin):
 *   GET    /categories                  List categories
 *   POST   /categories                  Create category
 *   PUT    /categories/:id              Update category
 *   DELETE /categories/:id              Delete category
 *
 *   GET    /items                       List menu items
 *   POST   /items                       Create menu item
 *   PUT    /items/:id                   Update menu item
 *   DELETE /items/:id                   Delete menu item
 *   PATCH  /items/:id/availability      Toggle availability
 */
const router           = require('express').Router();
const db               = require('../config/database');
const asyncHandler     = require('../utils/asyncHandler');
const ApiError         = require('../utils/ApiError');
const { authenticate } = require('../middleware/auth');
const tenantResolver   = require('../middleware/tenantResolver');

// ── Public routes (no auth needed) ───────────────────────────────────────────

// Resolve default restaurant for a tenant (used when no restaurantId in QR URL)
router.get('/public/tenant/:tenantSlug/restaurant', asyncHandler(async (req, res) => {
  const tenant = await db('tenants').where({ slug: req.params.tenantSlug, is_active: true }).first();
  if (!tenant) throw ApiError.notFound('Restaurant not found');
  const restaurant = await db('restaurants').where({ tenant_id: tenant.id }).first();
  if (!restaurant) throw ApiError.notFound('Restaurant not found');
  res.json({ success: true, data: { restaurantId: restaurant.id, tenantName: tenant.name } });
}));

router.get('/public/:restaurantId', asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  // Verify restaurant exists
  const restaurant = await db('restaurants').where({ id: restaurantId }).first();
  if (!restaurant) throw ApiError.notFound('Restaurant not found');

  const categories = await db('categories')
    .where({ tenant_id: restaurant.tenant_id, restaurant_id: restaurantId, is_active: true })
    .orderBy('sort_order');

  const items = await db('menu_items')
    .where({ tenant_id: restaurant.tenant_id, restaurant_id: restaurantId, is_available: true })
    .orderBy(['category_id', 'sort_order']);

  const itemsWithMods = await Promise.all(
    items.map(async (item) => {
      const groups = await db('modifier_groups')
        .where({ tenant_id: restaurant.tenant_id, menu_item_id: item.id });
      for (const g of groups) {
        g.options = await db('modifier_options')
          .where({ modifier_group_id: g.id, is_available: true });
      }
      return { ...item, modifier_groups: groups };
    })
  );

  const grouped = categories.map((cat) => ({
    ...cat,
    items: itemsWithMods.filter((i) => i.category_id === cat.id),
  }));

  res.json({ success: true, data: grouped, restaurantName: restaurant.name });
}));

router.get('/public/item/:itemId', asyncHandler(async (req, res) => {
  const item = await db('menu_items')
    .where({ id: req.params.itemId, tenant_id: req.tenant.id, is_available: true })
    .first();
  if (!item) throw ApiError.notFound('Item not found');

  const groups = await db('modifier_groups').where({ menu_item_id: item.id });
  for (const g of groups) {
    g.options = await db('modifier_options').where({ modifier_group_id: g.id, is_available: true });
  }
  res.json({ success: true, data: { ...item, modifier_groups: groups } });
}));

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use(authenticate);

// Categories CRUD
router.get('/categories', asyncHandler(async (req, res) => {
  const cats = await db('categories')
    .where({ tenant_id: req.tenant.id, restaurant_id: req.query.restaurantId })
    .orderBy('sort_order');
  res.json({ success: true, data: cats });
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const [cat] = await db('categories')
    .insert({ tenant_id: req.tenant.id, ...req.body })
    .returning('*');
  res.status(201).json({ success: true, data: cat });
}));

router.put('/categories/:id', asyncHandler(async (req, res) => {
  const [cat] = await db('categories')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .update({ ...req.body, updated_at: new Date() })
    .returning('*');
  if (!cat) throw ApiError.notFound('Category not found');
  res.json({ success: true, data: cat });
}));

router.delete('/categories/:id', asyncHandler(async (req, res) => {
  const count = await db('categories')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .delete();
  if (!count) throw ApiError.notFound('Category not found');
  res.json({ success: true, message: 'Category deleted' });
}));

// Menu items CRUD
router.get('/items', asyncHandler(async (req, res) => {
  const items = await db('menu_items')
    .where({ tenant_id: req.tenant.id, restaurant_id: req.query.restaurantId })
    .orderBy(['category_id', 'sort_order']);
  res.json({ success: true, data: items });
}));

router.post('/items', asyncHandler(async (req, res) => {
  const [item] = await db('menu_items')
    .insert({ tenant_id: req.tenant.id, ...req.body })
    .returning('*');
  res.status(201).json({ success: true, data: item });
}));

router.put('/items/:id', asyncHandler(async (req, res) => {
  const [item] = await db('menu_items')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .update({ ...req.body, updated_at: new Date() })
    .returning('*');
  if (!item) throw ApiError.notFound('Menu item not found');
  res.json({ success: true, data: item });
}));

router.delete('/items/:id', asyncHandler(async (req, res) => {
  const count = await db('menu_items')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .delete();
  if (!count) throw ApiError.notFound('Menu item not found');
  res.json({ success: true, message: 'Item deleted' });
}));

router.patch('/items/:id/availability', asyncHandler(async (req, res) => {
  const [item] = await db('menu_items')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .update({ is_available: req.body.is_available, updated_at: new Date() })
    .returning('*');
  if (!item) throw ApiError.notFound('Menu item not found');
  res.json({ success: true, data: item });
}));

module.exports = router;
