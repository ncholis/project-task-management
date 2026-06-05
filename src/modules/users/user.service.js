const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const { sanitizeUser } = require('../../middlewares/auth.middleware');
const { AppError } = require('../../utils/errors');

const MANAGED_ROLES = ['MANAGER', 'STAFF'];

async function createUser(data) {
  if (!MANAGED_ROLES.includes(data.role)) {
    throw new AppError('Admin can only create Manager or Staff users', 403);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      ...data,
      password: hashedPassword
    }
  });

  return sanitizeUser(user);
}

async function listUsers() {
  const users = await prisma.user.findMany({
    where: { role: { in: MANAGED_ROLES } },
    orderBy: { id: 'asc' }
  });

  return users.map(sanitizeUser);
}

async function getManagedUser(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !MANAGED_ROLES.includes(user.role)) {
    throw new AppError('User not found', 404);
  }

  return user;
}

async function getUser(id) {
  return sanitizeUser(await getManagedUser(id));
}

async function updateUser(id, data) {
  await getManagedUser(id);

  if (data.role && !MANAGED_ROLES.includes(data.role)) {
    throw new AppError('Admin can only manage Manager or Staff users', 403);
  }

  const payload = { ...data };
  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: payload
  });

  return sanitizeUser(updated);
}

async function deleteUser(id) {
  await getManagedUser(id);
  await prisma.user.delete({ where: { id } });
  return { id };
}

module.exports = {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser
};
