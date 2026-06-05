const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/errors');
const { publishTaskAssignmentEmail } = require('../../queues/email.queue');
const { publishOverdueTask } = require('../../queues/overdue.queue');
const { buildTaskTree } = require('./task.tree');
const {
  getCachedTaskTree,
  setCachedTaskTree,
  invalidateTaskTreeCache
} = require('./task.cache');

function safeUserSelect() {
  return {
    id: true,
    name: true,
    username: true,
    email: true,
    phone_number: true,
    role: true,
    created_at: true,
    updated_at: true
  };
}

function taskInclude() {
  return {
    project: true,
    parent: {
      select: {
        id: true,
        title: true,
        project_id: true
      }
    },
    assignedTo: {
      select: safeUserSelect()
    },
    assignedBy: {
      select: safeUserSelect()
    },
    createdBy: {
      select: safeUserSelect()
    }
  };
}

function hasOwn(data, key) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

async function getTaskOrFail(taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskInclude()
  });

  if (!task) throw new AppError('Task not found', 404);
  return task;
}

async function ensureProjectForTask(user, projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);

  if (user.role === 'ADMIN') return project;
  if (user.role === 'MANAGER' && project.manager_id === user.id) return project;

  throw new AppError('Forbidden', 403);
}

function assertCanViewTask(user, task) {
  if (user.role === 'ADMIN') return;
  if (user.role === 'MANAGER' && task.project.manager_id === user.id) return;
  if (user.role === 'STAFF' && task.assigned_to === user.id) return;

  throw new AppError('Forbidden', 403);
}

function assertCanManageTask(user, task) {
  if (user.role === 'ADMIN') return;
  if (user.role === 'MANAGER' && task.project.manager_id === user.id) return;

  throw new AppError('Forbidden', 403);
}

function assertCanUpdateStatus(user, task) {
  if (user.role === 'ADMIN') return;
  if (user.role === 'MANAGER' && task.project.manager_id === user.id) return;
  if (user.role === 'STAFF' && task.assigned_to === user.id) return;

  throw new AppError('Forbidden', 403);
}

async function ensureAssigneeAllowed(user, assignedTo) {
  if (!assignedTo) return null;

  const assignee = await prisma.user.findUnique({ where: { id: assignedTo } });
  if (!assignee || !['MANAGER', 'STAFF'].includes(assignee.role)) {
    throw new AppError('Task can only be assigned to Manager or Staff', 400);
  }

  if (user.role === 'MANAGER' && assignee.role !== 'STAFF') {
    throw new AppError('Manager can only assign Staff to task', 403);
  }

  return assignee;
}

async function ensureParentValid(parentId, projectId, taskId) {
  if (!parentId) return;
  if (taskId && parentId === taskId) throw new AppError('Task cannot be its own parent', 400);

  const parent = await prisma.task.findUnique({ where: { id: parentId } });
  if (!parent) throw new AppError('Parent task not found', 404);
  if (parent.project_id !== projectId) {
    throw new AppError('Parent task must be in the same project', 400);
  }

  if (!taskId) return;

  let currentParentId = parent.parent_id;
  while (currentParentId) {
    if (currentParentId === taskId) {
      throw new AppError('Task parent would create a cycle', 400);
    }
    const current = await prisma.task.findUnique({
      where: { id: currentParentId },
      select: { parent_id: true }
    });
    currentParentId = current?.parent_id || null;
  }
}

function validateTaskDates(data, currentTask = null) {
  const start = hasOwn(data, 'start_time') ? data.start_time : currentTask?.start_time;
  const end = hasOwn(data, 'end_time') ? data.end_time : currentTask?.end_time;

  if (start && end && new Date(start).getTime() > new Date(end).getTime()) {
    throw new AppError('end_time must be greater than or equal to start_time', 400);
  }
}

function scheduleOverdue(task) {
  if (!task.end_time) return;

  publishOverdueTask(task.id, task.end_time).catch((error) => {
    console.error('Failed to publish overdue task message:', error.message);
  });
}

function publishAssignmentEmail(task, assignee, assignedByUser) {
  if (!assignee) return;

  const payload = {
    to: assignee.email,
    subject: `Task assigned: ${task.title}`,
    task_title: task.title,
    project_name: task.project.project_name,
    assigned_by_name: assignedByUser.name
  };

  publishTaskAssignmentEmail(payload).catch((error) => {
    console.error('Failed to publish task assignment email:', error.message);
    console.log('Email payload fallback:', payload);
  });
}

async function createTask(user, data) {
  if (user.role === 'STAFF') throw new AppError('Forbidden', 403);

  await ensureProjectForTask(user, data.project_id);
  await ensureParentValid(data.parent_id, data.project_id);
  validateTaskDates(data);

  const assignee = await ensureAssigneeAllowed(user, data.assigned_to);
  const task = await prisma.task.create({
    data: {
      ...data,
      assigned_by: assignee ? user.id : null,
      created_by: user.id
    },
    include: taskInclude()
  });

  await invalidateTaskTreeCache(task.project_id);
  scheduleOverdue(task);
  publishAssignmentEmail(task, assignee, user);

  return task;
}

async function listTasks(user) {
  const where = user.role === 'ADMIN'
    ? {}
    : user.role === 'MANAGER'
      ? { project: { is: { manager_id: user.id } } }
      : { assigned_to: user.id };

  return prisma.task.findMany({
    where,
    include: taskInclude(),
    orderBy: { id: 'asc' }
  });
}

async function getTask(user, taskId) {
  const task = await getTaskOrFail(taskId);
  assertCanViewTask(user, task);
  return task;
}

async function updateTask(user, taskId, data) {
  const existing = await getTaskOrFail(taskId);
  assertCanManageTask(user, existing);
  validateTaskDates(data, existing);

  const targetProjectId = data.project_id || existing.project_id;
  if (hasOwn(data, 'project_id') && data.project_id !== existing.project_id) {
    await ensureProjectForTask(user, data.project_id);
    if (existing.parent_id && !hasOwn(data, 'parent_id')) {
      throw new AppError('parent_id must be updated when moving task to another project', 400);
    }
  }

  if (hasOwn(data, 'parent_id')) {
    await ensureParentValid(data.parent_id, targetProjectId, taskId);
  }

  const assignmentChanged = hasOwn(data, 'assigned_to') && data.assigned_to !== existing.assigned_to;
  const assignee = hasOwn(data, 'assigned_to')
    ? await ensureAssigneeAllowed(user, data.assigned_to)
    : null;

  const payload = { ...data };
  if (hasOwn(data, 'assigned_to')) {
    payload.assigned_by = data.assigned_to ? user.id : null;
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: payload,
    include: taskInclude()
  });

  await invalidateTaskTreeCache(existing.project_id);
  if (updated.project_id !== existing.project_id) {
    await invalidateTaskTreeCache(updated.project_id);
  }

  if (hasOwn(data, 'end_time')) scheduleOverdue(updated);
  if (assignmentChanged) publishAssignmentEmail(updated, assignee, user);

  return updated;
}

async function deleteTask(user, taskId) {
  const existing = await getTaskOrFail(taskId);
  assertCanManageTask(user, existing);

  await prisma.task.delete({ where: { id: taskId } });
  await invalidateTaskTreeCache(existing.project_id);

  return { id: taskId };
}

async function assignTask(user, taskId, assignedTo) {
  const existing = await getTaskOrFail(taskId);
  assertCanManageTask(user, existing);

  const assignee = await ensureAssigneeAllowed(user, assignedTo);
  const assignmentChanged = assignedTo !== existing.assigned_to;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      assigned_to: assignedTo,
      assigned_by: user.id
    },
    include: taskInclude()
  });

  await invalidateTaskTreeCache(updated.project_id);
  if (assignmentChanged) publishAssignmentEmail(updated, assignee, user);

  return updated;
}

async function updateTaskStatus(user, taskId, status) {
  const existing = await getTaskOrFail(taskId);
  assertCanUpdateStatus(user, existing);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status },
    include: taskInclude()
  });

  await invalidateTaskTreeCache(updated.project_id);
  return updated;
}

async function getProjectTaskTree(user, projectId) {
  if (user.role === 'STAFF') throw new AppError('Forbidden', 403);
  await ensureProjectForTask(user, projectId);

  const cached = await getCachedTaskTree(projectId);
  if (cached) return cached;

  const tasks = await prisma.task.findMany({
    where: { project_id: projectId },
    select: {
      id: true,
      project_id: true,
      parent_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      start_time: true,
      end_time: true,
      assigned_to: true,
      assigned_by: true,
      created_by: true,
      created_at: true,
      updated_at: true
    },
    orderBy: { id: 'asc' }
  });

  const tree = buildTaskTree(tasks);
  await setCachedTaskTree(projectId, tree);

  return tree;
}

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus,
  getProjectTaskTree,
  invalidateTaskTreeCache
};
