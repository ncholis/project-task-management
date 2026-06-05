const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});

const createUserSchema = {
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(6, 'Password minimum 6 characters'),
    email: z.string().email('Invalid email'),
    phone_number: z.string().optional().nullable(),
    role: z.enum(['MANAGER', 'STAFF'])
  })
};

const updateUserSchema = {
  params: idParam,
  body: z.object({
    name: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(6).optional(),
    email: z.string().email().optional(),
    phone_number: z.string().optional().nullable(),
    role: z.enum(['MANAGER', 'STAFF']).optional()
  }).refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
};

const userIdSchema = {
  params: idParam
};

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdSchema
};
