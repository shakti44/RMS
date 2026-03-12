const db       = require('../config/database');
const ApiError  = require('../utils/ApiError');

/**
 * Multi-tenancy resolver.
 *
 * Resolution order:
 *  1. req.user.tenantId   (authenticated staff routes)
 *  2. req.query.tenant    (QR guest routes: ?tenant=slug&table=token)
 *  3. X-Tenant-Slug header (API integrations)
 *
 * Sets req.tenant = { id, slug, currency, settings, ... }
 */
const tenantResolver = async (req, _res, next) => {
  try {
    let tenantId   = req.user?.tenantId;
    let tenantSlug = req.query.tenant || req.headers['x-tenant-slug'];

    if (!tenantId && !tenantSlug) {
      throw ApiError.badRequest('Tenant context is required');
    }

    const tenant = await db('tenants')
      .where(tenantId ? { id: tenantId } : { slug: tenantSlug })
      .where({ is_active: true })
      .first();

    if (!tenant) throw ApiError.notFound('Tenant not found or inactive');

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = tenantResolver;
