const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Default Admin',
      username: 'admin',
      password: adminPassword,
      email: 'admin@example.com',
      phone_number: '080000000001',
      role: 'ADMIN'
    }
  });

  const manager = await prisma.user.upsert({
    where: { username: 'manager1' },
    update: {},
    create: {
      name: 'Dummy Manager',
      username: 'manager1',
      password: userPassword,
      email: 'manager@example.com',
      phone_number: '080000000002',
      role: 'MANAGER'
    }
  });

  const staff = await prisma.user.upsert({
    where: { username: 'staff1' },
    update: {},
    create: {
      name: 'Dummy Staff',
      username: 'staff1',
      password: userPassword,
      email: 'staff@example.com',
      phone_number: '080000000003',
      role: 'STAFF'
    }
  });

  const project = await prisma.project.upsert({
    where: { id: 1 },
    update: {
      manager_id: manager.id
    },
    create: {
      project_name: 'Assessment Project',
      start_date: new Date(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: 'HIGH',
      manager_id: manager.id,
      created_by: admin.id
    }
  });

  const parentTask = await prisma.task.upsert({
    where: { id: 1 },
    update: {},
    create: {
      project_id: project.id,
      title: 'Backend Development',
      description: 'Build backend API modules',
      status: 'OPEN',
      priority: 'HIGH',
      start_time: new Date(),
      end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      assigned_to: staff.id,
      assigned_by: admin.id,
      created_by: admin.id
    }
  });

  const childTask = await prisma.task.upsert({
    where: { id: 2 },
    update: {},
    create: {
      project_id: project.id,
      parent_id: parentTask.id,
      title: 'Create Auth Module',
      description: 'Implement login and JWT middleware',
      status: 'WORKING',
      priority: 'HIGH',
      assigned_to: staff.id,
      assigned_by: manager.id,
      created_by: manager.id
    }
  });

  await prisma.task.upsert({
    where: { id: 3 },
    update: {},
    create: {
      project_id: project.id,
      parent_id: childTask.id,
      title: 'Create JWT Middleware',
      description: 'Authenticate Bearer token',
      status: 'OPEN',
      priority: 'MEDIUM',
      assigned_to: staff.id,
      assigned_by: manager.id,
      created_by: manager.id
    }
  });

  console.log('Seed completed');
  console.log('Admin login: admin / admin123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
