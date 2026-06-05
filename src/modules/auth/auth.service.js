const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const prisma = require('../../config/prisma');
const { sanitizeUser } = require('../../middlewares/auth.middleware');
const { AppError } = require('../../utils/errors');

async function login({ username, password }) {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    throw new AppError('Invalid username or password', 401);
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: sanitizeUser(user)
  };
}

module.exports = {
  login
};
