const taskService = require('./task.service');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const createTask = asyncHandler(async (req, res) => {
  const data = await taskService.createTask(req.user, req.body);
  return sendSuccess(res, 'Task created', data, 201);
});

const listTasks = asyncHandler(async (req, res) => {
  const data = await taskService.listTasks(req.user);
  return sendSuccess(res, 'Tasks retrieved', data);
});

const getTask = asyncHandler(async (req, res) => {
  const data = await taskService.getTask(req.user, req.params.id);
  return sendSuccess(res, 'Task retrieved', data);
});

const updateTask = asyncHandler(async (req, res) => {
  const data = await taskService.updateTask(req.user, req.params.id, req.body);
  return sendSuccess(res, 'Task updated', data);
});

const deleteTask = asyncHandler(async (req, res) => {
  const data = await taskService.deleteTask(req.user, req.params.id);
  return sendSuccess(res, 'Task deleted', data);
});

const assignTask = asyncHandler(async (req, res) => {
  const data = await taskService.assignTask(req.user, req.params.id, req.body.assigned_to);
  return sendSuccess(res, 'Task assigned', data);
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const data = await taskService.updateTaskStatus(req.user, req.params.id, req.body.status);
  return sendSuccess(res, 'Task status updated', data);
});

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus
};
