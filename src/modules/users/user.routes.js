const express = require('express');
const userController = require('./user.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const { createUserSchema, updateUserSchema, userIdSchema } = require('./user.validation');

const router = express.Router();

router.use(authenticate, authorizeRoles('ADMIN'));

router.post('/', validate(createUserSchema), userController.createUser);
router.get('/', userController.listUsers);
router.get('/:id', validate(userIdSchema), userController.getUser);
router.patch('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', validate(userIdSchema), userController.deleteUser);

module.exports = router;
