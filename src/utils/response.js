function sendSuccess(res, message = 'Success', data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function sendError(res, message = 'Internal server error', errors = [], statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
}

module.exports = {
  sendSuccess,
  sendError
};
