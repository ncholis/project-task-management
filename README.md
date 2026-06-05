# Project & Task Management System

Backend API untuk technical assessment Senior Backend Developer. Sistem ini menyediakan IAM/RBAC, project management, task management dengan recursive task tree, Redis cache, RabbitMQ worker untuk overdue automation, dan email notification via Nodemailer.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- Redis
- RabbitMQ
- Nodemailer
- JWT
- bcrypt
- Zod
- Docker dan Docker Compose
- Postman Collection untuk dokumentasi API

## Fitur Utama

- Login JWT dengan username dan password.
- Password hashing menggunakan bcrypt.
- RBAC untuk role `ADMIN`, `MANAGER`, dan `STAFF`.
- CRUD user oleh Admin untuk role Manager dan Staff.
- CRUD project oleh Admin, update project oleh Manager pada project miliknya.
- CRUD task oleh Admin dan Manager sesuai ownership project.
- Staff hanya melihat dan update status task yang di-assign kepadanya.
- Recursive task parent-child via `parent_id` tanpa batas level.
- Tree endpoint menggunakan Redis cache dengan TTL.
- Cache invalidation setiap task berubah.
- Email notification saat task di-assign.
- RabbitMQ delayed queue untuk auto-update task menjadi `OVERDUE`.
- Centralized error handling dan response JSON konsisten.

## Role Access Matrix

| Resource | ADMIN | MANAGER | STAFF |
| --- | --- | --- | --- |
| Users | CRUD Manager/Staff | No access | No access |
| Projects | Full CRUD, assign Manager | View/update assigned projects | No access |
| Tasks | Full CRUD, assign Manager/Staff | CRUD task on assigned projects, assign Staff | View assigned tasks only |
| Task Status | Any task | Task in assigned projects | Assigned task only |
| Task Tree | Any project | Assigned projects | No access |

## Database Schema Summary

- `User`: `id`, `name`, `username`, `password`, `email`, `phone_number`, `role`, `created_at`, `updated_at`.
- `Project`: `id`, `project_name`, `start_date`, `end_date`, `priority`, `manager_id`, `created_by`, timestamps.
- `Task`: `id`, `project_id`, `parent_id`, `title`, `description`, `status`, `priority`, `start_time`, `end_time`, `assigned_to`, `assigned_by`, `created_by`, timestamps.

Enums:

- `Role`: `ADMIN`, `MANAGER`, `STAFF`
- `ProjectPriority`: `LOW`, `MEDIUM`, `HIGH`
- `TaskPriority`: `LOW`, `MEDIUM`, `HIGH`
- `TaskStatus`: `OPEN`, `WORKING`, `CLOSED`, `OVERDUE`

## Default Admin Credential

```text
username: admin
password: admin123
email: admin@example.com
```

## Run with Local Node and Docker Dependencies

Use this flow when running API and workers from host machine. `.env` is already configured with `localhost` service hosts.

```bash
docker compose up -d postgres redis rabbitmq
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Run workers in separate terminals:

```bash
npm run worker:overdue
npm run worker:email
```

API URL:

```text
http://localhost:3000
```

RabbitMQ Management:

```text
http://localhost:15672
username: guest
password: guest
```

## Run with Full Docker

```bash
docker compose up --build
```

The `app` service runs `prisma migrate deploy`, runs seed, then starts the API. `overdue-worker` and `email-worker` run as separate services.

## Prisma Commands

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migration in development:

```bash
npm run prisma:migrate
```

Run seed:

```bash
npm run prisma:seed
```

## API Documentation

Import this file into Postman:

```text
docs/postman_collection.json
```

Collection variables:

- `base_url = http://localhost:3000`
- `token`
- `user_id`
- `manager_id`
- `staff_id`
- `project_id`
- `task_id`

Run `Auth Login` first. Login test script stores `token` automatically into Postman environment and collection variables when possible.

## Response Format

Success:

```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

## Cache Tree View

Endpoint:

```text
GET /api/projects/:projectId/tasks/tree
```

Redis key:

```text
task_tree:project:{projectId}
```

Flow:

1. API checks Redis using `task_tree:project:{projectId}`.
2. If cache exists, API returns cached tree.
3. If cache misses, API loads all tasks for project in one query.
4. API builds parent-child tree in memory using a map.
5. API stores tree in Redis with TTL from `CACHE_TTL_SECONDS`.

## Cache Invalidation

Cache is deleted with `DEL task_tree:project:{projectId}` whenever task data changes:

- create task
- update task
- delete task
- assign task
- update task status
- overdue worker changes status to `OVERDUE`

Helper functions live in `src/modules/tasks/task.cache.js`:

- `getTaskTreeCacheKey(projectId)`
- `invalidateTaskTreeCache(projectId)`

Invalidation is required so recursive tree view does not serve stale data after writes.

## RabbitMQ Delayed Task Overdue

The system uses RabbitMQ TTL queue plus dead-letter exchange pattern:

- On task create or `end_time` update, API publishes delayed payload to `task.overdue.delay`.
- Message expiration is set to `end_time - now`.
- Expired message is dead-lettered into `task.overdue.ready`.
- `src/workers/overdue.worker.js` consumes ready messages.
- Worker reloads task from database before updating.

Worker idempotency rules:

- If task does not exist, ack message.
- If task is already `CLOSED`, ack message.
- If task `end_time` differs from payload, ack old message.
- If current time has not passed latest `end_time`, publish delayed message again.
- If current time passed `end_time` and status is not `CLOSED`, update status to `OVERDUE` and invalidate Redis cache.

Payload:

```json
{
  "task_id": 1,
  "end_time": "2026-06-10T15:00:00.000Z"
}
```

## Email Notification

Task assignment publishes email event to RabbitMQ queue `task.assignment.email`.

Payload:

```json
{
  "to": "staff@example.com",
  "subject": "Task assigned: Backend Development",
  "task_title": "Backend Development",
  "project_name": "Assessment Project",
  "assigned_by_name": "Default Admin"
}
```

`src/workers/email.worker.js` consumes the event and sends email using Nodemailer. If SMTP config is empty, worker logs payload to console and does not crash.

## Example Flow

1. Login admin with `admin / admin123`.
2. Create manager.
3. Create staff.
4. Create project.
5. Assign manager to project.
6. Create parent task.
7. Create child task with `parent_id` from parent task.
8. Assign task to staff.
9. Get task tree with `GET /api/projects/:projectId/tasks/tree`.
10. Wait until `end_time`; overdue worker changes status to `OVERDUE` if task is not `CLOSED`.

## Technical Design Explanation

### Kenapa Menggunakan RBAC

RBAC memisahkan permission berdasarkan role. Admin punya akses penuh, Manager dibatasi ke project yang di-assign, dan Staff dibatasi ke task yang di-assign. Ini membuat authorization mudah diaudit dan sesuai requirement IAM.

### Kenapa Task Menggunakan Self-Referencing `parent_id`

Self-reference membuat task bisa punya child/sub-task tanpa batas level. Struktur ini fleksibel untuk nested task dan cukup disimpan dalam satu tabel `Task`.

### Kenapa Recursive Tree Dibangun dari Flat List Menggunakan Map

Tree endpoint mengambil semua task project dalam satu query, lalu membangun hierarchy di memory memakai `Map`. Cara ini menghindari recursive query per node dan mencegah N+1 query.

### Kenapa Recursive Tree View Menggunakan Redis Cache

Tree build bisa sering dipanggil dan hasilnya relatif stabil dibanding write task. Redis cache mengurangi load database dan mempercepat response tree view.

### Bagaimana Cache Invalidation Bekerja

Setiap mutation task menghapus key `task_tree:project:{projectId}`. Request tree berikutnya akan mengambil data baru dari database, rebuild tree, lalu menyimpan cache baru.

### Bagaimana RabbitMQ Delayed Message Bekerja untuk Overdue Task

API menghitung delay dari `end_time`, lalu publish message ke TTL delay queue. Setelah TTL habis, RabbitMQ memindahkan message ke ready queue melalui dead-letter exchange. Worker consume ready queue dan melakukan validasi ulang ke database.

### Bagaimana Email Notification Diproses Asynchronous

API tidak mengirim email langsung. API publish event ke RabbitMQ agar response assignment cepat. Email worker memproses pengiriman di background menggunakan Nodemailer.

### Bagaimana Worker Dibuat Idempotent

Overdue worker selalu membaca task terbaru dari database. Message lama tidak mengubah data jika `end_time` sudah berubah, task sudah `CLOSED`, atau task tidak ditemukan. Update `OVERDUE` hanya dilakukan jika kondisi terbaru masih valid.

### Bagaimana Role Manager dan Staff Dibatasi Aksesnya

Manager hanya lolos akses jika `project.manager_id` sama dengan `req.user.id`. Staff hanya lolos akses task jika `task.assigned_to` sama dengan `req.user.id`. Middleware dan service layer sama-sama menerapkan pembatasan ini pada endpoint yang relevan.

## Project Structure

```text
src/
  app.js
  server.js
  config/
  middlewares/
  modules/
    auth/
    users/
    projects/
    tasks/
  queues/
  workers/
  utils/
prisma/
  schema.prisma
  seed.js
  migrations/
docs/
  postman_collection.json
Dockerfile
docker-compose.yml
.env
.env.example
package.json
README.md
```

## Security Notes

- Password disimpan hashed dengan bcrypt.
- JWT secret dibaca dari environment variable.
- Password tidak pernah dikembalikan pada response API.
- Protected endpoint memakai middleware authentication.
- Role access memakai RBAC middleware dan service ownership checks.
- Request body divalidasi menggunakan Zod.
- Error response distandardisasi lewat centralized error middleware.
