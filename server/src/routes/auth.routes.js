const router      = require('express').Router();
const bcrypt      = require('bcryptjs');
const db          = require('../config/database');
const asyncHandler= require('../utils/asyncHandler');
const ApiError    = require('../utils/ApiError');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/register-tenant
 * Creates a new tenant + initial admin user in one transaction.
 */
router.post('/register-tenant', asyncHandler(async (req, res) => {
  const { tenantName, slug, email, password, restaurantName } = req.body;
  if (!tenantName || !slug || !email || !password)
    throw ApiError.badRequest('tenantName, slug, email, and password are required');

  const existing = await db('tenants').where({ slug }).orWhere({ email }).first();
  if (existing) throw ApiError.conflict('Tenant slug or email already in use');

  await db.transaction(async (trx) => {
    const [tenant] = await trx('tenants')
      .insert({ name: tenantName, slug, email })
      .returning('*');

    // Default restaurant
    const [restaurant] = await trx('restaurants')
      .insert({ tenant_id: tenant.id, name: restaurantName || tenantName })
      .returning('*');

    const hash = await bcrypt.hash(password, 12);
    await trx('users').insert({
      tenant_id:     tenant.id,
      name:          'Admin',
      email,
      password_hash: hash,
      role:          'tenant_admin',
    });

    res.status(201).json({
      success: true,
      message: 'Tenant registered',
      data: { tenantId: tenant.id, slug: tenant.slug, restaurantId: restaurant.id },
    });
  });
}));

/**
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password are required');

  const user = await db('users as u')
    .join('tenants as t', 'u.tenant_id', 't.id')
    .where({ 'u.email': email, 'u.is_active': true, 't.is_active': true })
    .select('u.*', 't.slug as tenant_slug', 't.name as tenant_name', 't.settings as tenant_settings')
    .first();

  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  const payload = { id: user.id, tenantId: user.tenant_id, role: user.role };
  const accessToken  = signAccess(payload);
  const refreshToken = signRefresh(payload);

  await db('users').where({ id: user.id }).update({
    refresh_token: refreshToken,
    last_login_at: new Date(),
  });

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        tenantId:   user.tenant_id,
        tenantSlug: user.tenant_slug,
        tenantName: user.tenant_name,
      },
    },
  });
}));

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('Refresh token required');

  let decoded;
  try { decoded = verifyRefresh(refreshToken); }
  catch { throw ApiError.unauthorized('Refresh token invalid or expired'); }

  const user = await db('users')
    .where({ id: decoded.id, refresh_token: refreshToken, is_active: true })
    .first();
  if (!user) throw ApiError.unauthorized('Token revoked');

  const newAccess  = signAccess({ id: user.id, tenantId: user.tenant_id, role: user.role });
  res.json({ success: true, data: { accessToken: newAccess } });
}));

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await db('users').where({ id: req.user.id }).update({ refresh_token: null });
  res.json({ success: true, message: 'Logged out' });
}));

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await db('users').where({ id: req.user.id }).first();
  if (!user) throw ApiError.notFound('User not found');
  const { password_hash, refresh_token, ...safe } = user;
  res.json({ success: true, data: safe });
}));

module.exports = router;
