# EduTrack Full Backend (Spec-Based)

This project now implements a broad v1 backend surface aligned with:
- `edutrack-system-spec.md`
- `edutrack-prd.md`
- `edutrack-db-schema.md`
- `edutrack-api-contracts.md`

## Module Status (Contract-Aware)

Status is based on acceptance against `edutrack-api-contracts.md` (implemented surface + response/behavior alignment).

| Module | Key endpoints/features currently available | Contract status |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me` | Fully implemented |
| Schools | `POST /schools`, `GET /schools/:id` | Fully implemented |
| Students | `GET /students`, `POST /students`, `GET /students/:id`, `PUT /students/:id`, `POST /students/:id/status`, `POST /students/bulk-import`, `GET /students/:id/report-card/:termId` | Fully implemented |
| Academics | Full CRUD/list for terms/classes/subjects plus `GET /classes/:id/students` | Fully implemented |
| Attendance | `POST /attendance`, `POST /attendance/bulk`, `GET /attendance/student/:studentId`, `GET /attendance/class/:classId` plus analytics endpoints | Fully implemented |
| Exams | `POST /exams`, `POST /exams/:id/results`, `GET /exams/:id/results`, `POST /exams/:id/publish` and extended exam routes | Fully implemented |
| Fees | Fee structures, invoice generation, payment recording/receipts, student fee account, arrears + notify endpoints | Fully implemented |

## Known Remaining Gaps
For the detailed gap breakdown and completion checklist, see [`implementation-gap-report.md`](implementation-gap-report.md).


## Delivery & Traceability
- [Implementation Traceability Matrix](implementation-traceability.md)

## API Base
- `http://localhost:4000/api/v1`

## Setup
```bash
cp .env.example .env
# Set DATABASE_URL in .env to your PostgreSQL connection string, e.g.
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/edutrack?schema=public"
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

### PostgreSQL migration flow
- Use `npm run prisma:migrate -- --name <migration_name>` for schema changes.
- Commit generated migration files under `prisma/migrations`.
- For a fresh local database, run `npx prisma migrate reset` (destructive) then re-seed/restart app as needed.

## Notes
- Architecture uses Fastify + Prisma + JWT + role guards + multi-tenant `schoolId` scoping.
- The schema includes key entities across students, academics, attendance, exams, and fees.
