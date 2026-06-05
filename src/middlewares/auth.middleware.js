const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');

function sanitizeUser(user) {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new AppError('Unauthorized', 401);
  }

  const decoded = jwt.verify(token, env.JWT_SECRET);
  const user = await prisma.user.findUnique({ where: { id: Number(decoded.sub) } });

  if (!user) {
    throw new AppError('Unauthorized', 401);
  }

  req.user = sanitizeUser(user);
  next();
});

module.exports = {
  authenticate,
  sanitizeUser
};
