const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors.length && { errors: err.errors }),
    });
  }

  // Knex / PG constraint violations
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry', detail: err.detail });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Foreign key violation', detail: err.detail });
  }

  logger.error({ message: err.message, stack: err.stack, path: req.path, method: req.method });
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
