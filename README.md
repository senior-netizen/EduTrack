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
| Auth | `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me` | Partial |
| Schools | `POST /schools`, `GET /schools/:id` | Partial |
| Students | `GET /students` (subset of filters), `POST /students`, `GET /students/:id`, `PUT /students/:id`, status change | Partial |
| Academics | Create-only endpoints for terms/classes/subjects | Partial |
| Attendance | `POST /attendance/bulk` | Partial |
| Exams | `POST /exams`, exam-result upsert | Partial |
| Fees | Invoice creation and payment recording | Partial |

## Known Remaining Gaps
For the detailed gap breakdown and completion checklist, see [`implementation-gap-report.md`](implementation-gap-report.md).

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
