const { z } = require('zod');

const validDate = z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), 'Invalid date');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});

const projectIdParam = z.object({
  projectId: z.coerce.number().int().positive()
});

const projectBody = z.object({
  project_name: z.string().min(1, 'Project name is required'),
  start_date: validDate.optional().nullable(),
  end_date: validDate.optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  manager_id: z.coerce.number().int().positive().optional().nullable()
});

const createProjectSchema = {
  body: projectBody
};

const updateProjectSchema = {
  params: idParam,
  body: projectBody.partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
};

const assignManagerSchema = {
  params: idParam,
  body: z.object({
    manager_id: z.coerce.number().int().positive()
  })
};

const projectIdSchema = {
  params: idParam
};

const projectTaskTreeSchema = {
  params: projectIdParam
};

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  assignManagerSchema,
  projectIdSchema,
  projectTaskTreeSchema
};
