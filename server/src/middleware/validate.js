const ApiError = require('../utils/ApiError');

/**
 * Joi schema validator middleware factory.
 * Usage: validate(myJoiSchema)  — validates req.body by default.
 *        validate(schema, 'query') — validates req.query
 */
const validate = (schema, source = 'body') =>
  (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const errors = error.details.map((d) => d.message);
      throw ApiError.badRequest('Validation failed', errors);
    }
    req[source] = value;
    next();
  };

module.exports = validate;
