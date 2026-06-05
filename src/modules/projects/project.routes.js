const express = require('express');
const projectController = require('./project.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles, checkProjectAccess } = require('../../middlewares/rbac.middleware');
const {
  createProjectSchema,
  updateProjectSchema,
  assignManagerSchema,
  projectIdSchema,
  projectTaskTreeSchema
} = require('./project.validation');

const router = express.Router();

router.use(authenticate);

router.post('/', authorizeRoles('ADMIN'), validate(createProjectSchema), projectController.createProject);
router.get('/', authorizeRoles('ADMIN', 'MANAGER'), projectController.listProjects);
router.get('/:projectId/tasks/tree', authorizeRoles('ADMIN', 'MANAGER'), validate(projectTaskTreeSchema), checkProjectAccess, projectController.getTaskTree);
router.get('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate(projectIdSchema), checkProjectAccess, projectController.getProject);
router.patch('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate(updateProjectSchema), checkProjectAccess, projectController.updateProject);
router.delete('/:id', authorizeRoles('ADMIN'), validate(projectIdSchema), projectController.deleteProject);
router.post('/:id/assign-manager', authorizeRoles('ADMIN'), validate(assignManagerSchema), projectController.assignManager);

module.exports = router;
