const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return sendSuccess(res, 'Login success', data);
});

const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Authenticated user', req.user);
});

module.exports = {
  login,
  me
};
