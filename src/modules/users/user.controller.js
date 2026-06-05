const userService = require('./user.service');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const createUser = asyncHandler(async (req, res) => {
  const data = await userService.createUser(req.body);
  return sendSuccess(res, 'User created', data, 201);
});

const listUsers = asyncHandler(async (req, res) => {
  const data = await userService.listUsers();
  return sendSuccess(res, 'Users retrieved', data);
});

const getUser = asyncHandler(async (req, res) => {
  const data = await userService.getUser(req.params.id);
  return sendSuccess(res, 'User retrieved', data);
});

const updateUser = asyncHandler(async (req, res) => {
  const data = await userService.updateUser(req.params.id, req.body);
  return sendSuccess(res, 'User updated', data);
});

const deleteUser = asyncHandler(async (req, res) => {
  const data = await userService.deleteUser(req.params.id);
  return sendSuccess(res, 'User deleted', data);
});

module.exports = {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser
};
