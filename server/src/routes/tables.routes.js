/**
 * /api/tables
 *
 * GET    /                  List tables for a restaurant
 * POST   /                  Create table
 * PUT    /:id               Update table details
 * DELETE /:id               Delete table
 * PATCH  /:id/status        Update table status (available/occupied/reserved/cleaning)
 * GET    /qr/:token         Resolve QR token → table + restaurant info (public)
 */
const router           = require('express').Router();
const db               = require('../config/database');
const ApiError         = require('../utils/ApiError');
const asyncHandler     = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const tenantResolver   = require('../middleware/tenantResolver');

// Public: resolve QR token (called when customer scans QR)
router.get('/qr/:token', asyncHandler(async (req, res) => {
  const table = await db('restaurant_tables as t')
    .join('restaurants as r', 't.restaurant_id', 'r.id')
    .join('tenants as tn',    't.tenant_id',      'tn.id')
    .where({ 't.qr_token': req.params.token, 't.is_active': true, 'tn.is_active': true })
    .select(
      't.id as table_id',
      't.name as table_name',
      't.status as table_status',
      'r.id as restaurant_id',
      'r.name as restaurant_name',
      'tn.slug as tenant_slug',
      'tn.name as tenant_name',
      'tn.logo_url',
      'tn.primary_color',
    )
    .first();

  if (!table) throw ApiError.notFound('Invalid or expired QR code');

  res.json({ success: true, data: table });
}));

// All routes below require auth + tenant context
router.use(tenantResolver, authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const tables = await db('restaurant_tables')
    .where({ tenant_id: req.tenant.id, restaurant_id: req.query.restaurantId })
    .orderBy(['section', 'name']);
  res.json({ success: true, data: tables });
}));

router.post('/', asyncHandler(async (req, res) => {
  const [table] = await db('restaurant_tables')
    .insert({ tenant_id: req.tenant.id, ...req.body })
    .returning('*');
  res.status(201).json({ success: true, data: table });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const [table] = await db('restaurant_tables')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .update({ ...req.body, updated_at: new Date() })
    .returning('*');
  if (!table) throw ApiError.notFound('Table not found');
  res.json({ success: true, data: table });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const count = await db('restaurant_tables')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .delete();
  if (!count) throw ApiError.notFound('Table not found');
  res.json({ success: true });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const valid = ['available', 'occupied', 'reserved', 'cleaning'];
  if (!valid.includes(req.body.status))
    throw ApiError.badRequest(`Status must be one of: ${valid.join(', ')}`);

  const [table] = await db('restaurant_tables')
    .where({ id: req.params.id, tenant_id: req.tenant.id })
    .update({ status: req.body.status, updated_at: new Date() })
    .returning('*');
  if (!table) throw ApiError.notFound('Table not found');
  res.json({ success: true, data: table });
}));

module.exports = router;
