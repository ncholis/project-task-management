const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403));
    }
    return next();
  };
}

const checkProjectAccess = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'ADMIN') return next();
  if (req.user.role !== 'MANAGER') throw new AppError('Forbidden', 403);

  const projectId = Number(req.params.id || req.params.projectId || req.body.project_id);
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) throw new AppError('Project not found', 404);
  if (project.manager_id !== req.user.id) throw new AppError('Forbidden', 403);

  return next();
});

const checkTaskAccess = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'ADMIN') return next();

  const task = await prisma.task.findUnique({
    where: { id: Number(req.params.id) },
    include: { project: true }
  });

  if (!task) throw new AppError('Task not found', 404);

  if (req.user.role === 'MANAGER' && task.project.manager_id === req.user.id) return next();
  if (req.user.role === 'STAFF' && task.assigned_to === req.user.id) return next();

  throw new AppError('Forbidden', 403);
});

module.exports = {
  authorizeRoles,
  checkProjectAccess,
  checkTaskAccess
};
