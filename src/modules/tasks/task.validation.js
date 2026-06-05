const { z } = require('zod');

const validDate = z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), 'Invalid date');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});

const taskBody = z.object({
  project_id: z.coerce.number().int().positive(),
  parent_id: z.coerce.number().int().positive().optional().nullable(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().nullable(),
  status: z.enum(['OPEN', 'WORKING', 'CLOSED', 'OVERDUE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  start_time: validDate.optional().nullable(),
  end_time: validDate.optional().nullable(),
  assigned_to: z.coerce.number().int().positive().optional().nullable()
});

const createTaskSchema = {
  body: taskBody
};

const updateTaskSchema = {
  params: idParam,
  body: taskBody.partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
};

const taskIdSchema = {
  params: idParam
};

const assignTaskSchema = {
  params: idParam,
  body: z.object({
    assigned_to: z.coerce.number().int().positive()
  })
};

const updateTaskStatusSchema = {
  params: idParam,
  body: z.object({
    status: z.enum(['OPEN', 'WORKING', 'CLOSED', 'OVERDUE'])
  })
};

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  assignTaskSchema,
  updateTaskStatusSchema
};
