const { Prisma } = require('@prisma/client');
const { sendError } = require('../utils/response');

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return sendError(res, 'Duplicate data', [{ fields: err.meta?.target }], 409);
    }
    if (err.code === 'P2025') {
      return sendError(res, 'Resource not found', [], 404);
    }
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 'Unauthorized', [], 401);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  const errors = err.errors || [];

  if (statusCode === 500) {
    console.error(err);
  }

  return sendError(res, message, errors, statusCode);
}

module.exports = errorMiddleware;
