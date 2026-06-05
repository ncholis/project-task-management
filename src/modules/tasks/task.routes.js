const express = require('express');
const taskController = require('./task.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles, checkTaskAccess } = require('../../middlewares/rbac.middleware');
const {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  assignTaskSchema,
  updateTaskStatusSchema
} = require('./task.validation');

const router = express.Router();

router.use(authenticate);

router.post('/', authorizeRoles('ADMIN', 'MANAGER'), validate(createTaskSchema), taskController.createTask);
router.get('/', authorizeRoles('ADMIN', 'MANAGER', 'STAFF'), taskController.listTasks);
router.post('/:id/assign', authorizeRoles('ADMIN', 'MANAGER'), validate(assignTaskSchema), checkTaskAccess, taskController.assignTask);
router.patch('/:id/status', authorizeRoles('ADMIN', 'MANAGER', 'STAFF'), validate(updateTaskStatusSchema), checkTaskAccess, taskController.updateTaskStatus);
router.get('/:id', authorizeRoles('ADMIN', 'MANAGER', 'STAFF'), validate(taskIdSchema), checkTaskAccess, taskController.getTask);
router.patch('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate(updateTaskSchema), checkTaskAccess, taskController.updateTask);
router.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate(taskIdSchema), checkTaskAccess, taskController.deleteTask);

module.exports = router;
