const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/errors');

function projectInclude() {
  return {
    manager: {
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true
      }
    },
    createdBy: {
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true
      }
    }
  };
}

async function ensureManager(managerId) {
  if (!managerId) return null;

  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager || manager.role !== 'MANAGER') {
    throw new AppError('Project can only be assigned to a Manager', 400);
  }

  return manager;
}

async function ensureProjectAccess(user, projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: projectInclude()
  });

  if (!project) throw new AppError('Project not found', 404);
  if (user.role === 'ADMIN') return project;
  if (user.role === 'MANAGER' && project.manager_id === user.id) return project;

  throw new AppError('Forbidden', 403);
}

async function createProject(user, data) {
  if (data.manager_id) await ensureManager(data.manager_id);

  return prisma.project.create({
    data: {
      ...data,
      created_by: user.id
    },
    include: projectInclude()
  });
}

async function listProjects(user) {
  if (user.role === 'ADMIN') {
    return prisma.project.findMany({
      include: projectInclude(),
      orderBy: { id: 'asc' }
    });
  }

  if (user.role === 'MANAGER') {
    return prisma.project.findMany({
      where: { manager_id: user.id },
      include: projectInclude(),
      orderBy: { id: 'asc' }
    });
  }

  throw new AppError('Forbidden', 403);
}

async function getProject(user, projectId) {
  return ensureProjectAccess(user, projectId);
}

async function updateProject(user, projectId, data) {
  await ensureProjectAccess(user, projectId);

  if (user.role === 'MANAGER' && Object.prototype.hasOwnProperty.call(data, 'manager_id')) {
    throw new AppError('Manager cannot assign manager to project', 403);
  }

  if (data.manager_id) await ensureManager(data.manager_id);

  return prisma.project.update({
    where: { id: projectId },
    data,
    include: projectInclude()
  });
}

async function deleteProject(projectId) {
  await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  await prisma.project.delete({ where: { id: projectId } });
  return { id: projectId };
}

async function assignManager(projectId, managerId) {
  await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  await ensureManager(managerId);

  return prisma.project.update({
    where: { id: projectId },
    data: { manager_id: managerId },
    include: projectInclude()
  });
}

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  assignManager,
  ensureProjectAccess
};
