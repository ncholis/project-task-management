const { z } = require('zod');
const { AppError } = require('../utils/errors');

function formatZodErrors(error) {
  return error.errors.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message
  }));
}

function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.params) req.params = schema.params.parse(req.params);
      if (schema.query) req.query = schema.query.parse(req.query);
      if (schema.body) req.body = schema.body.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation error', 400, formatZodErrors(error)));
      }
      return next(error);
    }
  };
}

module.exports = validate;
