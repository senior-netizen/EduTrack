# EduTrack

Implementation scaffold for EduTrack Student Management System based on the provided specification documents.

## Included
- Fastify REST API (`/api/v1`) with response envelope conventions.
- JWT authentication (`/auth/login`, `/auth/me`).
- RBAC middleware (`authenticate`, `authorize`).
- Student module starter (`GET /students`, `POST /students`).
- Prisma ORM schema capturing core multi-tenant entities: schools, users, terms, students.

## Setup
1. Copy env file:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate Prisma client and migrate:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```
4. Run server:
   ```bash
   npm run dev
   ```

Server runs on `http://localhost:4000` and API base URL is `http://localhost:4000/api/v1`.

## Next planned modules
- Academic management (terms/classes/subjects assignment)
- Attendance and alerts
- Exams and grading engine
- Fees and payments
- Notifications and report generation
