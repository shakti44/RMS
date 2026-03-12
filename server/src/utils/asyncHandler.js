/**
 * Wraps an async Express route handler so unhandled promise rejections
 * are automatically forwarded to next(err) — no try/catch boilerplate needed.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
