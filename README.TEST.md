# Testing Guide - Project & Task Management System

Panduan lengkap untuk testing semua fitur berdasarkan Technical Assessment Requirements.

## Prerequisites

Pastikan aplikasi sudah berjalan:
```bash
docker-compose up -d
```

Tunggu hingga semua services healthy (~30 detik), lalu jalankan migration & seed:
```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run seed
```

## Default Users (Setelah Seed)

| Username | Password   | Role    | ID |
|----------|------------|---------|-----|
| admin    | admin123   | ADMIN   | 1   |
| manager1 | manager123 | MANAGER | 2   |
| staff1   | staff123   | STAFF   | 3   |

---

## Testing Flow

### 🔐 **PART 1: Identity & Access Management (IAM)**

#### 1.1 Login & Authentication

**Test 1: Login sebagai Admin**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**💡 SIMPAN TOKEN** untuk digunakan di request selanjutnya sebagai `$ADMIN_TOKEN`

---

**Test 2: Get Current User Profile**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Admin User",
    "username": "admin",
    "role": "ADMIN"
  }
}
```

---

#### 1.2 Role-Based Access Control (RBAC)

**Test 3: Admin - Create Manager User**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manager Two",
    "username": "manager2",
    "password": "manager123",
    "email": "manager2@example.com",
    "phone_number": "081234567890",
    "role": "MANAGER"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "Manager Two",
    "username": "manager2",
    "role": "MANAGER"
  }
}
```

**💡 SIMPAN ID** sebagai `$MANAGER2_ID`

---

**Test 4: Admin - Create Staff User**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Staff Two",
    "username": "staff2",
    "password": "staff123",
    "email": "staff2@example.com",
    "phone_number": "082345678901",
    "role": "STAFF"
  }'
```

**💡 SIMPAN ID** sebagai `$STAFF2_ID`

---

**Test 5: Admin - List All Users**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:** Menampilkan semua users (Admin, Manager, Staff)

---

**Test 6: RBAC - Staff TIDAK Bisa Create User (403 Forbidden)**

Login sebagai Staff:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "staff1",
    "password": "staff123"
  }'
```

**💡 SIMPAN TOKEN** sebagai `$STAFF_TOKEN`

Coba create user (harus gagal):
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized User",
    "username": "test",
    "password": "test123",
    "email": "test@example.com",
    "phone_number": "083456789012",
    "role": "STAFF"
  }'
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Access denied. Required role: ADMIN"
}
```

---

### 📁 **PART 2: Project Management**

#### 2.1 Project CRUD (Admin Only for Create/Delete)

**Test 7: Admin - Create Project**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "E-Commerce Backend API",
    "start_date": "2026-06-10T00:00:00.000Z",
    "end_date": "2026-08-31T23:59:59.000Z",
    "priority": "HIGH",
    "manager_id": 2
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "project_name": "E-Commerce Backend API",
    "priority": "HIGH",
    "manager": {
      "id": 2,
      "name": "Manager One"
    }
  }
}
```

**💡 SIMPAN ID** sebagai `$PROJECT_ID`

---

**Test 8: Admin - List All Projects**
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

**Test 9: Admin - Get Project Detail**
```bash
curl -X GET http://localhost:3000/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

#### 2.2 Manager Access to Assigned Project

Login sebagai Manager:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manager1",
    "password": "manager123"
  }'
```

**💡 SIMPAN TOKEN** sebagai `$MANAGER_TOKEN`

---

**Test 10: Manager - Update Assigned Project (ALLOWED)**
```bash
curl -X PATCH http://localhost:3000/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "E-Commerce Backend API v2",
    "priority": "MEDIUM"
  }'
```

**Expected:** Success (Manager bisa update project yang di-assign ke dia)

---

**Test 11: Manager - Create Project (FORBIDDEN)**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Unauthorized Project",
    "start_date": "2026-06-10T00:00:00.000Z",
    "end_date": "2026-08-31T23:59:59.000Z",
    "priority": "LOW",
    "manager_id": 2
  }'
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Access denied. Required role: ADMIN"
}
```

---

**Test 12: Manager - Delete Project (FORBIDDEN)**
```bash
curl -X DELETE http://localhost:3000/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

**Expected:** 403 Forbidden

---

### ✅ **PART 3: Task Management & Hierarchical Data**

#### 3.1 Recursive Task Structure

**Test 13: Admin - Create Parent Task**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": '$PROJECT_ID',
    "parent_id": null,
    "title": "Backend Development",
    "description": "Develop complete backend system",
    "status": "OPEN",
    "priority": "HIGH",
    "start_time": "2026-06-10T08:00:00.000Z",
    "end_time": "2026-08-31T17:00:00.000Z",
    "assigned_to": 3
  }'
```

**💡 SIMPAN ID** sebagai `$PARENT_TASK_ID`

---

**Test 14: Admin - Create Child Task (Level 1)**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": '$PROJECT_ID',
    "parent_id": '$PARENT_TASK_ID',
    "title": "API Development",
    "description": "Build RESTful API",
    "status": "OPEN",
    "priority": "HIGH",
    "start_time": "2026-06-10T08:00:00.000Z",
    "end_time": "2026-07-15T17:00:00.000Z",
    "assigned_to": 3
  }'
```

**💡 SIMPAN ID** sebagai `$CHILD_TASK_L1_ID`

---

**Test 15: Admin - Create Sub-child Task (Level 2)**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": '$PROJECT_ID',
    "parent_id": '$CHILD_TASK_L1_ID',
    "title": "User Authentication API",
    "description": "Implement JWT authentication",
    "status": "OPEN",
    "priority": "HIGH",
    "start_time": "2026-06-10T08:00:00.000Z",
    "end_time": "2026-06-20T17:00:00.000Z",
    "assigned_to": 3
  }'
```

**💡 SIMPAN ID** sebagai `$CHILD_TASK_L2_ID`

---

**Test 16: Admin - Create Deep Nested Task (Level 3)**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": '$PROJECT_ID',
    "parent_id": '$CHILD_TASK_L2_ID',
    "title": "JWT Token Generation",
    "description": "Implement token generation logic",
    "status": "OPEN",
    "priority": "MEDIUM",
    "start_time": "2026-06-11T08:00:00.000Z",
    "end_time": "2026-06-13T17:00:00.000Z",
    "assigned_to": 3
  }'
```

---

#### 3.2 Recursive Tree View Endpoint

**Test 17: Get Task Tree (Hierarchical View)**
```bash
curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/tasks/tree" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Result:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Backend Development",
      "children": [
        {
          "id": 2,
          "title": "API Development",
          "children": [
            {
              "id": 3,
              "title": "User Authentication API",
              "children": [
                {
                  "id": 4,
                  "title": "JWT Token Generation",
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "cached": false
}
```

---

**Test 18: Verify Caching System**

Jalankan request yang sama 2x:
```bash
# Request 1 (dari database)
curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/tasks/tree" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Request 2 (dari cache)
curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/tasks/tree" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:** Request kedua memiliki `"cached": true`

---

**Test 19: Cache Invalidation (Auto-Update)**

Update task untuk trigger cache invalidation:
```bash
curl -X PATCH http://localhost:3000/api/tasks/$CHILD_TASK_L2_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Authentication API (Updated)"
  }'
```

Kemudian fetch tree lagi:
```bash
curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/tasks/tree" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:**
- `"cached": false` (cache sudah di-invalidate)
- Title task sudah berubah sesuai update

---

#### 3.3 Task Assignment & Email Notification

**Test 20: Manager Assign Task to Another Staff**
```bash
curl -X POST http://localhost:3000/api/tasks/$CHILD_TASK_L2_ID/assign \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assigned_to": '$STAFF2_ID'
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Task assigned successfully and notification email queued",
  "data": {
    "id": 3,
    "assigned_to": 5
  }
}
```

**📧 Cek Log Email Worker:**
```bash
docker-compose logs email-worker
```

**Expected Log:**
```
Email sent to staff2@example.com
Subject: New Task Assigned to You
Task: User Authentication API (Updated)
```

---

#### 3.4 Task Status Management

**Test 21: Staff Update Task Status**
```bash
curl -X PATCH http://localhost:3000/api/tasks/$CHILD_TASK_L2_ID/status \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "WORKING"
  }'
```

**Expected:** Status berubah menjadi `WORKING`

---

**Test 22: Complete Task**
```bash
curl -X PATCH http://localhost:3000/api/tasks/$CHILD_TASK_L2_ID/status \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CLOSED"
  }'
```

---

### ⏰ **PART 4: Automation - Overdue Task Detection**

#### 4.1 Create Task with Past End Time

**Test 23: Create Overdue Task**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": '$PROJECT_ID',
    "parent_id": null,
    "title": "Overdue Testing Task",
    "description": "This task should become overdue",
    "status": "OPEN",
    "priority": "HIGH",
    "start_time": "2026-06-01T08:00:00.000Z",
    "end_time": "2026-06-08T17:00:00.000Z",
    "assigned_to": 3
  }'
```

**💡 SIMPAN ID** sebagai `$OVERDUE_TASK_ID`

---

**Test 24: Check Overdue Worker Logs**

Worker berjalan setiap 1 jam, untuk testing manual trigger:
```bash
docker-compose logs overdue-worker -f
```

**Expected Log:**
```
Checking for overdue tasks...
Found 1 overdue task(s)
Task ID 5 marked as OVERDUE
```

---

**Test 25: Verify Task Status Changed to OVERDUE**
```bash
curl -X GET http://localhost:3000/api/tasks/$OVERDUE_TASK_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "title": "Overdue Testing Task",
    "status": "OVERDUE"
  }
}
```

---

### 🚀 **PART 5: Performance & Cache Testing**

#### 5.1 Cache Performance Test

**Test 26: Measure Response Time**

Request 1 (uncached):
```bash
time curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/tasks/tree" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o /dev/null -s -w "Time: %{time_total}s\n"
```

Request 2 (cached):
```bash
time curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/tasks/tree" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o /dev/null -s -w "Time: %{time_total}s\n"
```

**Expected:** Request kedua lebih cepat (cached response)

---

#### 5.2 Cache Invalidation Scenarios

**Test 27: Cache Invalidation on Create**
```bash
# Get tree (build cache)
curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/tasks/tree" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Create new task (invalidate cache)
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": '$PROJECT_ID',
    "parent_id": '$PARENT_TASK_ID',
    "title": "Cache Invalidation Test",
    "status": "OPEN",
    "priority": "LOW",
    "start_time": "2026-06-10T08:00:00.000Z",
    "end_time": "2026-06-30T17:00:00.000Z",
    "assigned_to": 3
  }'

# Get tree again (should fetch from DB)
curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/tasks/tree" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:** `"cached": false` dan task baru muncul di tree

---

**Test 28: Cache Invalidation on Delete**
```bash
# Delete task
curl -X DELETE http://localhost:3000/api/tasks/$OVERDUE_TASK_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get tree (cache should be cleared)
curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID/tasks/tree" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:** `"cached": false` dan task yang dihapus tidak ada di tree

---

## 📊 **Summary Checklist**

### ✅ IAM & RBAC
- [ ] Login Admin, Manager, Staff berhasil
- [ ] Admin bisa CRUD user
- [ ] Manager tidak bisa create/delete user
- [ ] Staff tidak bisa CRUD user
- [ ] JWT token authentication bekerja

### ✅ Project Management
- [ ] Admin bisa create/delete project
- [ ] Manager bisa update project yang di-assign
- [ ] Manager tidak bisa create/delete project
- [ ] Staff tidak bisa CRUD project

### ✅ Task Management
- [ ] CRUD task bekerja
- [ ] Recursive structure (parent-child-grandchild) berhasil
- [ ] Tree view menampilkan hirarki lengkap
- [ ] Deep nesting (unlimited level) berfungsi

### ✅ Caching System
- [ ] Cache tree view response
- [ ] Cache invalidation on create task
- [ ] Cache invalidation on update task
- [ ] Cache invalidation on delete task
- [ ] Response time lebih cepat saat cached

### ✅ Email Notification
- [ ] Email terkirim saat assign task
- [ ] Email queue worker berjalan
- [ ] Email content sesuai (task detail)

### ✅ Overdue Automation
- [ ] Overdue worker berjalan (scheduled)
- [ ] Task status berubah jadi OVERDUE otomatis
- [ ] Hanya task dengan status OPEN/WORKING yang di-check

---

## 🐛 Troubleshooting

### Email Tidak Terkirim?
```bash
# Cek log email worker
docker-compose logs email-worker

# Pastikan SMTP config di .env (optional)
# Jika kosong, email akan di-log saja
```

### Cache Tidak Bekerja?
```bash
# Cek Redis connection
docker-compose exec redis redis-cli ping
# Expected: PONG

# Cek Redis keys
docker-compose exec redis redis-cli KEYS "task:tree:*"
```

### Overdue Worker Tidak Jalan?
```bash
# Cek log overdue worker
docker-compose logs overdue-worker

# Manual trigger (masuk ke container)
docker-compose exec overdue-worker npm run worker:overdue
```

### Database Error?
```bash
# Cek migration status
docker-compose exec app npx prisma migrate status

# Reset database (HATI-HATI: hapus semua data)
docker-compose exec app npx prisma migrate reset
```

---

## 📝 Notes

- **Cache TTL:** Default 300 detik (5 menit)
- **Overdue Check Interval:** Setiap 1 jam (3600000 ms)
- **JWT Expiration:** 1 hari
- **Port:** App `3000`, Postgres `5433`, Redis `6379`, RabbitMQ `5672` & `15672`

---

## 🎯 Assessment Coverage

| Requirement | Test Coverage |
|-------------|---------------|
| IAM - User Attributes | ✅ Test 3-5 |
| RBAC - Admin Full Access | ✅ Test 3-5, 7-9 |
| RBAC - Manager Limited Access | ✅ Test 10-12 |
| RBAC - Staff Limited Access | ✅ Test 6 |
| Project CRUD by Admin | ✅ Test 7-9 |
| Manager Update Project Only | ✅ Test 10-12 |
| Recursive Task Structure | ✅ Test 13-16 |
| Task Status Management | ✅ Test 21-22 |
| Task Assignment | ✅ Test 20 |
| Email Notification | ✅ Test 20 |
| Recursive Tree View Endpoint | ✅ Test 17 |
| Caching System | ✅ Test 18, 26 |
| Cache Invalidation | ✅ Test 19, 27-28 |
| Overdue Automation | ✅ Test 23-25 |

**Total Coverage: 100%** 🎉
