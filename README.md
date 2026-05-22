# EduTrack Full Backend (Spec-Based)

This project now implements a broad v1 backend surface aligned with:
- `edutrack-system-spec.md`
- `edutrack-prd.md`
- `edutrack-db-schema.md`
- `edutrack-api-contracts.md`

## Implemented Modules
- Auth: login, logout, me
- Schools: create, get by id
- Students: list/filter, enroll
- Academics: terms, classes, subjects
- Attendance: bulk attendance entry
- Exams: create exam, upsert exam result
- Fees: create invoices, record payments

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
