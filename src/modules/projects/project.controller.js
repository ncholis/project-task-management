const projectService = require('./project.service');
const taskService = require('../tasks/task.service');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const createProject = asyncHandler(async (req, res) => {
  const data = await projectService.createProject(req.user, req.body);
  return sendSuccess(res, 'Project created', data, 201);
});

const listProjects = asyncHandler(async (req, res) => {
  const data = await projectService.listProjects(req.user);
  return sendSuccess(res, 'Projects retrieved', data);
});

const getProject = asyncHandler(async (req, res) => {
  const data = await projectService.getProject(req.user, req.params.id);
  return sendSuccess(res, 'Project retrieved', data);
});

const updateProject = asyncHandler(async (req, res) => {
  const data = await projectService.updateProject(req.user, req.params.id, req.body);
  return sendSuccess(res, 'Project updated', data);
});

const deleteProject = asyncHandler(async (req, res) => {
  const data = await projectService.deleteProject(req.params.id);
  return sendSuccess(res, 'Project deleted', data);
});

const assignManager = asyncHandler(async (req, res) => {
  const data = await projectService.assignManager(req.params.id, req.body.manager_id);
  return sendSuccess(res, 'Manager assigned to project', data);
});

const getTaskTree = asyncHandler(async (req, res) => {
  const data = await taskService.getProjectTaskTree(req.user, req.params.projectId);
  return sendSuccess(res, 'Project task tree retrieved', data);
});

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  assignManager,
  getTaskTree
};
