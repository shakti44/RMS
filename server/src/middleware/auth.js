const { verifyAccess } = require('../utils/jwt');
const ApiError          = require('../utils/ApiError');
const asyncHandler      = require('../utils/asyncHandler');

/**
 * Validates Bearer token and injects req.user = { id, tenantId, role }
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    throw ApiError.unauthorized('Missing or malformed authorization header');

  const token = header.slice(7);
  try {
    req.user = verifyAccess(token);
  } catch {
    throw ApiError.unauthorized('Token invalid or expired');
  }
  next();
});

/**
 * Role-based guard. Pass one or more allowed roles.
 * Usage: authorize('manager', 'tenant_admin')
 */
const authorize = (...roles) =>
  (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role))
      throw ApiError.forbidden(`Role '${req.user.role}' is not allowed here`);
    next();
  };

module.exports = { authenticate, authorize };
